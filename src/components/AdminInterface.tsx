import React, { useState, useEffect, useRef } from 'react';
import { Association, ScriptSequence, Consigne } from '../types';
import { 
  Plus, Edit, Eye, Trash2, UploadCloud, 
  HelpCircle, CheckCircle, Database, LayoutList, 
  Settings, FolderPlus, Sparkles, BookOpen, ChevronRight, X,
  Flame, AlertTriangle, Save, RefreshCw, Wifi, WifiOff, Server
} from 'lucide-react';
import SqlSchemaViewer from './SqlSchemaViewer';

interface AdminInterfaceProps {
  username: string;
  onLogout: () => void;
}

export default function AdminInterface({ username, onLogout }: AdminInterfaceProps) {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>('');
  const [sequences, setSequences] = useState<ScriptSequence[]>([]);
  
  // Ref to preserve and restore cursor selection in textareas after applying formatting tags
  const pendingSelectionRef = useRef<{ id: string; start: number; end: number } | null>(null);

  useEffect(() => {
    if (pendingSelectionRef.current) {
      const { id, start, end } = pendingSelectionRef.current;
      const el = document.getElementById(id) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(start, end);
      }
      pendingSelectionRef.current = null;
    }
  });
  
  // Toggles and views
  const [activeTab, setActiveTab] = useState<'sequences' | 'diagnostics'>('sequences');
  const [editingSequence, setEditingSequence] = useState<ScriptSequence | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Sequence form fields
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'script' | 'objection'>('script');
  const [newOrder, setNewOrder] = useState<number>(1);
  const [newParentSequenceId, setNewParentSequenceId] = useState<string>('');

  // Active Association name editing
  const [assocNameInput, setAssocNameInput] = useState<string>('');
  const [isSubmittingAssoc, setIsSubmittingAssoc] = useState(false);

  // New Association form fields
  const [newAssocName, setNewAssocName] = useState('');
  const [showAddAssoc, setShowAddAssoc] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Selector for workspace lists
  const [selectedCampaignDropdown, setSelectedCampaignDropdown] = useState(false);

  // Global error trackers & Toast Notifications for Firestore
  interface CustomToast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    details?: string;
  }
  const [toasts, setToasts] = useState<CustomToast[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, details?: string) => {
    const id = String(Date.now() + Math.random());
    const newToast: CustomToast = { id, type, title, message, details };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 10000); // 10 seconds duration to let user read diagnostic errors comfortably
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Database Synchronization state properties
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const checkSyncStatus = async () => {
    setIsCheckingSync(true);
    setSyncError(null);
    try {
      const res = await fetch('/script/api/db-sync-status');
      if (!res.ok) {
        throw new Error(`Erreur serveur (Status ${res.status})`);
      }
      const data = await res.json();
      setSyncStatus(data);
    } catch (err: any) {
      console.error("Failed to fetch sync status:", err);
      setSyncError(err.message || String(err));
    } finally {
      setIsCheckingSync(false);
    }
  };

  useEffect(() => {
    checkSyncStatus();
  }, [activeTab]);

  // Upload simulation fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'script' | 'objection'>('script');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Keep campaign input in sync
  const selectedAssoc = associations.find(a => a.id === selectedAssociationId);
  useEffect(() => {
    if (selectedAssoc) {
      setAssocNameInput(selectedAssoc.nom);
    } else {
      setAssocNameInput('');
    }
  }, [selectedAssociationId, associations]);

  // Handle saving campaign name update
  const handleSaveAssociationName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssociationId || !assocNameInput.trim() || isSubmittingAssoc) return;
    setIsSubmittingAssoc(true);
    try {
      const res = await fetch(`/script/api/associations/${selectedAssociationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: assocNameInput.trim() })
      });
      if (res.ok) {
        // Refresh associations
        fetchAssociations();
        alert("Nom de la campagne enregistré avec succès !");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAssoc(false);
    }
  };

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

  // Insert tag style helper
  const handleInsertTag = (
    tagType: string, 
    target: 'new' | 'edit'
  ) => {
    let tagOpen = '';
    let tagClose = '';
    if (tagType === 'VERT') {
      tagOpen = '[VERT CLAIR]';
      tagClose = '[/VERT CLAIR]';
    } else if (tagType === 'ORANGE') {
      tagOpen = '[ORANGE/JAUNE CLAIR]';
      tagClose = '[/ORANGE/JAUNE CLAIR]';
    } else if (tagType === 'ROUGE') {
      tagOpen = '[ROUGE CLAIR]';
      tagClose = '[/ROUGE CLAIR]';
    } else if (tagType === 'GRAS') {
      tagOpen = '[GRAS]';
      tagClose = '[/GRAS]';
    } else if (tagType.startsWith('TAILLE_')) {
      const sizeStr = tagType.split('_')[1];
      tagOpen = `[TAILLE=${sizeStr}]`;
      tagClose = '[/TAILLE]';
    } else if (tagType.startsWith('COULEUR_')) {
      const colorStr = tagType.split('_')[1];
      tagOpen = `[COULEUR=${colorStr}]`;
      tagClose = '[/COULEUR]';
    }

    const textareaId = target === 'new' ? 'new-text-textarea' : 'edit-text-textarea';
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    // Read directly from the DOM to avoid stale React state references during rapid formatting
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = `${tagOpen}${selectedText}${tagClose}`;
    const updatedValue = text.substring(0, start) + replacement + text.substring(end);

    // Update DOM element value immediately so consecutive styling calls work perfectly with native selection bounds
    textarea.value = updatedValue;

    if (target === 'new') {
      setNewText(updatedValue);
    } else if (editingSequence) {
      setEditingSequence({ ...editingSequence, texte_script: updatedValue });
    }

    // Save selection bounds to restore immediately on state-driven React render
    pendingSelectionRef.current = {
      id: textareaId,
      start: start + tagOpen.length,
      end: start + tagOpen.length + selectedText.length
    };

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selectedText.length);
    }, 10);
  };

  // Parser to convert tags to comfortable visual renders inside lists and preview panels
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
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {parseInlineStyles(text.substring(lastIndex, matchIndex))}
          </span>
        );
      }

      const tagType = match[1];
      const tagContent = match[2];

      if (tagType === 'VERT CLAIR') {
        elements.push(
          <span 
            key={`tag-${matchIndex}`} 
            className="px-1.5 py-0.5 rounded font-semibold text-xs mx-0.5 whitespace-pre-wrap"
            style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', borderLeft: '2px solid #2E7D32' }}
          >
            {parseInlineStyles(tagContent)}
          </span>
        );
      } else if (tagType === 'ORANGE/JAUNE CLAIR') {
        elements.push(
          <span 
            key={`tag-${matchIndex}`} 
            className="px-1.5 py-0.5 rounded font-semibold text-xs mx-0.5 whitespace-pre-wrap"
            style={{ backgroundColor: '#FFF3E0', color: '#EF6C00', borderLeft: '2px solid #EF6C00' }}
          >
            {parseInlineStyles(tagContent)}
          </span>
        );
      } else if (tagType === 'ROUGE CLAIR') {
        elements.push(
          <span 
            key={`tag-${matchIndex}`} 
            className="px-1.5 py-0.5 rounded font-semibold text-xs mx-0.5 whitespace-pre-wrap"
            style={{ backgroundColor: '#FFEBEE', color: '#C62828', borderLeft: '2px solid #C62828' }}
          >
            {parseInlineStyles(tagContent)}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(
        <span key={`text-end`} className="whitespace-pre-wrap font-light">
          {parseInlineStyles(text.substring(lastIndex))}
        </span>
      );
    }

    return elements.length > 0 ? elements : <span className="font-light">{parseInlineStyles(text)}</span>;
  };

  // Fetch associations Initially
  const fetchAssociations = () => {
    fetch('/script/api/associations')
      .then(res => res.json())
      .then(data => {
        setAssociations(data);
        if (data.length > 0 && !selectedAssociationId) {
          setSelectedAssociationId(data[0].id);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchAssociations();
  }, []);

  // Sync sequences list when association changes
  const fetchSequences = () => {
    if (!selectedAssociationId) {
      setSequences([]);
      return;
    }
    
    fetch(`/script/api/sequences?association_id=${selectedAssociationId}`)
      .then(res => res.json())
      .then((data: ScriptSequence[]) => {
        setSequences(data);
        setNewOrder(data.length + 1);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchSequences();
  }, [selectedAssociationId]);

  // Handle Create Sequence
  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newText) return;

    const targetId = String(Date.now());
    const seqObj: ScriptSequence = {
      id: targetId,
      association_id: selectedAssociationId,
      titre_sequence: newTitle,
      texte_script: newText,
      ordre: Number(newOrder) || (sequences.length + 1),
      type: newType,
      parent_sequence_id: newType === 'objection' ? (newParentSequenceId || undefined) : undefined
    };

    try {
      const res = await fetch('/script/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seqObj)
      });

      if (res.ok) {
        addToast('success', 'Séquence créée', `La séquence "${newTitle}" a été enregistrée.`);
        setNewTitle('');
        setNewText('');
        setNewType('script');
        setNewParentSequenceId('');
        fetchSequences();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Edit/Update Sequence
  const handleUpdateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSequence) return;

    try {
      const res = await fetch('/script/api/sequences', {
        method: 'POST', // handles edit when ID is passed inside the body
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSequence)
      });

      if (res.ok) {
        addToast('success', 'Séquence mise à jour', `La séquence "${editingSequence.titre_sequence}" a été mise à jour.`);
        setEditingSequence(null);
        fetchSequences();
      } else {
        addToast('error', 'Échec de modification - Séquence', `Le serveur a répondu avec le statut ${res.status}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Sequence
  const handleDeleteSequence = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette séquence ?")) return;

    try {
      const res = await fetch(`/script/api/sequences/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addToast('success', 'Séquence supprimée', `La séquence ${id} a été supprimée.`);
        fetchSequences();
      } else {
        addToast('error', 'Échec de suppression - Séquence', `Le serveur a répondu avec le statut ${res.status}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create Association
  const handleCreateAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssocName) return;

    try {
      const res = await fetch('/script/api/associations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newAssocName })
      });
      if (res.ok) {
        const added = await res.json();
        setNewAssocName('');
        setShowAddAssoc(false);
        setAssociations(prev => [...prev, added]);
        setSelectedAssociationId(added.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Drag & Drop / File selection simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  // Handle simulated upload
  const handleSimulateUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus("Analyse du document...");

    try {
      const res = await fetch('/script/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          association_id: selectedAssociationId,
          filename: selectedFile.name,
          file_type: uploadType
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus(`Analyse réussie ! Nouvelle séquence générée : "${data.sequence.titre_sequence}"`);
        setSelectedFile(null);
        fetchSequences();
        setTimeout(() => setUploadStatus(null), 5000);
      } else {
        setUploadStatus("Erreur lors de l'analyse du document.");
      }
    } catch (err) {
      setUploadStatus("Erreur de connexion au service d'analyse.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" id="admin-interface">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4 border-b border-indigo-950 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/15 p-2 rounded-lg text-blue-400 border border-blue-500/30">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Console d'Administration Synergy</h1>
            <p className="text-xs text-slate-400 font-mono">Contrôle global des campagnes d'appels • <span className="text-blue-400 font-semibold">{username}</span></p>
          </div>
        </div>

        {/* Local Storage Indicator Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 text-xs font-semibold">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Stockage local actif (Fichier db.json)</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
        >
          Déconnexion
        </button>
      </header>

      {/* Sub-header Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-3.5 shadow-sm">
        <button
          onClick={() => {
            setActiveTab('sequences');
            setEditingSequence(null);
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTab === 'sequences'
              ? 'bg-slate-950 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
          }`}
        >
          Gestion des Séquences
        </button>
        <button
          onClick={() => {
            setActiveTab('diagnostics');
            setEditingSequence(null);
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'diagnostics'
              ? 'bg-slate-950 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Synchronisation & Diagnostic</span>
          {syncStatus && syncStatus.activeBackend !== 'local' && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 p-5">
        
        {activeTab === 'diagnostics' ? (
          <div className="max-w-4xl mx-auto py-4 space-y-6">

            {/* Diagnostic de synchronisation de la base */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-700 font-bold" id="sync-db-icon" />
                    <span>SYNCHRONISATION ET DIAGNOSTIC BASE DE DONNÉES</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Vérifiez en temps réel l'état de la connexion de votre application avec PostgreSQL (base principale), Cloud Firestore (secours) et la sauvegarde locale.
                  </p>
                </div>
                
                <button
                  id="btn-check-sync"
                  onClick={checkSyncStatus}
                  disabled={isCheckingSync}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-150 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 disabled:text-slate-400 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm border border-slate-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSync ? 'animate-spin' : ''}`} />
                  <span>{isCheckingSync ? 'Vérification...' : 'Tester la synchronisation'}</span>
                </button>
              </div>

              {/* Alert indicator box */}
              {isCheckingSync && !syncStatus ? (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 flex items-center justify-center gap-3">
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                  <span className="text-xs text-slate-600 animate-pulse font-medium">Interrogation des bases de données en cours...</span>
                </div>
              ) : syncError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-red-800">Impossible d'effectuer le diagnostic</h4>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">
                      L'appel API de contrôle a renvoyé l'erreur suivante : <code className="font-mono bg-red-100 text-red-700 px-1 py-0.5 rounded">{syncError}</code>
                    </p>
                  </div>
                </div>
              ) : syncStatus ? (
                <div className="space-y-6">
                  {/* Status Banner */}
                  {syncStatus.activeBackend === 'postgres' ? (
                    <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-4 flex items-start gap-3.5">
                      <div className="bg-emerald-500 rounded-full p-1.5 text-white animate-pulse">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                          <span>CONNECTÉ À POSTGRESQL (BASE PRINCIPALE)</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                        </h4>
                        <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                          La base de données <strong>PostgreSQL</strong> est connectée. Toutes les modifications apportées aux campagnes, scripts, objections et notes d'agents y sont enregistrées, avec une copie de secours dans <code>db.json</code>.
                        </p>
                      </div>
                    </div>
                  ) : syncStatus.activeBackend === 'firestore' ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3.5">
                      <div className="bg-amber-500 rounded-full p-1.5 text-white">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                          POSTGRESQL INDISPONIBLE — BASCULE SUR FIRESTORE
                        </h4>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          {syncStatus.postgres.configured
                            ? "La connexion à PostgreSQL a échoué. L'application utilise temporairement Cloud Firestore et réessaiera PostgreSQL automatiquement."
                            : "PostgreSQL n'est pas configuré (DATABASE_URL ou SQL_HOST/SQL_DB_NAME). L'application utilise Cloud Firestore."}
                        </p>
                        {syncStatus.postgres.error && (
                          <div className="mt-2 text-[11px] font-mono bg-amber-100/50 text-amber-800 p-2 rounded border border-amber-200 max-h-24 overflow-y-auto">
                            {syncStatus.postgres.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3.5">
                      <div className="bg-red-500 rounded-full p-1.5 text-white">
                        <WifiOff className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">
                          MODE SAUVEGARDE LOCALE ACTIVE (AUCUNE BASE DISTANTE)
                        </h4>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed font-normal">
                          Ni PostgreSQL ni Firestore ne sont joignables. Vos données sont conservées sur le serveur dans le fichier local (<code>db.json</code>) et seront recopiées dans PostgreSQL dès qu'une base vide sera disponible.
                        </p>
                        {[syncStatus.postgres.error, syncStatus.firestore.error || syncStatus.firestore.reason].filter(Boolean).map((msg: string, i: number) => (
                          <div key={i} className="mt-2 text-[11px] font-mono bg-red-100/50 text-red-800 p-2 rounded border border-red-200 max-h-24 overflow-y-auto">
                            {msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SIDE BY SIDE METRICS COMPARE GRID */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Statistiques de comparaison des données</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {([
                        ['associations', 'Associations / Campagnes'],
                        ['sequences', "Scripts d'appels & Séquences"],
                        ['notes', 'Commentaires & Notes Agents'],
                      ] as const).map(([key, label]) => {
                        const remoteCounts = syncStatus.activeBackend === 'postgres'
                          ? syncStatus.postgres.counts
                          : syncStatus.activeBackend === 'firestore' ? syncStatus.firestore.counts : null;
                        const localCount = syncStatus.local.counts[key];
                        return (
                          <div key={key} className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                                <div className="border-r border-slate-200/60 pb-1">
                                  <span className="block text-lg font-extrabold text-slate-800">{localCount}</span>
                                  <span className="text-[9px] text-slate-500 uppercase">Sauvegardes</span>
                                </div>
                                <div>
                                  <span className="block text-lg font-extrabold text-slate-800">
                                    {remoteCounts ? remoteCounts[key] : 'N/A'}
                                  </span>
                                  <span className="text-[9px] text-slate-500 uppercase">
                                    {syncStatus.activeBackend === 'firestore' ? 'Firestore' : 'PostgreSQL'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-medium">État :</span>
                              {!remoteCounts ? (
                                <span className="px-1.5 py-0.5 rounded text-amber-800 font-bold uppercase bg-amber-100">Hors Ligne</span>
                              ) : localCount === remoteCounts[key] ? (
                                <span className="px-1.5 py-0.5 rounded text-emerald-800 font-bold uppercase bg-emerald-100">Parfait</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-blue-800 font-bold uppercase bg-blue-100">Écart</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CONFIGURATION TECHNICAL metadata */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase text-[9px] tracking-wider mb-2">
                      <Server className="w-3.5 h-3.5 text-slate-600" />
                      <span>CONFIGURATION SYSTÈME</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stockage actif :</span>
                      <span className="font-semibold text-slate-800">{syncStatus.activeStorage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PostgreSQL (principal) :</span>
                      <span className="font-mono text-slate-800">
                        {!syncStatus.postgres.configured ? 'Non configuré' : syncStatus.postgres.connected ? 'Connecté' : 'Indisponible'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Firestore (secours) :</span>
                      <span className="font-mono text-slate-800">
                        {!syncStatus.firestore.configured ? 'Non configuré' : syncStatus.firestore.connected ? 'Connecté' : 'Indisponible'}
                      </span>
                    </div>
                    {syncStatus.firestore.configured && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Firebase Project ID :</span>
                          <span className="font-mono text-slate-800">{syncStatus.firestore.projectId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Firestore Database ID :</span>
                          <span className="font-mono text-slate-800">{syncStatus.firestore.databaseId || '(default)'}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Heure de la vérification :</span>
                      <span className="text-slate-800">{new Date(syncStatus.timestamp).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  <p>Aucune information récoltée pour le moment. Cliquez sur "Tester la synchronisation" pour démarrer.</p>
                </div>
              )}
            </div>

            {/* Database Reset Option */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Réinitialisation des scripts par défaut (HIM)</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Si vous avez perdu vos données suite à une republish/mise à jour, ou si vous souhaitez écraser le contenu de votre base cloud Firestore/locale pour retrouver les scripts <strong>HIM d&apos;origine (Handicap International)</strong>, vous pouvez cliquer sur le bouton ci-dessous pour forcer la réinitialisation complète de la base de données.
              </p>
              <button
                onClick={async () => {
                  if (confirm("Attention: Cette action effacera toutes les modifications apportées aux campagnes, scripts et objections courants de votre base de données (Firestore et Locale) pour réinstaller les scripts HIM par défaut. Voulez-vous continuer ?")) {
                    try {
                      const res = await fetch('/script/api/reset-database', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok) {
                        alert(data.message);
                        window.location.reload();
                      } else {
                        alert("Erreur: " + data.error);
                      }
                    } catch (e: any) {
                      alert("Erreur de connexion : " + e.message);
                    }
                  }
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow cursor-pointer uppercase tracking-wider bg-red-600 hover:bg-red-750"
              >
                Réinstaller les scripts HIM par défaut
              </button>
            </div>

            <SqlSchemaViewer />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            
            {/* Left Hand side: Campaign / Assoc manager & Simulated Upload */}
            <div className="xl:col-span-4 flex flex-col gap-5">
              
              {/* ASSOCIATION DE TRAVAIL Side Block */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="bg-slate-900 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold">1</span>
                    <span>ASSOCIATION DE TRAVAIL</span>
                  </h3>
                  <button 
                    onClick={() => setSelectedCampaignDropdown(!selectedCampaignDropdown)}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase"
                  >
                    {selectedCampaignDropdown ? 'Fermer' : 'Choisir Autre'}
                  </button>
                </div>

                {/* Main Edit Campaign Form */}
                <form onSubmit={handleSaveAssociationName} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      NOM DE L'ONG / ASSOCIATION
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={assocNameInput}
                        onChange={(e) => setAssocNameInput(e.target.value)}
                        placeholder="Chargement de l'association..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingAssoc || !selectedAssociationId}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-lg transition shrink-0 active:scale-95 disabled:opacity-45"
                        id="save-assoc-name-btn"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </form>

                {/* Drops selection with list toggled on */}
                {(selectedCampaignDropdown || associations.length <= 1) && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toutes les campagnes :</span>
                      <button
                        onClick={() => setShowAddAssoc(!showAddAssoc)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nouvelle</span>
                      </button>
                    </div>

                    {showAddAssoc && (
                      <form onSubmit={handleCreateAssociation} className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2.5">
                        <input
                          type="text"
                          required
                          placeholder="Ex: Secours Catholique, Croix-Rouge..."
                          value={newAssocName}
                          onChange={(e) => setNewAssocName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowAddAssoc(false)}
                            className="px-2 py-0.5 text-[9px] text-slate-500 hover:bg-slate-100 rounded"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-0.5 text-[9px] bg-indigo-600 text-white rounded font-medium shadow"
                          >
                            Créer
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {associations.map(assoc => {
                        const isSelected = selectedAssociationId === assoc.id;
                        return (
                          <div
                            key={assoc.id}
                            className={`w-full flex items-center justify-between rounded-lg border transition text-xs overflow-hidden ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                                : 'bg-slate-50/70 hover:bg-slate-100 text-slate-600 border-slate-200/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssociationId(assoc.id);
                                setSelectedCampaignDropdown(false);
                              }}
                              className="flex-1 text-left p-2.5 truncate cursor-pointer font-mono"
                            >
                              {assoc.nom}
                            </button>
                            <div className="flex items-center gap-1 pr-2">
                              {confirmDeleteId === assoc.id ? (
                                <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-150 shrink-0">
                                  <span className="text-[9px] text-red-700 font-medium">Sûr ?</span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const res = await fetch(`/script/api/associations/${assoc.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          const nextAssocs = associations.filter(a => a.id !== assoc.id);
                                          setAssociations(nextAssocs);
                                          if (selectedAssociationId === assoc.id) {
                                            if (nextAssocs.length > 0) {
                                              setSelectedAssociationId(nextAssocs[0].id);
                                            } else {
                                              setSelectedAssociationId('');
                                              setSequences([]);
                                            }
                                          }
                                          setConfirmDeleteId(null);
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="px-1 py-0.5 bg-red-600 text-white rounded text-[9px] font-bold"
                                  >
                                    Oui
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-medium"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {isSelected && <CheckCircle className="w-3 h-3 text-indigo-600 shrink-0" />}
                                  {!isSelected && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(assoc.id);
                                      }}
                                      className="p-1 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded transition"
                                      title="Supprimer la campagne"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ALIMENTATION DES GUIDES Side Block */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center gap-1.5 mb-4 pb-2 border-b border-slate-100">
                  <span className="bg-slate-900 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold">3</span>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    ALIMENTATION DES GUIDES
                  </h3>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-150 space-y-4">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">RÉDACTION DU GUIDE</span>
                  
                  {/* Custom script standard / objection selector buttons */}
                  <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setNewType('script');
                        setNewParentSequenceId('');
                      }}
                      className={`flex-1 py-2 rounded-lg font-semibold transition active:scale-95 text-center ${
                        newType === 'script'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-600 hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      Script standard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewType('objection');
                      }}
                      className={`flex-1 py-2 rounded-lg font-semibold transition active:scale-95 text-center ${
                        newType === 'objection'
                          ? 'bg-amber-500 text-white shadow'
                          : 'text-slate-600 hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      Objection
                    </button>
                  </div>

                  {/* Association to standard scripts only if objection is highlighted */}
                  {newType === 'objection' && (
                    <div className="animate-fadeIn">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        SÉQUENCE DE FLUX ASSOCIÉE :
                      </label>
                      <select
                        value={newParentSequenceId}
                        onChange={(e) => setNewParentSequenceId(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        id="parent-seq-selector-admin"
                      >
                        <option value="">Toutes les séquences (Générale)</option>
                        {sequences
                          .filter(s => s.type === 'script')
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              Étape {s.ordre} - {s.titre_sequence}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      TITRE COURT DE L'ÉTAPE :
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Refus financier, Salutation..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        TEXTE DE L'ARGUMENTAIRE :
                      </label>
                      <span className="text-[9px] text-slate-400">Surlignez du texte pour styliser</span>
                    </div>

                    {/* Inline Tagging Style formatting toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/50 p-1.5 rounded-t-lg border border-b-0 border-slate-200">
                      
                      {/* Font styles */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertTag('GRAS', 'new')}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-850 text-[10px] font-extrabold rounded flex items-center gap-1 cursor-pointer"
                        title="Rendre le texte sélectionné gras [GRAS]"
                      >
                        <b>B</b> <span className="text-[9px] font-normal text-slate-550">Gras</span>
                      </button>

                      {/* Font sizes */}
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                        <span className="text-[9px] text-slate-500 font-bold mr-1">Taille:</span>
                        {(['14', '18', '22', '26', '32'] as const).map((size) => (
                          <button
                            key={size}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertTag(`TAILLE_${size}`, 'new')}
                            className="px-1 py-0.5 hover:bg-slate-100 text-[9px] font-bold font-mono text-slate-700 rounded border border-slate-100 cursor-pointer"
                            title={`Taille ${size}px`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>

                      {/* Font colors */}
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                        <span className="text-[9px] text-slate-500 font-bold mr-1">Couleur:</span>
                        {[
                          { name: 'Noir', code: '#0F172A' },
                          { name: 'Bleu', code: '#2563EB' },
                          { name: 'Rouge', code: '#DC2626' },
                          { name: 'Vert', code: '#16A34A' },
                          { name: 'Orange', code: '#EA580C' },
                          { name: 'Violet', code: '#9333EA' }
                        ].map((color) => (
                          <button
                            key={color.code}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleInsertTag(`COULEUR_${color.code}`, 'new')}
                            className="w-3.5 h-3.5 rounded-full border border-slate-200 cursor-pointer shadow-sm active:scale-95 transition-transform"
                            style={{ backgroundColor: color.code }}
                            title={`Couleur: ${color.name}`}
                          />
                        ))}
                      </div>

                      <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertTag('VERT', 'new')}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded cursor-pointer"
                        title="Style Vert Clair (Intro/Positif)"
                      >
                        Encadré [Vert]
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertTag('ORANGE', 'new')}
                        className="px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-850 text-[10px] font-bold rounded cursor-pointer"
                        title="Style Orange (Grille de dons)"
                      >
                        Encadré [Orange]
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertTag('ROUGE', 'new')}
                        className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold rounded cursor-pointer"
                        title="Style Rouge Clair (Alerte/Reglement)"
                      >
                        Encadré [Rouge]
                      </button>
                    </div>

                    <textarea
                      required
                      id="new-text-textarea"
                      rows={5}
                      placeholder="Rédigez la phrase à prononcer au téléphone par l'agent..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-b-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-normal"
                    />
                  </div>

                  {/* Live real-time preview panel */}
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">APERÇU EN TEMPS RÉEL :</span>
                    <div className="bg-slate-100 rounded-lg p-3 border border-slate-200/50 min-h-[50px] max-h-40 overflow-y-auto text-xs leading-relaxed text-slate-800">
                      {newText ? parseScriptText(newText) : <span className="text-slate-400 italic font-light">Le contenu formaté s'affichera ici en direct...</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      ORDRE D'APPARITION :
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newOrder}
                      onChange={(e) => setNewOrder(Number(e.target.value))}
                      className="w-32 border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleCreateSequence}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition shadow cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>PUBLIER LE GUIDE</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Right Hand side: Parallel Columns splits representing Standard workflow and Objections guide */}
            <div className="xl:col-span-8 flex flex-col gap-5">
              
              {/* Active Campaign Header Banner Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded text-[10px] font-bold">
                      CAMPAGNE ACTIVE :
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                    {selectedAssoc ? selectedAssoc.nom : 'Chargement...'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Toutes les modifications s'appliquent immédiatement sur l'écran d'appel des agents connectés.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping"></span>
                    <span>{sequences.filter(s => s.type === 'script').length} Flux standards</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    <span>{sequences.filter(s => s.type === 'objection').length} Objections d'appel</span>
                  </span>
                </div>
              </div>

              {/* Form to Edit/Update Sequence inline */}
              {editingSequence && (
                <div className="p-6 bg-indigo-50/70 border-b border-slate-100 rounded-xl border border-indigo-200 animate-slideDown">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-indigo-100">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="w-4 h-4 text-indigo-700" />
                      <span>Modifier la Séquence : {editingSequence.titre_sequence}</span>
                    </h4>
                    <button 
                      onClick={() => setEditingSequence(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleUpdateSequence} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type de script</label>
                        <select
                          value={editingSequence.type}
                          onChange={(e) => setEditingSequence({ 
                            ...editingSequence, 
                            type: e.target.value as 'script' | 'objection',
                            parent_sequence_id: e.target.value === 'script' ? undefined : editingSequence.parent_sequence_id
                          })}
                          className="w-full border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-indigo-500"
                        >
                          <option value="script">Séquence standard</option>
                          <option value="objection">Objection rapide</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ordre d'affichage</label>
                        <input
                          type="number"
                          min="1"
                          value={editingSequence.ordre}
                          onChange={(e) => setEditingSequence({ ...editingSequence, ordre: Number(e.target.value) })}
                          className="w-full border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-indigo-500 font-mono"
                        />
                      </div>

                      {editingSequence.type === 'objection' && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Séquence standard associée</label>
                          <select
                            value={editingSequence.parent_sequence_id || ''}
                            onChange={(e) => setEditingSequence({ ...editingSequence, parent_sequence_id: e.target.value || undefined })}
                            className="w-full border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-indigo-500"
                          >
                            <option value="">Toutes les séquences (Générale)</option>
                            {sequences
                              .filter(s => s.type === 'script' && s.id !== editingSequence.id)
                              .map(s => (
                                <option key={s.id} value={s.id}>Étape {s.ordre} - {s.titre_sequence}</option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Titre de la séquence</label>
                      <input
                        type="text"
                        required
                        value={editingSequence.titre_sequence}
                        onChange={(e) => setEditingSequence({ ...editingSequence, titre_sequence: e.target.value })}
                        className="w-full border border-slate-200 bg-white rounded-lg text-xs p-2 focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Texte du script de lecture</label>
                        <span className="text-[10px] text-slate-400 italic">Balises dispo: [VERT CLAIR], [ORANGE/JAUNE CLAIR], [ROUGE CLAIR]</span>
                      </div>
                      
                      {/* Formatting bar helper inside the inline editor too */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/50 p-1.5 rounded-t-lg border border-b-0 border-slate-200">
                        {/* Font styles */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInsertTag('GRAS', 'edit')}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-850 text-[10px] font-extrabold rounded flex items-center gap-1 cursor-pointer"
                          title="Rendre le texte sélectionné gras [GRAS]"
                        >
                          <b>B</b> <span className="text-[9px] font-normal text-slate-550">Gras</span>
                        </button>

                        {/* Font sizes */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                          <span className="text-[9px] text-slate-500 font-bold mr-1">Taille:</span>
                          {(['14', '18', '22', '26', '32'] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleInsertTag(`TAILLE_${size}`, 'edit')}
                              className="px-1 py-0.5 hover:bg-slate-100 text-[9px] font-bold font-mono text-slate-700 rounded border border-slate-100 cursor-pointer"
                              title={`Taille ${size}px`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>

                        {/* Font colors */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                          <span className="text-[9px] text-slate-500 font-bold mr-1">Couleur:</span>
                          {[
                            { name: 'Noir', code: '#0F172A' },
                            { name: 'Bleu', code: '#2563EB' },
                            { name: 'Rouge', code: '#DC2626' },
                            { name: 'Vert', code: '#16A34A' },
                            { name: 'Orange', code: '#EA580C' },
                            { name: 'Violet', code: '#9333EA' }
                          ].map((color) => (
                            <button
                              key={color.code}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleInsertTag(`COULEUR_${color.code}`, 'edit')}
                              className="w-3.5 h-3.5 rounded-full border border-slate-200 cursor-pointer shadow-sm active:scale-95 transition-transform"
                              style={{ backgroundColor: color.code }}
                              title={`Couleur: ${color.name}`}
                            />
                          ))}
                        </div>

                        <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInsertTag('VERT', 'edit')}
                          className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded cursor-pointer"
                        >
                          Encadré [Vert]
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInsertTag('ORANGE', 'edit')}
                          className="px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-[11px] text-orange-850 font-bold rounded cursor-pointer"
                        >
                          Encadré [Orange]
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInsertTag('ROUGE', 'edit')}
                          className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold rounded cursor-pointer"
                        >
                          Encadré [Rouge]
                        </button>
                      </div>

                      <textarea
                        required
                        id="edit-text-textarea"
                        rows={6}
                        value={editingSequence.texte_script}
                        onChange={(e) => setEditingSequence({ ...editingSequence, texte_script: e.target.value })}
                        className="w-full border border-slate-200 bg-white rounded-b-lg text-xs p-3 focus:outline-indigo-500 font-mono text-[11px] leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingSequence(null)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white hover:bg-slate-50 transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow"
                      >
                        Sauvegarder les modifications
                      </button>
                    </div>
                  </form>
                </div>
              )}



              {/* DUAL WORKSPACE SPLIT BLOCK - DUAL SIDE-BY-SIDE PANELS */}
              <div className="grid grid-cols-1 lg:grid-cols-2" id="dual-guide-columns">
                
                {/* COLUMN 1: Script de Flux Principal */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {/* Styled Header in solid indigo/navy color requested in the mockup */}
                  <div className="bg-slate-900 border border-slate-900 text-white rounded-t-xl px-4 py-3.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-500 text-slate-950 font-black w-5 h-5 rounded flex items-center justify-center text-[10px] select-none">F</span>
                      <h4 className="font-extrabold text-xs text-slate-100 tracking-wide">
                        SCRIPT DE FLUX PRINCIPAL ({sequences.filter(s => s.type === 'script').length})
                      </h4>
                    </div>
                    <span className="text-[9px] font-black uppercase text-teal-400 tracking-wider">
                      ORDRE CHRONOLOGIQUE
                    </span>
                  </div>

                  {/* Body sequences */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] min-h-[300px]">
                    {sequences
                      .filter(s => s.type === 'script')
                      .sort((a,b) => a.ordre - b.ordre)
                      .map((seq) => (
                        <div 
                          key={seq.id}
                          className="bg-slate-50/70 border border-slate-200/60 hover:border-slate-350 hover:bg-white rounded-xl p-4 shadow-sm relative transition-all group space-y-2.5"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {/* Order indicator bubble */}
                              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 font-mono font-bold flex items-center justify-center text-[11px] border border-teal-200/50">
                                {seq.ordre}
                              </span>
                              <h5 className="font-bold text-slate-800 text-[12px] truncate max-w-[200px]">
                                {seq.titre_sequence}
                              </h5>
                            </div>

                            {/* Hover Actions triggers */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingSequence(seq)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSequence(seq.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Real-time formatted argument render */}
                          <div className="text-[11px] text-slate-600 bg-white border border-slate-100 p-2.5 rounded-lg leading-relaxed">
                            {parseScriptText(seq.texte_script)}
                          </div>
                        </div>
                      ))}

                    {sequences.filter(s => s.type === 'script').length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs italic">
                        Aucun paragraphe de flux principal configuré pour cette campagne...
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMN 2: Guide des Objections d'Appel */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {/* Styled Header in solid dark amber/navy color requested in the mockup */}
                  <div className="bg-slate-900 border border-slate-900 text-white rounded-t-xl px-4 py-3.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-slate-950 font-black w-5 h-5 rounded flex items-center justify-center text-[10px] select-none">O</span>
                      <h4 className="font-extrabold text-xs text-slate-100 tracking-wide">
                        GUIDE DES OBJECTIONS ({sequences.filter(s => s.type === 'objection').length})
                      </h4>
                    </div>
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">
                      RÉFUTATIONS PRÊTES
                    </span>
                  </div>

                  {/* Body objections */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] min-h-[300px]">
                    {sequences
                      .filter(s => s.type === 'objection')
                      .sort((a,b) => a.ordre - b.ordre)
                      .map((obj) => {
                        const parentSeq = sequences.find(s => s.id === obj.parent_sequence_id);
                        return (
                          <div 
                            key={obj.id}
                            className="bg-slate-50/70 border border-slate-200/60 hover:border-slate-350 hover:bg-white rounded-xl p-4 shadow-sm relative transition-all group space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-0.5">
                                <h5 className="font-bold text-slate-800 text-[12px] pr-8 truncate max-w-[200px]">
                                  {obj.titre_sequence}
                                </h5>
                                
                                {/* Label indicator of linked parent step sequence */}
                                {parentSeq ? (
                                  <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200/50 px-1.5 py-0.5 rounded font-medium inline-block max-w-[190px] truncate">
                                    Lié à : Étape {parentSeq.ordre} - {parentSeq.titre_sequence}
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-amber-50/80 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-semibold inline-block">
                                    Objection Universelle (Toutes)
                                  </span>
                                )}
                              </div>

                              {/* Hover Actions triggers */}
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => setEditingSequence(obj)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                                  title="Modifier"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSequence(obj.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Real-time formatted argument render */}
                            <div className="text-[11px] text-slate-600 bg-white border border-slate-100 p-2.5 rounded-lg leading-relaxed mt-1">
                              {parseScriptText(obj.texte_script)}
                            </div>
                          </div>
                        );
                      })}

                    {sequences.filter(s => s.type === 'objection').length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs italic">
                        Aucun guide d'objection rédigé pour cette campagne... pour l'instant.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* Toast Notifications Floating Panel */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0" id="toast-notifications-portal">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border p-4 shadow-lg flex flex-col gap-2 transition duration-350 animate-in fade-in slide-in-from-bottom-5 bg-white ${
              toast.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-900'
                : toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                : 'border-slate-200 bg-slate-50/95 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                {toast.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs tracking-tight uppercase">
                    {toast.title}
                  </h4>
                  <p className="text-xs mt-0.5 opacity-90 leading-normal">
                    {toast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 hover:bg-slate-200/50 rounded transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {toast.details && (
              <div className="mt-1 bg-slate-950/90 text-slate-300 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[10px] break-all max-h-[140px] overflow-y-auto leading-normal">
                <span className="text-rose-400 font-bold block mb-1">Rapport d'erreur technique :</span>
                {toast.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
