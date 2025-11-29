const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categories.controller');
const { hybridAuthMiddleware, checkPatPermission } = require('../middleware/pat');

const router = express.Router();

// All routes require authentication (JWT or PAT)
router.use(hybridAuthMiddleware);

// Lecture des catégories
router.get('/', checkPatPermission('canReadCategories'), getCategories);
router.get('/:id', checkPatPermission('canReadCategories'), getCategory);

// Création de catégorie
router.post('/', checkPatPermission('canCreateCategories'), createCategory);

// Modification et suppression (pas de permission PAT pour ça, JWT uniquement)
// Les PAT ne peuvent pas modifier/supprimer des catégories pour des raisons de sécurité
router.put('/:id', (req, res, next) => {
  if (req.authMethod === 'pat') {
    return res.status(403).json({ error: 'Les tokens API ne peuvent pas modifier les catégories.' });
  }
  next();
}, updateCategory);

router.delete('/:id', (req, res, next) => {
  if (req.authMethod === 'pat') {
    return res.status(403).json({ error: 'Les tokens API ne peuvent pas supprimer les catégories.' });
  }
  next();
}, deleteCategory);

module.exports = router;
