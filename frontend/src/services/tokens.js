import api from './api'

/**
 * Liste les tokens API de l'utilisateur
 */
export const getTokens = async () => {
  const response = await api.get('/tokens')
  return response.data
}

/**
 * Crée un nouveau token API
 * @param {Object} data - { name, expiresIn?, permissions? }
 */
export const createToken = async (data) => {
  const response = await api.post('/tokens', data)
  return response.data
}

/**
 * Récupère un token spécifique
 * @param {string} id - ID du token
 */
export const getToken = async (id) => {
  const response = await api.get(`/tokens/${id}`)
  return response.data
}

/**
 * Met à jour un token
 * @param {string} id - ID du token
 * @param {Object} data - { name?, permissions? }
 */
export const updateToken = async (id, data) => {
  const response = await api.patch(`/tokens/${id}`, data)
  return response.data
}

/**
 * Révoque un token (le désactive)
 * @param {string} id - ID du token
 */
export const revokeToken = async (id) => {
  const response = await api.post(`/tokens/${id}/revoke`)
  return response.data
}

/**
 * Supprime définitivement un token
 * @param {string} id - ID du token
 */
export const deleteToken = async (id) => {
  const response = await api.delete(`/tokens/${id}`)
  return response.data
}
