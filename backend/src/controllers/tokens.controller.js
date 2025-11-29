const crypto = require('crypto')
const prisma = require('../config/database')
const { hashToken } = require('../middleware/pat')

/**
 * Génère un token PAT sécurisé
 * Format: pat_[4 premiers chars du userId]_[32 chars aléatoires]
 */
const generateToken = (userId) => {
  const prefix = userId.substring(0, 4)
  const random = crypto.randomBytes(24).toString('base64url') // 32 chars
  return `pat_${prefix}_${random}`
}

/**
 * Liste les tokens de l'utilisateur connecté
 * GET /api/v1/tokens
 */
const listTokens = async (req, res, next) => {
  try {
    const tokens = await prisma.apiToken.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        canReadTasks: true,
        canCreateTasks: true,
        canUpdateTasks: true,
        canDeleteTasks: true,
        canReadCategories: true,
        canCreateCategories: true,
        lastUsedAt: true,
        lastUsedIp: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ tokens })
  } catch (error) {
    next(error)
  }
}

/**
 * Crée un nouveau token API
 * POST /api/v1/tokens
 *
 * Body:
 * - name: string (requis) - Nom du token
 * - expiresIn: number (optionnel) - Durée de vie en jours
 * - permissions: object (optionnel) - Permissions du token
 */
const createToken = async (req, res, next) => {
  try {
    // Vérifier si l'utilisateur peut créer des tokens
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { canCreateApiTokens: true }
    })

    if (!user?.canCreateApiTokens) {
      return res.status(403).json({
        error: 'Vous n\'êtes pas autorisé à créer des tokens API. Contactez un administrateur.'
      })
    }

    const { name, expiresIn, permissions = {} } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Le nom du token est requis.' })
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Le nom du token ne peut pas dépasser 100 caractères.' })
    }

    // Limiter le nombre de tokens par utilisateur
    const tokenCount = await prisma.apiToken.count({
      where: { userId: req.user.id }
    })

    if (tokenCount >= 10) {
      return res.status(400).json({
        error: 'Vous avez atteint la limite de 10 tokens. Supprimez un token existant pour en créer un nouveau.'
      })
    }

    // Générer le token
    const rawToken = generateToken(req.user.id)
    const tokenHash = hashToken(rawToken)
    const tokenPrefix = rawToken.substring(0, 12) + '...'

    // Calculer la date d'expiration si spécifiée
    let expiresAt = null
    if (expiresIn && typeof expiresIn === 'number' && expiresIn > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresIn)
    }

    // Créer le token en base
    const apiToken = await prisma.apiToken.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        tokenHash,
        tokenPrefix,
        expiresAt,
        canReadTasks: permissions.canReadTasks !== false,
        canCreateTasks: permissions.canCreateTasks === true,
        canUpdateTasks: permissions.canUpdateTasks === true,
        canDeleteTasks: permissions.canDeleteTasks === true,
        canReadCategories: permissions.canReadCategories !== false,
        canCreateCategories: permissions.canCreateCategories === true
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        canReadTasks: true,
        canCreateTasks: true,
        canUpdateTasks: true,
        canDeleteTasks: true,
        canReadCategories: true,
        canCreateCategories: true,
        expiresAt: true,
        createdAt: true
      }
    })

    // Retourner le token EN CLAIR une seule fois
    res.status(201).json({
      message: 'Token créé avec succès. Copiez-le maintenant, il ne sera plus jamais affiché.',
      token: rawToken,
      tokenInfo: apiToken
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Récupère les détails d'un token
 * GET /api/v1/tokens/:id
 */
const getToken = async (req, res, next) => {
  try {
    const { id } = req.params

    const token = await prisma.apiToken.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        canReadTasks: true,
        canCreateTasks: true,
        canUpdateTasks: true,
        canDeleteTasks: true,
        canReadCategories: true,
        canCreateCategories: true,
        lastUsedAt: true,
        lastUsedIp: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!token) {
      return res.status(404).json({ error: 'Token non trouvé.' })
    }

    res.json({ token })
  } catch (error) {
    next(error)
  }
}

/**
 * Met à jour un token (nom, permissions)
 * PATCH /api/v1/tokens/:id
 */
const updateToken = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, permissions } = req.body

    // Vérifier que le token appartient à l'utilisateur
    const existingToken = await prisma.apiToken.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    })

    if (!existingToken) {
      return res.status(404).json({ error: 'Token non trouvé.' })
    }

    const updateData = {}

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Le nom du token est requis.' })
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Le nom du token ne peut pas dépasser 100 caractères.' })
      }
      updateData.name = name.trim()
    }

    if (permissions !== undefined) {
      if (permissions.canReadTasks !== undefined) updateData.canReadTasks = !!permissions.canReadTasks
      if (permissions.canCreateTasks !== undefined) updateData.canCreateTasks = !!permissions.canCreateTasks
      if (permissions.canUpdateTasks !== undefined) updateData.canUpdateTasks = !!permissions.canUpdateTasks
      if (permissions.canDeleteTasks !== undefined) updateData.canDeleteTasks = !!permissions.canDeleteTasks
      if (permissions.canReadCategories !== undefined) updateData.canReadCategories = !!permissions.canReadCategories
      if (permissions.canCreateCategories !== undefined) updateData.canCreateCategories = !!permissions.canCreateCategories
    }

    const token = await prisma.apiToken.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        canReadTasks: true,
        canCreateTasks: true,
        canUpdateTasks: true,
        canDeleteTasks: true,
        canReadCategories: true,
        canCreateCategories: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      }
    })

    res.json({ message: 'Token mis à jour.', token })
  } catch (error) {
    next(error)
  }
}

/**
 * Révoque (désactive) un token
 * POST /api/v1/tokens/:id/revoke
 */
const revokeToken = async (req, res, next) => {
  try {
    const { id } = req.params

    // Vérifier que le token appartient à l'utilisateur
    const existingToken = await prisma.apiToken.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    })

    if (!existingToken) {
      return res.status(404).json({ error: 'Token non trouvé.' })
    }

    await prisma.apiToken.update({
      where: { id },
      data: { isActive: false }
    })

    res.json({ message: 'Token révoqué avec succès.' })
  } catch (error) {
    next(error)
  }
}

/**
 * Supprime définitivement un token
 * DELETE /api/v1/tokens/:id
 */
const deleteToken = async (req, res, next) => {
  try {
    const { id } = req.params

    // Vérifier que le token appartient à l'utilisateur
    const existingToken = await prisma.apiToken.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    })

    if (!existingToken) {
      return res.status(404).json({ error: 'Token non trouvé.' })
    }

    await prisma.apiToken.delete({
      where: { id }
    })

    res.json({ message: 'Token supprimé définitivement.' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listTokens,
  createToken,
  getToken,
  updateToken,
  revokeToken,
  deleteToken
}
