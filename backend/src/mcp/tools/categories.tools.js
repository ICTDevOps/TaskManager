const prisma = require('../../config/database')

/**
 * Définitions des outils MCP pour les catégories
 */
const getToolDefinitions = () => [
  {
    name: 'categories_list',
    description: 'Liste toutes les catégories de l\'utilisateur',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'categories_create',
    description: 'Crée une nouvelle catégorie',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nom de la catégorie (requis)'
        },
        color: {
          type: 'string',
          description: 'Couleur hexadécimale (ex: #FF5733). Défaut: #6366f1'
        }
      },
      required: ['name']
    }
  }
]

/**
 * Vérifie une permission du token
 */
const checkPermission = (apiToken, permission) => {
  if (!apiToken) return true // JWT a tous les droits
  return apiToken.permissions?.[permission] === true
}

/**
 * Handler pour les outils categories_*
 */
const handleTool = async (name, args, user, apiToken) => {
  switch (name) {
    case 'categories_list':
      return await listCategories(args, user, apiToken)
    case 'categories_create':
      return await createCategory(args, user, apiToken)
    default:
      return {
        content: [{ type: 'text', text: `Outil inconnu: ${name}` }],
        isError: true
      }
  }
}

/**
 * Liste les catégories
 */
const listCategories = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canReadCategories')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canReadCategories requis.' }],
      isError: true
    }
  }

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      color: true,
      createdAt: true,
      _count: {
        select: { tasks: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  const result = {
    count: categories.length,
    categories: categories.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      taskCount: c._count.tasks,
      createdAt: c.createdAt.toISOString()
    }))
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  }
}

/**
 * Crée une catégorie
 */
const createCategory = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canCreateCategories')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canCreateCategories requis.' }],
      isError: true
    }
  }

  const { name, color = '#6366f1' } = args

  if (!name || name.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Le nom de la catégorie est requis.' }],
      isError: true
    }
  }

  // Vérifier si une catégorie avec ce nom existe déjà
  const existing = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: { equals: name.trim(), mode: 'insensitive' }
    }
  })

  if (existing) {
    return {
      content: [{ type: 'text', text: `Une catégorie "${name}" existe déjà.` }],
      isError: true
    }
  }

  // Valider le format de la couleur
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  if (!colorRegex.test(color)) {
    return {
      content: [{ type: 'text', text: 'Format de couleur invalide. Utilisez le format hexadécimal (#RRGGBB).' }],
      isError: true
    }
  }

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name: name.trim(),
      color: color
    }
  })

  const result = {
    message: 'Catégorie créée avec succès.',
    category: {
      id: category.id,
      name: category.name,
      color: category.color,
      createdAt: category.createdAt.toISOString()
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  }
}

module.exports = {
  getToolDefinitions,
  handleTool
}
