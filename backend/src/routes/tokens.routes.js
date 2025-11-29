const express = require('express')
const router = express.Router()
const tokensController = require('../controllers/tokens.controller')
const authMiddleware = require('../middleware/auth')

// Toutes les routes nécessitent une authentification JWT (pas PAT)
// Car on ne veut pas qu'un token puisse créer d'autres tokens
router.use(authMiddleware)

// GET /api/v1/tokens - Liste les tokens de l'utilisateur
router.get('/', tokensController.listTokens)

// POST /api/v1/tokens - Crée un nouveau token
router.post('/', tokensController.createToken)

// GET /api/v1/tokens/:id - Récupère un token
router.get('/:id', tokensController.getToken)

// PATCH /api/v1/tokens/:id - Met à jour un token
router.patch('/:id', tokensController.updateToken)

// POST /api/v1/tokens/:id/revoke - Révoque un token
router.post('/:id/revoke', tokensController.revokeToken)

// DELETE /api/v1/tokens/:id - Supprime définitivement un token
router.delete('/:id', tokensController.deleteToken)

module.exports = router
