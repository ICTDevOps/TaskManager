import { useState, useEffect } from 'react';
import { X, UserPlus, Users, Check, X as XIcon, Edit2, Trash2, Shield, Eye, Plus, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { delegationService } from '../services/delegations';

export default function SharingPanel({ isOpen, onClose, categories = [] }) {
  const [delegations, setDelegations] = useState({ given: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulaire d'invitation
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    identifier: '',
    canCreateTasks: false,
    canEditTasks: false,
    canDeleteTasks: false,
    canCreateCategories: false,
    hiddenCategoryIds: []
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Édition des permissions
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  // Expansion des détails
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDelegations();
    }
  }, [isOpen]);

  const loadDelegations = async () => {
    try {
      setLoading(true);
      const data = await delegationService.getDelegations();
      setDelegations(data);
    } catch (err) {
      setError('Erreur lors du chargement des partages.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviteLoading(true);

    try {
      await delegationService.createDelegation(inviteData);
      setSuccess('Invitation envoyée avec succès.');
      setShowInviteForm(false);
      setInviteData({
        identifier: '',
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canCreateCategories: false,
        hiddenCategoryIds: []
      });
      loadDelegations();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi de l\'invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await delegationService.acceptDelegation(id);
      setSuccess('Invitation acceptée.');
      loadDelegations();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'acceptation.');
    }
  };

  const handleReject = async (id) => {
    try {
      await delegationService.rejectDelegation(id);
      setSuccess('Invitation refusée.');
      loadDelegations();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du refus.');
    }
  };

  const handleLeave = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir quitter ce partage ?')) return;
    try {
      await delegationService.leaveDelegation(id);
      setSuccess('Vous avez quitté ce partage.');
      loadDelegations();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce partage ?')) return;
    try {
      await delegationService.deleteDelegation(id);
      setSuccess('Partage supprimé.');
      loadDelegations();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression.');
    }
  };

  const handleStartEdit = (delegation) => {
    setEditingId(delegation.id);
    setEditData({
      canCreateTasks: delegation.canCreateTasks,
      canEditTasks: delegation.canEditTasks,
      canDeleteTasks: delegation.canDeleteTasks,
      canCreateCategories: delegation.canCreateCategories,
      hiddenCategoryIds: delegation.hiddenCategoryIds || []
    });
  };

  const handleSaveEdit = async () => {
    try {
      await delegationService.updateDelegation(editingId, editData);
      setSuccess('Permissions mises à jour.');
      setEditingId(null);
      setEditData(null);
      loadDelegations();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour.');
    }
  };

  const toggleHiddenCategory = (categoryId, isInvite = false) => {
    if (isInvite) {
      setInviteData(prev => ({
        ...prev,
        hiddenCategoryIds: prev.hiddenCategoryIds.includes(categoryId)
          ? prev.hiddenCategoryIds.filter(id => id !== categoryId)
          : [...prev.hiddenCategoryIds, categoryId]
      }));
    } else {
      setEditData(prev => ({
        ...prev,
        hiddenCategoryIds: prev.hiddenCategoryIds.includes(categoryId)
          ? prev.hiddenCategoryIds.filter(id => id !== categoryId)
          : [...prev.hiddenCategoryIds, categoryId]
      }));
    }
  };

  const getDisplayName = (user) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Partages</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Section: Personnes qui gèrent mes tâches */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Personnes qui gèrent mes tâches
                  </h3>
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"
                  >
                    <UserPlus className="h-4 w-4" />
                    Inviter
                  </button>
                </div>

                {/* Formulaire d'invitation */}
                {showInviteForm && (
                  <form onSubmit={handleInvite} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email ou nom d'utilisateur
                      </label>
                      <input
                        type="text"
                        value={inviteData.identifier}
                        onChange={(e) => setInviteData({ ...inviteData, identifier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="utilisateur@email.com"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Permissions
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={inviteData.canCreateTasks}
                            onChange={(e) => setInviteData({ ...inviteData, canCreateTasks: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Peut créer des tâches
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={inviteData.canEditTasks}
                            onChange={(e) => setInviteData({ ...inviteData, canEditTasks: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Peut modifier des tâches
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={inviteData.canDeleteTasks}
                            onChange={(e) => setInviteData({ ...inviteData, canDeleteTasks: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Peut supprimer des tâches
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={inviteData.canCreateCategories}
                            onChange={(e) => setInviteData({ ...inviteData, canCreateCategories: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Peut créer des catégories
                        </label>
                      </div>
                    </div>

                    {categories.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Catégories à masquer
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleHiddenCategory(cat.id, true)}
                              className={`px-2 py-1 text-xs rounded-full border transition ${
                                inviteData.hiddenCategoryIds.includes(cat.id)
                                  ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                                  : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {inviteData.hiddenCategoryIds.includes(cat.id) ? '🚫 ' : ''}{cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={inviteLoading}
                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50"
                      >
                        {inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInviteForm(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}

                {/* Liste des délégations données */}
                {delegations.given.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Personne ne gère vos tâches pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {delegations.given.map(delegation => (
                      <div key={delegation.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {(delegation.delegate.firstName?.[0] || delegation.delegate.username[0]).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {getDisplayName(delegation.delegate)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                @{delegation.delegate.username}
                                {delegation.status === 'pending' && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                                    En attente
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(expandedId === delegation.id ? null : delegation.id)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            >
                              {expandedId === delegation.id ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleStartEdit(delegation)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            >
                              <Edit2 className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(delegation.id)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>

                        {/* Détails étendus ou édition */}
                        {(expandedId === delegation.id || editingId === delegation.id) && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            {editingId === delegation.id ? (
                              // Mode édition
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <input
                                      type="checkbox"
                                      checked={editData.canCreateTasks}
                                      onChange={(e) => setEditData({ ...editData, canCreateTasks: e.target.checked })}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Peut créer des tâches
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <input
                                      type="checkbox"
                                      checked={editData.canEditTasks}
                                      onChange={(e) => setEditData({ ...editData, canEditTasks: e.target.checked })}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Peut modifier des tâches
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <input
                                      type="checkbox"
                                      checked={editData.canDeleteTasks}
                                      onChange={(e) => setEditData({ ...editData, canDeleteTasks: e.target.checked })}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Peut supprimer des tâches
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <input
                                      type="checkbox"
                                      checked={editData.canCreateCategories}
                                      onChange={(e) => setEditData({ ...editData, canCreateCategories: e.target.checked })}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Peut créer des catégories
                                  </label>
                                </div>

                                {categories.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                      Catégories à masquer :
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {categories.map(cat => (
                                        <button
                                          key={cat.id}
                                          type="button"
                                          onClick={() => toggleHiddenCategory(cat.id)}
                                          className={`px-2 py-1 text-xs rounded-full border transition ${
                                            editData.hiddenCategoryIds.includes(cat.id)
                                              ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                                              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          {editData.hiddenCategoryIds.includes(cat.id) ? '🚫 ' : ''}{cat.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary-dark"
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setEditData(null); }}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Mode affichage
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                <p className="mb-1">Permissions :</p>
                                <div className="flex flex-wrap gap-2">
                                  <span className={`px-2 py-0.5 rounded ${delegation.canCreateTasks ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    {delegation.canCreateTasks ? '✓' : '✗'} Créer
                                  </span>
                                  <span className={`px-2 py-0.5 rounded ${delegation.canEditTasks ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    {delegation.canEditTasks ? '✓' : '✗'} Modifier
                                  </span>
                                  <span className={`px-2 py-0.5 rounded ${delegation.canDeleteTasks ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    {delegation.canDeleteTasks ? '✓' : '✗'} Supprimer
                                  </span>
                                  <span className={`px-2 py-0.5 rounded ${delegation.canCreateCategories ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    {delegation.canCreateCategories ? '✓' : '✗'} Catégories
                                  </span>
                                </div>
                                {delegation.hiddenCategoryIds?.length > 0 && (
                                  <p className="mt-2 text-gray-500">
                                    {delegation.hiddenCategoryIds.length} catégorie(s) masquée(s)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: Invitations reçues */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Invitations reçues
                </h3>

                {delegations.received.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Aucune invitation reçue.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {delegations.received.map(delegation => (
                      <div key={delegation.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {(delegation.owner.firstName?.[0] || delegation.owner.username[0]).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {getDisplayName(delegation.owner)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                @{delegation.owner.username}
                              </p>
                            </div>
                          </div>

                          {delegation.status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleAccept(delegation.id)}
                                className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />
                                Accepter
                              </button>
                              <button
                                onClick={() => handleReject(delegation.id)}
                                className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"
                              >
                                <XIcon className="h-3 w-3" />
                                Refuser
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 dark:text-green-400">Actif</span>
                              <button
                                onClick={() => handleLeave(delegation.id)}
                                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                Quitter
                              </button>
                            </div>
                          )}
                        </div>

                        {delegation.status === 'accepted' && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-2">
                              <span className={`px-2 py-0.5 rounded ${delegation.canCreateTasks ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {delegation.canCreateTasks ? '✓' : '✗'} Créer
                              </span>
                              <span className={`px-2 py-0.5 rounded ${delegation.canEditTasks ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {delegation.canEditTasks ? '✓' : '✗'} Modifier
                              </span>
                              <span className={`px-2 py-0.5 rounded ${delegation.canDeleteTasks ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {delegation.canDeleteTasks ? '✓' : '✗'} Supprimer
                              </span>
                              <span className={`px-2 py-0.5 rounded ${delegation.canCreateCategories ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {delegation.canCreateCategories ? '✓' : '✗'} Catégories
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
