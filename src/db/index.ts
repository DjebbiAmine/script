import { Association, ScriptSequence, AgentNote, Consigne } from '../types';
import { CallCenterDB, StoreCounts } from './types';
import { PostgresStore, isPostgresConfigured } from './postgres';
import { defaultData } from './defaults';

// PostgreSQL is the only storage backend: there is no fallback. If it is not configured
// or not reachable, startup fails and every request errors out until it is back.
const OP_TIMEOUT_MS = Number(process.env.DB_OP_TIMEOUT_MS) || 8000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`PostgreSQL : délai dépassé (${OP_TIMEOUT_MS} ms)`)), OP_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class Database {
  private store!: PostgresStore;

  // Connects (creating the schema if needed) and seeds an empty database with the defaults.
  // Throws if PostgreSQL is not configured or unreachable.
  async init(): Promise<void> {
    if (!isPostgresConfigured()) {
      throw new Error('PostgreSQL non configuré : définissez DATABASE_URL ou SQL_HOST/SQL_DB_NAME.');
    }
    this.store = new PostgresStore();
    await withTimeout(this.store.init());
    const counts = await withTimeout(this.store.counts());
    if (counts.associations === 0 && counts.sequences === 0) {
      console.log('🗄️  [DB] PostgreSQL est vide — initialisation avec les données par défaut...');
      await withTimeout(this.store.replaceAll(defaultData()));
    }
    console.log('✅ [DB] Connexion PostgreSQL établie.');
  }

  listAssociations(): Promise<Association[]> {
    return withTimeout(this.store.listAssociations());
  }
  upsertAssociation(a: Association): Promise<void> {
    return withTimeout(this.store.upsertAssociation(a));
  }
  deleteAssociation(id: string): Promise<void> {
    return withTimeout(this.store.deleteAssociation(id));
  }

  listSequences(associationId?: string): Promise<ScriptSequence[]> {
    return withTimeout(this.store.listSequences(associationId));
  }
  upsertSequence(seq: ScriptSequence): Promise<void> {
    return withTimeout(this.store.upsertSequence(seq));
  }
  deleteSequence(id: string): Promise<void> {
    return withTimeout(this.store.deleteSequence(id));
  }

  getNote(id: string): Promise<AgentNote | null> {
    return withTimeout(this.store.getNote(id));
  }
  upsertNote(note: AgentNote): Promise<void> {
    return withTimeout(this.store.upsertNote(note));
  }

  listConsignes(associationId?: string): Promise<Consigne[]> {
    return withTimeout(this.store.listConsignes(associationId));
  }
  upsertConsigne(c: Consigne): Promise<void> {
    return withTimeout(this.store.upsertConsigne(c));
  }
  deleteConsigne(id: string): Promise<void> {
    return withTimeout(this.store.deleteConsigne(id));
  }

  resetToDefaults(): Promise<void> {
    const data: CallCenterDB = defaultData();
    return withTimeout(this.store.replaceAll(data));
  }

  async status() {
    let counts: StoreCounts | null = null;
    let error: string | undefined;
    try {
      counts = await withTimeout(this.store.counts());
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    return {
      connected: counts !== null,
      error,
      counts,
      timestamp: new Date().toISOString(),
    };
  }
}

export const db = new Database();
