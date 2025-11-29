const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getActivityLog } = require('../controllers/activity.controller');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Récupérer le journal d'activité
router.get('/', getActivityLog);

module.exports = router;
