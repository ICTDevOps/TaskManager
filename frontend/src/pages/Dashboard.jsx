import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import FilterBar from '../components/FilterBar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CategoryManager from '../components/CategoryManager';
import SettingsPanel from '../components/SettingsPanel';
import SharingPanel from '../components/SharingPanel';
import ContextSelector from '../components/ContextSelector';
import ActivityLogPanel from '../components/ActivityLogPanel';
import EmptyState from '../components/EmptyState';
import { ToastContainer } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useCategories } from '../hooks/useCategories';
import { delegationService } from '../services/delegations';
import { authService } from '../services/auth';

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const [defaultContext, setDefaultContext] = useState(user?.defaultContext || 'self');

  const {
    tasks,
    loading,
    stats,
    fetchTasks,
    fetchStats,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask
  } = useTasks();

  const {
    categories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  } = useCategories();

  // Context (self or owner ID for delegated tasks)
  const [currentContext, setCurrentContext] = useState('self');
  const [delegations, setDelegations] = useState({ given: [], received: [], pendingCount: 0 });
  const [currentPermissions, setCurrentPermissions] = useState(null);

  // Filters
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [sharingPanelOpen, setSharingPanelOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load delegations
  const loadDelegations = useCallback(async () => {
    try {
      const data = await delegationService.getDelegations();
      setDelegations(data);
    } catch (err) {
      console.error('Error loading delegations:', err);
    }
  }, []);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const params = {
        status,
        sort_by: sortBy,
        sort_order: sortOrder,
        search,
        categoryId: categoryId || undefined
      };

      if (currentContext && currentContext !== 'self') {
        params.ownerId = currentContext;
      }

      await fetchTasks(params);
    } catch {
      addToast('Erreur lors du chargement des tâches', 'error');
    }
  }, [fetchTasks, status, sortBy, sortOrder, search, categoryId, currentContext, addToast]);

  // Load categories based on context
  const loadCategories = useCallback(async () => {
    try {
      if (currentContext && currentContext !== 'self') {
        const data = await delegationService.getOwnerCategories(currentContext);
        // This updates the categories state, but we need to use a different approach
        // For now, we'll use fetchCategories and pass ownerId
      }
      await fetchCategories(currentContext !== 'self' ? currentContext : undefined);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, [fetchCategories, currentContext]);

  useEffect(() => {
    loadTasks();
    if (currentContext === 'self') {
      fetchStats();
    }
    loadCategories();
  }, [loadTasks, fetchStats, loadCategories, currentContext]);

  useEffect(() => {
    loadDelegations();
  }, [loadDelegations]);

  // Initialiser le contexte par défaut au chargement des délégations
  useEffect(() => {
    if (user?.defaultContext && user.defaultContext !== 'self') {
      // Vérifier que la délégation existe toujours et est acceptée
      const validDelegation = delegations.received.find(
        d => d.owner.id === user.defaultContext && d.status === 'accepted'
      );
      if (validDelegation) {
        setCurrentContext(user.defaultContext);
      } else {
        // Si la délégation n'existe plus, revenir à "self"
        setCurrentContext('self');
      }
    }
    setDefaultContext(user?.defaultContext || 'self');
  }, [user?.defaultContext, delegations.received]);

  // Update permissions when context changes
  useEffect(() => {
    if (currentContext && currentContext !== 'self') {
      const delegation = delegations.received.find(
        d => d.owner.id === currentContext && d.status === 'accepted'
      );
      if (delegation) {
        setCurrentPermissions({
          canCreateTasks: delegation.canCreateTasks,
          canEditTasks: delegation.canEditTasks,
          canDeleteTasks: delegation.canDeleteTasks,
          canCreateCategories: delegation.canCreateCategories
        });
      }
    } else {
      setCurrentPermissions(null);
    }
  }, [currentContext, delegations.received]);

  // Get current owner name for header
  const getCurrentOwnerName = () => {
    if (currentContext === 'self') return null;
    const delegation = delegations.received.find(d => d.owner.id === currentContext);
    if (delegation) {
      const owner = delegation.owner;
      if (owner.firstName || owner.lastName) {
        return `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
      }
      return owner.username;
    }
    return null;
  };

  // Mettre à jour le contexte par défaut
  const handleSetDefaultContext = async (context) => {
    try {
      const data = await authService.updateDefaultContext(context);
      setDefaultContext(context);
      if (updateUser && data.user) {
        updateUser(data.user);
      }
      addToast('Contexte par défaut mis à jour', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la mise à jour', 'error');
    }
  };

  // Check if can perform action
  const canCreate = currentContext === 'self' || currentPermissions?.canCreateTasks;
  const canEdit = currentContext === 'self' || currentPermissions?.canEditTasks;
  const canDelete = currentContext === 'self' || currentPermissions?.canDeleteTasks;
  const canCreateCat = currentContext === 'self' || currentPermissions?.canCreateCategories;

  // Handlers
  const handleCreateTask = async (data) => {
    try {
      if (currentContext !== 'self') {
        data.ownerId = currentContext;
      }
      await createTask(data);
      addToast('Tâche créée avec succès', 'success');
      if (currentContext === 'self') fetchStats();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la création', 'error');
    }
  };

  const handleUpdateTask = async (data) => {
    try {
      await updateTask(editingTask.id, data);
      addToast('Tâche modifiée avec succès', 'success');
      setEditingTask(null);
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la modification', 'error');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      addToast('Tâche supprimée', 'success');
      if (currentContext === 'self') fetchStats();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      await completeTask(id);
      addToast('Tâche terminée', 'success');
      if (currentContext === 'self') fetchStats();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleReopenTask = async (id) => {
    try {
      await reopenTask(id);
      addToast('Tâche réouverte', 'success');
      if (currentContext === 'self') fetchStats();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  // Category handlers
  const handleCreateCategory = async (data) => {
    try {
      if (currentContext !== 'self') {
        data.ownerId = currentContext;
      }
      await createCategory(data);
      addToast('Catégorie créée', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la création', 'error');
    }
  };

  const handleUpdateCategory = async (id, data) => {
    try {
      await updateCategory(id, data);
      addToast('Catégorie modifiée', 'success');
      loadTasks();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la modification', 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      addToast('Catégorie supprimée', 'success');
      if (categoryId === id) {
        setCategoryId('');
      }
      loadTasks();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
  };

  const handleContextChange = (context) => {
    setCurrentContext(context);
    setCategoryId(''); // Reset category filter when changing context
    setSearch(''); // Reset search
  };

  const openCreateModal = () => {
    if (!canCreate) {
      addToast('Vous n\'avez pas la permission de créer des tâches', 'error');
      return;
    }
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    if (!canEdit) {
      addToast('Vous n\'avez pas la permission de modifier des tâches', 'error');
      return;
    }
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSharingClose = () => {
    setSharingPanelOpen(false);
    loadDelegations(); // Refresh delegations when closing
  };

  const isSearching = search.length > 0 || status !== 'all' || categoryId !== '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        stats={currentContext === 'self' ? stats : null}
        onOpenCategories={() => setCategoryManagerOpen(true)}
        onOpenSettings={() => setSettingsPanelOpen(true)}
        onOpenSharing={() => setSharingPanelOpen(true)}
        onOpenActivityLog={() => setActivityLogOpen(true)}
        pendingInvitations={delegations.pendingCount}
        currentContext={currentContext}
        currentOwnerName={getCurrentOwnerName()}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Context Selector */}
        <div className="mb-4 flex items-center justify-between">
          <ContextSelector
            currentContext={currentContext}
            onContextChange={handleContextChange}
            delegationsReceived={delegations.received}
            pendingCount={delegations.pendingCount}
            defaultContext={defaultContext}
            onSetDefaultContext={handleSetDefaultContext}
          />

          {/* Permissions indicator for delegated context */}
          {currentContext !== 'self' && currentPermissions && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Droits:</span>
              {canCreate && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Créer</span>}
              {canEdit && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Modifier</span>}
              {canDelete && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Supprimer</span>}
              {canCreateCat && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Catégories</span>}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <FilterBar
          status={status}
          setStatus={setStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          search={search}
          setSearch={setSearch}
          categories={categories}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
        />

        {/* Refresh button */}
        <div className="flex justify-end mt-4 mb-2">
          <button
            onClick={loadTasks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Tasks list */}
        <div className="space-y-3">
          {loading && tasks.length === 0 ? (
            // Skeleton loader
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))
          ) : tasks.length === 0 ? (
            <EmptyState isSearching={isSearching} onCreateTask={canCreate ? openCreateModal : null} />
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={canEdit ? handleCompleteTask : null}
                onReopen={canEdit ? handleReopenTask : null}
                onEdit={canEdit ? openEditModal : null}
                onDelete={canDelete ? handleDeleteTask : null}
              />
            ))
          )}
        </div>
      </main>

      {/* Floating action button */}
      {canCreate && (
        <button
          onClick={openCreateModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center transition transform hover:scale-105"
          title="Nouvelle tâche"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Task modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        categories={categories}
      />

      {/* Category manager */}
      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        categories={categories}
        onCreateCategory={canCreateCat ? handleCreateCategory : null}
        onUpdateCategory={currentContext === 'self' ? handleUpdateCategory : null}
        onDeleteCategory={currentContext === 'self' ? handleDeleteCategory : null}
        readOnly={currentContext !== 'self' && !canCreateCat}
      />

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        user={user}
        onUserUpdate={updateUser}
      />

      {/* Sharing panel */}
      <SharingPanel
        isOpen={sharingPanelOpen}
        onClose={handleSharingClose}
        categories={categories}
      />

      {/* Activity log panel */}
      <ActivityLogPanel
        isOpen={activityLogOpen}
        onClose={() => setActivityLogOpen(false)}
        currentOwnerId={currentContext !== 'self' ? currentContext : null}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
