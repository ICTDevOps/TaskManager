const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  reopenTask,
  getStats,
  exportTasks
} = require('../controllers/tasks.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Stats
router.get('/stats', getStats);

// Export
router.get('/export', exportTasks);

// CRUD
router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Status actions
router.patch('/:id/complete', completeTask);
router.patch('/:id/reopen', reopenTask);

module.exports = router;
