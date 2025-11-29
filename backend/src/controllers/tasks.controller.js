const { z } = require('zod');
const prisma = require('../config/database');
const { createActivityLog } = require('./activity.controller');

// Helper: Créer les logs d'activité pour owner ET actor (si différents)
const logActivityForBoth = async ({ ownerId, actorId, action, entityType, entityId, entityTitle, details }) => {
  // Toujours créer le log pour le owner
  await createActivityLog({
    ownerId,
    actorId,
    action,
    entityType,
    entityId,
    entityTitle,
    details
  });

  // Si l'acteur est différent du owner, créer aussi un log pour l'acteur
  if (actorId !== ownerId) {
    await createActivityLog({
      ownerId: actorId, // Le log appartient à l'acteur
      actorId,
      action,
      entityType,
      entityId,
      entityTitle,
      details,
      targetOwnerId: ownerId // Référence au propriétaire pour contexte
    });
  }
};

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(255),
  description: z.string().optional(),
  importance: z.enum(['low', 'normal', 'high']).default('normal'),
  categoryId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional() // Pour les délégués
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  importance: z.enum(['low', 'normal', 'high']).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().optional().nullable()
});

// Helper: Vérifier les permissions de délégation
const checkDelegationPermission = async (actorId, ownerId, permission) => {
  if (actorId === ownerId) return true;

  const delegation = await prisma.taskDelegation.findFirst({
    where: {
      ownerId,
      delegateId: actorId,
      status: 'accepted'
    }
  });

  if (!delegation) return false;

  switch (permission) {
    case 'view':
      return true;
    case 'create':
      return delegation.canCreateTasks;
    case 'edit':
      return delegation.canEditTasks;
    case 'delete':
      return delegation.canDeleteTasks;
    default:
      return false;
  }
};

// Helper: Obtenir les catégories cachées pour un délégué
const getHiddenCategoryIds = async (actorId, ownerId) => {
  if (actorId === ownerId) return [];

  const delegation = await prisma.taskDelegation.findFirst({
    where: {
      ownerId,
      delegateId: actorId,
      status: 'accepted'
    }
  });

  if (!delegation || !delegation.hiddenCategoryIds) return [];
  return delegation.hiddenCategoryIds.split(',').filter(Boolean);
};

const getTasks = async (req, res, next) => {
  try {
    const {
      status = 'all',
      sort_by = 'created_at',
      sort_order = 'desc',
      search = '',
      importance,
      categoryId,
      limit = 50,
      offset = 0,
      ownerId // Pour les délégués
    } = req.query;

    const actorId = req.user.id;
    const targetOwnerId = ownerId || actorId;

    // Vérifier les permissions si on accède aux tâches de quelqu'un d'autre
    if (targetOwnerId !== actorId) {
      const hasAccess = await checkDelegationPermission(actorId, targetOwnerId, 'view');
      if (!hasAccess) {
        return res.status(403).json({ error: 'Accès non autorisé.' });
      }
    }

    // Récupérer les catégories cachées
    const hiddenCategoryIds = await getHiddenCategoryIds(actorId, targetOwnerId);

    // Build where clause
    const where = {
      userId: targetOwnerId
    };

    if (status !== 'all') {
      where.status = status;
    }

    if (importance) {
      where.importance = importance;
    }

    if (categoryId) {
      where.categoryId = categoryId === 'none' ? null : categoryId;
    }

    // Exclure les catégories cachées pour les délégués
    if (hiddenCategoryIds.length > 0) {
      if (where.categoryId === undefined) {
        where.OR = [
          { categoryId: null },
          { categoryId: { notIn: hiddenCategoryIds } }
        ];
      }
    }

    if (search) {
      const searchCondition = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];

      if (where.OR) {
        // Combiner avec les conditions existantes
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition }
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    // Build orderBy
    const orderByMap = {
      created_at: 'createdAt',
      due_date: 'dueDate',
      importance: 'importance',
      title: 'title',
      updated_at: 'updatedAt'
    };

    const orderBy = {
      [orderByMap[sort_by] || 'createdAt']: sort_order === 'asc' ? 'asc' : 'desc'
    };

    // Get tasks with pagination and include category
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          category: true
        }
      }),
      prisma.task.count({ where })
    ]);

    res.json({
      tasks,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const actorId = req.user.id;

    const task = await prisma.task.findFirst({
      where: { id: req.params.id },
      include: { category: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée.' });
    }

    // Vérifier les permissions
    const hasAccess = await checkDelegationPermission(actorId, task.userId, 'view');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    // Vérifier si la catégorie est cachée
    if (task.categoryId) {
      const hiddenCategoryIds = await getHiddenCategoryIds(actorId, task.userId);
      if (hiddenCategoryIds.includes(task.categoryId)) {
        return res.status(403).json({ error: 'Accès non autorisé.' });
      }
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const actorId = req.user.id;
    const targetOwnerId = data.ownerId || actorId;

    // Vérifier les permissions si on crée pour quelqu'un d'autre
    if (targetOwnerId !== actorId) {
      const hasPermission = await checkDelegationPermission(actorId, targetOwnerId, 'create');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de créer des tâches.' });
      }
    }

    // Verify category belongs to target owner if provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, userId: targetOwnerId }
      });
      if (!category) {
        return res.status(400).json({ error: 'Catégorie invalide.' });
      }

      // Vérifier que la catégorie n'est pas cachée pour le délégué
      if (targetOwnerId !== actorId) {
        const hiddenCategoryIds = await getHiddenCategoryIds(actorId, targetOwnerId);
        if (hiddenCategoryIds.includes(data.categoryId)) {
          return res.status(403).json({ error: 'Cette catégorie n\'est pas accessible.' });
        }
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: targetOwnerId,
        title: data.title,
        description: data.description || null,
        importance: data.importance,
        categoryId: data.categoryId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime || null
      },
      include: {
        category: true
      }
    });

    // Log d'activité (pour owner ET actor si différents)
    await logActivityForBoth({
      ownerId: targetOwnerId,
      actorId,
      action: 'created_task',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title
    });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const actorId = req.user.id;

    // Get the task first
    const existingTask = await prisma.task.findFirst({
      where: { id: req.params.id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Tâche non trouvée.' });
    }

    // Vérifier les permissions
    const hasPermission = await checkDelegationPermission(actorId, existingTask.userId, 'edit');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cette tâche.' });
    }

    // Verify category belongs to owner if provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, userId: existingTask.userId }
      });
      if (!category) {
        return res.status(400).json({ error: 'Catégorie invalide.' });
      }

      // Vérifier que la catégorie n'est pas cachée pour le délégué
      if (existingTask.userId !== actorId) {
        const hiddenCategoryIds = await getHiddenCategoryIds(actorId, existingTask.userId);
        if (hiddenCategoryIds.includes(data.categoryId)) {
          return res.status(403).json({ error: 'Cette catégorie n\'est pas accessible.' });
        }
      }
    }

    // Préparer les détails pour le log
    const changes = {};
    if (data.title && data.title !== existingTask.title) changes.title = { old: existingTask.title, new: data.title };
    if (data.status && data.status !== existingTask.status) changes.status = { old: existingTask.status, new: data.status };
    if (data.importance && data.importance !== existingTask.importance) changes.importance = { old: existingTask.importance, new: data.importance };

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.importance && { importance: data.importance }),
        ...(data.status && { status: data.status }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.dueTime !== undefined && { dueTime: data.dueTime })
      },
      include: {
        category: true
      }
    });

    // Log d'activité (pour owner ET actor si différents)
    await logActivityForBoth({
      ownerId: existingTask.userId,
      actorId,
      action: 'updated_task',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
      details: Object.keys(changes).length > 0 ? changes : null
    });

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const actorId = req.user.id;

    // Get the task first
    const existingTask = await prisma.task.findFirst({
      where: { id: req.params.id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Tâche non trouvée.' });
    }

    // Vérifier les permissions
    const hasPermission = await checkDelegationPermission(actorId, existingTask.userId, 'delete');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer cette tâche.' });
    }

    await prisma.task.delete({
      where: { id: req.params.id }
    });

    // Log d'activité (pour owner ET actor si différents)
    await logActivityForBoth({
      ownerId: existingTask.userId,
      actorId,
      action: 'deleted_task',
      entityType: 'task',
      entityId: existingTask.id,
      entityTitle: existingTask.title
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const completeTask = async (req, res, next) => {
  try {
    const actorId = req.user.id;

    // Get the task first
    const existingTask = await prisma.task.findFirst({
      where: { id: req.params.id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Tâche non trouvée.' });
    }

    // Vérifier les permissions
    const hasPermission = await checkDelegationPermission(actorId, existingTask.userId, 'edit');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cette tâche.' });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    // Log d'activité (pour owner ET actor si différents)
    await logActivityForBoth({
      ownerId: existingTask.userId,
      actorId,
      action: 'completed_task',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title
    });

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

const reopenTask = async (req, res, next) => {
  try {
    const actorId = req.user.id;

    // Get the task first
    const existingTask = await prisma.task.findFirst({
      where: { id: req.params.id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Tâche non trouvée.' });
    }

    // Vérifier les permissions
    const hasPermission = await checkDelegationPermission(actorId, existingTask.userId, 'edit');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cette tâche.' });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'active',
        completedAt: null
      }
    });

    // Log d'activité (pour owner ET actor si différents)
    await logActivityForBoth({
      ownerId: existingTask.userId,
      actorId,
      action: 'reopened_task',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title
    });

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [total, active, completed, highPriority, overdue] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'active' } }),
      prisma.task.count({ where: { userId, status: 'completed' } }),
      prisma.task.count({ where: { userId, importance: 'high', status: 'active' } }),
      prisma.task.count({
        where: {
          userId,
          status: 'active',
          dueDate: { lt: new Date() }
        }
      })
    ]);

    res.json({
      total_tasks: total,
      active_tasks: active,
      completed_tasks: completed,
      high_priority_tasks: highPriority,
      overdue_tasks: overdue,
      completion_rate: total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0
    });
  } catch (error) {
    next(error);
  }
};

// Export tasks in JSON or XML format
const exportTasks = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const userId = req.user.id;

    // Get all tasks with categories
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });

    // Format tasks for export
    const exportData = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      importance: task.importance,
      category: task.category ? {
        name: task.category.name,
        color: task.category.color
      } : null,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

    if (format === 'xml') {
      // Convert to XML
      const tasksToXml = (tasks) => {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<tasks>\n';

        for (const task of tasks) {
          xml += '  <task>\n';
          xml += `    <id>${escapeXml(task.id)}</id>\n`;
          xml += `    <title>${escapeXml(task.title)}</title>\n`;
          xml += `    <description>${escapeXml(task.description || '')}</description>\n`;
          xml += `    <status>${escapeXml(task.status)}</status>\n`;
          xml += `    <importance>${escapeXml(task.importance)}</importance>\n`;

          if (task.category) {
            xml += '    <category>\n';
            xml += `      <name>${escapeXml(task.category.name)}</name>\n`;
            xml += `      <color>${escapeXml(task.category.color)}</color>\n`;
            xml += '    </category>\n';
          } else {
            xml += '    <category/>\n';
          }

          xml += `    <dueDate>${task.dueDate ? task.dueDate.toISOString() : ''}</dueDate>\n`;
          xml += `    <dueTime>${escapeXml(task.dueTime || '')}</dueTime>\n`;
          xml += `    <completedAt>${task.completedAt ? task.completedAt.toISOString() : ''}</completedAt>\n`;
          xml += `    <createdAt>${task.createdAt.toISOString()}</createdAt>\n`;
          xml += `    <updatedAt>${task.updatedAt.toISOString()}</updatedAt>\n`;
          xml += '  </task>\n';
        }

        xml += '</tasks>';
        return xml;
      };

      const escapeXml = (str) => {
        if (!str) return '';
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const xml = tasksToXml(exportData);

      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="tasks-export-${new Date().toISOString().split('T')[0]}.xml"`);
      res.send(xml);
    } else {
      // JSON format (default)
      res.set('Content-Type', 'application/json');
      res.set('Content-Disposition', `attachment; filename="tasks-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        totalTasks: exportData.length,
        tasks: exportData
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  reopenTask,
  getStats,
  exportTasks
};
