import api from './api';

export const tasksService = {
  async getTasks(params = {}) {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  async getTask(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async createTask(data) {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  async updateTask(id, data) {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id) {
    await api.delete(`/tasks/${id}`);
  },

  async completeTask(id) {
    const response = await api.patch(`/tasks/${id}/complete`);
    return response.data;
  },

  async reopenTask(id) {
    const response = await api.patch(`/tasks/${id}/reopen`);
    return response.data;
  },

  async getStats() {
    const response = await api.get('/tasks/stats');
    return response.data;
  },

  async exportTasks(format = 'json') {
    const response = await api.get('/tasks/export', {
      params: { format },
      responseType: 'blob'
    });
    return response;
  }
};
