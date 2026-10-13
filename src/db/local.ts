import fs from 'fs';
import path from 'path';
import { Association, ScriptSequence, AgentNote, Consigne } from '../types';
import { CallCenterDB, DataStore, StoreCounts } from './types';
import { DEFAULT_ASSOCIATIONS, DEFAULT_SEQUENCES } from './defaults';

const DB_PATH = path.join(process.cwd(), 'db.json');

export function defaultData(): CallCenterDB {
  return {
    associations: structuredClone(DEFAULT_ASSOCIATIONS),
    sequences: structuredClone(DEFAULT_SEQUENCES),
    notes: [],
    consignes: [],
  };
}

// Last-resort store: in-memory data persisted to db.json. Every write is mirrored here
// so the app keeps working (and can re-seed Postgres) when no remote database is reachable.
export class LocalStore implements DataStore {
  readonly name = 'local' as const;
  private data: CallCenterDB = defaultData();

  async init(): Promise<void> {
    this.load();
  }

  load(): void {
    try {
      if (!fs.existsSync(DB_PATH)) {
        this.save();
        return;
      }
      const loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      this.data = {
        associations: loaded.associations || structuredClone(DEFAULT_ASSOCIATIONS),
        sequences: loaded.sequences || structuredClone(DEFAULT_SEQUENCES),
        notes: loaded.notes || [],
        consignes: loaded.consignes || [],
      };
      console.log('💾 [LOCAL] Base de secours chargée depuis db.json');
    } catch (err) {
      console.error('💾 [LOCAL] Erreur de lecture de db.json, utilisation des données par défaut :', err);
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('💾 [LOCAL] Erreur d’écriture de db.json :', err);
    }
  }

  private upsert<T extends { id: string }>(list: T[], item: T): void {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx !== -1) list[idx] = item;
    else list.push(item);
    this.save();
  }

  snapshot(): CallCenterDB {
    return structuredClone(this.data);
  }

  async listAssociations(): Promise<Association[]> {
    return [...this.data.associations].sort((a, b) => a.nom.localeCompare(b.nom));
  }

  async upsertAssociation(a: Association): Promise<void> {
    this.upsert(this.data.associations, a);
  }

  async deleteAssociation(id: string): Promise<void> {
    this.data.associations = this.data.associations.filter((a) => a.id !== id);
    this.data.sequences = this.data.sequences.filter((s) => s.association_id !== id);
    this.data.notes = this.data.notes.filter((n) => n.association_id !== id);
    this.data.consignes = this.data.consignes.filter((c) => c.association_id !== id);
    this.save();
  }

  async listSequences(associationId?: string): Promise<ScriptSequence[]> {
    return this.data.sequences
      .filter((s) => !associationId || s.association_id === associationId)
      .sort((a, b) => a.ordre - b.ordre);
  }

  async upsertSequence(s: ScriptSequence): Promise<void> {
    this.upsert(this.data.sequences, s);
  }

  async deleteSequence(id: string): Promise<void> {
    this.data.sequences = this.data.sequences.filter((s) => s.id !== id);
    this.save();
  }

  async getNote(id: string): Promise<AgentNote | null> {
    return this.data.notes.find((n) => n.id === id) || null;
  }

  async upsertNote(n: AgentNote): Promise<void> {
    this.upsert(this.data.notes, n);
  }

  async listConsignes(associationId?: string): Promise<Consigne[]> {
    return this.data.consignes.filter((c) => !associationId || c.association_id === associationId);
  }

  async upsertConsigne(c: Consigne): Promise<void> {
    this.upsert(this.data.consignes, c);
  }

  async deleteConsigne(id: string): Promise<void> {
    this.data.consignes = this.data.consignes.filter((c) => c.id !== id);
    this.save();
  }

  async replaceAll(data: CallCenterDB): Promise<void> {
    this.data = structuredClone(data);
    this.save();
  }

  async counts(): Promise<StoreCounts> {
    return {
      associations: this.data.associations.length,
      sequences: this.data.sequences.length,
      notes: this.data.notes.length,
      consignes: this.data.consignes.length,
    };
  }
}
