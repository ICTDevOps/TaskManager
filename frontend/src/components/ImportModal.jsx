import { useState, useRef } from 'react';
import { X, Upload, FileJson, FileText, AlertTriangle, Check, Copy, RefreshCw, SkipForward, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

/**
 * Modal d'import de tâches
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onImportComplete: () => void - Callback après import réussi
 * - targetUserId: string (optionnel) - Pour l'import admin
 * - targetUserName: string (optionnel) - Nom de l'utilisateur cible pour l'admin
 */
export default function ImportModal({ isOpen, onClose, onImportComplete, targetUserId = null, targetUserName = null }) {
  const [step, setStep] = useState('upload'); // upload, analyzing, review, importing, complete
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [format, setFormat] = useState('json');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [rawTasks, setRawTasks] = useState([]);
  const [resolutions, setResolutions] = useState({});
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const isAdmin = !!targetUserId;

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setFileContent(null);
    setFormat('json');
    setError('');
    setAnalysis(null);
    setRawTasks([]);
    setResolutions({});
    setProgress(0);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);

    // Detect format from file extension
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext === 'xml') {
      setFormat('xml');
    } else {
      setFormat('json');
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier');
    };
    reader.readAsText(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!fileContent) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setStep('analyzing');
    setError('');

    try {
      const endpoint = isAdmin
        ? `/admin/users/${targetUserId}/import/analyze`
        : '/tasks/import/analyze';

      const response = await api.post(endpoint, {
        content: fileContent,
        format
      });

      setAnalysis(response.data.analysis);
      setRawTasks(response.data.rawTasks);

      // Initialize resolutions
      const initialResolutions = {
        newTasks: response.data.analysis.newTasks.map(t => ({ index: t.index })),
        conflicts: response.data.analysis.conflicts.map(c => ({
          index: c.index,
          title: c.importTask.title,
          resolution: 'skip', // Default to skip
          existingTaskId: c.existingTasks[0]?.id
        }))
      };
      setResolutions(initialResolutions);

      setStep('review');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'analyse du fichier');
      setStep('upload');
    }
  };

  const updateConflictResolution = (index, resolution) => {
    setResolutions(prev => ({
      ...prev,
      conflicts: prev.conflicts.map(c =>
        c.index === index ? { ...c, resolution } : c
      )
    }));
  };

  const setAllConflictsResolution = (resolution) => {
    setResolutions(prev => ({
      ...prev,
      conflicts: prev.conflicts.map(c => ({ ...c, resolution }))
    }));
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    setError('');

    try {
      const endpoint = isAdmin
        ? `/admin/users/${targetUserId}/import/apply`
        : '/tasks/import/apply';

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post(endpoint, {
        rawTasks,
        resolutions
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResults(response.data.results);
      setStep('complete');

      // Notify parent of completion
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'import');
      setStep('review');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {isAdmin ? `Import pour ${targetUserName}` : 'Importer des tâches'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Sélectionnez un fichier d'export (JSON ou XML) pour importer vos tâches.
              </p>

              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    {format === 'xml' ? (
                      <FileText className="h-12 w-12 text-orange-500" />
                    ) : (
                      <FileJson className="h-12 w-12 text-blue-500" />
                    )}
                    <span className="text-gray-900 dark:text-white font-medium">{file.name}</span>
                    <span className="text-sm text-gray-500">Format: {format.toUpperCase()}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Cliquez pour sélectionner un fichier
                    </span>
                    <span className="text-sm text-gray-500">
                      JSON ou XML
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Analyse du fichier en cours...
              </p>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && analysis && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analysis.newTasks.length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Nouvelles tâches</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {analysis.conflicts.length}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">Doublons détectés</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {rawTasks.length}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Total dans le fichier</div>
                </div>
              </div>

              {/* New Tasks Preview */}
              {analysis.newTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Nouvelles tâches à créer ({analysis.newTasks.length})
                  </h3>
                  <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <ul className="space-y-1 text-sm">
                      {analysis.newTasks.slice(0, 10).map((t, i) => (
                        <li key={i} className="text-gray-600 dark:text-gray-400">
                          {t.task.title}
                        </li>
                      ))}
                      {analysis.newTasks.length > 10 && (
                        <li className="text-gray-500 italic">
                          ... et {analysis.newTasks.length - 10} autres
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Conflicts Resolution */}
              {analysis.conflicts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Doublons à résoudre ({analysis.conflicts.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAllConflictsResolution('skip')}
                        className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                      >
                        Tout ignorer
                      </button>
                      <button
                        onClick={() => setAllConflictsResolution('overwrite')}
                        className="text-xs px-2 py-1 rounded bg-orange-200 dark:bg-orange-900/50 hover:bg-orange-300 dark:hover:bg-orange-900 transition"
                      >
                        Tout écraser
                      </button>
                      <button
                        onClick={() => setAllConflictsResolution('duplicate')}
                        className="text-xs px-2 py-1 rounded bg-blue-200 dark:bg-blue-900/50 hover:bg-blue-300 dark:hover:bg-blue-900 transition"
                      >
                        Tout dupliquer
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {analysis.conflicts.map((conflict, idx) => {
                      const resolution = resolutions.conflicts?.find(r => r.index === conflict.index);
                      return (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {conflict.importTask.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Existe déjà sur le serveur ({conflict.existingTasks.length} correspondance{conflict.existingTasks.length > 1 ? 's' : ''})
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => updateConflictResolution(conflict.index, 'skip')}
                                className={`p-2 rounded transition ${
                                  resolution?.resolution === 'skip'
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                                }`}
                                title="Ignorer"
                              >
                                <SkipForward className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateConflictResolution(conflict.index, 'overwrite')}
                                className={`p-2 rounded transition ${
                                  resolution?.resolution === 'overwrite'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                                }`}
                                title="Écraser"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateConflictResolution(conflict.index, 'duplicate')}
                                className={`p-2 rounded transition ${
                                  resolution?.resolution === 'duplicate'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                                }`}
                                title="Dupliquer"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <SkipForward className="h-3 w-3" /> Ignorer
                    </span>
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Écraser
                    </span>
                    <span className="flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Dupliquer
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-full max-w-md mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Import en cours...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                Veuillez patienter...
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && results && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Import terminé !
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {results.created}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Créées</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {results.updated}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Mises à jour</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {results.skipped}
                  </div>
                  <div className="text-sm text-gray-500">Ignorées</div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    Erreurs ({results.errors.length})
                  </h4>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {results.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        {err.title || `Tâche ${err.index}`}: {err.error}
                      </li>
                    ))}
                    {results.errors.length > 5 && (
                      <li className="italic">... et {results.errors.length - 5} autres erreurs</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            {step === 'upload' && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!file}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyser
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Retour
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition"
                >
                  Importer
                </button>
              </>
            )}

            {step === 'complete' && (
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
