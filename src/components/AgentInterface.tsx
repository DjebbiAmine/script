import React, { useState, useEffect, useRef } from 'react';
import { useLiveUpdates } from '../lib/useLiveUpdates';
import { Association, ScriptSequence, Consigne } from '../types';
import { 
  X, Save, FileText, Headphones, LogOut, 
  ChevronRight, HelpCircle, CheckCircle, 
  AlertTriangle, Flame, RefreshCw, ExternalLink 
} from 'lucide-react';
import MiniAgentInterface from './MiniAgentInterface';

interface AgentInterfaceProps {
  username: string;
  onLogout: () => void;
}

export default function AgentInterface({ username, onLogout }: AgentInterfaceProps) {
  const isMiniMode = window.location.search.includes('mini=true');

  if (isMiniMode) {
    return <MiniAgentInterface username={username} onLogout={onLogout} />;
  }

  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>(() => {
    return localStorage.getItem('synergy_selected_assoc_id') || '';
  });
  const [sequences, setSequences] = useState<ScriptSequence[]>([]);
  
  const [activeSequence, setActiveSequence] = useState<ScriptSequence | null>(null);
  const [activeObjection, setActiveObjection] = useState<ScriptSequence | null>(null);
  // The steps list shows at most 5 steps (whatever their wrapped height) and scrolls beyond that.
  const stepsListRef = useRef<HTMLDivElement>(null);
  const [stepsMaxHeight, setStepsMaxHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const list = stepsListRef.current;
    if (!list) return;
    const measure = () => {
      const items: HTMLElement[] = [];
      list.querySelectorAll<HTMLElement>(':scope > button').forEach(b => items.push(b));
      if (items.length <= 5) {
        setStepsMaxHeight(undefined);
        return;
      }
      const fifth = items[4];
      setStepsMaxHeight(fifth.offsetTop - items[0].offsetTop + fifth.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll('button').forEach(b => observer.observe(b));
    return () => observer.disconnect();
  }, [sequences]);

  const [note, setNote] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load all associations on mount
  useEffect(() => {
    const loadAssociations = () => {
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
    };

    loadAssociations();
  }, []);

  const launchPipMode = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert("Votre navigateur ne supporte pas encore le mode Document Picture-in-Picture (requis pour le Toujours au Premier Plan). Utilisez Google Chrome ou Microsoft Edge pour en profiter ! En attendant, la fenêtre flottante classique s'ouvrira.");
      window.open(
        window.location.origin + '/script/?mini=true',
        'SynergyMini',
        'width=420,height=760,status=no,menubar=no,toolbar=no,location=no,resizable=yes'
      );
      return;
    }

    try {
      // @ts-ignore
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 440,
        height: 780,
      });

      // Copy stylesheets so style classes (Tailwind, custom) render correctly in sub window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = pipWindow.document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      // Import external fonts and icons if defined
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        pipWindow.document.head.appendChild(link.cloneNode(true));
      });

      pipWindow.document.body.className = 'bg-slate-950 text-slate-100 m-0 p-0 overflow-x-hidden';
      pipWindow.document.title = "Synergy Mini (Toujours au Premier Plan)";

      const container = pipWindow.document.createElement('div');
      container.id = 'pip-root';
      pipWindow.document.body.appendChild(container);

      const { createRoot } = await import('react-dom/client');
      const root = createRoot(container);
      root.render(
        <MiniAgentInterface 
          username={username} 
          onLogout={() => {
            onLogout();
            pipWindow.close();
          }} 
          isPip={true}
        />
      );

      // Safe release on root window unloading
      const closePipOnUnload = () => pipWindow.close();
      window.addEventListener('beforeunload', closePipOnUnload);
      pipWindow.addEventListener('pagehide', () => {
        window.removeEventListener('beforeunload', closePipOnUnload);
      });

    } catch (err) {
      console.error("Failed to start Picture-in-Picture window:", err);
      // Fallback
      window.open(
        window.location.origin + '/script/?mini=true',
        'SynergyMini',
        'width=420,height=760,status=no,menubar=no,toolbar=no,location=no,resizable=yes'
      );
    }
  };

  // Listen for storage changes from mini pop-up
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

    const loadSequences = () => {
      fetch(`/script/api/sequences?association_id=${selectedAssociationId}`)
        .then(res => res.json())
        .then((data: ScriptSequence[]) => {
          setSequences(data);
          // Default to the first main script sequence
          const mainScripts = data.filter(s => s.type === 'script');
          if (mainScripts.length > 0) {
            setActiveSequence(mainScripts[0]);
          } else {
            setActiveSequence(null);
          }
          // Set no active objection by default
          setActiveObjection(null);
        })
        .catch(err => console.error("Error loading sequences", err));
    };

    const loadNote = () => {
      fetch(`/script/api/notes/${username}/${selectedAssociationId}`)
        .then(res => res.json())
        .then(data => {
          setNote(data.note_texte || '');
          setSaveStatus('idle');
        })
        .catch(err => console.error("Error loading notes", err));
    };

    loadSequences();
    loadNote();
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

  // Handle Note Save manually
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

  // Auto-save note on debounce (convenient for call centers!)
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
    }, 1500); // Auto-save after 1.5 seconds of silence

    return () => clearTimeout(delayDebounce);
  }, [note, selectedAssociationId, username]);

  // Inline parser for nesting tags: Bold [GRAS], custom font sizes [TAILLE=X] and custom colors [COULEUR=Y]
  const parseInlineStyles = (inputText: string): React.ReactNode => {
    if (!inputText) return "";
    
    // Regular expression matching bold [GRAS], font sizes [TAILLE=X], and colors [COULEUR=Y]
    const inlineRegex = /\[(GRAS)\]([\s\S]*?)\[\/GRAS\]|\[TAILLE=(\d+)\]([\s\S]*?)\[\/TAILLE\]|\[COULEUR=(#[0-9A-Fa-f]{6}|[a-zA-Z]+)\]([\s\S]*?)\[\/COULEUR\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = inlineRegex.exec(inputText)) !== null) {
      const matchIndex = match.index;
      
      // Add plain text before match
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
      } else if (match[3]) { // TAILLE=X
        const sizeStr = match[3];
        const content = match[4];
        elements.push(
          <span key={`size-${matchIndex}`} style={{ fontSize: `${sizeStr}px`, lineHeight: '1.4' }}>
            {parseInlineStyles(content)}
          </span>
        );
      } else if (match[5]) { // COULEUR=Y
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

  // Parser to convert specific color tags to high comfort, fully custom CSS styling
  // Standard CSS direct mappings requested:
  // - VERT CLAIR (#E8F5E9, text #2E7D32)
  // - ORANGE/JAUNE CLAIR (#FFF3E0, text #EF6C00)
  // - ROUGE CLAIR (#FFEBEE, text #C62828)
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
          <p key={`text-${lastIndex}`} className="mb-5 text-slate-850 leading-relaxed font-sans font-normal whitespace-pre-wrap">
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
            style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', borderLeft: '5px solid #2E7D32' }}
            className="my-5 p-5 rounded-r-xl shadow-sm leading-relaxed font-sans font-medium text-[1.15rem] sm:text-[1.25rem] whitespace-pre-wrap flex gap-3 items-start"
          >
            <CheckCircle className="w-6 h-6 shrink-0 mt-0.5 text-[#2E7D32]" />
            <div>{parseInlineStyles(tagContent)}</div>
          </div>
        );
      } else if (tagType === 'ORANGE/JAUNE CLAIR') {
        elements.push(
          <div 
            key={`tag-${matchIndex}`} 
            style={{ backgroundColor: '#FFF3E0', color: '#EF6C00', borderLeft: '5px solid #EF6C00' }}
            className="my-5 p-5 rounded-r-xl shadow-sm leading-relaxed font-sans font-medium text-[1.15rem] sm:text-[1.25rem] whitespace-pre-wrap flex gap-3 items-start"
          >
            <Flame className="w-6 h-6 shrink-0 mt-0.5 text-[#EF6C00]" />
            <div>{parseInlineStyles(tagContent)}</div>
          </div>
        );
      } else if (tagType === 'ROUGE CLAIR') {
        elements.push(
          <div 
            key={`tag-${matchIndex}`} 
            style={{ backgroundColor: '#FFEBEE', color: '#C62828', borderLeft: '5px solid #C62828' }}
            className="my-5 p-5 rounded-r-xl shadow-sm leading-relaxed font-sans font-medium text-[1.15rem] sm:text-[1.25rem] whitespace-pre-wrap flex gap-3 items-start animate-pulse"
          >
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-[#C62828]" />
            <div>{parseInlineStyles(tagContent)}</div>
          </div>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      const trailing = text.substring(lastIndex).trim();
      if (trailing) {
        elements.push(
          <p key={`text-end`} className="mb-5 text-slate-850 leading-relaxed font-sans font-normal whitespace-pre-wrap">
            {parseInlineStyles(trailing)}
          </p>
        );
      }
    }

    return elements.length > 0 ? (
      <div className="space-y-4">{elements}</div>
    ) : (
      <p className="text-slate-805 leading-relaxed whitespace-pre-wrap font-sans font-normal">
        {parseInlineStyles(text)}
      </p>
    );
  };

  const renderContextualGuidelines = () => {
    if (!activeSequence) return null;

    switch (activeSequence.id) {
      case 's1':
        return (
          <div className="space-y-2">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5 uppercase tracking-wider text-teal-600">
              <Headphones className="w-3.5 h-3.5" />
              Consignes d'Accroche (Étape 1)
            </span>
            <p className="pl-2 border-l border-teal-300">• Parlez avec un ton posé, accueillant, clair et professionnel.</p>
            <p className="pl-2 border-l border-teal-300">• Marquez une pause respectueuse après la salutation pour laisser répondre le prospect.</p>
            <p className="pl-2 border-l border-teal-300">• Si le prospect prétend être occupé ou refuse de parler, utilisez l'objection correspondante immédiatement.</p>
          </div>
        );
        
      case 's2':
        return (
          <div className="space-y-4">
            <span className="font-extrabold text-slate-900 block text-sm flex items-center gap-1.5 uppercase tracking-wider text-teal-600 border-b-2 border-teal-500 pb-2">
              <Headphones className="w-4 h-4 text-teal-600 animate-pulse" />
              Consignes d'Argumentaire (Étape 2)
            </span>
            
            <div className="space-y-3">
              <div className="bg-white/80 rounded-xl p-3 border border-teal-100 shadow-sm space-y-2.5">
                <span className="font-extrabold text-teal-850 uppercase tracking-wider text-[10px] bg-teal-50 text-teal-800 px-2.5 py-1 rounded-md block border border-teal-200/50">
                  ⚡ Après la question découverte :
                </span>
                
                <div className="space-y-2 text-[11px] leading-relaxed">
                  {/* Cas 1: Oui */}
                  <div className="p-2 rounded bg-slate-50 border-l-4 border-emerald-500 space-y-1">
                    <span className="font-bold text-emerald-800 uppercase tracking-widest text-[9px] block">🔍 LE PROSPECT RÉPOND "OUI" :</span>
                    <p className="text-slate-800 font-medium">« c’est tout a votre honneur, et pourrais je connaître une ou deux associations que vous soutenez depuis peut être très longtemps ? »</p>
                  </div>

                  {/* Cas 2: Cite 1 ou 2 */}
                  <div className="p-2 rounded bg-slate-50 border-l-4 border-blue-500 space-y-1">
                    <span className="font-bold text-blue-800 uppercase tracking-widest text-[9px] block">🏷️ CITE 1 OU 2 ASSOCIATIONS :</span>
                    <p className="text-slate-700 font-semibold text-[10px]">Valoriser l'effort & continuer sur l'argumentaire.</p>
                  </div>

                  {/* Cas 3: Oubli */}
                  <div className="p-2 rounded bg-slate-50 border-l-4 border-amber-500 space-y-1.5">
                    <span className="font-bold text-amber-800 uppercase tracking-widest text-[9px] block">❓ DIT "JE NE SAIS PAS" OU "OUBLIÉ" :</span>
                    <p className="text-slate-800 font-medium">« vous avez des problèmes de mémoire Mr/Mme, vous suivez un traitement ou c’est juste des oublis comme tout le monde ? »</p>
                    
                    <div className="mt-1.5 pl-2 border-l border-amber-300 space-y-1 text-[10px] text-slate-600">
                      <p>• <strong>Si Oui (traitement)</strong> → <span className="font-bold text-red-655 uppercase">Congé poli :</span> <span className="italic block bg-white/70 p-1 rounded border border-amber-200 mt-0.5">« hé bien bravo Mr/Mme je ne vous retiens pas plus vous allez recevoir notre courrier et on compte sur votre soutien, merci pour le temps accordé et au revoir »</span></p>
                      <p>• <strong>Si Non (oubli ordinaire) :</strong> <span className="italic block mt-0.5">« ah très bien et est ce que vous vous rappelé de la dernière association soutenue ? »</span> (Sinon placer en indécis)</p>
                    </div>
                  </div>

                  {/* Cas 4: Ca ne vous regarde pas */}
                  <div className="p-2 rounded bg-slate-50 border-l-4 border-slate-600 space-y-1">
                    <span className="font-bold text-slate-855 uppercase tracking-widest text-[9px] block">🛑 DIT "ÇA NE VOUS REGARDE PAS" :</span>
                    <p className="text-slate-800 font-medium">« tout a fait Mr/Mme c'était juste pour savoir si vous étiez plus dans le domaine de la recherche médicale, les enfants ou peut être les animaux... »</p>
                    <p className="text-slate-500 text-[10px] pl-1 font-medium">• Si accepte → continuer. Sinon → Retour direct à l'argumentaire.</p>
                  </div>
                </div>
              </div>

              {/* Bloc Objection Pas les Moyens */}
              <div className="bg-white/80 rounded-xl p-3 border border-amber-100 shadow-sm space-y-2">
                <span className="font-extrabold text-amber-850 uppercase tracking-wider text-[10px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md block border border-amber-200/50">
                  ⚠️ PENDANT L'OBJECTION REÇUE "PAS LES MOYENS" :
                </span>
                
                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="p-2 rounded bg-slate-50 border-l-4 border-amber-500 space-y-1">
                    <span className="font-bold text-slate-600 block text-[10px]">Poser d'abord la question de transition :</span>
                    <p className="text-slate-800 italic bg-white/60 p-1.5 rounded border font-medium">« je comprends c’est vrai que la conjoncture nous impact tous d’ailleurs j’aimerais vous demander sans etre indiscret(e) bien sur, vous êtes toujours actif(ve) ou retraité(e) ? »</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded">
                      <span className="font-extrabold text-indigo-800 uppercase block text-[9px]">🛠️ ACTIF(VE) :</span>
                      <p className="text-slate-700 italic mt-0.5 font-medium">« effectivement les salaires n’augmentent pas, ils stagnent... »</p>
                    </div>
                    
                    <div className="p-2 bg-emerald-50/50 border border-emerald-100 rounded">
                      <span className="font-extrabold text-emerald-800 uppercase block text-[9px]">👴 RETRAITÉ(E) :</span>
                      <p className="text-slate-705 italic mt-0.5 font-medium">« ah d accord si je vous ai posé la question c’est que votre voix parait plutôt (très) jeune. »</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 's3':
        return (
          <div className="space-y-3">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5 uppercase tracking-wider text-teal-600 border-b border-slate-200 pb-1.5">
              <Headphones className="w-3.5 h-3.5" />
              Consignes Verrouillage (Étape 3)
            </span>
            
            <div className="space-y-2 text-[11px] leading-normal">
              <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">La question découverte n'a PAS été posée pendant l'argumentaire :</p>
              <div className="pl-2 border-l-2 border-teal-500 space-y-1.5 text-slate-650">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Demandez après l'accord ou verrouillage :</p>
                <p className="italic text-slate-800 bg-slate-50 p-1 rounded">« c’est très généreux de votre part surtout que j’imagine que vous soutenez déjà d’autres associations ? »</p>
                
                <p><strong>Si oui :</strong> <span className="italic text-slate-755">« et bien c’est tout à votre honneur... et vous en soutenez depuis de nombreuses années ?... bravo pour ce que vous faites... »</span></p>
                <p><strong>Si non :</strong> <span className="italic text-slate-755">« ah d'accord, sans être indiscret vous n’en avez jamais soutenu ou stoppé pour raisons personnelles ? »</span></p>
                
                <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wide pt-1">Dans les deux cas, demandez :</p>
                <p className="italic text-slate-805 bg-slate-50 p-1 rounded">« et quelle est la raison qui vous pousse à nous soutenir aujourd'hui ? »</p>
                <div className="pl-2 text-[10px] text-slate-500 leading-tight">
                  • Si raison valable : valoriser et continuer.<br />
                  • Si vague : creuser problème mémoire, continuer, don indécis.
                </div>
              </div>
            </div>
          </div>
        );
        
      case 's4':
        return (
          <div className="space-y-2">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5 uppercase tracking-wider text-teal-600">
              <Headphones className="w-3.5 h-3.5" />
              Consignes de Congé (Étape 4)
            </span>
            <p className="pl-2 border-l border-teal-300">• Remerciez chaleureusement le donateur de la part de toute l'équipe.</p>
            <p className="pl-2 border-l border-teal-300">• Confirmez que le courrier/lien de don sera envoyé promptement.</p>
            <p className="pl-2 border-l border-teal-305">• Laissez une impression mémorable positive et polie.</p>
          </div>
        );
        
      default:
        return (
          <div className="space-y-2">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5 uppercase tracking-wider text-teal-600">
              💡 Conseils d'appel Synergy
            </span>
            <p>1. Parlez avec un ton posé, chaleureux et professionnel.</p>
            <p>2. Laissez respirer l'interlocuteur après l'annonce du montant.</p>
            <p>3. Reformulez les objections positives avec empathie.</p>
          </div>
        );
    }
  };

  // Filter sequences into primary scripts vs objections
  const mainScripts = sequences.filter(s => s.type === 'script');
  const objections = sequences.filter(s => s.type === 'objection');

  const selectedAssoc = associations.find(a => a.id === selectedAssociationId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" id="agent-interface">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500/15 p-2 rounded-lg text-teal-400 border border-teal-500/30">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Espace Téléconseiller Synergy</h1>
            <p className="text-xs text-slate-400 font-mono">Agent Connecté : <span className="text-teal-400 uppercase font-semibold">{username}</span></p>
          </div>
        </div>

        {/* Association Selector */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-3.5 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 max-w-md w-full md:w-auto">
            <label className="text-xs font-semibold text-slate-300 whitespace-nowrap uppercase tracking-wider">
              Campagne :
            </label>
            <select
              value={selectedAssociationId}
              onChange={(e) => setSelectedAssociationId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer w-full md:w-64"
              id="assoc-selector-agent"
            >
              {associations.map(assoc => (
                <option key={assoc.id} value={assoc.id}>
                  {assoc.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Launch Mini Window button absolutely solves single-screen spacing constraints */}
          <button
            onClick={() => {
              window.open(
                window.location.origin + '/script/?mini=true',
                'SynergyMini',
                'width=420,height=760,status=no,menubar=no,toolbar=no,location=no,resizable=yes'
              );
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 hover:text-black rounded-lg text-sm transition font-bold shadow-sm active:scale-95 cursor-pointer w-full md:w-auto justify-center"
            id="btn-mini-mode"
            title="Ouvre une petite fenêtre flottante idéale pour placer à côté d'un CRM, occupant très peu d'écran !"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Mode Flottant</span>
          </button>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-4 py-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-sm transition font-medium cursor-pointer"
          id="btn-logout-agent"
        >
          <LogOut className="w-4 h-4" />
          <span>Quitter</span>
        </button>
      </header>

      {/* Main Container Grid with 15% / 55% / 30% ratio */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[15%_55%_30%] gap-5 p-5" id="agent-workspace-container">
        
        {/* Left Sidebar: Main Sequences Tabs */}
        <aside className="flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">
              Flux d'appel principal
            </h2>
            
            <div
              ref={stepsListRef}
              className="space-y-2 overflow-y-auto overscroll-contain pr-1 -mr-1"
              style={stepsMaxHeight ? { maxHeight: stepsMaxHeight } : undefined}
            >
              {mainScripts.map((seq, index) => {
                const isActive = activeSequence?.id === seq.id;
                return (
                  <button
                    key={seq.id}
                    onClick={() => {
                      setActiveSequence(seq);
                      setActiveObjection(null); // Clear temporary objection when switching steps
                    }}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-center justify-between gap-2 text-sm cursor-pointer ${
                      isActive 
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-705 border-slate-200'
                    }`}
                    id={`seq-btn-${seq.id}`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs ${
                        isActive ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="min-w-0 break-words leading-snug">{seq.titre_sequence}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                );
              })}

              {mainScripts.length === 0 && (
                <p className="text-slate-400 text-xs italic text-center py-4">Aucune séquence principale configurée.</p>
              )}
            </div>
          </div>

          {/* Contextual guidelines adapting to current step */}
          <div className="bg-gradient-to-br from-indigo-50 to-teal-50 border border-slate-200 rounded-xl p-4 text-xs leading-relaxed text-slate-600 space-y-2.5 shadow-sm">
            {renderContextualGuidelines()}
          </div>

          {/* Blacklisted words warning card */}
          <div className="bg-[#FFF5F5] border border-red-200 rounded-xl p-4 text-xs leading-relaxed text-red-800 space-y-2 shadow-sm">
            <span className="font-bold text-red-900 block flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Mots Interdits (Blacklistés)
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Exceptionnel', 'Ok', 'Super', 'À titre personnel'].map((word) => (
                <span key={word} className="bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded border border-red-200/50 uppercase tracking-wide text-[9px] font-mono">
                  {word}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-red-600/90 italic mt-1 leading-normal font-medium">
              ⚠️ Veillez à ce que ces termes ne soient jamais prononcés lors de vos échanges.
            </p>
          </div>
        </aside>

        {/* COLUMN A: [F] Script de Flux Principal */}
        <main className="flex flex-col bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden min-h-[500px]">
          {/* Header of Active Step */}
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="bg-teal-500 text-slate-950 font-black w-5 h-5 rounded flex items-center justify-center text-[10px] select-none">F</span>
              <div>
                <span className="text-[9px] font-black uppercase text-teal-400 tracking-wider">
                  FLUX PRINCIPAL DE L'ÉTAPE
                </span>
                <h2 className="text-xs font-bold text-slate-100 truncate max-w-[280px]" id="active-script-title">
                  {activeSequence ? `Étape ${mainScripts.indexOf(activeSequence) + 1} - ${activeSequence.titre_sequence}` : 'Chargement...'}
                </h2>
              </div>
            </div>

            {/* Step navigation */}
            {mainScripts.length > 0 && activeSequence && (() => {
              const currIdx = mainScripts.findIndex(s => s.id === activeSequence.id);
              const goTo = (idx: number) => {
                setActiveSequence(mainScripts[idx]);
                setActiveObjection(null); // Clear active objection on step change
              };
              return (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={currIdx <= 0}
                    onClick={() => goTo(currIdx - 1)}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-100 py-1 px-3 text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Précédent
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold whitespace-nowrap">
                    {currIdx + 1} / {mainScripts.length}
                  </span>
                  <button
                    disabled={currIdx >= mainScripts.length - 1}
                    onClick={() => goTo(currIdx + 1)}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed py-1 px-3 text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Suivant
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Main Script Text Content Area: HYPER OPTIMIZED UX */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/10" id="script-content-display">
            {activeSequence ? (
              <div className="space-y-4">
                <div className="text-[1.2rem] sm:text-[1.3rem] leading-[1.8] text-slate-900 font-normal">
                  {parseScriptText(activeSequence.texte_script)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <FileText className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                <p className="text-sm italic">Aucune séquence principale sélectionnée.</p>
              </div>
            )}
          </div>
        </main>

        {/* COLUMN B: [O] Guide des Objections d'Appel + Bloc-Notes */}
        <section className="flex flex-col gap-5">

          {/* Top Partition: Contextual Objections List & Current Rebuttal Display */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[300px]">
            
            {/* Styled Header matching mockup style */}
            <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-black w-5 h-5 rounded flex items-center justify-center text-[10px] select-none">O</span>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">
                    TRAITEMENT CONTEXTUEL DES OBJECTIONS
                  </span>
                  <h2 className="text-xs font-bold text-slate-100">
                    Réfutations instantanées calibrées
                  </h2>
                </div>
              </div>
              <span className="text-[8px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-mono uppercase">
                Sans mélanger
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              
              {/* 1. Objections linked specifically to BOTH the current steps OR Universal */}
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {activeSequence 
                    ? `🎯 Objections liées à l'étape : ${activeSequence.titre_sequence}` 
                    : '🎯 Objections liées à cette étape'
                  }
                </span>
                
                <div className="grid grid-cols-1 gap-2">
                  {objections
                    .filter(obj => obj.parent_sequence_id === activeSequence?.id)
                    .map(obj => {
                      const isActive = activeObjection?.id === obj.id;
                      return (
                        <button
                          key={obj.id}
                          onClick={() => setActiveObjection(isActive ? null : obj)}
                          className={`w-full text-left px-3 py-2 border rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-bold'
                              : 'bg-rose-50/50 hover:bg-rose-50 text-rose-800 border-rose-100/60'
                          }`}
                          id={`obj-specific-${obj.id}`}
                        >
                          <span className="truncate pr-2">{obj.titre_sequence}</span>
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      );
                    })}

                  {objections.filter(obj => obj.parent_sequence_id === activeSequence?.id).length === 0 && (
                    <p className="text-slate-400 text-[10px] italic py-1 pl-1">
                      Aucune objection spécifique associée par l'admin à cette étape.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. Universal / General Objections */}
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  🌍 Réactions &amp; Objections Générales (Toutes étapes)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {objections
                    .filter(obj => !obj.parent_sequence_id)
                    .map(obj => {
                      const isActive = activeObjection?.id === obj.id;
                      return (
                        <button
                          key={obj.id}
                          onClick={() => setActiveObjection(isActive ? null : obj)}
                          className={`text-left px-3 py-2 border rounded-lg text-xs font-semibold truncate transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-bold'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          id={`obj-general-${obj.id}`}
                        >
                          <span className="truncate pr-1">{obj.titre_sequence}</span>
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      );
                    })}

                  {objections.filter(obj => !obj.parent_sequence_id).length === 0 && (
                    <p className="text-slate-400 text-[10px] italic py-1 col-span-2">
                      Aucun guide d'objection générale disponible.
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Rebuttal display right inside the split workspace! */}
              {activeObjection ? (
                <div className="mt-4 pt-3 border-t border-slate-100 animate-fadeIn">
                  <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mb-2 text-slate-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-extrabold text-amber-900 tracking-wide uppercase truncate">
                        Argument : {activeObjection.titre_sequence}
                      </span>
                    </div>
                    <button 
                      onClick={() => setActiveObjection(null)}
                      className="text-amber-800 hover:bg-amber-100 p-0.5 rounded transition cursor-pointer shrink-0"
                      title="Fermer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200/60 leading-[1.75] text-slate-900 text-[1.12rem]">
                    {parseScriptText(activeObjection.texte_script)}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/30 text-center text-slate-400 text-[11px] italic">
                  Déroulez le flux d'appel principal. Si le donateur émet une objection, cliquez sur sa fiche ci-dessus pour afficher l'argumentaire adéquat ici instantanément.
                </div>
              )}

            </div>
          </div>

          {/* Bottom Partition: Sticky Interactive Notepad */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 shrink-0 flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <span>Bloc-Notes de l'Agent</span>
              </h3>
              {saveStatus === 'saving' && <span className="text-[10px] text-teal-600 font-mono flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto...</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-emerald-600 font-mono font-bold">✓ Enregistré</span>}
              {saveStatus === 'error' && <span className="text-[10px] text-red-600 font-mono">✗ Échec</span>}
            </div>

            <textarea
              className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all resize-none font-sans leading-normal"
              placeholder="Ex : Promesse de don de 40 € par mandat ... rappelle mercredi à 14 heures ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              id="notepad-textarea"
            />

            <div className="flex gap-2.5 mt-2.5">
              <button
                onClick={handleSaveNote}
                disabled={saveStatus === 'saving'}
                className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                id="btn-save-note"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Sauvegarder les notes</span>
              </button>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
