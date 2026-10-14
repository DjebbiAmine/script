import pg from 'pg';
import { Association, ScriptSequence, AgentNote, Consigne } from '../types';
import { CallCenterDB, DataStore, StoreCounts } from './types';
import { SCHEMA_SQL } from './schema';

// Postgres is the only database. Configure it with DATABASE_URL, or with
// SQL_HOST / SQL_PORT / SQL_USER / SQL_PASSWORD / SQL_DB_NAME (SQL_SSL=true for TLS).
export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || (process.env.SQL_HOST && process.env.SQL_DB_NAME));
}

function poolConfig(): pg.PoolConfig {
  const ssl = process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  const common: pg.PoolConfig = {
    max: 10,
    // Fail fast so requests error out instead of hanging.
    connectionTimeoutMillis: Number(process.env.SQL_CONNECT_TIMEOUT_MS) || 5000,
    idleTimeoutMillis: 30000,
    ssl,
  };
  if (process.env.DATABASE_URL) {
    return { ...common, connectionString: process.env.DATABASE_URL };
  }
  return {
    ...common,
    host: process.env.SQL_HOST,
    port: Number(process.env.SQL_PORT) || 5432,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
  };
}

function toSequence(row: any): ScriptSequence {
  const seq: ScriptSequence = {
    id: row.id,
    association_id: row.association_id,
    titre_sequence: row.titre_sequence,
    texte_script: row.texte_script,
    ordre: Number(row.ordre),
    type: row.type,
  };
  if (row.parent_sequence_id) seq.parent_sequence_id = row.parent_sequence_id;
  return seq;
}

export class PostgresStore implements DataStore {
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool(poolConfig());
    // Idle client errors (e.g. server restart) must not crash the process.
    this.pool.on('error', (err) => {
      console.error('🐘 [POSTGRES] Erreur sur une connexion inactive :', err.message);
    });
  }

  async init(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);
  }

  private async tx(fn: (client: pg.PoolClient) => Promise<void>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await fn(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async listAssociations(): Promise<Association[]> {
    const { rows } = await this.pool.query(
      'SELECT id, nom, logo_url, date_creation FROM associations ORDER BY nom'
    );
    return rows;
  }

  async upsertAssociation(a: Association): Promise<void> {
    await this.pool.query(
      `INSERT INTO associations (id, nom, logo_url, date_creation) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, logo_url = EXCLUDED.logo_url, date_creation = EXCLUDED.date_creation`,
      [a.id, a.nom, a.logo_url || '', a.date_creation]
    );
  }

  async deleteAssociation(id: string): Promise<void> {
    await this.tx(async (c) => {
      await c.query('DELETE FROM sequences WHERE association_id = $1', [id]);
      await c.query('DELETE FROM notes WHERE association_id = $1', [id]);
      await c.query('DELETE FROM consignes WHERE association_id = $1', [id]);
      await c.query('DELETE FROM associations WHERE id = $1', [id]);
    });
  }

  async listSequences(associationId?: string): Promise<ScriptSequence[]> {
    const { rows } = associationId
      ? await this.pool.query('SELECT * FROM sequences WHERE association_id = $1 ORDER BY ordre', [associationId])
      : await this.pool.query('SELECT * FROM sequences ORDER BY ordre');
    return rows.map(toSequence);
  }

  async upsertSequence(s: ScriptSequence): Promise<void> {
    await this.pool.query(
      `INSERT INTO sequences (id, association_id, titre_sequence, texte_script, ordre, type, parent_sequence_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET association_id = EXCLUDED.association_id, titre_sequence = EXCLUDED.titre_sequence,
         texte_script = EXCLUDED.texte_script, ordre = EXCLUDED.ordre, type = EXCLUDED.type,
         parent_sequence_id = EXCLUDED.parent_sequence_id`,
      [s.id, s.association_id, s.titre_sequence, s.texte_script, s.ordre, s.type, s.parent_sequence_id || null]
    );
  }

  async deleteSequence(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sequences WHERE id = $1', [id]);
  }

  async getNote(id: string): Promise<AgentNote | null> {
    const { rows } = await this.pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async upsertNote(n: AgentNote): Promise<void> {
    await this.pool.query(
      `INSERT INTO notes (id, agent_username, association_id, note_texte, date_mise_a_jour) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET note_texte = EXCLUDED.note_texte, date_mise_a_jour = EXCLUDED.date_mise_a_jour`,
      [n.id, n.agent_username, n.association_id, n.note_texte, n.date_mise_a_jour]
    );
  }

  async listConsignes(associationId?: string): Promise<Consigne[]> {
    const { rows } = associationId
      ? await this.pool.query('SELECT * FROM consignes WHERE association_id = $1', [associationId])
      : await this.pool.query('SELECT * FROM consignes');
    return rows;
  }

  async upsertConsigne(c: Consigne): Promise<void> {
    await this.pool.query(
      `INSERT INTO consignes (id, texte, association_id, sequence_id, date_creation) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET texte = EXCLUDED.texte, association_id = EXCLUDED.association_id,
         sequence_id = EXCLUDED.sequence_id, date_creation = EXCLUDED.date_creation`,
      [c.id, c.texte, c.association_id, c.sequence_id, c.date_creation]
    );
  }

  async deleteConsigne(id: string): Promise<void> {
    await this.pool.query('DELETE FROM consignes WHERE id = $1', [id]);
  }

  async replaceAll(data: CallCenterDB): Promise<void> {
    await this.tx(async (c) => {
      await c.query('TRUNCATE associations, sequences, notes, consignes');
      for (const a of data.associations) {
        await c.query(
          'INSERT INTO associations (id, nom, logo_url, date_creation) VALUES ($1, $2, $3, $4)',
          [a.id, a.nom, a.logo_url || '', a.date_creation]
        );
      }
      for (const s of data.sequences) {
        await c.query(
          `INSERT INTO sequences (id, association_id, titre_sequence, texte_script, ordre, type, parent_sequence_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [s.id, s.association_id, s.titre_sequence, s.texte_script, s.ordre, s.type, s.parent_sequence_id || null]
        );
      }
      for (const n of data.notes) {
        await c.query(
          'INSERT INTO notes (id, agent_username, association_id, note_texte, date_mise_a_jour) VALUES ($1, $2, $3, $4, $5)',
          [n.id, n.agent_username, n.association_id, n.note_texte, n.date_mise_a_jour]
        );
      }
      for (const k of data.consignes) {
        await c.query(
          'INSERT INTO consignes (id, texte, association_id, sequence_id, date_creation) VALUES ($1, $2, $3, $4, $5)',
          [k.id, k.texte, k.association_id, k.sequence_id, k.date_creation]
        );
      }
    });
  }

  async counts(): Promise<StoreCounts> {
    const { rows } = await this.pool.query(`SELECT
      (SELECT COUNT(*) FROM associations)::int AS associations,
      (SELECT COUNT(*) FROM sequences)::int AS sequences,
      (SELECT COUNT(*) FROM notes)::int AS notes,
      (SELECT COUNT(*) FROM consignes)::int AS consignes`);
    return rows[0];
  }
}
