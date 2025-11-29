import api from './api';

export const categoriesService = {
  async getCategories(ownerId = null) {
    const params = {};
    if (ownerId) {
      params.ownerId = ownerId;
    }
    const response = await api.get('/categories', { params });
    return response.data;
  },

  async getCategory(id) {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  async createCategory(data) {
    const response = await api.post('/categories', data);
    return response.data;
  },

  async updateCategory(id, data) {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id) {
    await api.delete(`/categories/${id}`);
  }
};
