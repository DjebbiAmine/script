import fs from 'fs';
import path from 'path';
import { Association, ScriptSequence, AgentNote, Consigne } from '../types';
import { CallCenterDB, DataStore, StoreCounts } from './types';

type Firestore = import('firebase-admin/firestore').Firestore;
type DocRef = import('firebase-admin/firestore').DocumentReference;

export interface FirebaseInfo {
  configured: boolean;
  projectId?: string;
  databaseId?: string;
  reason?: string;
}

// Firebase is only the fallback. It needs an explicit service account: without one,
// firebase-admin falls back to Google Application Default Credentials, which crashes
// the process on hosts outside Google Cloud ("Could not load the default credentials").
//   FIREBASE_SERVICE_ACCOUNT_JSON  inline JSON of the service account key
//   FIREBASE_SERVICE_ACCOUNT_PATH  or GOOGLE_APPLICATION_CREDENTIALS: path to the key file
//   FIRESTORE_DATABASE_ID          optional, overrides firebase-applet-config.json
function loadServiceAccount(): Record<string, any> | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  }
  return null;
}

function loadAppletConfig(): { projectId?: string; firestoreDatabaseId?: string } {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export async function createFirestoreStore(): Promise<{ store: FirestoreStore | null; info: FirebaseInfo }> {
  let serviceAccount: Record<string, any> | null;
  let appletConfig: { projectId?: string; firestoreDatabaseId?: string };
  try {
    serviceAccount = loadServiceAccount();
    appletConfig = loadAppletConfig();
  } catch (err: any) {
    return { store: null, info: { configured: false, reason: `Configuration Firebase illisible : ${err.message}` } };
  }

  if (!serviceAccount) {
    return {
      store: null,
      info: {
        configured: false,
        reason: 'Aucun compte de service Firebase (FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_PATH).',
      },
    };
  }

  const projectId = serviceAccount.project_id || appletConfig.projectId;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || '(default)';

  // Loaded lazily so hosts without Firebase never touch the Google SDKs.
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount as any), projectId });
  const db = databaseId === '(default)' ? getFirestore(app) : getFirestore(app, databaseId);
  // Optional fields (e.g. parent_sequence_id on scripts) are undefined; Firestore rejects those by default.
  db.settings({ ignoreUndefinedProperties: true });

  return { store: new FirestoreStore(db), info: { configured: true, projectId, databaseId } };
}

const COLLECTIONS = ['associations', 'sequences', 'notes', 'consignes'] as const;
// Firestore batches are limited to 500 writes.
const BATCH_LIMIT = 450;

export class FirestoreStore implements DataStore {
  readonly name = 'firestore' as const;

  constructor(private db: Firestore) {}

  async init(): Promise<void> {
    await this.db.collection('associations').limit(1).get();
  }

  private async list<T>(col: string, associationId?: string): Promise<T[]> {
    const ref = this.db.collection(col);
    const snap = associationId ? await ref.where('association_id', '==', associationId).get() : await ref.get();
    return snap.docs.map((d) => d.data() as T);
  }

  private async deleteDocs(refs: DocRef[]): Promise<void> {
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = this.db.batch();
      refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }

  async listAssociations(): Promise<Association[]> {
    const items = await this.list<Association>('associations');
    return items.sort((a, b) => a.nom.localeCompare(b.nom));
  }

  async upsertAssociation(a: Association): Promise<void> {
    await this.db.collection('associations').doc(a.id).set(a);
  }

  async deleteAssociation(id: string): Promise<void> {
    const refs: DocRef[] = [this.db.collection('associations').doc(id)];
    for (const col of ['sequences', 'notes', 'consignes']) {
      const snap = await this.db.collection(col).where('association_id', '==', id).get();
      snap.docs.forEach((d) => refs.push(d.ref));
    }
    await this.deleteDocs(refs);
  }

  async listSequences(associationId?: string): Promise<ScriptSequence[]> {
    const items = await this.list<ScriptSequence>('sequences', associationId);
    return items.sort((a, b) => a.ordre - b.ordre);
  }

  async upsertSequence(s: ScriptSequence): Promise<void> {
    await this.db.collection('sequences').doc(s.id).set(s);
  }

  async deleteSequence(id: string): Promise<void> {
    await this.db.collection('sequences').doc(id).delete();
  }

  async getNote(id: string): Promise<AgentNote | null> {
    const doc = await this.db.collection('notes').doc(id).get();
    return doc.exists ? (doc.data() as AgentNote) : null;
  }

  async upsertNote(n: AgentNote): Promise<void> {
    await this.db.collection('notes').doc(n.id).set(n);
  }

  async listConsignes(associationId?: string): Promise<Consigne[]> {
    return this.list<Consigne>('consignes', associationId);
  }

  async upsertConsigne(c: Consigne): Promise<void> {
    await this.db.collection('consignes').doc(c.id).set(c);
  }

  async deleteConsigne(id: string): Promise<void> {
    await this.db.collection('consignes').doc(id).delete();
  }

  async replaceAll(data: CallCenterDB): Promise<void> {
    for (const col of COLLECTIONS) {
      const snap = await this.db.collection(col).get();
      await this.deleteDocs(snap.docs.map((d) => d.ref));
    }
    for (const col of COLLECTIONS) {
      const items = data[col] as { id: string }[];
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const batch = this.db.batch();
        items.slice(i, i + BATCH_LIMIT).forEach((item) => batch.set(this.db.collection(col).doc(item.id), item));
        await batch.commit();
      }
    }
  }

  async counts(): Promise<StoreCounts> {
    const result: any = {};
    for (const col of COLLECTIONS) {
      const snap = await this.db.collection(col).count().get();
      result[col] = snap.data().count;
    }
    return result;
  }
}
