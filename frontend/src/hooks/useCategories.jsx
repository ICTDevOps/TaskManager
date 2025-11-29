import { useState, useCallback } from 'react';
import { categoriesService } from '../services/categories';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async (ownerId = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesService.getCategories(ownerId);
      setCategories(data.categories);
      return data.categories;
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des catégories');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    const data = await categoriesService.createCategory(categoryData);
    setCategories(prev => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)));
    return data.category;
  }, []);

  const updateCategory = useCallback(async (id, categoryData) => {
    const data = await categoriesService.updateCategory(id, categoryData);
    setCategories(prev => prev.map(c => c.id === id ? data.category : c).sort((a, b) => a.name.localeCompare(b.name)));
    return data.category;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await categoriesService.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
