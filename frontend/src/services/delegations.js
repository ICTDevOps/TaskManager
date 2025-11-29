import api from './api';

export const delegationService = {
  // Récupérer toutes les délégations (données et reçues)
  getDelegations: async () => {
    const response = await api.get('/delegations');
    return response.data;
  },

  // Créer une nouvelle délégation (inviter quelqu'un)
  createDelegation: async (data) => {
    const response = await api.post('/delegations', data);
    return response.data;
  },

  // Modifier les permissions d'une délégation
  updateDelegation: async (id, data) => {
    const response = await api.patch(`/delegations/${id}`, data);
    return response.data;
  },

  // Supprimer une délégation
  deleteDelegation: async (id) => {
    const response = await api.delete(`/delegations/${id}`);
    return response.data;
  },

  // Accepter une invitation
  acceptDelegation: async (id) => {
    const response = await api.post(`/delegations/${id}/accept`);
    return response.data;
  },

  // Refuser une invitation
  rejectDelegation: async (id) => {
    const response = await api.post(`/delegations/${id}/reject`);
    return response.data;
  },

  // Se retirer d'une délégation
  leaveDelegation: async (id) => {
    const response = await api.post(`/delegations/${id}/leave`);
    return response.data;
  },

  // Récupérer les tâches d'un owner
  getOwnerTasks: async (ownerId, params = {}) => {
    const response = await api.get(`/tasks`, { params: { ...params, ownerId } });
    return response.data;
  },

  // Récupérer les catégories d'un owner
  getOwnerCategories: async (ownerId) => {
    const response = await api.get(`/categories`, { params: { ownerId } });
    return response.data;
  }
};

export default delegationService;
