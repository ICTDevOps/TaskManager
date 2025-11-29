const express = require('express');
const {
  getStats,
  getUsers,
  getUser,
  updateUser,
  changeUserPassword,
  deleteUser,
  exportUserTasks
} = require('../controllers/admin.controller');
const {
  adminAnalyzeImport,
  adminApplyImport
} = require('../controllers/import.controller');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// All routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard stats
router.get('/stats', getStats);

// Users management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/password', changeUserPassword);
router.delete('/users/:id', deleteUser);
router.get('/users/:id/export', exportUserTasks);

// Import de tâches pour un utilisateur
router.post('/users/:id/import/analyze', adminAnalyzeImport);
router.post('/users/:id/import/apply', adminApplyImport);

module.exports = router;
