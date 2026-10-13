import { Association, ScriptSequence, AgentNote, Consigne } from '../types';

export type BackendName = 'postgres' | 'firestore' | 'local';

export interface CallCenterDB {
  associations: Association[];
  sequences: ScriptSequence[];
  notes: AgentNote[];
  consignes: Consigne[];
}

export interface StoreCounts {
  associations: number;
  sequences: number;
  notes: number;
  consignes: number;
}

// Common contract implemented by every persistence backend.
export interface DataStore {
  readonly name: BackendName;
  // Verifies connectivity (and creates the schema where relevant). Throws on failure.
  init(): Promise<void>;

  listAssociations(): Promise<Association[]>;
  upsertAssociation(assoc: Association): Promise<void>;
  // Deletes the association and its sequences, notes and consignes.
  deleteAssociation(id: string): Promise<void>;

  listSequences(associationId?: string): Promise<ScriptSequence[]>;
  upsertSequence(seq: ScriptSequence): Promise<void>;
  deleteSequence(id: string): Promise<void>;

  getNote(id: string): Promise<AgentNote | null>;
  upsertNote(note: AgentNote): Promise<void>;

  listConsignes(associationId?: string): Promise<Consigne[]>;
  upsertConsigne(consigne: Consigne): Promise<void>;
  deleteConsigne(id: string): Promise<void>;

  // Wipes every collection/table and writes the given dataset.
  replaceAll(data: CallCenterDB): Promise<void>;
  counts(): Promise<StoreCounts>;
}
