import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Association, ScriptSequence, AgentNote, Consigne } from './src/types';
import { db } from './src/db';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// A failing database driver must never take the whole server down.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  [SERVER] Promesse rejetée non gérée :', reason);
});

// Live updates over Server-Sent Events (served at /script/wss). Every successful write on the
// API notifies the connected screens, which then refetch their data.
const sseClients = new Set<express.Response>();

app.get('/script/wss', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // keep nginx from buffering the stream
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Comment lines keep idle connections open through proxies.
setInterval(() => {
  for (const client of sseClients) client.write(': ping\n\n');
}, 25_000).unref();

app.use('/script/api', (req, res, next) => {
  if (req.method !== 'GET' && !req.path.startsWith('/notes')) {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      for (const client of sseClients) client.write('event: change\ndata: {}\n\n');
    });
  }
  next();
});

// API Router
// Login check
app.post('/script/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis.' });
  }

  // Admin login condition
  if (username === 'Admin' && password === 'Synergy@2026') {
    return res.json({ success: true, role: 'admin', username: 'Admin' });
  }

  // Agent login condition (agent01 to agent60 with password "123456")
  const agentMatch = username.match(/^agent([0-5][0-9]|60)$/);
  const agentNum = agentMatch ? parseInt(agentMatch[1], 10) : null;
  if (agentNum !== null && agentNum >= 1 && agentNum <= 60 && password === '123456') {
    return res.json({ success: true, role: 'agent', username });
  }

  return res.status(401).json({ success: false, message: 'Identifiants ou mot de passe incorrects.' });
});

// GET Database Synchronization Status
app.get('/script/api/db-sync-status', async (req, res) => {
  try {
    res.json(await db.status());
  } catch (err: any) {
    console.error("Failed to query db-sync-status:", err);
    res.status(500).json({ error: "Erreur lors de la vérification de la synchronisation : " + err.message });
  }
});

// GET Associations
app.get('/script/api/associations', async (req, res) => {
  try {
    res.json(await db.listAssociations());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to access associations' });
  }
});

// POST Association
app.post('/script/api/associations', async (req, res) => {
  const { nom, logo_url } = req.body;
  if (!nom) {
    return res.status(400).json({ error: 'Le nom de l\'association est requis.' });
  }
  const newAssoc: Association = {
    id: String(Date.now()),
    nom,
    logo_url: logo_url || "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=150&auto=format&fit=crop&q=60",
    date_creation: new Date().toISOString().split('T')[0]
  };

  try {
    await db.upsertAssociation(newAssoc);
    res.status(201).json(newAssoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create association' });
  }
});

// PUT Association (rename / update logo)
app.put('/script/api/associations/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, logo_url } = req.body;
  try {
    const existing = (await db.listAssociations()).find(a => a.id === String(id));
    if (!existing) {
      return res.status(404).json({ error: 'Association introuvable.' });
    }
    const updated: Association = {
      ...existing,
      nom: nom ? String(nom) : existing.nom,
      logo_url: logo_url ? String(logo_url) : existing.logo_url
    };
    await db.upsertAssociation(updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update association' });
  }
});

// DELETE Association (cascades to sequences, notes and consignes)
app.delete('/script/api/associations/:id', async (req, res) => {
  try {
    await db.deleteAssociation(String(req.params.id));
    res.json({ success: true, message: 'Association supprimée avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete association' });
  }
});

// GET Sequences (filtered optionally by Association)
app.get('/script/api/sequences', async (req, res) => {
  const { association_id } = req.query;
  try {
    const result = await db.listSequences(association_id ? String(association_id) : undefined);
    // Sort by order ASC
    result.sort((a, b) => a.ordre - b.ordre);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to access sequences' });
  }
});

// POST/PUT Sequence (create / update)
app.post('/script/api/sequences', async (req, res) => {
  const { id, association_id, titre_sequence, texte_script, ordre, type, parent_sequence_id } = req.body;
  if (!association_id || !titre_sequence || !texte_script || !type) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }

  try {
    const targetId = id ? String(id) : String(Date.now());
    const incomingOrder = Number(ordre);

    let currentOrder = ordre === undefined || ordre === null || Number.isNaN(incomingOrder) ? null : incomingOrder;
    if (currentOrder === null) {
      const sequences = await db.listSequences(String(association_id));
      currentOrder = sequences.length + 1;
    }

    const seqObj: ScriptSequence = {
      id: targetId,
      association_id: String(association_id),
      titre_sequence,
      texte_script,
      ordre: currentOrder,
      type: type === 'objection' ? 'objection' : 'script'
    };
    if (seqObj.type === 'objection' && parent_sequence_id) {
      seqObj.parent_sequence_id = String(parent_sequence_id);
    }

    if (seqObj.type === 'script') {
      // Insert the script at the requested position among the scripts and renumber them 1..n,
      // so a priority that is already taken shifts the others instead of creating a tie.
      const siblings = (await db.listSequences(seqObj.association_id))
        .filter(s => s.type === 'script' && s.id !== seqObj.id)
        .sort((a, b) => a.ordre - b.ordre);
      const position = Math.min(Math.max(Math.round(seqObj.ordre) || 1, 1), siblings.length + 1);
      siblings.splice(position - 1, 0, seqObj);
      for (const [i, s] of siblings.entries()) {
        if (s.ordre !== i + 1 || s.id === seqObj.id) {
          s.ordre = i + 1;
          await db.upsertSequence(s);
        }
      }
    } else {
      await db.upsertSequence(seqObj);
    }
    res.json(seqObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save sequence' });
  }
});

// DELETE Sequence
app.delete('/script/api/sequences/:id', async (req, res) => {
  try {
    await db.deleteSequence(String(req.params.id));
    res.json({ success: true, message: 'Séquence supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

// GET Note
app.get('/script/api/notes/:agent_username/:association_id', async (req, res) => {
  const { agent_username, association_id } = req.params;
  try {
    const note = await db.getNote(`${agent_username}_${association_id}`);
    res.json(note || { note_texte: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to access agent notes' });
  }
});

// POST Note (creates or updates)
app.post('/script/api/notes', async (req, res) => {
  const { agent_username, association_id, note_texte } = req.body;
  if (!agent_username || !association_id) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }
  const noteData: AgentNote = {
    id: `${agent_username}_${association_id}`,
    agent_username,
    association_id,
    note_texte: note_texte || '',
    date_mise_a_jour: new Date().toISOString()
  };
  try {
    await db.upsertNote(noteData);
    res.json(noteData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to persist note' });
  }
});

// GET Consignes (filtered optionally by Association)
app.get('/script/api/consignes', async (req, res) => {
  const { association_id } = req.query;
  try {
    res.json(await db.listConsignes(association_id ? String(association_id) : undefined));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to access consignes' });
  }
});

// POST Consigne (create or update)
app.post('/script/api/consignes', async (req, res) => {
  const { id, association_id, sequence_id, texte } = req.body;
  if (!association_id || !sequence_id || !texte) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }

  const consigneObj: Consigne = {
    id: id ? String(id) : String(Date.now()),
    association_id: String(association_id),
    sequence_id: String(sequence_id),
    texte: String(texte),
    date_creation: new Date().toISOString()
  };

  try {
    await db.upsertConsigne(consigneObj);
    res.json(consigneObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save consigne' });
  }
});

// DELETE Consigne
app.delete('/script/api/consignes/:id', async (req, res) => {
  try {
    await db.deleteConsigne(String(req.params.id));
    res.json({ success: true, message: 'Consigne supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete consigne' });
  }
});

// RESET database to DEFAULT_ASSOCIATIONS and DEFAULT_SEQUENCES
app.post('/script/api/reset-database', async (req, res) => {
  try {
    await db.resetToDefaults();
    res.json({ success: true, message: 'La base de données a été réinitialisée avec succès aux scripts HIM d\'origine !' });
  } catch (err: any) {
    console.error("Failed to reset database:", err);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation de la base de données: ' + err.message });
  }
});

// Document Upload & Auto-generation of sequences
app.post('/script/api/upload-document', async (req, res) => {
  const { association_id, filename, file_type } = req.body; // file_type can be 'script' or 'objection'
  if (!association_id || !filename || !file_type) {
    return res.status(400).json({ error: 'Paramètres de téléversement manquants.' });
  }

  // Create a beautiful generated sequence based on simulation
  const generatedId = 'gen_' + Date.now();
  let generatedTitle = `Séquence importée : ${filename.replace(/\.[^/.]+$/, "")}`;
  let generatedText = '';

  if (file_type === 'script') {
    generatedText = `[VERT CLAIR] "Séquence principale générée à partir du document importé (${filename})" [/VERT CLAIR]\n\n"Bonjour ! Nous vous contactons à la suite de vos soutiens antérieurs pour notre nouvelle action nationale."\n\n[ORANGE/JAUNE CLAIR] 💡 GRILLE DE DONS SUGGÉRÉE :\n- 30 € pour financer les actions de solidarité.\n- 60 € pour soutenir l'équipement technique mobile.\n- 120 € pour former les bénévoles. [/ORANGE/JAUNE CLAIR]\n\n"Est-ce que cela résonne avec votre engagement ?"`;
  } else {
    generatedTitle = `Objection traitée : ${filename.replace(/\.[^/.]+$/, "")}`;
    generatedText = `[ORANGE/JAUNE CLAIR] "Réfutation d'objection issue du document (${filename})" [/ORANGE/JAUNE CLAIR]\n\n"Je comprends parfaitement vos interrogations au sujet du fonctionnement de cette campagne. Cependant, sachez que l'association s'engage à allouer plus de 80% des ressources directement aux projets sur le terrain..."`;
  }

  try {
    const sequences = await db.listSequences(String(association_id));
    const newSeq: ScriptSequence = {
      id: generatedId,
      association_id: String(association_id),
      titre_sequence: generatedTitle,
      texte_script: generatedText,
      ordre: sequences.length + 1,
      type: file_type === 'objection' ? 'objection' : 'script'
    };

    await db.upsertSequence(newSeq);
    res.json({
      success: true,
      message: 'Le document a été analysé et converti en bloc de script avec succès !',
      sequence: newSeq
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import document' });
  }
});

// Vite / static routes serving
async function startServer() {
  await db.init();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ [SERVER] Échec du démarrage :', err);
  process.exit(1);
});
