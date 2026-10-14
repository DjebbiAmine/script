import React, { useState } from 'react';
import { Copy, Check, Database, Star } from 'lucide-react';
import { SCHEMA_SQL } from '../db/schema';

const SQL_SCHEMA = `-- =========================================================
-- SCHÉMA POSTGRESQL - Synergy Call Center
-- Appliqué automatiquement par le serveur au démarrage.
-- =========================================================

${SCHEMA_SQL}`;

export default function SqlSchemaViewer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 shadow-xl" id="sql-schema-viewer">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm mb-1">
            <Database className="w-4 h-4" />
            <span>BASE PRINCIPALE POSTGRESQL</span>
          </div>
          <h3 className="text-xl font-bold font-sans tracking-tight">Script SQL d'initialisation</h3>
          <p className="text-slate-400 text-xs mt-1">
            Le serveur crée ces tables automatiquement au démarrage. Vous pouvez aussi exécuter ce script manuellement avec <span className="text-cyan-300">psql</span>.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition shadow-md active:scale-95 cursor-pointer"
          id="btn-copy-sql"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-200" />
              <span>Copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copier le script SQL</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-xs overflow-x-auto max-h-80 leading-relaxed text-slate-300">
        <pre className="whitespace-pre">{SQL_SCHEMA}</pre>
      </div>

      <div className="mt-6 bg-slate-800/40 border border-slate-800 rounded-lg p-4 text-xs">
        <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5 font-sans">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span>Stockage</span>
        </h4>
        <ul className="list-disc list-inside space-y-1.5 text-slate-400 leading-relaxed">
          <li><strong>PostgreSQL :</strong> seule base de données, sans repli (<code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-400">DATABASE_URL</code> ou <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-400">SQL_HOST</code>/<code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-400">SQL_DB_NAME</code>).</li>
        </ul>
      </div>
    </div>
  );
}
