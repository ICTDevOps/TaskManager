import { useState, useEffect, useRef } from 'react';
import { X, Plus, Pencil, Trash2, Tag, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6b7280', // Gray
  '#1f2937', // Dark
];

export default function CategoryManager({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingCategory(null);
      setFormData({ name: '', color: '#6366f1' });
      setError('');
      setColorPickerOpen(false);
    }
  }, [isOpen]);

  // Fermer le color picker quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setLoading(true);
    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, formData);
      } else {
        await onCreateCategory(formData);
      }
      setFormData({ name: '', color: '#6366f1' });
      setEditingCategory(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color });
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: '#6366f1' });
    setError('');
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ? Les tâches associées ne seront pas supprimées.`)) {
      return;
    }
    try {
      await onDeleteCategory(category.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gérer les catégories
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom de la catégorie"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              />
            </div>

            {/* Color picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                type="button"
                onClick={() => setColorPickerOpen(!colorPickerOpen)}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 transition hover:border-primary"
                style={{ backgroundColor: formData.color }}
              />
              {colorPickerOpen && (
                <div className="absolute right-0 top-full mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 grid grid-cols-6 gap-1 z-10 w-40">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, color }));
                        setColorPickerOpen(false);
                      }}
                      className={`w-5 h-5 rounded transition hover:scale-110 ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {editingCategory ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingCategory ? 'Modifier' : 'Ajouter'}
            </button>

            {editingCategory && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Annuler
              </button>
            )}
          </div>
        </form>

        {/* Categories list */}
        <div className="flex-1 overflow-y-auto p-4">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune catégorie</p>
              <p className="text-sm">Créez votre première catégorie ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </span>
                    {category._count?.tasks > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                        {category._count.tasks} tâche{category._count.tasks > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-400"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
