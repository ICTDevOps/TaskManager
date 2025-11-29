import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(identifier, password) {
    const response = await api.post('/auth/login', { identifier, password });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },

  async updateEmail(newEmail, password) {
    const response = await api.patch('/auth/email', { newEmail, password });
    return response.data;
  },

  async updatePassword(currentPassword, newPassword) {
    const response = await api.patch('/auth/password', { currentPassword, newPassword });
    return response.data;
  },

  async updateDefaultContext(defaultContext) {
    const response = await api.patch('/auth/default-context', { defaultContext });
    return response.data;
  }
};
