import { useState, useCallback } from 'react';
import { tasksService } from '../services/tasks';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksService.getTasks(params);
      setTasks(data.tasks);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des tâches');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await tasksService.getStats();
      setStats(data);
      return data;
    } catch (err) {
      console.error('Erreur lors du chargement des stats:', err);
    }
  }, []);

  const createTask = useCallback(async (taskData) => {
    const data = await tasksService.createTask(taskData);
    setTasks(prev => [data.task, ...prev]);
    return data.task;
  }, []);

  const updateTask = useCallback(async (id, taskData) => {
    const data = await tasksService.updateTask(id, taskData);
    setTasks(prev => prev.map(t => t.id === id ? data.task : t));
    return data.task;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await tasksService.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const completeTask = useCallback(async (id) => {
    const data = await tasksService.completeTask(id);
    setTasks(prev => prev.map(t => t.id === id ? data.task : t));
    return data.task;
  }, []);

  const reopenTask = useCallback(async (id) => {
    const data = await tasksService.reopenTask(id);
    setTasks(prev => prev.map(t => t.id === id ? data.task : t));
    return data.task;
  }, []);

  return {
    tasks,
    loading,
    error,
    stats,
    fetchTasks,
    fetchStats,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask
  };
}
