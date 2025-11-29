const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  searchUsers,
  getDelegations,
  createDelegation,
  updateDelegation,
  deleteDelegation,
  acceptDelegation,
  rejectDelegation,
  leaveDelegation,
  getOwnerTasks,
  getOwnerCategories
} = require('../controllers/delegation.controller');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Recherche d'utilisateurs
router.get('/search-users', searchUsers);

// CRUD délégations
router.get('/', getDelegations);
router.post('/', createDelegation);
router.put('/:id', updateDelegation);
router.patch('/:id', updateDelegation);
router.delete('/:id', deleteDelegation);

// Actions sur les invitations
router.post('/:id/accept', acceptDelegation);
router.post('/:id/reject', rejectDelegation);
router.post('/:id/leave', leaveDelegation);

// Accès aux données d'un owner (pour les délégués)
router.get('/:ownerId/tasks', getOwnerTasks);
router.get('/:ownerId/categories', getOwnerCategories);

module.exports = router;
