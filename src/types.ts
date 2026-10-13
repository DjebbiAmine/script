export interface Association {
  id: string;
  nom: string;
  logo_url: string;
  date_creation: string;
}

export interface ScriptSequence {
  id: string;
  association_id: string;
  titre_sequence: string;
  texte_script: string;
  ordre: number;
  type: 'script' | 'objection';
  parent_sequence_id?: string;
}

export interface AgentNote {
  id: string;
  agent_username: string;
  association_id: string;
  note_texte: string;
  date_mise_a_jour: string;
}

export interface Consigne {
  id: string;
  texte: string;
  association_id: string;
  sequence_id: string; // Specific sequence ID, or "global"
  date_creation: string;
}

export type UserRole = 'agent' | 'admin' | null;

export interface UserSession {
  username: string;
  role: UserRole;
}
