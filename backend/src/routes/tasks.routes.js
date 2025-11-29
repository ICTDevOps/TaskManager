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
const { hybridAuthMiddleware, checkPatPermission } = require('../middleware/pat');

const router = express.Router();

// All routes require authentication (JWT or PAT)
router.use(hybridAuthMiddleware);

// Stats (lecture seule)
router.get('/stats', checkPatPermission('canReadTasks'), getStats);

// Export (lecture seule)
router.get('/export', checkPatPermission('canReadTasks'), exportTasks);

// CRUD avec vérification des permissions PAT
router.get('/', checkPatPermission('canReadTasks'), getTasks);
router.get('/:id', checkPatPermission('canReadTasks'), getTask);
router.post('/', checkPatPermission('canCreateTasks'), createTask);
router.put('/:id', checkPatPermission('canUpdateTasks'), updateTask);
router.delete('/:id', checkPatPermission('canDeleteTasks'), deleteTask);

// Status actions (considérées comme des updates)
router.patch('/:id/complete', checkPatPermission('canUpdateTasks'), completeTask);
router.patch('/:id/reopen', checkPatPermission('canUpdateTasks'), reopenTask);

module.exports = router;
