// PostgreSQL schema — applied automatically by the server at startup (idempotent).
// Kept dependency-free so the admin UI (SqlSchemaViewer) can display the same SQL.
export const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS associations (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    logo_url TEXT NOT NULL DEFAULT '',
    date_creation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sequences (
    id TEXT PRIMARY KEY,
    association_id TEXT NOT NULL,
    titre_sequence TEXT NOT NULL,
    texte_script TEXT NOT NULL,
    ordre INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL CHECK (type IN ('script', 'objection')),
    parent_sequence_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_sequences_association ON sequences (association_id);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    agent_username TEXT NOT NULL,
    association_id TEXT NOT NULL,
    note_texte TEXT NOT NULL DEFAULT '',
    date_mise_a_jour TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_association ON notes (association_id);

CREATE TABLE IF NOT EXISTS consignes (
    id TEXT PRIMARY KEY,
    texte TEXT NOT NULL,
    association_id TEXT NOT NULL,
    sequence_id TEXT NOT NULL,
    date_creation TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consignes_association ON consignes (association_id);
`;
