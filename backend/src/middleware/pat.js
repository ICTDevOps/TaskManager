const crypto = require('crypto')
const prisma = require('../config/database')

/**
 * Hash un token PAT avec SHA-256
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Middleware d'authentification par PAT (Personal Access Token)
 * Supporte les tokens au format: pat_xxxx_xxxxxxxxxxxxxxxx
 *
 * Ajoute à req:
 * - req.user: l'utilisateur propriétaire du token
 * - req.apiToken: le token API avec ses permissions
 * - req.authMethod: 'pat' pour identifier la méthode d'auth
 */
const patMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis.' })
    }

    const token = authHeader.split(' ')[1]

    // Vérifier si c'est un PAT (commence par pat_)
    if (!token.startsWith('pat_')) {
      return res.status(401).json({ error: 'Token API invalide.' })
    }

    // Hasher le token pour le comparer
    const tokenHash = hashToken(token)

    // Rechercher le token en base
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            canCreateApiTokens: true
          }
        }
      }
    })

    if (!apiToken) {
      return res.status(401).json({ error: 'Token API invalide ou révoqué.' })
    }

    // Vérifier si le token est actif
    if (!apiToken.isActive) {
      return res.status(401).json({ error: 'Token API révoqué.' })
    }

    // Vérifier l'expiration
    if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
      return res.status(401).json({ error: 'Token API expiré.' })
    }

    // Vérifier si l'utilisateur est actif
    if (!apiToken.user.isActive) {
      return res.status(403).json({ error: 'Compte utilisateur désactivé.' })
    }

    // Mettre à jour la dernière utilisation (async, non bloquant)
    prisma.apiToken.update({
      where: { id: apiToken.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: req.ip || req.connection?.remoteAddress
      }
    }).catch(err => console.error('Erreur mise à jour lastUsedAt:', err))

    // Ajouter les infos à la requête
    req.user = apiToken.user
    req.apiToken = {
      id: apiToken.id,
      name: apiToken.name,
      permissions: {
        canReadTasks: apiToken.canReadTasks,
        canCreateTasks: apiToken.canCreateTasks,
        canUpdateTasks: apiToken.canUpdateTasks,
        canDeleteTasks: apiToken.canDeleteTasks,
        canReadCategories: apiToken.canReadCategories,
        canCreateCategories: apiToken.canCreateCategories
      }
    }
    req.authMethod = 'pat'

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware hybride: accepte JWT ou PAT
 * Utile pour les routes qui doivent supporter les deux méthodes
 */
const hybridAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis.' })
  }

  const token = authHeader.split(' ')[1]

  // Si c'est un PAT, utiliser patMiddleware
  if (token.startsWith('pat_')) {
    return patMiddleware(req, res, next)
  }

  // Sinon, utiliser le JWT classique
  const authMiddleware = require('./auth')
  return authMiddleware(req, res, next)
}

/**
 * Middleware pour vérifier une permission spécifique du PAT
 * Usage: checkPatPermission('canCreateTasks')
 */
const checkPatPermission = (permission) => {
  return (req, res, next) => {
    // Si ce n'est pas une auth PAT, laisser passer (JWT a tous les droits)
    if (req.authMethod !== 'pat') {
      return next()
    }

    // Vérifier la permission
    if (!req.apiToken?.permissions?.[permission]) {
      return res.status(403).json({
        error: `Permission insuffisante. Le token n'a pas la permission: ${permission}`
      })
    }

    next()
  }
}

module.exports = {
  patMiddleware,
  hybridAuthMiddleware,
  checkPatPermission,
  hashToken
}
