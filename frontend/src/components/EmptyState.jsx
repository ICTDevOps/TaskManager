import { ClipboardList, Search } from 'lucide-react';

export default function EmptyState({ isSearching, onCreateTask }) {
  if (isSearching) {
    return (
      <div className="text-center py-12">
        <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Aucune tâche trouvée
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Essayez de modifier vos critères de recherche
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <ClipboardList className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Aucune tâche
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Commencez par créer votre première tâche
      </p>
      <button
        onClick={onCreateTask}
        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition"
      >
        Créer une tâche
      </button>
    </div>
  );
}
