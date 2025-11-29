import api from './api';

export const activityService = {
  // Récupérer le journal d'activité
  getActivityLog: async (params = {}) => {
    const response = await api.get('/activity', { params });
    return response.data;
  }
};

export default activityService;
