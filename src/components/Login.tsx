import React, { useState } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, Headphones } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (username: string, role: 'agent' | 'admin') => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/script/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.username, data.role);
      } else {
        setError(data.message || 'Identifiants invalides');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4" id="login-container">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-center">
          <div className="inline-flex p-3 bg-slate-800 text-teal-400 rounded-xl mb-3 border border-slate-700">
            <Headphones className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-white">Synergy Call Center</h1>
          <p className="text-slate-400 text-sm mt-1">Gestionnaire de scripts & Objections de dons</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium text-center" id="login-error">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Identifiant Utilisateur
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: agent05 ou Admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all focus:ring-2 focus:ring-teal-100"
                  id="input-username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Mot de Passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all focus:ring-2 focus:ring-teal-100"
                  id="input-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-xl text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              id="btn-login-submit"
            >
              {loading ? (
                <span>Connexion en cours...</span>
              ) : (
                <>
                  <span>Accéder à mon espace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>
      
      <p className="text-slate-400 text-[11px] mt-6 font-mono">
        © 2026 Synergy Call Center • Intranet d'Appels pour Associations en France
      </p>
    </div>
  );
}
