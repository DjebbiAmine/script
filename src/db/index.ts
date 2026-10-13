import { Association, ScriptSequence, AgentNote, Consigne } from '../types';
import { BackendName, CallCenterDB, DataStore, StoreCounts } from './types';
import { PostgresStore, isPostgresConfigured } from './postgres';
import { createFirestoreStore, FirebaseInfo } from './firestore';
import { LocalStore, defaultData } from './local';

// Storage priority: Postgres (primary) → Firestore (fallback) → db.json (last resort).
// Each operation is tried on the remotes in order; a backend that fails is skipped for
// RETRY_MS, then retried. Every write is also mirrored to db.json.
const RETRY_MS = 30_000;
const OP_TIMEOUT_MS = Number(process.env.DB_OP_TIMEOUT_MS) || 8000;

interface BackendState {
  store: DataStore;
  ready: boolean;
  downUntil: number;
  lastError?: string;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: délai dépassé (${OP_TIMEOUT_MS} ms)`)), OP_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const LABELS: Record<BackendName, string> = {
  postgres: 'PostgreSQL (base principale)',
  firestore: 'Cloud Firestore (base de secours)',
  local: 'Fichiers locaux (db.json) - Mode Secours',
};

class Database {
  private remotes: BackendState[] = [];
  private local = new LocalStore();
  private firebaseInfo: FirebaseInfo = { configured: false };
  private lastServedBy: BackendName = 'local';

  async init(): Promise<void> {
    await this.local.init();

    if (isPostgresConfigured()) {
      this.remotes.push({ store: new PostgresStore(), ready: false, downUntil: 0 });
    } else {
      console.warn('🐘 [POSTGRES] DATABASE_URL ou SQL_HOST/SQL_DB_NAME non définis — PostgreSQL désactivé.');
    }

    try {
      const { store, info } = await createFirestoreStore();
      this.firebaseInfo = info;
      if (store) this.remotes.push({ store, ready: false, downUntil: 0 });
      else console.warn(`📡 [FIREBASE] Firebase désactivé : ${info.reason}`);
    } catch (err: any) {
      this.firebaseInfo = { configured: false, reason: err.message };
      console.error('📡 [FIREBASE] Initialisation impossible, Firebase désactivé :', err.message);
    }

    for (const backend of this.remotes) {
      await this.ensureReady(backend);
    }
    const active = this.remotes.find((b) => b.ready);
    this.lastServedBy = active ? active.store.name : 'local';
    console.log(`🗄️  [DB] Stockage actif : ${LABELS[this.lastServedBy]}`);
  }

  // Connects (creating the schema if needed) and seeds an empty backend from db.json.
  private async ensureReady(backend: BackendState): Promise<boolean> {
    if (backend.ready) return true;
    const name = backend.store.name;
    try {
      await withTimeout(backend.store.init(), name);
      const counts = await withTimeout(backend.store.counts(), name);
      if (counts.associations === 0 && counts.sequences === 0) {
        console.log(`🗄️  [DB] ${name} est vide — initialisation avec les données de db.json...`);
        await withTimeout(backend.store.replaceAll(this.local.snapshot()), name);
      }
      backend.ready = true;
      backend.downUntil = 0;
      backend.lastError = undefined;
      console.log(`✅ [DB] Connexion ${name} établie.`);
      return true;
    } catch (err) {
      this.markDown(backend, err);
      return false;
    }
  }

  private markDown(backend: BackendState, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    // Re-run init (schema + seed-if-empty) on the next attempt, in case the database was recreated.
    backend.ready = false;
    backend.downUntil = Date.now() + RETRY_MS;
    backend.lastError = message;
    console.error(`⚠️  [DB] ${backend.store.name} indisponible (nouvel essai dans ${RETRY_MS / 1000}s) : ${message}`);
  }

  private async available(): Promise<BackendState[]> {
    const result: BackendState[] = [];
    for (const backend of this.remotes) {
      if (backend.downUntil > Date.now()) continue;
      if (await this.ensureReady(backend)) result.push(backend);
    }
    return result;
  }

  private async read<T>(op: (store: DataStore) => Promise<T>): Promise<T> {
    for (const backend of await this.available()) {
      try {
        const result = await withTimeout(op(backend.store), backend.store.name);
        this.lastServedBy = backend.store.name;
        return result;
      } catch (err) {
        this.markDown(backend, err);
      }
    }
    this.lastServedBy = 'local';
    return op(this.local);
  }

  private async write(op: (store: DataStore) => Promise<void>): Promise<void> {
    for (const backend of await this.available()) {
      try {
        await withTimeout(op(backend.store), backend.store.name);
        this.lastServedBy = backend.store.name;
        break;
      } catch (err) {
        this.markDown(backend, err);
      }
    }
    await op(this.local);
  }

  listAssociations(): Promise<Association[]> {
    return this.read((s) => s.listAssociations());
  }
  upsertAssociation(a: Association): Promise<void> {
    return this.write((s) => s.upsertAssociation(a));
  }
  deleteAssociation(id: string): Promise<void> {
    return this.write((s) => s.deleteAssociation(id));
  }

  listSequences(associationId?: string): Promise<ScriptSequence[]> {
    return this.read((s) => s.listSequences(associationId));
  }
  upsertSequence(seq: ScriptSequence): Promise<void> {
    return this.write((s) => s.upsertSequence(seq));
  }
  deleteSequence(id: string): Promise<void> {
    return this.write((s) => s.deleteSequence(id));
  }

  getNote(id: string): Promise<AgentNote | null> {
    return this.read((s) => s.getNote(id));
  }
  upsertNote(note: AgentNote): Promise<void> {
    return this.write((s) => s.upsertNote(note));
  }

  listConsignes(associationId?: string): Promise<Consigne[]> {
    return this.read((s) => s.listConsignes(associationId));
  }
  upsertConsigne(c: Consigne): Promise<void> {
    return this.write((s) => s.upsertConsigne(c));
  }
  deleteConsigne(id: string): Promise<void> {
    return this.write((s) => s.deleteConsigne(id));
  }

  // Resets every reachable backend (not just the first one) to the default dataset.
  async resetToDefaults(): Promise<void> {
    const data: CallCenterDB = defaultData();
    for (const backend of await this.available()) {
      try {
        await withTimeout(backend.store.replaceAll(data), backend.store.name);
      } catch (err) {
        this.markDown(backend, err);
      }
    }
    await this.local.replaceAll(data);
  }

  async status() {
    const backendStatus = async (name: 'postgres' | 'firestore') => {
      const backend = this.remotes.find((b) => b.store.name === name);
      if (!backend) return { configured: false, connected: false, counts: null as StoreCounts | null };
      let counts: StoreCounts | null = null;
      if (await this.ensureReady(backend)) {
        try {
          counts = await withTimeout(backend.store.counts(), name);
        } catch (err) {
          this.markDown(backend, err);
        }
      }
      return { configured: true, connected: counts !== null, error: backend.lastError, counts };
    };

    const postgres = await backendStatus('postgres');
    const firestore = await backendStatus('firestore');
    const activeBackend: BackendName = postgres.connected ? 'postgres' : firestore.connected ? 'firestore' : 'local';

    return {
      activeBackend,
      activeStorage: LABELS[activeBackend],
      lastServedBy: this.lastServedBy,
      postgres,
      firestore: { ...firestore, projectId: this.firebaseInfo.projectId, databaseId: this.firebaseInfo.databaseId, reason: this.firebaseInfo.reason },
      local: { counts: await this.local.counts() },
      timestamp: new Date().toISOString(),
    };
  }
}

export const db = new Database();
