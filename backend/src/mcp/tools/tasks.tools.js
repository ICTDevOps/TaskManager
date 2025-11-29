const prisma = require('../../config/database')

/**
 * Définitions des outils MCP pour les tâches
 */
const getToolDefinitions = () => [
  {
    name: 'tasks_list',
    description: 'Liste les tâches de l\'utilisateur avec filtres optionnels',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'active', 'completed'],
          description: 'Filtrer par statut (défaut: all)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'Filtrer par priorité'
        },
        categoryId: {
          type: 'string',
          description: 'ID de la catégorie pour filtrer'
        },
        search: {
          type: 'string',
          description: 'Recherche dans le titre et la description'
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de tâches à retourner (défaut: 50)'
        }
      }
    }
  },
  {
    name: 'tasks_get',
    description: 'Récupère les détails d\'une tâche spécifique',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tâche'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'tasks_create',
    description: 'Crée une nouvelle tâche',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titre de la tâche (requis)'
        },
        description: {
          type: 'string',
          description: 'Description détaillée'
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'Priorité (défaut: normal)'
        },
        dueDate: {
          type: 'string',
          description: 'Date d\'échéance au format YYYY-MM-DD'
        },
        dueTime: {
          type: 'string',
          description: 'Heure d\'échéance au format HH:MM'
        },
        categoryId: {
          type: 'string',
          description: 'ID de la catégorie'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'tasks_update',
    description: 'Modifie une tâche existante',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tâche à modifier'
        },
        title: {
          type: 'string',
          description: 'Nouveau titre'
        },
        description: {
          type: 'string',
          description: 'Nouvelle description'
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'Nouvelle priorité'
        },
        dueDate: {
          type: 'string',
          description: 'Nouvelle date d\'échéance (YYYY-MM-DD)'
        },
        dueTime: {
          type: 'string',
          description: 'Nouvelle heure d\'échéance (HH:MM)'
        },
        categoryId: {
          type: 'string',
          description: 'Nouvel ID de catégorie (null pour retirer)'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'tasks_complete',
    description: 'Marque une tâche comme terminée',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tâche à marquer comme terminée'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'tasks_reopen',
    description: 'Réouvre une tâche terminée',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tâche à réouvrir'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'tasks_delete',
    description: 'Supprime une tâche',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tâche à supprimer'
        }
      },
      required: ['taskId']
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
 * Handler pour les outils tasks_*
 */
const handleTool = async (name, args, user, apiToken) => {
  switch (name) {
    case 'tasks_list':
      return await listTasks(args, user, apiToken)
    case 'tasks_get':
      return await getTask(args, user, apiToken)
    case 'tasks_create':
      return await createTask(args, user, apiToken)
    case 'tasks_update':
      return await updateTask(args, user, apiToken)
    case 'tasks_complete':
      return await completeTask(args, user, apiToken)
    case 'tasks_reopen':
      return await reopenTask(args, user, apiToken)
    case 'tasks_delete':
      return await deleteTask(args, user, apiToken)
    default:
      return {
        content: [{ type: 'text', text: `Outil inconnu: ${name}` }],
        isError: true
      }
  }
}

/**
 * Liste les tâches
 */
const listTasks = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canReadTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canReadTasks requis.' }],
      isError: true
    }
  }

  const { status = 'all', priority, categoryId, search, limit = 50 } = args || {}

  const where = { userId: user.id }

  if (status === 'active') where.status = 'active'
  else if (status === 'completed') where.status = 'completed'

  if (priority) where.importance = priority

  if (categoryId) where.categoryId = categoryId

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, color: true } }
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: Math.min(limit, 100)
  })

  const result = {
    count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.importance,
      dueDate: t.dueDate?.toISOString().split('T')[0],
      dueTime: t.dueTime,
      category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color } : null,
      completedAt: t.completedAt?.toISOString(),
      createdAt: t.createdAt.toISOString()
    }))
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  }
}

/**
 * Récupère une tâche
 */
const getTask = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canReadTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canReadTasks requis.' }],
      isError: true
    }
  }

  const { taskId } = args

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    include: {
      category: { select: { id: true, name: true, color: true } }
    }
  })

  if (!task) {
    return {
      content: [{ type: 'text', text: 'Tâche non trouvée.' }],
      isError: true
    }
  }

  const result = {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.importance,
    dueDate: task.dueDate?.toISOString().split('T')[0],
    dueTime: task.dueTime,
    category: task.category,
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  }
}

/**
 * Crée une tâche
 */
const createTask = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canCreateTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canCreateTasks requis.' }],
      isError: true
    }
  }

  const { title, description, priority = 'normal', dueDate, dueTime, categoryId } = args

  if (!title || title.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Le titre est requis.' }],
      isError: true
    }
  }

  // Vérifier la catégorie si spécifiée
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id }
    })
    if (!category) {
      return {
        content: [{ type: 'text', text: 'Catégorie non trouvée.' }],
        isError: true
      }
    }
  }

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      importance: priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      dueTime: dueTime || null,
      categoryId: categoryId || null
    },
    include: {
      category: { select: { id: true, name: true, color: true } }
    }
  })

  const result = {
    message: 'Tâche créée avec succès.',
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.importance,
      dueDate: task.dueDate?.toISOString().split('T')[0],
      dueTime: task.dueTime,
      category: task.category,
      createdAt: task.createdAt.toISOString()
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  }
}

/**
 * Met à jour une tâche
 */
const updateTask = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canUpdateTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canUpdateTasks requis.' }],
      isError: true
    }
  }

  const { taskId, title, description, priority, dueDate, dueTime, categoryId } = args

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id }
  })

  if (!existingTask) {
    return {
      content: [{ type: 'text', text: 'Tâche non trouvée.' }],
      isError: true
    }
  }

  const updateData = {}

  if (title !== undefined) {
    if (!title || title.trim().length === 0) {
      return {
        content: [{ type: 'text', text: 'Le titre ne peut pas être vide.' }],
        isError: true
      }
    }
    updateData.title = title.trim()
  }

  if (description !== undefined) updateData.description = description?.trim() || null
  if (priority !== undefined) updateData.importance = priority
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
  if (dueTime !== undefined) updateData.dueTime = dueTime || null

  if (categoryId !== undefined) {
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: user.id }
      })
      if (!category) {
        return {
          content: [{ type: 'text', text: 'Catégorie non trouvée.' }],
          isError: true
        }
      }
    }
    updateData.categoryId = categoryId || null
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      category: { select: { id: true, name: true, color: true } }
    }
  })

  const result = {
    message: 'Tâche mise à jour avec succès.',
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.importance,
      dueDate: task.dueDate?.toISOString().split('T')[0],
      dueTime: task.dueTime,
      category: task.category,
      updatedAt: task.updatedAt.toISOString()
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
  }
}

/**
 * Marque une tâche comme terminée
 */
const completeTask = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canUpdateTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canUpdateTasks requis.' }],
      isError: true
    }
  }

  const { taskId } = args

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id }
  })

  if (!existingTask) {
    return {
      content: [{ type: 'text', text: 'Tâche non trouvée.' }],
      isError: true
    }
  }

  if (existingTask.status === 'completed') {
    return {
      content: [{ type: 'text', text: 'La tâche est déjà terminée.' }]
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date()
    }
  })

  return {
    content: [{ type: 'text', text: JSON.stringify({
      message: 'Tâche marquée comme terminée.',
      taskId: task.id,
      title: task.title,
      completedAt: task.completedAt.toISOString()
    }, null, 2) }]
  }
}

/**
 * Réouvre une tâche
 */
const reopenTask = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canUpdateTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canUpdateTasks requis.' }],
      isError: true
    }
  }

  const { taskId } = args

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id }
  })

  if (!existingTask) {
    return {
      content: [{ type: 'text', text: 'Tâche non trouvée.' }],
      isError: true
    }
  }

  if (existingTask.status === 'active') {
    return {
      content: [{ type: 'text', text: 'La tâche est déjà active.' }]
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'active',
      completedAt: null
    }
  })

  return {
    content: [{ type: 'text', text: JSON.stringify({
      message: 'Tâche réouverte.',
      taskId: task.id,
      title: task.title,
      status: task.status
    }, null, 2) }]
  }
}

/**
 * Supprime une tâche
 */
const deleteTask = async (args, user, apiToken) => {
  if (!checkPermission(apiToken, 'canDeleteTasks')) {
    return {
      content: [{ type: 'text', text: 'Permission refusée: canDeleteTasks requis.' }],
      isError: true
    }
  }

  const { taskId } = args

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id }
  })

  if (!existingTask) {
    return {
      content: [{ type: 'text', text: 'Tâche non trouvée.' }],
      isError: true
    }
  }

  await prisma.task.delete({
    where: { id: taskId }
  })

  return {
    content: [{ type: 'text', text: JSON.stringify({
      message: 'Tâche supprimée.',
      taskId: existingTask.id,
      title: existingTask.title
    }, null, 2) }]
  }
}

module.exports = {
  getToolDefinitions,
  handleTool
}
