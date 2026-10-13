var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/db/postgres.ts
var import_pg = __toESM(require("pg"), 1);

// src/db/schema.ts
var SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS associations (
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

// src/db/postgres.ts
function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.SQL_HOST && process.env.SQL_DB_NAME);
}
function poolConfig() {
  const ssl = process.env.SQL_SSL === "true" ? { rejectUnauthorized: false } : void 0;
  const common = {
    max: 10,
    // Fail fast so requests can fall back to Firestore instead of hanging.
    connectionTimeoutMillis: Number(process.env.SQL_CONNECT_TIMEOUT_MS) || 5e3,
    idleTimeoutMillis: 3e4,
    ssl
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
    database: process.env.SQL_DB_NAME
  };
}
function toSequence(row) {
  const seq = {
    id: row.id,
    association_id: row.association_id,
    titre_sequence: row.titre_sequence,
    texte_script: row.texte_script,
    ordre: Number(row.ordre),
    type: row.type
  };
  if (row.parent_sequence_id) seq.parent_sequence_id = row.parent_sequence_id;
  return seq;
}
var PostgresStore = class {
  constructor() {
    this.name = "postgres";
    this.pool = new import_pg.default.Pool(poolConfig());
    this.pool.on("error", (err) => {
      console.error("\u{1F418} [POSTGRES] Erreur sur une connexion inactive :", err.message);
    });
  }
  async init() {
    await this.pool.query(SCHEMA_SQL);
  }
  async tx(fn) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await fn(client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {
      });
      throw err;
    } finally {
      client.release();
    }
  }
  async listAssociations() {
    const { rows } = await this.pool.query(
      "SELECT id, nom, logo_url, date_creation FROM associations ORDER BY nom"
    );
    return rows;
  }
  async upsertAssociation(a) {
    await this.pool.query(
      `INSERT INTO associations (id, nom, logo_url, date_creation) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, logo_url = EXCLUDED.logo_url, date_creation = EXCLUDED.date_creation`,
      [a.id, a.nom, a.logo_url || "", a.date_creation]
    );
  }
  async deleteAssociation(id) {
    await this.tx(async (c) => {
      await c.query("DELETE FROM sequences WHERE association_id = $1", [id]);
      await c.query("DELETE FROM notes WHERE association_id = $1", [id]);
      await c.query("DELETE FROM consignes WHERE association_id = $1", [id]);
      await c.query("DELETE FROM associations WHERE id = $1", [id]);
    });
  }
  async listSequences(associationId) {
    const { rows } = associationId ? await this.pool.query("SELECT * FROM sequences WHERE association_id = $1 ORDER BY ordre", [associationId]) : await this.pool.query("SELECT * FROM sequences ORDER BY ordre");
    return rows.map(toSequence);
  }
  async upsertSequence(s) {
    await this.pool.query(
      `INSERT INTO sequences (id, association_id, titre_sequence, texte_script, ordre, type, parent_sequence_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET association_id = EXCLUDED.association_id, titre_sequence = EXCLUDED.titre_sequence,
         texte_script = EXCLUDED.texte_script, ordre = EXCLUDED.ordre, type = EXCLUDED.type,
         parent_sequence_id = EXCLUDED.parent_sequence_id`,
      [s.id, s.association_id, s.titre_sequence, s.texte_script, s.ordre, s.type, s.parent_sequence_id || null]
    );
  }
  async deleteSequence(id) {
    await this.pool.query("DELETE FROM sequences WHERE id = $1", [id]);
  }
  async getNote(id) {
    const { rows } = await this.pool.query("SELECT * FROM notes WHERE id = $1", [id]);
    return rows[0] || null;
  }
  async upsertNote(n) {
    await this.pool.query(
      `INSERT INTO notes (id, agent_username, association_id, note_texte, date_mise_a_jour) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET note_texte = EXCLUDED.note_texte, date_mise_a_jour = EXCLUDED.date_mise_a_jour`,
      [n.id, n.agent_username, n.association_id, n.note_texte, n.date_mise_a_jour]
    );
  }
  async listConsignes(associationId) {
    const { rows } = associationId ? await this.pool.query("SELECT * FROM consignes WHERE association_id = $1", [associationId]) : await this.pool.query("SELECT * FROM consignes");
    return rows;
  }
  async upsertConsigne(c) {
    await this.pool.query(
      `INSERT INTO consignes (id, texte, association_id, sequence_id, date_creation) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET texte = EXCLUDED.texte, association_id = EXCLUDED.association_id,
         sequence_id = EXCLUDED.sequence_id, date_creation = EXCLUDED.date_creation`,
      [c.id, c.texte, c.association_id, c.sequence_id, c.date_creation]
    );
  }
  async deleteConsigne(id) {
    await this.pool.query("DELETE FROM consignes WHERE id = $1", [id]);
  }
  async replaceAll(data) {
    await this.tx(async (c) => {
      await c.query("TRUNCATE associations, sequences, notes, consignes");
      for (const a of data.associations) {
        await c.query(
          "INSERT INTO associations (id, nom, logo_url, date_creation) VALUES ($1, $2, $3, $4)",
          [a.id, a.nom, a.logo_url || "", a.date_creation]
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
          "INSERT INTO notes (id, agent_username, association_id, note_texte, date_mise_a_jour) VALUES ($1, $2, $3, $4, $5)",
          [n.id, n.agent_username, n.association_id, n.note_texte, n.date_mise_a_jour]
        );
      }
      for (const k of data.consignes) {
        await c.query(
          "INSERT INTO consignes (id, texte, association_id, sequence_id, date_creation) VALUES ($1, $2, $3, $4, $5)",
          [k.id, k.texte, k.association_id, k.sequence_id, k.date_creation]
        );
      }
    });
  }
  async counts() {
    const { rows } = await this.pool.query(`SELECT
      (SELECT COUNT(*) FROM associations)::int AS associations,
      (SELECT COUNT(*) FROM sequences)::int AS sequences,
      (SELECT COUNT(*) FROM notes)::int AS notes,
      (SELECT COUNT(*) FROM consignes)::int AS consignes`);
    return rows[0];
  }
};

// src/db/firestore.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && import_fs.default.existsSync(keyPath)) {
    return JSON.parse(import_fs.default.readFileSync(keyPath, "utf-8"));
  }
  return null;
}
function loadAppletConfig() {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  if (!import_fs.default.existsSync(configPath)) return {};
  return JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
}
async function createFirestoreStore() {
  let serviceAccount;
  let appletConfig;
  try {
    serviceAccount = loadServiceAccount();
    appletConfig = loadAppletConfig();
  } catch (err) {
    return { store: null, info: { configured: false, reason: `Configuration Firebase illisible : ${err.message}` } };
  }
  if (!serviceAccount) {
    return {
      store: null,
      info: {
        configured: false,
        reason: "Aucun compte de service Firebase (FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_PATH)."
      }
    };
  }
  const projectId = serviceAccount.project_id || appletConfig.projectId;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || "(default)";
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app2 = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId });
  const db2 = databaseId === "(default)" ? getFirestore(app2) : getFirestore(app2, databaseId);
  db2.settings({ ignoreUndefinedProperties: true });
  return { store: new FirestoreStore(db2), info: { configured: true, projectId, databaseId } };
}
var COLLECTIONS = ["associations", "sequences", "notes", "consignes"];
var BATCH_LIMIT = 450;
var FirestoreStore = class {
  constructor(db2) {
    this.db = db2;
    this.name = "firestore";
  }
  async init() {
    await this.db.collection("associations").limit(1).get();
  }
  async list(col, associationId) {
    const ref = this.db.collection(col);
    const snap = associationId ? await ref.where("association_id", "==", associationId).get() : await ref.get();
    return snap.docs.map((d) => d.data());
  }
  async deleteDocs(refs) {
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = this.db.batch();
      refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }
  async listAssociations() {
    const items = await this.list("associations");
    return items.sort((a, b) => a.nom.localeCompare(b.nom));
  }
  async upsertAssociation(a) {
    await this.db.collection("associations").doc(a.id).set(a);
  }
  async deleteAssociation(id) {
    const refs = [this.db.collection("associations").doc(id)];
    for (const col of ["sequences", "notes", "consignes"]) {
      const snap = await this.db.collection(col).where("association_id", "==", id).get();
      snap.docs.forEach((d) => refs.push(d.ref));
    }
    await this.deleteDocs(refs);
  }
  async listSequences(associationId) {
    const items = await this.list("sequences", associationId);
    return items.sort((a, b) => a.ordre - b.ordre);
  }
  async upsertSequence(s) {
    await this.db.collection("sequences").doc(s.id).set(s);
  }
  async deleteSequence(id) {
    await this.db.collection("sequences").doc(id).delete();
  }
  async getNote(id) {
    const doc = await this.db.collection("notes").doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  async upsertNote(n) {
    await this.db.collection("notes").doc(n.id).set(n);
  }
  async listConsignes(associationId) {
    return this.list("consignes", associationId);
  }
  async upsertConsigne(c) {
    await this.db.collection("consignes").doc(c.id).set(c);
  }
  async deleteConsigne(id) {
    await this.db.collection("consignes").doc(id).delete();
  }
  async replaceAll(data) {
    for (const col of COLLECTIONS) {
      const snap = await this.db.collection(col).get();
      await this.deleteDocs(snap.docs.map((d) => d.ref));
    }
    for (const col of COLLECTIONS) {
      const items = data[col];
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const batch = this.db.batch();
        items.slice(i, i + BATCH_LIMIT).forEach((item) => batch.set(this.db.collection(col).doc(item.id), item));
        await batch.commit();
      }
    }
  }
  async counts() {
    const result = {};
    for (const col of COLLECTIONS) {
      const snap = await this.db.collection(col).count().get();
      result[col] = snap.data().count;
    }
    return result;
  }
};

// src/db/local.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);

// src/db/defaults.ts
var DEFAULT_ASSOCIATIONS = [
  {
    id: "him",
    nom: "Handicap International",
    logo_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=150&auto=format&fit=crop&q=60",
    date_creation: "2026-06-18"
  },
  {
    id: "ccfd",
    nom: "CCFD - Terre Solidaire",
    logo_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=150&auto=format&fit=crop&q=60",
    date_creation: "2026-06-18"
  }
];
var DEFAULT_SEQUENCES = [
  {
    id: "s1",
    association_id: "him",
    titre_sequence: "1. S'identifier & Contact (Accroche)",
    texte_script: `[VERT CLAIR] [GRAS]Allo bonjour! ....[/GRAS] [/VERT CLAIR]

[GRAS]Oui[/GRAS]
"Monsieur / Madame...........?, je suis sofia alami / samy sabri et je vous appelle de la part d\u2019Handicap International ( que vous connaissez peut etre de nom ou de reputation) ?"

"Et / ou"
"avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous lib\xE8re ensuite c\u2018est promis, vous me le permettez Mr/Mme.....?"`,
    ordre: 1,
    type: "script"
  },
  {
    id: "s2",
    association_id: "him",
    titre_sequence: "2. L'argumentaire",
    texte_script: `"Merci,"

"Savez-vous que depuis plus de 44 ans, [GRAS]HANDICAP INTERNATIONAL[/GRAS] lutte contre les [COULEUR=#DC2626][GRAS]mines anti-personnel[/GRAS][/COULEUR] et les bombes a sous munition"

"Nous intervenons principalement dans les zones de guerre et de conflits o\xF9 ces armes barbares font encore une victimes toutes les 30 minutes, [GRAS]95% de ces victimes sont des civils[/GRAS] et malheureusement presque 40% d\u2019entre elles des enfants."

"car vous le savez avec l\u2019insouciance de leur age ils courts ils jouent et quand ils trouvent une mine anti-personnelle ils pensent que c\u2019est un jouet et quand elle ne les tue pas elle reste a l\u2019origine de blessures s\xE9v\xE8res entra\xEEnant souvent [COULEUR=#DC2626][GRAS]l\u2019amputation d\u2019un bras ou d\u2019une jambe[/GRAS][/COULEUR]."

"D\u2019ailleurs Mr/Mme j\u2019aimerais vous demandez sans \xEAtre indiscret bien sur, avez vous des causes ou des associations qui vous tiennes a c\u0153ur et que vous soutenez ?"

"c est tout a votre honneur et pourrais je connaitre une association que vous soutenez peut etre depuis longtemps"

"H\xE9 bien Mr/Mme je vous dis bravo pour ce que vous faites personnellement je pense que toutes les causes sont louables et m\xE9ritent d\u2019etre soutenues."

"Comme vous savez peut \xEAtre nous avons des \xE9quipes de volontaire sur le terrain pour apporter en premier lieu des soins post-traumatiques avec notamment du soutien psychologique. Puis nous leur fabriquons une proth\xE8se, un fauteuil roulant ou des b\xE9quilles selon les besoins. Chez l\u2019enfant comme vous l\u2019imaginez la proth\xE8se doit \xEAtre chang\xE9e tous les 6 mois pour suivre sa croissance et enfin nous leurs donnons des s\xE9ances de r\xE9\xE9ducations pour leur r\xE9apprendre \xE0 marcher avec cette nouvelle jambe."

"afin de nous permettre de continuer a bien nos missions, je vous propose de nous apporter votre soutien pour cette campagne ."

[ORANGE/JAUNE CLAIR] \u{1F4A1} Avec un soutien de par exemple [TAILLE=18][GRAS]80\u20AC[/GRAS][/TAILLE] vous contribuez \xE0 financer la fabrication de [COULEUR=#16A34A][GRAS]deux proth\xE8ses[/GRAS][/COULEUR] qui permettront \xE0 2 enfants amput\xE9s de \xAB vivre \xE0 nouveau debout \xBB. [/ORANGE/JAUNE CLAIR]

"Donc Mr/Mme est ce que ces enfants pourraient compter sur un soutien de 80 euro de votre part?"`,
    ordre: 2,
    type: "script"
  },
  {
    id: "s3",
    association_id: "him",
    titre_sequence: "3. Verrouillage & Blindage",
    texte_script: `[VERT CLAIR] [GRAS]VERROUILLAGE :[/GRAS]
"Tres bien, donc puis-je noter de votre part comme promesse de don la somme de\u2026\u2026euros au profit handicap international?" [/VERT CLAIR]

"C\u2019est formidable, je vous explique vous allez recevoir un courrier de la part de notre pr\xE9sident dans lequel bien sur notre appel sera authentifi\xE9e, vous y trouverez un bon de g\xE9n\xE9rosit\xE9 et une enveloppe timbr\xE9e et libell\xE9e a l\u2019adresse d\u2019handicap international dans laquelle vous n\u2019aurez qu\u2019a glisser votre ch\xE8que, cela vous convient Mr/Mme.....,?"

"Tr\xE8s bien je vais rapidement confirmer vos coordonn\xE9es pour la bonne r\xE9ception de notre courrier"
- c\u2019est bien M /Mme...... ?
- Votre pr\xE9nom svp .....?
- Vous habitez toujours au (num\xE9ro, le nom de la rue / le code postal et la ville)
- Y a-t-il un compl\xE9ment d\u2019adresse \xE0 rajouter, un nom de r\xE9sidence, num\xE9ro de b\xE2timent d\u2019appartement ?

"Tr\xE8s bien, Mr/Mme sachez qu\u2019aujourd\u2019hui vous avez la possibilit\xE9 de nous aider doublement, premi\xE8rement vous nous aidez a poursuivre nos actions sur le terrain gr\xE2ce a votre g\xE9n\xE9rosit\xE9 et deuxi\xE8mement vous pouvez nous aider a faire des \xE9conomies sur l\u2019envoie d\u2019un courrier en faisant votre don en ligne sur un formulaire pr\xE9-rempli directement sur le site d\u2019handicap international. si cela vous convient j\u2019aurais besoin de votre adresse e-mail svp pour vous envoyer le lien."

"Si le prospect accepte prendre son e-mail ou le confirmer, envoyer le lien ( par e-mail ou SMS ) et faire votre blindage : donc Mr/Mme vous allez recevoir ce lien dans quelques instant, vous engagez vous a nous retourner votre soutien de xx euros a la r\xE9ception de cette e-mail?"

"Si le prospect ne d\xE9sire pas le faire par SMS ou e-mail: tr\xE8s bien il n\u2019y a pas de soucis Mr/Mme"

[VERT CLAIR] [GRAS]BLINDAGE :[/GRAS]
"vous allez recevoir notre courrier d\u2019ici quatre a cinq jours voir une semaine
Donc vous engagez-vous \xE0 nous renvoyer votre don de [COULEUR=#16A34A]XX.... euros[/COULEUR]
\xE0 la r\xE9ception de notre courrier ?" [/VERT CLAIR]

[VERT CLAIR] [GRAS]Ind\xE9cis blindage : Je ne sais pas peut \xEAtre ![/GRAS]
"Mr/Mme\u2026.votre intention de nous soutenir ne t\xE9moigne que de votre g\xE9n\xE9rosit\xE9, votre engagement nous confortera dans notre volont\xE9 d\u2019agir et nous permettra de pr\xE9voir nos actions en \xE9tablissant a notre niveau un budget pr\xE9visionnel. Aussi, sans faire trop d\u2019effort, \xE0 quel moment pouvez-vous nous retourner votre soutien ?" [/VERT CLAIR]

[VERT CLAIR] (Si le prospect donne une date) : [/VERT CLAIR]
"Donc si je comprends bien vous vous engagez \xE0 nous envoyer votre soutien (x jours) apr\xE8s la r\xE9ception de notre courrier ?"`,
    ordre: 3,
    type: "script"
  },
  {
    id: "s4",
    association_id: "him",
    titre_sequence: "4. Prise de cong\xE9",
    texte_script: `[GRAS]Prise de cong\xE9[/GRAS]

"He bien Mr/Mme il ne me reste plus qu\u2019a vous dire un grand merci pour votre g\xE9n\xE9rosit\xE9 et aussi pour le temps que vous m\u2019avez accord\xE9 au nom de toute \xE9quipe d\u2019handicap international je vous souhaite de passer une excellente journ\xE9e, portez vous bien Mr/Mme et je vous dis au revoir."`,
    ordre: 4,
    type: "script"
  },
  {
    id: "o1",
    association_id: "him",
    titre_sequence: "Objection : NON (faux num\xE9ro)",
    texte_script: `"Ah ! D\xE9sol\xE9 apparemment je me suis tromp\xE9, mais vous savez mon appel n'est pas forcement nominatif, je suis Sofia alami / Samy jabry et Je vous appelle de la part d\u2019handicap international que vous connaissez peut \xEAtre de nom ou de r\xE9putation? \uF04A \uF04A \uF04A"`,
    ordre: 1,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o2",
    association_id: "him",
    titre_sequence: "Objection : Je ne suis pas int\xE9ress\xE9 / pas le temps / occup\xE9",
    texte_script: `"Apparemment vous \xEAtes souvent appel\xE9 au t\xE9l\xE9phone ? effectivement a votre place je r\xE9agirais de la m\xEAme mani\xE8re, moi ce que je peut faire a mon niveau c\u2019est remonter l\u2019information pour que vous ne soyez plus d\xE9rang\xE9 par handicap international.

Mais en attendant puisque je vous ai au bout du fil et avec votre permission bien sur, et ce que je peux prendre 2 petites minute de votre temps et je vous libere ensuite c\u2019est promis.

Vous me le permettez Mme/ Mr .....?"`,
    ordre: 2,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o3",
    association_id: "him",
    titre_sequence: "Objection : Vous m\u2019appelez pour un don / retraite / pas de moyens",
    texte_script: `"Je vous rassure mon appel n\u2019aurait plus aucun sens s\u2019il se limitait \xE0 un don, le plus important pour nous et de vous informer sur nos action donc avec votre permission bien sur je ne prendrais qu\u2019une petite minute de votre temps et je vous lib\xE8re ensuite, c\u2019est promis. Vous me le permettez Mr /Mme.....?"`,
    ordre: 3,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o4",
    association_id: "him",
    titre_sequence: "Objection : Trop sollicit\xE9 / donne \xE0 d'autres associations",
    texte_script: `"Ah et bien bravo pour ce que vous faites, cela ne t\xE9moigne que de votre g\xE9n\xE9rosit\xE9 \uF04A , je vous rassure le but n\u2019est absolument pas de changer vos habitudes caritatives, je vous explique en 2 petites minutes ce dont il s\u2019agit et je vous lib\xE8re ensuite c\u2019est promis, vous me le permettez Mme/Mr\u2026\u2026.. ;\uF04A"`,
    ordre: 4,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o5",
    association_id: "him",
    titre_sequence: "Objection : Je ne donne pas d\u2019argent par t\xE9l\xE9phone",
    texte_script: `"je vous rassure, il n\u2019est pas question que vous donniez de l\u2019argent par t\xE9l\xE9phone. Si vous d\xE9sirez soutenir notre association, vous recevrez un courrier de notre part.

En attendant et avec votre permission bien sur je ne prendrais que deux petites minutes de votre part et je vous lib\xE8re ensuite, c\u2019est promis vous me le permettez Mr/Mme......?"`,
    ordre: 5,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o6",
    association_id: "him",
    titre_sequence: "Objection : D'O\xD9 AVEZ VOUS EU MES COORDONN\xC9ES",
    texte_script: `"Tout simplement de l\u2019annuaire t\xE9l\xE9phonique (ou \xE9lectronique)"`,
    ordre: 6,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o7",
    association_id: "him",
    titre_sequence: "Objection : JE SUIS EN LISTE ROUGE",
    texte_script: `"Je vous prie de nous excuser Mr/Mme, nos fichiers ne sont apparemment pas actualis\xE9s je remonte l\u2019information pour que vous ne soyez plus importun\xE9 par handicap international.

Sur ce Mme/Mr je vous remercie pour le moment que vous m\u2019avez accord\xE9, en mon nom et au nom de toute l\u2019\xE9quipe de la fondation, je vous souhaite une excellente journ\xE9e (ou soir\xE9e) et au revoir."`,
    ordre: 7,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o8",
    association_id: "him",
    titre_sequence: "Objection : JE SUIS EN LISTE BLOCTEL OU PACITEL",
    texte_script: `"Si je ne me trompe pas le bloctel ne concerne que les d\xE9marches commerciales,et nous nous sommes une association humanitaire donc avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous lib\xE8re ensuite c\u2019est promis, vous me le permettez Mr/Mme...."`,
    ordre: 8,
    type: "objection",
    parent_sequence_id: "s1"
  },
  {
    id: "o9",
    association_id: "him",
    titre_sequence: "Objection : Pas les moyens (Argumentaire)",
    texte_script: `[VERT CLAIR] "Donc si j\u2019ai bien compris, vous me dites que" (reformulation) [/VERT CLAIR]

"et bien M.MME DUPONT, je suis d\u2019accord avec vous pour dire que cette conjoncture nous impacte tous et particuli\xE8rement  nos retrait\xE9s qui ne sont pas g\xE2t\xE9s par l\u2019\xE9tat, j\u2019entends bien vos difficult\xE9s et dans ce sens, je tiens \xE0 vous rassurer, il ne s\u2019agit pas de vous demander d\u2019aller haut de-l\xE0 de vos disponibilit\xE9s, nous voulons que les personnes qui nous soutiennent gardent les moyens de vivre dignement sans quoi notre action n\u2019aurait pas de sens, c\u2019est pourquoi que tous les dons sont pr\xE9cieux et nous permettent de porter secours aux victimes qui se retrouvent g\xE9n\xE9ralement avec un bras ou une jambe amput\xE9e suite \xE0 l\u2019explosion de ces engins de guerre."

"Nous implantons en priorit\xE9 nos unit\xE9s d'appareillage et de r\xE9\xE9ducation dans les zones o\xF9 les handicaps sont les plus nombreux, l\xE0 o\xF9 aucune structure n'existe avant notre arriv\xE9e, notre action vise non seulement \xE0 'r\xE9parer' leur handicap physique mais aussi \xE0 les accompagner psychologiquement pour qu\u2019ils puissent surmonter leur traumatismes  et ce n\u2019est que tous ensemble qu\u2019on pourra soulager la douleur de toutes ces victimes, leur permettre de remarcher \xE0 nouveau et de retrouver un semblant de vie normal."

"Aussi, je comprends facilement que [GRAS]80\u20AC[/GRAS] ne soit pas une somme anodine, est-ce qu\u2019un soutien de [COULEUR=#16A34A][GRAS]40\u20AC[/GRAS][/COULEUR] serait plus accessible \xE0 votre budget ?"`,
    ordre: 9,
    type: "objection",
    parent_sequence_id: "s2"
  },
  {
    id: "o10",
    association_id: "him",
    titre_sequence: "Objection : Donne \xE0 plusieurs associations (Argumentaire)",
    texte_script: `"Effectivement, vous \xEAtes sollicit\xE9s, vous donnez \xE0\u2026\u2026, vraiment bravo pour ce que vous faites cela ne t\xE9moigne que de votre g\xE9n\xE9rosit\xE9, mon intention n\u2019est pas de vous d\xE9tourner des associations que vous aidez et qui ont aussi besoin de votre soutien. Je suis conscient(e) qu\u2019il y a de nombreuses causes \xE0 soutenir et je sais aussi que nos donateurs sont souvent engag\xE9s aux c\xF4t\xE9s d\u2019autres associations, et ce n\u2019est que tous ensemble qu\u2019on pourra continuer \xE0 assurer nos missions aupr\xE8s des personnes handicap\xE9es."

"L\u2019ann\xE9e pass\xE9e ce sont plus de 2 millions de victimes qui ont pu b\xE9n\xE9ficier directement de notre aide et de vivre \xE0 nouveau debout, mais et comme vous le savez peut-\xEAtre la grande majorit\xE9 des victimes sont des enfants innocents car il y a certaines mines antipersonnel qui ressemblent \xE0 des jouets voire des papillons et les s\xE9quelles sont irr\xE9versibles pour tous les enfants qui survivent \xE0 l\u2019explosion. Morts, blessures et souffrances, tel est le triste h\xE9ritage laiss\xE9 par les mines antipersonnel, c\u2019est pourquoi que l\u2019union du plus grand nombre nous est indispensable afin d\u2019apporter l\u2019aide n\xE9cessaire \xE0 ces populations oubli\xE9es."

"D\u2019ailleurs c\u2019est vrai que [GRAS]80\u20AC[/GRAS] n\u2019est pas une somme anodine, vous savez ce n'\xE9tait qu'un exemple. Est-ce qu\u2019un soutien de [COULEUR=#16A34A][GRAS]40\u20AC[/GRAS][/COULEUR] est plus accessible \xE0 votre budget ?"`,
    ordre: 10,
    type: "objection",
    parent_sequence_id: "s2"
  },
  {
    id: "o11",
    association_id: "him",
    titre_sequence: "Objection : Conjoint (Je souhaite en parler \xE0 Mme/M) (Argumentaire)",
    texte_script: `"C\u2019est Mme/Mr qui s\u2019en occupe ou vous le faites ensemble?"

[VERT CLAIR] Si c\u2019est Mme/Mr qui s\u2019en occupe: [/VERT CLAIR]
"tr\xE8s bien c\u2019est tout \xE0 son honneur et est-ce qu\u2019il vous est d\xE9j\xE0 arriv\xE9 de soutenir une association ind\xE9pendamment de Mme/Mr ?"
[VERT CLAIR] (Traiter l'objection conjoint quelque soit la r\xE9ponse de m\xEAme s'ils le font ensemble). [/VERT CLAIR]

"Je comprends parfaitement que ce genre de d\xE9cisions se prennent \xE0 deux, je vous laisserai le soin de lui en parler, en attendant je ne vous cache pas qu\u2019il est primordial pour nous de quantifier nos moyens, conna\xEEtre nos ressources \xE0 venir pour savoir quand et comment agir."
- \xC0 80\u20AC : traiter une objection directe.
- \xC0 50\u20AC : resensibilisation.

"Ensuite: Aussi ind\xE9pendamment de MME/M, peut-on compter sur un soutien de par exemple (positionnement de replis, [COULEUR=#16A34A][GRAS]50\u20AC[/GRAS][/COULEUR] ou [COULEUR=#16A34A][GRAS]20/25\u20AC[/GRAS][/COULEUR]), par la suite si Mme/Mr d\xE9cide de se joindre \xE0 vous et de donner un peu plus \xE7a ne sera qu\u2019une agr\xE9able surprise pour nous. Aussi peut-on compter sur un soutien de par exemple XX de votre part ?"

[VERT CLAIR] (Si le prospect accepte : passer au verrouillage-blindage) [/VERT CLAIR]

[VERT CLAIR] [GRAS]Apr\xE8s blindage :[/GRAS] [/VERT CLAIR]
"Sommes-nous d'accord pour dire que vous vous engagez personnellement \xE0 nous soutenir ind\xE9pendamment de Mr/Mme ?"`,
    ordre: 11,
    type: "objection",
    parent_sequence_id: "s2"
  },
  {
    id: "o12",
    association_id: "him",
    titre_sequence: "Objection : Pas les moyens (Etape 3)",
    texte_script: `"Je comprends tout \xE0 fait Mr/Mme, notre but n'est absolument pas de vous mettre en difficult\xE9, votre situation est tout \xE0 fait respectable. Dites-moi en toute simplicit\xE9, quel est le montant qui rentrerait le plus confortablement dans votre budget, peut-\xEAtre de [COULEUR=#16A34A][GRAS]20 ou 30 \u20AC[/GRAS][/COULEUR] ? Chaque don est pr\xE9cieux, il n'y a pas de petite contribution."`,
    ordre: 12,
    type: "objection",
    parent_sequence_id: "s3"
  },
  {
    id: "o13",
    association_id: "him",
    titre_sequence: "Objection : Conjoint (Etape 3)",
    texte_script: `"Je comprends parfaitement, Mme/Mr. C'est tout \xE0 votre honneur de prendre cette d\xE9cision ensemble. Cependant, pour nous permettre de pr\xE9voir notre budget d'action et limiter les co\xFBts d'envoi en validant d\xE8s maintenant la promesse de principe, pourrions-nous fixer une base minimale de [COULEUR=#16A34A][GRAS]20 ou 25 \u20AC[/GRAS][/COULEUR] ? Vous restez totalement libre de l'ajuster ou de l'annuler \xE0 la r\xE9ception du courrier apr\xE8s en avoir discut\xE9."`,
    ordre: 13,
    type: "objection",
    parent_sequence_id: "s3"
  },
  {
    id: "o14",
    association_id: "him",
    titre_sequence: "Traitement courrier \xE0 45 euro",
    texte_script: `"Vous souhaitez recevoir notre courrier et cela ne t\xE9moigne que de votre intention de nous soutenir, si je vous pose cette question relative au montant, c\u2019est afin d\u2019avoir un peu de visibilit\xE9 sur nos financements futurs pour pouvoir planifier nos actions, nous avons donc besoin d\u2019avoir une id\xE9e par rapport au type de montant que vous pourrez nous envoyer.

[VERT CLAIR] (Traiter la resensibilisation) [/VERT CLAIR]

sachant que chaque don est essentiel et qu\u2019il n\u2019y a pas de petit dons, dites moi tout simplement quel est le montant qui rentrerait le plus confortablement dans votre budjet, peut \xEAtre\u2026. [COULEUR=#16A34A][GRAS]20 ou 30\u20AC[/GRAS][/COULEUR]"`,
    ordre: 14,
    type: "objection",
    parent_sequence_id: "s2"
  },
  {
    id: "o15",
    association_id: "him",
    titre_sequence: "Resensibilisation 20/25 euros",
    texte_script: `"J\u2019aimerai vous dire une derni\xE8re chose et je vous lib\xE8re si le HANDICAPE INTERNATIONAL m\u2019a demand\xE9 de vous contacter aujourd\u2019hui c\u2019est que la situation est vraiment pr\xE9occupante et ce n\u2019est que tous ensemble, b\xE9n\xE9voles, donateurs, que nous pourrons agir durablement contre les causes de la faim et des in\xE9galit\xE9s. Nous comptons aujourd\u2019hui plus de 700 millions de personnes qui souffrent de la faim \xE0 travers le monde. C\u2019est pourquoi, Le HANDICAPE INTERNATIONAL agit sur le long terme en soutenant des associations locales et des projets durables, comme l\u2019agriculture familiale, qui permettent aux populations de se nourrir par leur propre travail et de devenir autonomes, plut\xF4t que de d\xE9pendre d\u2019une aide d\u2019urgence temporaire. Concr\xE8tement, plus de 500 projets sont men\xE9s dans 72 pays, am\xE9liorant ainsi la vie de plus de 2 millions de personnes, les r\xE9sultats sont donc encourageants mais loin d\u2019\xEAtre suffisants. 

et afin de poursuivre nos actions, votre soutien quel qu\u2019en soit le montant nous est indispensable et pr\xE9cieux et comme on dit ce sont les petits ruisseaux qui forment les grandes rivi\xE8res donc dites-moi tout simplement et sans faire beaucoup d\u2019efforts quel est le montant qui vous parait envisageable\u2026 (marquer un temps d\u2019arr\xEAt de 3 secondes, si le prospect ne se prononce pas ).peut \xEAtre [COULEUR=#16A34A][GRAS]20 ou 25\u20AC[/GRAS][/COULEUR] ?"`,
    ordre: 15,
    type: "objection",
    parent_sequence_id: "s2"
  },
  {
    id: "o16",
    association_id: "him",
    titre_sequence: "Objection : Faire le don sur Internet",
    texte_script: `"Eh bien \xE9cout\xE9 Mr/Mme vous d\xE9sirez faire votre don sur internet cela ne prouve que de votre intention de nous soutenir, mais vous l\u2019avez compris aujourd\u2019hui je vous appel pour une campagne sp\xE9cifique , une campagne qui nous permettra d\u2019agir de mani\xE8re cibl\xE9e, donc si vous acceptez de le faire suite au courrier que je vais vous envoyer votre soutien ira directement \xE0 cette campagne. En plus vous serez not\xE9 a notre niveau que vous nous avez soutenu, et vous n\u2019aurez plus besoin d'\xEAtre rappel\xE9 ult\xE9rieurement, donc Mr/Mme acceptez vous de le faire suite a notre courrier ?"`,
    ordre: 16,
    type: "objection",
    parent_sequence_id: "s2"
  },
  {
    id: "o17",
    association_id: "him",
    titre_sequence: "Objection : IND\xC9CIS Montant",
    texte_script: `"Si je vous pose la question relative au montant, ce n\u2019est en aucun cas pour vous paraitre pressant ou ind\xE9licat, je m\u2019excuse si c\u2019est peut-\xEAtre l\u2019impression que je vous donnes, mais comme toute ONG, nous ne disposons pas de fonds s\xFBrs, donc nous devons nous baser sur un budget pr\xE9visionel, qui nous permet de quantifier nos moyens afin de bien planifier nos actions, donc pour ne pas vous presser, je vous propose de vous baser sur un montant minimum de par exemple [COULEUR=#16A34A][GRAS]15 ou 20 \u20AC[/GRAS][/COULEUR] et par la suite si vous d\xE9cidez de donner ne serait-ce qu\u2019un euro de plus, ca ne sera qu\u2019une excellente surprise pour nous, on fait comme ca ?"`,
    ordre: 17,
    type: "objection",
    parent_sequence_id: "s3"
  },
  {
    id: "o18",
    association_id: "him",
    titre_sequence: "Objection : IND\xC9CIS RETOUR (Blindage)",
    texte_script: `"J\u2019entends une petite h\xE9sitation de votre part \u{1F642} , et je tenais \xE0 vous rassurer, le don se fait uniquement en fonction de vos moyens et vos disponibilit\xE9s, seulement, nous avons besoin d\u2019avoir une visibilit\xE9 pour \xE9tablir ce qu\u2019on appel un budget pr\xE9visionnel, qui nous permet d\u2019organiser nos actions et pr\xE9voir nos d\xE9penses, ainsi sans vouloir vous para\xEEtre pressant ou ind\xE9licat, dites moi tout simplement au plus tard, et sans faire trop d\u2019efforts, \xE0 quel moment pensez-vous pouvoir nous retourner votre pr\xE9cieux don ?"`,
    ordre: 18,
    type: "objection",
    parent_sequence_id: "s3"
  },
  {
    id: "ccfd_s1",
    association_id: "ccfd",
    titre_sequence: "1. S'identifier & Contact (Accroche)",
    texte_script: `[VERT CLAIR] [GRAS]Allo bonjour! ....[/GRAS] [/VERT CLAIR]

[GRAS]Oui[/GRAS]
"Monsieur / Madame...........?, je suis Julie Amon / Nicolas Amon, je vous contacte de la part de l\u2019association CCFD \u2013 Terre Solidaire. (ou Comit\xE9 Catholique contre la Faim et pour le D\xE9veloppement)"
"que vous connaissez peut \xEAtre de nom ou de r\xE9putation ?"

"Et / ou"
"avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous lib\xE8re ensuite c\u2018est promis, vous me le permettez Mr/Mme.....?"`,
    ordre: 1,
    type: "script"
  },
  {
    id: "ccfd_s2",
    association_id: "ccfd",
    titre_sequence: "2. L'argumentaire",
    texte_script: `"Merci Mr/ Mme"

"Il faut savoir que depuis plus de 60 ans, l\u2019association [GRAS]CCFD \u2013 Terre Solidaire[/GRAS], m\xE8ne des projets de solidarit\xE9 internationale, dans plus de 70 pays en difficult\xE9, notamment en mati\xE8re de lutte contre la faim et les in\xE9galit\xE9s., nous permettons \xE0 des familles enti\xE8res de subvenir elles-m\xEAmes \xE0 leurs propres besoins, en p\xE9rennisant nos actions sur le long terme."

"D\u2019ailleurs, j\u2019aimerais vous demander, sans \xEAtre indiscret bien s\xFBr [GRAS]avez vous des causes ou des associations qui vous tiennent \xE0 c\u0153ur et que vous soutenez?[/GRAS]"

"c est tout a votre honneur et pourrais je connaitre une association que vous soutenez peut etre depuis longtemps"

"Et bien bravo pour ce que vous faites, personnellement je pense que toutes les causes sont louables et m\xE9ritent d\u2019\xEAtre d\xE9fendues."

"Aujourd\u2019hui, nous sommes particuli\xE8rement mobilis\xE9s dans plusieurs r\xE9gions du monde o\xF9 des populations ont de plus en plus de difficult\xE9s \xE0 vivre de leurs terres."

"Par exemple, au [GRAS]Br\xE9sil[/GRAS], en Amazonie, nous travaillons avec notre partenaire [GRAS]FASE[/GRAS] \u2013 pour soutenir les communaut\xE9s locales qui prot\xE8gent leurs terres face \xE0 l\u2019exploitation des ressources naturelles."

"Dans d\u2019autres r\xE9gions du Br\xE9sil, nous accompagnons \xE9galement les populations touch\xE9es par l\u2019exploitation mini\xE8re avec l\u2019organisation [GRAS]Justi\xE7a nos Trilhos[/GRAS], afin de d\xE9fendre leurs droits et pr\xE9server leurs moyens de subsistance."

"Et \xE0 [GRAS]Madagascar[/GRAS], gr\xE2ce \xE0 notre partenaire [GRAS]FARM[/GRAS], nous soutenons des femmes rurales qui d\xE9veloppent l\u2019agro\xE9cologie pour nourrir leurs familles et renforcer l\u2019autonomie de leurs communaut\xE9s."

"Ce que je vous invite \xE0 retenir M.MME DUPONT, c\u2019est qu\u2019aujourd\u2019hui encore des milliers de personnes risquent leur vie, sous la menace des multinationales, des centaines de familles sont oblig\xE9es de fuir leur village et c\u2019est tous ensemble que nous pourrons leur permettre de se d\xE9fendre, faire entendre leurs droits \xE0 la terre et surtout leur offrir la dignit\xE9 de se nourrir de leur propre travail."

[ORANGE/JAUNE CLAIR] \u{1F4A1} Donc Moi ce que je vous propose, c\u2019est de nous apporter votre soutien \xE0 hauteur de par exemple [TAILLE=18][GRAS]80 \u20AC[/GRAS][/TAILLE] , avec lequel vous permettez la conservation d\u20191 hectare de for\xEAt tropicale et \xE0 1 famille de locaux de gagner 900 euro/an gr\xE2ce \xE0 la vente de produits forestiers (noix du Br\xE9sil, a\xE7a\xED, majo et autres). [/ORANGE/JAUNE CLAIR]

"Aussi Mr/Mme .... ces populations vuln\xE9rables pourraient elles compter sur un soutien de [COULEUR=#16A34A][GRAS]80 \u20AC[/GRAS][/COULEUR] de votre part, sachant qu\u2019apr\xE8s d\xE9duction fiscale de [GRAS]66%[/GRAS], cela ne vous co\xFBte en r\xE9alit\xE9 que [COULEUR=#16A34A][GRAS]27 \u20AC[/GRAS][/COULEUR] ?"`,
    ordre: 2,
    type: "script"
  },
  {
    id: "ccfd_s3",
    association_id: "ccfd",
    titre_sequence: "3. Verrouillage & Blindage",
    texte_script: `[VERT CLAIR] [GRAS]VERROUILLAGE :[/GRAS]
"Tres bien, donc puis-je noter de votre part comme promesse de don la somme de \u2026\u2026euros au profit de CCFD?" [/VERT CLAIR]

"C\u2019est formidable, je vous explique vous allez recevoir un courrier de la part de notre pr\xE9sident dans lequel bien sur notre appel sera authentifi\xE9e, vous y trouverez un bon de g\xE9n\xE9rosit\xE9 et une enveloppe timbr\xE9e et libell\xE9e a l\u2019adresse de CCFD dans laquelle vous n\u2019aurez qu\u2019a glisser votre ch\xE8que, cela vous convient Mr/Mme.....,?"

"Tr\xE8s bien je vais rapidement confirmer vos coordonn\xE9es pour la bonne r\xE9ception de notre courrier"
- c\u2019est bien M /Mme...... ?
- Votre pr\xE9nom svp .....?
- Vous habitez toujours au (num\xE9ro, le nom de la rue / le code postal et la ville)
- Y a-t-il un compl\xE9ment d\u2019adresse \xE0 rajouter, un nom de r\xE9sidence, num\xE9ro de b\xE2timent d\u2019appartement ?

"Tr\xE8s bien, Mr/Mme sachez qu\u2019aujourd\u2019hui vous avez la possibilit\xE9 de nous aider doublement, premi\xE8rement vous nous aidez a poursuivre nos actions sur le terrain gr\xE2ce a votre g\xE9n\xE9rosit\xE9 et deuxi\xE8mement vous pouvez nous aider a faire des \xE9conomies sur l\u2019envoie d\u2019un courrier en faisant votre don en ligne sur un formulaire pr\xE9-rempli directement sur le site de CCFD. si cela vous convient j\u2019aurais besoin de votre adresse e-mail svp pour vous envoyer le lien."

"Si le prospect accepte prendre son e-mail ou le confirmer, envoyer le lien ( par e-mail ou SMS ) et faire votre blindage : donc Mr/Mme vous allez recevoir ce lien dans quelques instant, vous engagez vous a nous retourner votre soutien de xx euros a la r\xE9ception de cette e-mail?"

"Si le prospect ne d\xE9sire pas le faire par SMS ou e-mail: tr\xE8s bien il n\u2019y a pas de soucis Mr/Mme"

[VERT CLAIR] [GRAS]BLINDAGE :[/GRAS]
"vous allez recevoir notre courrier d\u2019ici quatre a cinq jours voir une semaine
Donc vous engagez-vous \xE0 nous renvoyer votre don de [COULEUR=#16A34A]XX.... euros[/COULEUR]
\xE0 la r\xE9ception de notre courrier ?" [/VERT CLAIR]

[VERT CLAIR] [GRAS]Ind\xE9cis blindage : Je ne sais pas peut \xEAtre ![/GRAS]
"Mr/Mme\u2026.votre intention de nous soutenir ne t\xE9moigne que de votre g\xE9n\xE9rosit\xE9, votre engagement nous confortera dans notre volont\xE9 d\u2019agir et nous permettra de pr\xE9voir nos actions en \xE9tablissant a notre niveau un budget pr\xE9visionnel. Aussi, sans faire trop d\u2019effort, \xE0 quel moment pouvez-vous nous retourner votre soutien ?" [/VERT CLAIR]

[VERT CLAIR] (Si le prospect donne une date) : [/VERT CLAIR]
"Donc si si je comprends bien vous vous engagez \xE0 nous envoyer votre soutien (x jours) apr\xE8s la r\xE9ception de notre courrier ?"`,
    ordre: 3,
    type: "script"
  },
  {
    id: "ccfd_s4",
    association_id: "ccfd",
    titre_sequence: "4. Prise de cong\xE9",
    texte_script: `[GRAS]Prise de cong\xE9[/GRAS]

"He bien Mr/Mme il ne me reste plus qu\u2019a vous dire un grand merci pour votre g\xE9n\xE9rosit\xE9 et aussi pour le temps que vous m\u2019avez accord\xE9 au nom de toute \xE9quipe de CCFD je vous souhaite de passer une excellente journ\xE9e, portez vous bien Mr/Mme et je vous dis au revoir."`,
    ordre: 4,
    type: "script"
  },
  {
    id: "ccfd_o1",
    association_id: "ccfd",
    titre_sequence: "Objection : NON (faux num\xE9ro)",
    texte_script: `"Ah ! D\xE9sol\xE9 apparemment je me suis tromp\xE9, mais vous savez mon appel n'est pas forcement nominatif, je suis Julie Amon / Nicolas Amon et Je vous appelle de la part du CCFD que vous connaissez peut \xEAtre de nom ou de r\xE9putation?"`,
    ordre: 1,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o2",
    association_id: "ccfd",
    titre_sequence: "Objection : Je ne suis pas int\xE9ress\xE9 / pas le temps / occup\xE9",
    texte_script: `"Apparemment vous \xEAtes souvent appel\xE9 au t\xE9l\xE9phone ? effectivement a votre place je r\xE9agirais de la m\xEAme mani\xE8re, moi ce que je peut faire a mon niveau c\u2019est remonter l\u2019information pour que vous ne soyez plus d\xE9rang\xE9 par notre association.

Mais en attendant puisque je vous ai au bout du fil et avec votre permission bien sur, et ce que je peux prendre 2 petites minute de votre temps et je vous libere ensuite c\u2019est promis. Vous me le permettez Mme/ Mr Roz.....?"`,
    ordre: 2,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o3",
    association_id: "ccfd",
    titre_sequence: "Objection : Pas int\xE9ress\xE9 2 eme anti racc",
    texte_script: `"Je vous rassure Mr/Mme je ne souhaite pas vous retenir longtemps au telephone a peine 2 petites minutes et je vous libere ensuite, vous me le permettez?"`,
    ordre: 3,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o4",
    association_id: "ccfd",
    titre_sequence: "Objection : Vous m\u2019appelez pour un don / retraite / pas de moyens",
    texte_script: `"Je vous rassure mon appel n\u2019aurait plus aucun sens s\u2019il se limitait \xE0 un don, le plus important pour nous et de vous informer sur nos action donc avec votre permission bien sur je ne prendrais qu\u2019une petite minute de votre temps et je vous lib\xE8re ensuite, c\u2019est promis. Vous me le permettez Mr /Mme.....?"`,
    ordre: 4,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o5",
    association_id: "ccfd",
    titre_sequence: "Objection : Trop sollicit\xE9 / donne \xE0 d'autres associations",
    texte_script: `"Ah et bien bravo pour ce que vous faites, cela ne t\xE9moigne que de votre g\xE9n\xE9rosit\xE9, je vous rassure le but n\u2019est absolument pas de changer vos habitudes caritatives, je vous explique en 2 petites minutes ce dont il s\u2019agit et je vous lib\xE8re ensuite c\u2019est promis, vous me le permettez Mme/Mr\u2026\u2026.. ;"`,
    ordre: 5,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o6",
    association_id: "ccfd",
    titre_sequence: "Objection : Je ne donne pas d\u2019argent par t\xE9l\xE9phone",
    texte_script: `"je vous rassure, il n\u2019est pas question que vous donniez de l\u2019argent par t\xE9l\xE9phone. Si vous d\xE9sirez soutenir notre association, vous recevrez un courrier de notre part.

En attendant et avec votre permission bien sur je ne prendrais que deux petites minutes de votre part et je vous lib\xE8re ensuite, c\u2019est promis vous me le permettez Mr/Mme......?"`,
    ordre: 6,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o7",
    association_id: "ccfd",
    titre_sequence: "Objection : D'O\xD9 AVEZ VOUS EU MES COORDONN\xC9ES",
    texte_script: `"Tout simplement de l\u2019annuaire t\xE9l\xE9phonique (ou \xE9lectronique)"`,
    ordre: 7,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o8",
    association_id: "ccfd",
    titre_sequence: "Objection : JE SUIS EN LISTE ROUGE",
    texte_script: `"Je vous prie de nous excuser Mr/Mme, nos fichiers ne sont apparemment pas actualis\xE9s je remonte l\u2019information pour que vous ne soyez plus importun\xE9 par notre association.

Sur ce Mme/Mr je vous remercie pour le moment que vous m\u2019avez accord\xE9, en mon nom et au nom de toute l\u2019\xE9quipe, je vous souhaite une excellente journ\xE9e (ou soir\xE9e) et au revoir."`,
    ordre: 8,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o9",
    association_id: "ccfd",
    titre_sequence: "Objection : JE SUIS EN LISTE BLOCTEL OU PACITEL",
    texte_script: `"Si je ne me trompe pas le bloctel ne concerne que les d\xE9marches commerciales,et nous nous sommes une association humanitaire donc avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous lib\xE8re ensuite c\u2019est promis, vous me le permettez Mr/Mme...."`,
    ordre: 9,
    type: "objection",
    parent_sequence_id: "ccfd_s1"
  },
  {
    id: "ccfd_o10",
    association_id: "ccfd",
    titre_sequence: "Objection : Pas les moyens, petite retraite (Argumentaire)",
    texte_script: `"Je sens bien votre int\xE9r\xEAt sinc\xE8re pour ce que nous faisons \xE0 CCFD, et je me doute que c\u2019est avant tout une question de moyens qui vous freine en ce moment.

Donc si j\u2019ai bien compris, vous me dites que [VERT CLAIR](reformulation)[/VERT CLAIR] et bien M.MME DUPONT, je me doute que c\u2019est avant tout une question de moyens qui vous freine en ce moment, j\u2019entends bien vos difficult\xE9s , je tiens \xE0 vous rassurer, nous voulons que les personnes qui nous soutiennent gardent les moyens de vivre dignement sans quoi notre action n\u2019aurait pas de sens, c\u2019est pourquoi que tous les dons sont pr\xE9cieux et nous permettent d\u2019agir, de freiner ces multinationales, ces grandes puissances mondiales qui se croient tout permis, qui menacent et chassent des milliers de familles de leurs villages, pire encore les menaces sont souvent mises \xE0 ex\xE9cution, nous veillons donc \xE0 ce que chacun voie ses droits fondamentaux respect\xE9s : manger \xE0 sa faim, vivre de son travail, habiter dans un environnement sain et choisir le lieu o\xF9 construire sa vie\u2026 , sans vous, rien n\u2019est possible, c\u2019est pourquoi votre participation nous est importante. 

Aussi je comprends, 80 \u20AC \xE7a fait peut \xEAtre beaucoup, je vous rassure ce n\u2019\xE9tait qu\u2019un exemple pr\xE9f\xE9riez-vous nous soutenir \xE0 hauteur de [COULEUR=#16A34A][GRAS]45 \u20AC[/GRAS][/COULEUR], c'est plus accessible \xE0 votre budget ?"`,
    ordre: 10,
    type: "objection",
    parent_sequence_id: "ccfd_s2"
  },
  {
    id: "ccfd_o11",
    association_id: "ccfd",
    titre_sequence: "Objection : Donne \xE0 plusieurs associations (Argumentaire)",
    texte_script: `"Effectivement, vous \xEAtes sollicit\xE9s, vous donnez \xE0\u2026\u2026, vraiment bravo pour ce que vous faites cela ne t\xE9moigne que de votre g\xE9n\xE9rosit\xE9, mon intention n\u2019est pas de vous d\xE9tourner des associations que vous aidez et qui ont aussi besoin de votre soutien. Je suis conscient(e) qu\u2019il y a de nombreuses causes \xE0 soutenir et je sais aussi que nos donateurs sont souvent engag\xE9s aux c\xF4t\xE9s d\u2019autres associations, si je me permets de vous contacter aujourd\u2019hui c\u2019est que les causes de la faim sont multiples et ne cessent d\u2019augmenter, nous parlons de populations en situation de grande souffrance, ces populations qui vivaient auparavant: d\u2019un lopin de terre, quelques c\xE9r\xE9ales, deux ch\xE8vres\u2026 de quoi se nourrir, envoyer leurs enfants \xE0 l\u2019\xE9cole et vivre dans la dignit\xE9 mais les grandes entreprises et multinationales ont d\xE9cid\xE9s autrement et c\u2019est vraiment tous ensemble, donateurs, b\xE9n\xE9voles et militants que nous pouvons veiller \xE0 ce que ces familles puissent se d\xE9fendre, faire entendre leur droit \xE0 la terre face \xE0 ces multinationales destructrices et de vivre ainsi dans la dignit\xE9. 

aussi je comprends, 80 \u20AC \xE7a fait peut \xEAtre beaucoup, je vous rassure ce n\u2019\xE9tait qu\u2019un exemple pr\xE9f\xE9riez-vous nous soutenir \xE0 hauteur de [COULEUR=#16A34A][GRAS]45 \u20AC[/GRAS][/COULEUR], c'est plus accessible \xE0 votre budget ?"`,
    ordre: 11,
    type: "objection",
    parent_sequence_id: "ccfd_s2"
  },
  {
    id: "ccfd_o12",
    association_id: "ccfd",
    titre_sequence: "Objection : Je donnerai plus tard (Argumentaire)",
    texte_script: `"Vous souhaitez donner plus tard et cela ne t\xE9moigne que de l\u2019int\xE9r\xEAt que vous portez \xE0 notre cause aussi de votre g\xE9n\xE9rosit\xE9.

Seulement si nous nous sommes permis de vous contacter, c\u2019est que nous avons besoin de ressources imm\xE9diates car mon appel est motiv\xE9 par l\u2019urgence, notamment \xE0 cause des multinationales qui convoitent les ressources de ces populations et d\xE9truisent tout sur leur passage, ces familles qui occupent ces territoires depuis toujours, ont souvent l\u2019interdiction de chasser, p\xEAcher ou cultiver leurs propres terres. Sous la menace, elles sont oblig\xE9s d\u2019abandonner leur village.

Aussi c\u2019est vous qui nous donnez les moyens d\u2019\xE9tendre nos actions \xE0 d\u2019autres associations locales et continuer de l\u2019avant. C\u2019est vrai que 80\u20AC n\u2019est pas une somme anodine, vous savez ce n'\xE9tait qu'un exemple. pr\xE9f\xE9riez-vous nous soutenir \xE0 hauteur de [COULEUR=#16A34A][GRAS]45 \u20AC[/GRAS][/COULEUR], c\u2019est plus accessible \xE0 votre budget ?"`,
    ordre: 12,
    type: "objection",
    parent_sequence_id: "ccfd_s2"
  },
  {
    id: "ccfd_o13",
    association_id: "ccfd",
    titre_sequence: "Objection : Pas les moyens (Etape 3)",
    texte_script: `"Je comprends tout \xE0 fait Mr/Mme, notre but n'est absolument pas de vous mettre en difficult\xE9, votre situation est tout \xE0 fait respectable. Dites-moi en toute simplicit\xE9, quel est le montant qui rentrerait le plus confortablement dans votre budget, peut-\xEAtre de [COULEUR=#16A34A][GRAS]20 ou 30 \u20AC[/GRAS][/COULEUR] ? Chaque don est pr\xE9cieux, il n'y a pas de petite contribution."`,
    ordre: 13,
    type: "objection",
    parent_sequence_id: "ccfd_s2"
  },
  {
    id: "ccfd_o14",
    association_id: "ccfd",
    titre_sequence: "Objection : Conjoint (Etape 3)",
    texte_script: `"C\u2019est Mme/Mr qui s\u2019en occupe ou vous le faites ensemble?"

[VERT CLAIR]Si c\u2019est Mme/Mr qui s\u2019en occupe:[/VERT CLAIR]
"tr\xE8s bien c\u2019est tout \xE0 son honneur et est-ce qu\u2019il vous est d\xE9j\xE0 arriv\xE9 de soutenir une association ind\xE9pendamment de Mme/Mr ?"

[VERT CLAIR](Traiter l'objection conjoint quelque soit la r\xE9ponse de m\xEAme s'ils le font ensemble).[/VERT CLAIR]

"Je comprendsbiens parfaitement que ce genre de d\xE9cisions se prennent \xE0 deux, je vous laisserai le soin de lui en parler, en attendant je ne vous cache pas qu\u2019il est primordial pour nous de quantifier nos moyens, conna\xEEtre nos ressources \xE0 venir pour savoir quand et comment agir."
- \xC0 80\u20AC : traiter une objection directe. - \xC0 50\u20AC : resensibilisation.

"Ensuite: Aussi ind\xE9pendamment de MME/M, peut-on compter sur un soutien de par exemple (positionnement de replis, [COULEUR=#16A34A][GRAS]50\u20AC[/GRAS][/COULEUR] ou [COULEUR=#16A34A][GRAS]20/25\u20AC[/GRAS][/COULEUR]), par la suite si Mme/Mr d\xE9cide de se joindre \xE0 vous et de donner un peu plus \xE7a ne sera qu\u2019une agr\xE9able surprise pour nous. Aussi peut-on compter sur un soutien de par exemple XX de votre part ?"`,
    ordre: 14,
    type: "objection",
    parent_sequence_id: "ccfd_s3"
  },
  {
    id: "ccfd_o15",
    association_id: "ccfd",
    titre_sequence: "Traitement courrier \xE0 45 euro",
    texte_script: `"Vous souhaitez recevoir notre courrier et cela ne t\xE9moigne que de votre intention de nous soutenir, si je vous pose cette question relative au montant, c\u2019est afin d\u2019avoir un peu de visibilit\xE9 sur nos financements futurs pour pouvoir planifier nos actions, nous avons donc besoin d\u2019avoir une id\xE9e par rapport au type de montant que vous pourrez nous envoyer.

[VERT CLAIR] (Traiter la resensibilisation) [/VERT CLAIR]

sachant que chaque don est essentiel et qu\u2019il n\u2019y a pas de petit dons, dites moi tout simplement quel est le montant qui rentrerait le plus confortablement dans votre budjet, peut \xEAtre\u2026. [COULEUR=#16A34A][GRAS]20 ou 30\u20AC[/GRAS][/COULEUR]"`,
    ordre: 15,
    type: "objection",
    parent_sequence_id: "ccfd_s2"
  },
  {
    id: "ccfd_o16",
    association_id: "ccfd",
    titre_sequence: "Resensibilisation 20/25 euros",
    texte_script: `"J\u2019aimerai vous dire une derni\xE8re chose et je vous lib\xE8re si le CCFD m\u2019a demand\xE9 de vous contacter aujourd\u2019hui c\u2019est que la situation est vraiment pr\xE9occupante et ce n\u2019est que tous ensemble, b\xE9n\xE9voles, donateurs, que nous pourrons agir durablement contre les causes de la faim et des in\xE9galit\xE9s. Nous comptons aujourd\u2019hui plus de 700 millions de personnes qui souffrent de la faim \xE0 travers le monde. C\u2019est pourquoi, Le CCFD-Terre Solidaire agit sur le long terme en soutenant des associations locales et des projets durables, comme l\u2019agriculture familiale, qui permettent aux populations de se nourrir par leur propre travail et de devenir autonomes, plut\xF4t que de d\xE9pendre d\u2019une aide d\u2019urgence temporaire. Concr\xE8tement, plus de 500 projets sont men\xE9s dans 72 pays, am\xE9liorant ainsi la vie de plus de 2 millions de personnes, les r\xE9sultats sont donc encourageants mais loin d\u2019\xEAtre suffisants. 

et afin de poursuivre nos actions, votre soutien quel qu\u2019en soit le montant nous est indispensable et pr\xE9cieux et comme on dit ce sont les petits ruisseaux qui forment les grandes rivi\xE8res donc dites-moi tout simplement et sans faire beaucoup d\u2019efforts quel est le montant qui vous parait envisageable\u2026 (marquer un temps d\u2019arr\xEAt de 3 secondes, si le prospect ne se prononce pas ).peut \xEAtre [COULEUR=#16A34A][GRAS]20 ou 25\u20AC[/GRAS][/COULEUR] ?"`,
    ordre: 16,
    type: "objection",
    parent_sequence_id: "ccfd_s2"
  },
  {
    id: "ccfd_o17",
    association_id: "ccfd",
    titre_sequence: "Objection : Faire le don sur Internet",
    texte_script: `"Eh bien \xE9cout\xE9 Mr/Mme vous d\xE9sirez faire votre don sur internet cela ne prouve que de votre intention de nous soutenir, mais vous l\u2019avez compris aujourd\u2019hui je vous appel pour une campagne sp\xE9cifique , une campagne qui nous permettra d\u2019agir de mani\xE8re cibl\xE9e, donc si vous acceptez de le faire suite au courrier que je vais vous envoyer votre soutien ira directement \xE0 cette campagne. En plus vous serez not\xE9 a notre niveau que vous nous avez soutenu, et vous n\u2019aurez plus besoin d'\xEAtre rappel\xE9 ult\xE9rieurement, donc Mr/Mme acceptez vous de le faire suite a notre courrier ?"`,
    ordre: 17,
    type: "objection",
    parent_sequence_id: "ccfd_s3"
  },
  {
    id: "ccfd_o18",
    association_id: "ccfd",
    titre_sequence: "Objection : IND\xC9CIS Montant",
    texte_script: `"Si je vous pose la question relative au montant, ce n\u2019est en aucun cas pour vous paraitre pressant ou ind\xE9licat, je m\u2019excuse si c\u2019est peut-\xEAtre l\u2019impression que je vous donnes, mais comme toute ONG, nous ne disposons pas de fonds s\xFBrs, donc nous devons nous baser sur un budget pr\xE9visionel, qui nous permet de quantifier nos moyens afin de bien planifier nos actions, donc pour ne pas vous presser, je vous propose de vous baser sur un montant minimum de par exemple [COULEUR=#16A34A][GRAS]15 ou 20 \u20AC[/GRAS][/COULEUR] et par la suite si vous d\xE9cidez de donner ne serait-ce qu\u2019un euro de plus, ca ne sera qu\u2019une excellente surprise pour nous, on fait comme ca ?"`,
    ordre: 18,
    type: "objection",
    parent_sequence_id: "ccfd_s3"
  },
  {
    id: "ccfd_o19",
    association_id: "ccfd",
    titre_sequence: "Objection : IND\xC9CIS RETOUR (Blindage)",
    texte_script: `"J\u2019entends une petite h\xE9sitation de votre part \u{1F642} , et je tenais \xE0 vous rassurer, le don se fait uniquement en fonction de vos moyens et vos disponibilit\xE9s, seulement, nous avons besoin d\u2019avoir une visibilit\xE9 pour \xE9tablir ce qu\u2019on appel un budget pr\xE9visionnel, qui nous permet d\u2019organiser nos actions et pr\xE9voir nos d\xE9penses, ainsi sans vouloir vous para\xEEtre pressant ou ind\xE9licat, dites moi tout simplement au plus tard, et sans faire trop d\u2019efforts, \xE0 quel moment pensez-vous pouvoir nous retourner votre pr\xE9cieux don ?"`,
    ordre: 19,
    type: "objection",
    parent_sequence_id: "ccfd_s3"
  }
];

// src/db/local.ts
var DB_PATH = import_path2.default.join(process.cwd(), "db.json");
function defaultData() {
  return {
    associations: structuredClone(DEFAULT_ASSOCIATIONS),
    sequences: structuredClone(DEFAULT_SEQUENCES),
    notes: [],
    consignes: []
  };
}
var LocalStore = class {
  constructor() {
    this.name = "local";
    this.data = defaultData();
  }
  async init() {
    this.load();
  }
  load() {
    try {
      if (!import_fs2.default.existsSync(DB_PATH)) {
        this.save();
        return;
      }
      const loaded = JSON.parse(import_fs2.default.readFileSync(DB_PATH, "utf-8"));
      this.data = {
        associations: loaded.associations || structuredClone(DEFAULT_ASSOCIATIONS),
        sequences: loaded.sequences || structuredClone(DEFAULT_SEQUENCES),
        notes: loaded.notes || [],
        consignes: loaded.consignes || []
      };
      console.log("\u{1F4BE} [LOCAL] Base de secours charg\xE9e depuis db.json");
    } catch (err) {
      console.error("\u{1F4BE} [LOCAL] Erreur de lecture de db.json, utilisation des donn\xE9es par d\xE9faut :", err);
    }
  }
  save() {
    try {
      import_fs2.default.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("\u{1F4BE} [LOCAL] Erreur d\u2019\xE9criture de db.json :", err);
    }
  }
  upsert(list, item) {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx !== -1) list[idx] = item;
    else list.push(item);
    this.save();
  }
  snapshot() {
    return structuredClone(this.data);
  }
  async listAssociations() {
    return [...this.data.associations].sort((a, b) => a.nom.localeCompare(b.nom));
  }
  async upsertAssociation(a) {
    this.upsert(this.data.associations, a);
  }
  async deleteAssociation(id) {
    this.data.associations = this.data.associations.filter((a) => a.id !== id);
    this.data.sequences = this.data.sequences.filter((s) => s.association_id !== id);
    this.data.notes = this.data.notes.filter((n) => n.association_id !== id);
    this.data.consignes = this.data.consignes.filter((c) => c.association_id !== id);
    this.save();
  }
  async listSequences(associationId) {
    return this.data.sequences.filter((s) => !associationId || s.association_id === associationId).sort((a, b) => a.ordre - b.ordre);
  }
  async upsertSequence(s) {
    this.upsert(this.data.sequences, s);
  }
  async deleteSequence(id) {
    this.data.sequences = this.data.sequences.filter((s) => s.id !== id);
    this.save();
  }
  async getNote(id) {
    return this.data.notes.find((n) => n.id === id) || null;
  }
  async upsertNote(n) {
    this.upsert(this.data.notes, n);
  }
  async listConsignes(associationId) {
    return this.data.consignes.filter((c) => !associationId || c.association_id === associationId);
  }
  async upsertConsigne(c) {
    this.upsert(this.data.consignes, c);
  }
  async deleteConsigne(id) {
    this.data.consignes = this.data.consignes.filter((c) => c.id !== id);
    this.save();
  }
  async replaceAll(data) {
    this.data = structuredClone(data);
    this.save();
  }
  async counts() {
    return {
      associations: this.data.associations.length,
      sequences: this.data.sequences.length,
      notes: this.data.notes.length,
      consignes: this.data.consignes.length
    };
  }
};

// src/db/index.ts
var RETRY_MS = 3e4;
var OP_TIMEOUT_MS = Number(process.env.DB_OP_TIMEOUT_MS) || 8e3;
function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: d\xE9lai d\xE9pass\xE9 (${OP_TIMEOUT_MS} ms)`)), OP_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
var LABELS = {
  postgres: "PostgreSQL (base principale)",
  firestore: "Cloud Firestore (base de secours)",
  local: "Fichiers locaux (db.json) - Mode Secours"
};
var Database = class {
  constructor() {
    this.remotes = [];
    this.local = new LocalStore();
    this.firebaseInfo = { configured: false };
    this.lastServedBy = "local";
  }
  async init() {
    await this.local.init();
    if (isPostgresConfigured()) {
      this.remotes.push({ store: new PostgresStore(), ready: false, downUntil: 0 });
    } else {
      console.warn("\u{1F418} [POSTGRES] DATABASE_URL ou SQL_HOST/SQL_DB_NAME non d\xE9finis \u2014 PostgreSQL d\xE9sactiv\xE9.");
    }
    try {
      const { store, info } = await createFirestoreStore();
      this.firebaseInfo = info;
      if (store) this.remotes.push({ store, ready: false, downUntil: 0 });
      else console.warn(`\u{1F4E1} [FIREBASE] Firebase d\xE9sactiv\xE9 : ${info.reason}`);
    } catch (err) {
      this.firebaseInfo = { configured: false, reason: err.message };
      console.error("\u{1F4E1} [FIREBASE] Initialisation impossible, Firebase d\xE9sactiv\xE9 :", err.message);
    }
    for (const backend of this.remotes) {
      await this.ensureReady(backend);
    }
    const active = this.remotes.find((b) => b.ready);
    this.lastServedBy = active ? active.store.name : "local";
    console.log(`\u{1F5C4}\uFE0F  [DB] Stockage actif : ${LABELS[this.lastServedBy]}`);
  }
  // Connects (creating the schema if needed) and seeds an empty backend from db.json.
  async ensureReady(backend) {
    if (backend.ready) return true;
    const name = backend.store.name;
    try {
      await withTimeout(backend.store.init(), name);
      const counts = await withTimeout(backend.store.counts(), name);
      if (counts.associations === 0 && counts.sequences === 0) {
        console.log(`\u{1F5C4}\uFE0F  [DB] ${name} est vide \u2014 initialisation avec les donn\xE9es de db.json...`);
        await withTimeout(backend.store.replaceAll(this.local.snapshot()), name);
      }
      backend.ready = true;
      backend.downUntil = 0;
      backend.lastError = void 0;
      console.log(`\u2705 [DB] Connexion ${name} \xE9tablie.`);
      return true;
    } catch (err) {
      this.markDown(backend, err);
      return false;
    }
  }
  markDown(backend, err) {
    const message = err instanceof Error ? err.message : String(err);
    backend.ready = false;
    backend.downUntil = Date.now() + RETRY_MS;
    backend.lastError = message;
    console.error(`\u26A0\uFE0F  [DB] ${backend.store.name} indisponible (nouvel essai dans ${RETRY_MS / 1e3}s) : ${message}`);
  }
  async available() {
    const result = [];
    for (const backend of this.remotes) {
      if (backend.downUntil > Date.now()) continue;
      if (await this.ensureReady(backend)) result.push(backend);
    }
    return result;
  }
  async read(op) {
    for (const backend of await this.available()) {
      try {
        const result = await withTimeout(op(backend.store), backend.store.name);
        this.lastServedBy = backend.store.name;
        return result;
      } catch (err) {
        this.markDown(backend, err);
      }
    }
    this.lastServedBy = "local";
    return op(this.local);
  }
  async write(op) {
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
  listAssociations() {
    return this.read((s) => s.listAssociations());
  }
  upsertAssociation(a) {
    return this.write((s) => s.upsertAssociation(a));
  }
  deleteAssociation(id) {
    return this.write((s) => s.deleteAssociation(id));
  }
  listSequences(associationId) {
    return this.read((s) => s.listSequences(associationId));
  }
  upsertSequence(seq) {
    return this.write((s) => s.upsertSequence(seq));
  }
  deleteSequence(id) {
    return this.write((s) => s.deleteSequence(id));
  }
  getNote(id) {
    return this.read((s) => s.getNote(id));
  }
  upsertNote(note) {
    return this.write((s) => s.upsertNote(note));
  }
  listConsignes(associationId) {
    return this.read((s) => s.listConsignes(associationId));
  }
  upsertConsigne(c) {
    return this.write((s) => s.upsertConsigne(c));
  }
  deleteConsigne(id) {
    return this.write((s) => s.deleteConsigne(id));
  }
  // Resets every reachable backend (not just the first one) to the default dataset.
  async resetToDefaults() {
    const data = defaultData();
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
    const backendStatus = async (name) => {
      const backend = this.remotes.find((b) => b.store.name === name);
      if (!backend) return { configured: false, connected: false, counts: null };
      let counts = null;
      if (await this.ensureReady(backend)) {
        try {
          counts = await withTimeout(backend.store.counts(), name);
        } catch (err) {
          this.markDown(backend, err);
        }
      }
      return { configured: true, connected: counts !== null, error: backend.lastError, counts };
    };
    const postgres = await backendStatus("postgres");
    const firestore = await backendStatus("firestore");
    const activeBackend = postgres.connected ? "postgres" : firestore.connected ? "firestore" : "local";
    return {
      activeBackend,
      activeStorage: LABELS[activeBackend],
      lastServedBy: this.lastServedBy,
      postgres,
      firestore: { ...firestore, projectId: this.firebaseInfo.projectId, databaseId: this.firebaseInfo.databaseId, reason: this.firebaseInfo.reason },
      local: { counts: await this.local.counts() },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
var db = new Database();

// server.ts
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
app.use(import_express.default.json());
process.on("unhandledRejection", (reason) => {
  console.error("\u26A0\uFE0F  [SERVER] Promesse rejet\xE9e non g\xE9r\xE9e :", reason);
});
app.post("/script/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Identifiant et mot de passe requis." });
  }
  if (username === "Admin" && password === "Synergy@2026") {
    return res.json({ success: true, role: "admin", username: "Admin" });
  }
  const agentMatch = username.match(/^agent([0-5][0-9]|60)$/);
  const agentNum = agentMatch ? parseInt(agentMatch[1], 10) : null;
  if (agentNum !== null && agentNum >= 1 && agentNum <= 60 && password === "123456") {
    return res.json({ success: true, role: "agent", username });
  }
  return res.status(401).json({ success: false, message: "Identifiants ou mot de passe incorrects." });
});
app.get("/script/api/db-sync-status", async (req, res) => {
  try {
    res.json(await db.status());
  } catch (err) {
    console.error("Failed to query db-sync-status:", err);
    res.status(500).json({ error: "Erreur lors de la v\xE9rification de la synchronisation : " + err.message });
  }
});
app.get("/script/api/associations", async (req, res) => {
  try {
    res.json(await db.listAssociations());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to access associations" });
  }
});
app.post("/script/api/associations", async (req, res) => {
  const { nom, logo_url } = req.body;
  if (!nom) {
    return res.status(400).json({ error: "Le nom de l'association est requis." });
  }
  const newAssoc = {
    id: String(Date.now()),
    nom,
    logo_url: logo_url || "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=150&auto=format&fit=crop&q=60",
    date_creation: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  try {
    await db.upsertAssociation(newAssoc);
    res.status(201).json(newAssoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create association" });
  }
});
app.put("/script/api/associations/:id", async (req, res) => {
  const { id } = req.params;
  const { nom, logo_url } = req.body;
  try {
    const existing = (await db.listAssociations()).find((a) => a.id === String(id));
    if (!existing) {
      return res.status(404).json({ error: "Association introuvable." });
    }
    const updated = {
      ...existing,
      nom: nom ? String(nom) : existing.nom,
      logo_url: logo_url ? String(logo_url) : existing.logo_url
    };
    await db.upsertAssociation(updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update association" });
  }
});
app.delete("/script/api/associations/:id", async (req, res) => {
  try {
    await db.deleteAssociation(String(req.params.id));
    res.json({ success: true, message: "Association supprim\xE9e avec succ\xE8s." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete association" });
  }
});
app.get("/script/api/sequences", async (req, res) => {
  const { association_id } = req.query;
  try {
    const result = await db.listSequences(association_id ? String(association_id) : void 0);
    result.sort((a, b) => a.ordre - b.ordre);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to access sequences" });
  }
});
app.post("/script/api/sequences", async (req, res) => {
  const { id, association_id, titre_sequence, texte_script, ordre, type, parent_sequence_id } = req.body;
  if (!association_id || !titre_sequence || !texte_script || !type) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }
  try {
    const targetId = id ? String(id) : String(Date.now());
    const incomingOrder = Number(ordre);
    let currentOrder = ordre === void 0 || ordre === null || Number.isNaN(incomingOrder) ? null : incomingOrder;
    if (currentOrder === null) {
      const sequences = await db.listSequences(String(association_id));
      currentOrder = sequences.length + 1;
    }
    const seqObj = {
      id: targetId,
      association_id: String(association_id),
      titre_sequence,
      texte_script,
      ordre: currentOrder,
      type: type === "objection" ? "objection" : "script"
    };
    if (seqObj.type === "objection" && parent_sequence_id) {
      seqObj.parent_sequence_id = String(parent_sequence_id);
    }
    await db.upsertSequence(seqObj);
    res.json(seqObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save sequence" });
  }
});
app.delete("/script/api/sequences/:id", async (req, res) => {
  try {
    await db.deleteSequence(String(req.params.id));
    res.json({ success: true, message: "S\xE9quence supprim\xE9e." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete sequence" });
  }
});
app.get("/script/api/notes/:agent_username/:association_id", async (req, res) => {
  const { agent_username, association_id } = req.params;
  try {
    const note = await db.getNote(`${agent_username}_${association_id}`);
    res.json(note || { note_texte: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to access agent notes" });
  }
});
app.post("/script/api/notes", async (req, res) => {
  const { agent_username, association_id, note_texte } = req.body;
  if (!agent_username || !association_id) {
    return res.status(400).json({ error: "Param\xE8tres manquants." });
  }
  const noteData = {
    id: `${agent_username}_${association_id}`,
    agent_username,
    association_id,
    note_texte: note_texte || "",
    date_mise_a_jour: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await db.upsertNote(noteData);
    res.json(noteData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to persist note" });
  }
});
app.get("/script/api/consignes", async (req, res) => {
  const { association_id } = req.query;
  try {
    res.json(await db.listConsignes(association_id ? String(association_id) : void 0));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to access consignes" });
  }
});
app.post("/script/api/consignes", async (req, res) => {
  const { id, association_id, sequence_id, texte } = req.body;
  if (!association_id || !sequence_id || !texte) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }
  const consigneObj = {
    id: id ? String(id) : String(Date.now()),
    association_id: String(association_id),
    sequence_id: String(sequence_id),
    texte: String(texte),
    date_creation: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await db.upsertConsigne(consigneObj);
    res.json(consigneObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save consigne" });
  }
});
app.delete("/script/api/consignes/:id", async (req, res) => {
  try {
    await db.deleteConsigne(String(req.params.id));
    res.json({ success: true, message: "Consigne supprim\xE9e." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete consigne" });
  }
});
app.post("/script/api/reset-database", async (req, res) => {
  try {
    await db.resetToDefaults();
    res.json({ success: true, message: "La base de donn\xE9es a \xE9t\xE9 r\xE9initialis\xE9e avec succ\xE8s aux scripts HIM d'origine !" });
  } catch (err) {
    console.error("Failed to reset database:", err);
    res.status(500).json({ error: "Erreur lors de la r\xE9initialisation de la base de donn\xE9es: " + err.message });
  }
});
app.post("/script/api/upload-document", async (req, res) => {
  const { association_id, filename, file_type } = req.body;
  if (!association_id || !filename || !file_type) {
    return res.status(400).json({ error: "Param\xE8tres de t\xE9l\xE9versement manquants." });
  }
  const generatedId = "gen_" + Date.now();
  let generatedTitle = `S\xE9quence import\xE9e : ${filename.replace(/\.[^/.]+$/, "")}`;
  let generatedText = "";
  if (file_type === "script") {
    generatedText = `[VERT CLAIR] "S\xE9quence principale g\xE9n\xE9r\xE9e \xE0 partir du document import\xE9 (${filename})" [/VERT CLAIR]

"Bonjour ! Nous vous contactons \xE0 la suite de vos soutiens ant\xE9rieurs pour notre nouvelle action nationale."

[ORANGE/JAUNE CLAIR] \u{1F4A1} GRILLE DE DONS SUGG\xC9R\xC9E :
- 30 \u20AC pour financer les actions de solidarit\xE9.
- 60 \u20AC pour soutenir l'\xE9quipement technique mobile.
- 120 \u20AC pour former les b\xE9n\xE9voles. [/ORANGE/JAUNE CLAIR]

"Est-ce que cela r\xE9sonne avec votre engagement ?"`;
  } else {
    generatedTitle = `Objection trait\xE9e : ${filename.replace(/\.[^/.]+$/, "")}`;
    generatedText = `[ORANGE/JAUNE CLAIR] "R\xE9futation d'objection issue du document (${filename})" [/ORANGE/JAUNE CLAIR]

"Je comprends parfaitement vos interrogations au sujet du fonctionnement de cette campagne. Cependant, sachez que l'association s'engage \xE0 allouer plus de 80% des ressources directement aux projets sur le terrain..."`;
  }
  try {
    const sequences = await db.listSequences(String(association_id));
    const newSeq = {
      id: generatedId,
      association_id: String(association_id),
      titre_sequence: generatedTitle,
      texte_script: generatedText,
      ordre: sequences.length + 1,
      type: file_type === "objection" ? "objection" : "script"
    };
    await db.upsertSequence(newSeq);
    res.json({
      success: true,
      message: "Le document a \xE9t\xE9 analys\xE9 et converti en bloc de script avec succ\xE8s !",
      sequence: newSeq
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import document" });
  }
});
async function startServer() {
  await db.init();
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("\u274C [SERVER] \xC9chec du d\xE9marrage :", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
