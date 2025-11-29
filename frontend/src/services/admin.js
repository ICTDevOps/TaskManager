import api from './api';

export const adminService = {
  async getStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  async getUser(id) {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  async updateUser(id, data) {
    const response = await api.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  async changeUserPassword(id, newPassword) {
    const response = await api.patch(`/admin/users/${id}/password`, { newPassword });
    return response.data;
  },

  async deleteUser(id, exportTasks = false) {
    const response = await api.delete(`/admin/users/${id}`, {
      params: { exportTasks }
    });
    return response.data;
  },

  async exportUserTasks(id, format = 'json') {
    const response = await api.get(`/admin/users/${id}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response;
  }
};
