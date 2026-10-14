import React, { useState, useEffect } from 'react';
import { useLiveUpdates } from '../lib/useLiveUpdates';
import { Association, ScriptSequence, Consigne } from '../types';
import { 
  X, Save, FileText, Headphones, LogOut, 
  ChevronRight, HelpCircle, CheckCircle, 
  AlertTriangle, Flame, RefreshCw 
} from 'lucide-react';

interface MiniAgentInterfaceProps {
  username: string;
  onLogout: () => void;
  isPip?: boolean;
  // Rendered inside the normal page on narrow screens (side panel, tablet, phone) instead of a popup.
  embedded?: boolean;
}

export default function MiniAgentInterface({ username, onLogout, isPip = false, embedded = false }: MiniAgentInterfaceProps) {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>(() => {
    return localStorage.getItem('synergy_selected_assoc_id') || '';
  });
  const [sequences, setSequences] = useState<ScriptSequence[]>([]);
  const [activeSequence, setActiveSequence] = useState<ScriptSequence | null>(null);
  const [activeObjection, setActiveObjection] = useState<ScriptSequence | null>(null);
  
  const [note, setNote] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'script' | 'objections' | 'notes'>('script');

  // Focus retention trick to keep non-PiP popup on top
  useEffect(() => {
    if (isPip || embedded) return;

    const handleBlur = () => {
      setTimeout(() => {
        try {
          window.focus();
        } catch (e) {
          console.warn("Could not focus back automatically:", e);
        }
      }, 150);
    };

    window.addEventListener('blur', handleBlur);
    
    const focusInterval = setInterval(() => {
      try {
        window.focus();
      } catch (e) {}
    }, 1000);

    return () => {
      window.removeEventListener('blur', handleBlur);
      clearInterval(focusInterval);
    };
  }, [isPip, embedded]);

  // Load all associations on mount
  useEffect(() => {
    fetch('/script/api/associations')
      .then(res => res.json())
      .then(data => {
        setAssociations(data);
        if (data.length > 0 && !selectedAssociationId) {
          setSelectedAssociationId(data[0].id);
          localStorage.setItem('synergy_selected_assoc_id', data[0].id);
        }
      })
      .catch(err => console.error("Error loading associations", err));
  }, []);

  // Listen for storage events (allows the popup to automatically sync if the user changes the campaign in the main window!)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'synergy_selected_assoc_id' && e.newValue) {
        setSelectedAssociationId(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync sequences + local notes when association changes
  useEffect(() => {
    if (!selectedAssociationId) return;

    localStorage.setItem('synergy_selected_assoc_id', selectedAssociationId);

    fetch(`/script/api/sequences?association_id=${selectedAssociationId}`)
      .then(res => res.json())
      .then((data: ScriptSequence[]) => {
        setSequences(data);
        const mainScripts = data.filter(s => s.type === 'script');
        if (mainScripts.length > 0) {
          setActiveSequence(mainScripts[0]);
        } else {
          setActiveSequence(null);
        }
        setActiveObjection(null);
      })
      .catch(err => console.error("Error loading sequences", err));

    // Fetch note
    fetch(`/script/api/notes/${username}/${selectedAssociationId}`)
      .then(res => res.json())
      .then(data => {
        setNote(data.note_texte || '');
        setSaveStatus('idle');
      })
      .catch(err => console.error("Error loading notes", err));

  }, [selectedAssociationId, username]);

  // Pick up admin edits without a reload, keeping the current step and objection when they still exist.
  useLiveUpdates(() => {
    fetch('/script/api/associations')
      .then(res => res.json())
      .then(setAssociations)
      .catch(err => console.error("Error refreshing associations", err));
    if (!selectedAssociationId) return;
    fetch(`/script/api/sequences?association_id=${selectedAssociationId}`)
      .then(res => res.json())
      .then((data: ScriptSequence[]) => {
        setSequences(data);
        const scripts = data.filter(s => s.type === 'script');
        setActiveSequence(prev => data.find(s => s.id === prev?.id) ?? scripts[0] ?? null);
        setActiveObjection(prev => data.find(s => s.id === prev?.id) ?? null);
      })
      .catch(err => console.error("Error refreshing sequences", err));
  });

  // Notes Auto-save setup
  useEffect(() => {
    if (!selectedAssociationId || note === '') return;
    const delayDebounce = setTimeout(() => {
      fetch('/script/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_username: username,
          association_id: selectedAssociationId,
          note_texte: note
        })
      }).catch(err => console.error("Auto-save note error", err));
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [note, selectedAssociationId, username]);

  const handleSaveNote = async () => {
    if (!selectedAssociationId) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/script/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_username: username,
          association_id: selectedAssociationId,
          note_texte: note
        })
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // Plain formatting parser from AgentInterface.tsx
  const parseInlineStyles = (inputText: string): React.ReactNode => {
    if (!inputText) return "";
    
    const inlineRegex = /\[(GRAS)\]([\s\S]*?)\[\/GRAS\]|\[TAILLE=(\d+)\]([\s\S]*?)\[\/TAILLE\]|\[COULEUR=(#[0-9A-Fa-f]{6}|[a-zA-Z]+)\]([\s\S]*?)\[\/COULEUR\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = inlineRegex.exec(inputText)) !== null) {
      const matchIndex = match.index;
      
      if (matchIndex > lastIndex) {
        elements.push(inputText.substring(lastIndex, matchIndex));
      }
      
      if (match[1] === 'GRAS') {
        const content = match[2];
        elements.push(
          <strong key={`bold-${matchIndex}`} className="font-extrabold text-inherit">
            {parseInlineStyles(content)}
          </strong>
        );
      } else if (match[3]) {
        const sizeStr = match[3];
        const content = match[4];
        elements.push(
          <span key={`size-${matchIndex}`} style={{ fontSize: `${sizeStr}px`, lineHeight: '1.4' }}>
            {parseInlineStyles(content)}
          </span>
        );
      } else if (match[5]) {
        const colorStr = match[5];
        const content = match[6];
        elements.push(
          <span key={`color-${matchIndex}`} style={{ color: colorStr }}>
            {parseInlineStyles(content)}
          </span>
        );
      }
      
      lastIndex = inlineRegex.lastIndex;
    }
    
    if (lastIndex < inputText.length) {
      elements.push(inputText.substring(lastIndex));
    }
    
    return elements.length > 0 ? <>{elements}</> : inputText;
  };

  const parseScriptText = (text: string) => {
    if (!text) return null;

    const regex = /\[(VERT CLAIR|ORANGE\/JAUNE CLAIR|ROUGE CLAIR)\]([\s\S]*?)\[\/\1\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        elements.push(
          <p key={`text-${lastIndex}`} className="mb-4 text-slate-800 leading-relaxed font-sans text-sm whitespace-pre-wrap">
            {parseInlineStyles(text.substring(lastIndex, matchIndex).trim())}
          </p>
        );
      }

      const tagType = match[1];
      const tagContent = match[2].trim();

      if (tagType === 'VERT CLAIR') {
        elements.push(
          <div 
            key={`tag-${matchIndex}`} 
            style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', borderLeft: '4px solid #2E7D32' }}
            className="my-3 p-3.5 rounded-r-lg shadow-sm leading-relaxed font-sans font-semibold text-xs sm:text-sm whitespace-pre-wrap"
          >
            {parseInlineStyles(tagContent)}
          </div>
        );
      } else if (tagType === 'ORANGE/JAUNE CLAIR') {
        elements.push(
          <div 
            key={`tag-${matchIndex}`} 
            style={{ backgroundColor: '#FFF3E0', color: '#EF6C00', borderLeft: '4px solid #EF6C00' }}
            className="my-3 p-3.5 rounded-r-lg shadow-sm leading-relaxed font-sans font-semibold text-xs sm:text-sm whitespace-pre-wrap"
          >
            {parseInlineStyles(tagContent)}
          </div>
        );
      } else if (tagType === 'ROUGE CLAIR') {
        elements.push(
          <div 
            key={`tag-${matchIndex}`} 
            style={{ backgroundColor: '#FFEBEE', color: '#C62828', borderLeft: '4px solid #C62828' }}
            className="my-3 p-3.5 rounded-r-lg shadow-sm leading-relaxed font-sans font-semibold text-xs sm:text-sm whitespace-pre-wrap animate-pulse"
          >
            {parseInlineStyles(tagContent)}
          </div>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      const trailing = text.substring(lastIndex).trim();
      if (trailing) {
        elements.push(
          <p key={`text-end`} className="mb-4 text-slate-800 leading-relaxed font-sans text-sm whitespace-pre-wrap">
            {parseInlineStyles(trailing)}
          </p>
        );
      }
    }

    return elements.length > 0 ? (
      <div className="space-y-3">{elements}</div>
    ) : (
      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-sm font-sans">
        {parseInlineStyles(text)}
      </p>
    );
  };

  const mainScripts = sequences.filter(s => s.type === 'script');
  const objections = sequences.filter(s => s.type === 'objection');
  const selectedAssoc = associations.find(a => a.id === selectedAssociationId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-full overflow-x-hidden" id="mini-companion-panel">
      
      {/* Compact Mini Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 py-2 shrink-0 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Headphones className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-[11px] font-bold tracking-tight text-white uppercase truncate">
            {embedded ? `Synergy • ${username}` : 'Synergy Mini-Compagnon'}
          </span>
          {!embedded && (
            <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider ${isPip ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse'}`}>
              {isPip ? '📌 Épinglé 1er plan' : '⚡ Toujours Visible'}
            </span>
          )}
        </div>

        {embedded ? (
          <button
            onClick={onLogout}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
            title="Quitter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          /* Quit Popup Button */
          <button
            onClick={() => window.close()}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
            title="Fermer la mini-fenêtre"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Selector and Tab Controller Panel */}
      <div className="px-3 pt-2 pb-1 bg-slate-900 shrink-0 space-y-2">
        {/* Campaign dropdown */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-2 py-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pôle :</span>
          <select
            value={selectedAssociationId}
            onChange={(e) => setSelectedAssociationId(e.target.value)}
            className="bg-transparent border-none text-[11px] text-white focus:outline-none cursor-pointer flex-1 py-0.5"
          >
            {associations.map(assoc => (
              <option key={assoc.id} value={assoc.id} className="bg-slate-900 text-white">
                {assoc.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-850 text-xs">
          <button
            onClick={() => setActiveTab('script')}
            className={`flex-1 text-center pb-2 font-bold uppercase tracking-wider text-[10px] transition-all relative ${
              activeTab === 'script' 
                ? 'text-teal-400 font-extrabold border-b-2 border-teal-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📃 Script
          </button>
          <button
            onClick={() => setActiveTab('objections')}
            className={`flex-1 text-center pb-2 font-bold uppercase tracking-wider text-[10px] transition-all relative ${
              activeTab === 'objections' 
                ? 'text-amber-400 font-extrabold border-b-2 border-amber-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 Objections
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 text-center pb-2 font-bold uppercase tracking-wider text-[10px] transition-all relative ${
              activeTab === 'notes' 
                ? 'text-sky-400 font-extrabold border-b-2 border-sky-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📝 Notes
          </button>
        </div>
      </div>

      {/* Scrollable Main Area depending on active Tab */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3" id="mini-scroller-view">
        
        {/* TAB 1: Main Script Flow */}
        {activeTab === 'script' && (
          <div className="space-y-4 animate-fadeIn">
            {activeSequence ? (
              <div className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 shadow-xl">
                {/* Step navigation + active step tag */}
                {(() => {
                  const idx = mainScripts.findIndex(s => s.id === activeSequence.id);
                  return (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          disabled={idx <= 0}
                          onClick={() => setActiveSequence(mainScripts[idx - 1])}
                          className="px-3 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-30 rounded-lg text-xs font-bold text-slate-700 transition"
                        >
                          Précédent
                        </button>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {idx + 1} / {mainScripts.length}
                        </span>
                        <button
                          disabled={idx >= mainScripts.length - 1}
                          onClick={() => setActiveSequence(mainScripts[idx + 1])}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded-lg text-xs font-bold text-white transition"
                        >
                          Suivant
                        </button>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="bg-teal-500 font-black text-slate-950 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide shrink-0">
                          Étape {idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold break-words">
                          {activeSequence.titre_sequence}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Script Body Text in Compact Mode */}
                <div className="leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  {parseScriptText(activeSequence.texte_script)}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs italic">
                Aucun script principal chargé pour cette campagne.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Direct Contextual Objections */}
        {activeTab === 'objections' && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Quick Filter buttons */}
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">
                Objections de cette étape
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {objections
                  .filter(obj => obj.parent_sequence_id === activeSequence?.id)
                  .map(obj => {
                    const isSelected = activeObjection?.id === obj.id;
                    return (
                      <button
                        key={obj.id}
                        onClick={() => setActiveObjection(isSelected ? null : obj)}
                        className={`text-left p-2 border rounded-lg text-[11px] font-bold transition flex justify-between items-center cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-extrabold'
                            : 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border-rose-900/50'
                        }`}
                      >
                        <span className="truncate pr-1">{obj.titre_sequence}</span>
                        <ChevronRight className="w-3 h-3 shrink-0" />
                      </button>
                    );
                  })}
                {objections.filter(obj => obj.parent_sequence_id === activeSequence?.id).length === 0 && (
                  <p className="text-[10px] text-slate-500 italic pl-1">Aucune objection spécifique liée à cette étape.</p>
                )}
              </div>
            </div>

            {/* General Objections */}
            <div className="space-y-1.5 pt-2 border-t border-slate-900">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">
                Objections Générales (Toutes étapes)
              </span>
              <div className="grid grid-cols-2 gap-1.5 animate-fadeIn">
                {objections
                  .filter(obj => !obj.parent_sequence_id)
                  .map(obj => {
                    const isSelected = activeObjection?.id === obj.id;
                    return (
                      <button
                        key={obj.id}
                        onClick={() => setActiveObjection(isSelected ? null : obj)}
                        className={`text-left p-2 border rounded-lg text-[10px] font-bold truncate transition-all flex justify-between items-center cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold col-span-2 shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="truncate pr-1">{obj.titre_sequence}</span>
                        <HelpCircle className="w-3 h-3 shrink-0" />
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Active Rebuttal Display Card! */}
            {activeObjection ? (
              <div className="mt-4 p-3.5 bg-white text-slate-900 border border-amber-300 rounded-xl relative shadow-2xl animate-scaleUp">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5 border-slate-100">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Réfutation : {activeObjection.titre_sequence}
                  </span>
                  <button 
                    onClick={() => setActiveObjection(null)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-450 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="leading-relaxed bg-amber-50/25 p-2 rounded-lg text-xs leading-5">
                  {parseScriptText(activeObjection.texte_script)}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/30 rounded-lg text-center text-slate-500 text-[10px] italic border border-dashed border-slate-900">
                Sélectionnez une objection ci-dessus pour afficher la réponse adéquate instantanément.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Interactive Notepad synced with database */}
        {activeTab === 'notes' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Bloc-Notes de l'agent (Sauvegarde synchronisée)
              </span>
              
              {saveStatus === 'saving' && <span className="text-[10px] text-teal-400 flex items-center gap-1 animate-pulse"><RefreshCw className="w-2.5 h-2.5 animate-spin" /> En cours...</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-emerald-400 font-bold">✓ Sauvegardé</span>}
              {saveStatus === 'error' && <span className="text-[10px] text-red-400">✗ Échec</span>}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-80 p-3 bg-slate-900 border border-slate-800 text-white rounded-lg focus:outline-none focus:border-teal-500 text-xs placeholder:text-slate-600 leading-normal font-sans resize-none"
              placeholder="Saisissez des notes sur le prospect... Elles se sauvegardent automatiquement toutes les 1.5 secondes !"
            />

            <button
              onClick={handleSaveNote}
              disabled={saveStatus === 'saving'}
              className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 hover:text-black font-bold rounded-lg text-xs transition active:scale-95 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Forcer l'enregistrement manuel</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
