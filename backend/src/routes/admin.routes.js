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

module.exports = router;
