const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Schémas de validation
const createDelegationSchema = z.object({
  identifier: z.string().min(1, 'Email ou nom d\'utilisateur requis').optional(),
  delegateId: z.string().uuid().optional(),
  canCreateTasks: z.boolean().default(false),
  canEditTasks: z.boolean().default(false),
  canDeleteTasks: z.boolean().default(false),
  canCreateCategories: z.boolean().default(false),
  hiddenCategoryIds: z.array(z.string()).default([])
}).refine(data => data.identifier || data.delegateId, {
  message: 'Email, nom d\'utilisateur ou ID requis'
});

const updateDelegationSchema = z.object({
  canCreateTasks: z.boolean().optional(),
  canEditTasks: z.boolean().optional(),
  canDeleteTasks: z.boolean().optional(),
  canCreateCategories: z.boolean().optional(),
  hiddenCategoryIds: z.array(z.string()).optional()
});

// Rechercher des utilisateurs pour l'invitation
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclure soi-même
          { isActive: true },
          {
            OR: [
              { email: { contains: query.toLowerCase() } },
              { username: { contains: query.toLowerCase() } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true
      },
      take: 10
    });

    res.json({ users });
  } catch (error) {
    console.error('Erreur searchUsers:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Récupérer toutes les délégations (données et reçues)
const getDelegations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Délégations données (je délègue à quelqu'un)
    const given = await prisma.taskDelegation.findMany({
      where: { ownerId: userId },
      include: {
        delegate: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Délégations reçues (quelqu'un me délègue)
    const received = await prisma.taskDelegation.findMany({
      where: { delegateId: userId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compter les invitations en attente
    const pendingCount = received.filter(d => d.status === 'pending').length;

    res.json({
      given: given.map(d => ({
        id: d.id,
        delegate: d.delegate,
        canCreateTasks: d.canCreateTasks,
        canEditTasks: d.canEditTasks,
        canDeleteTasks: d.canDeleteTasks,
        canCreateCategories: d.canCreateCategories,
        hiddenCategoryIds: d.hiddenCategoryIds ? d.hiddenCategoryIds.split(',').filter(Boolean) : [],
        status: d.status,
        createdAt: d.createdAt
      })),
      received: received.map(d => ({
        id: d.id,
        owner: d.owner,
        canCreateTasks: d.canCreateTasks,
        canEditTasks: d.canEditTasks,
        canDeleteTasks: d.canDeleteTasks,
        canCreateCategories: d.canCreateCategories,
        status: d.status,
        createdAt: d.createdAt
      })),
      pendingCount
    });
  } catch (error) {
    console.error('Erreur getDelegations:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer une nouvelle délégation (inviter quelqu'un)
const createDelegation = async (req, res) => {
  try {
    const validation = createDelegationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { identifier, delegateId, canCreateTasks, canEditTasks, canDeleteTasks, canCreateCategories, hiddenCategoryIds } = validation.data;
    const ownerId = req.user.id;

    let delegate;

    // Si delegateId fourni, chercher directement par ID
    if (delegateId) {
      delegate = await prisma.user.findFirst({
        where: {
          id: delegateId,
          isActive: true
        }
      });
    } else if (identifier) {
      // Sinon rechercher par email ou username
      delegate = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() }
          ],
          isActive: true
        }
      });
    }

    if (!delegate) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Vérifier qu'on ne s'invite pas soi-même
    if (delegate.id === ownerId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous inviter vous-même.' });
    }

    // Vérifier si une délégation existe déjà
    const existing = await prisma.taskDelegation.findUnique({
      where: {
        ownerId_delegateId: {
          ownerId,
          delegateId: delegate.id
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Une invitation existe déjà pour cet utilisateur.' });
    }

    // Créer la délégation
    const delegation = await prisma.taskDelegation.create({
      data: {
        ownerId,
        delegateId: delegate.id,
        canCreateTasks,
        canEditTasks,
        canDeleteTasks,
        canCreateCategories,
        hiddenCategoryIds: hiddenCategoryIds.join(','),
        status: 'pending'
      },
      include: {
        delegate: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      delegation: {
        id: delegation.id,
        delegate: delegation.delegate,
        canCreateTasks: delegation.canCreateTasks,
        canEditTasks: delegation.canEditTasks,
        canDeleteTasks: delegation.canDeleteTasks,
        canCreateCategories: delegation.canCreateCategories,
        hiddenCategoryIds: hiddenCategoryIds,
        status: delegation.status,
        createdAt: delegation.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur createDelegation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Modifier une délégation (permissions)
const updateDelegation = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = updateDelegationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const userId = req.user.id;

    // Vérifier que la délégation appartient à l'utilisateur
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!delegation) {
      return res.status(404).json({ error: 'Délégation non trouvée.' });
    }

    const updateData = {};
    if (validation.data.canCreateTasks !== undefined) updateData.canCreateTasks = validation.data.canCreateTasks;
    if (validation.data.canEditTasks !== undefined) updateData.canEditTasks = validation.data.canEditTasks;
    if (validation.data.canDeleteTasks !== undefined) updateData.canDeleteTasks = validation.data.canDeleteTasks;
    if (validation.data.canCreateCategories !== undefined) updateData.canCreateCategories = validation.data.canCreateCategories;
    if (validation.data.hiddenCategoryIds !== undefined) updateData.hiddenCategoryIds = validation.data.hiddenCategoryIds.join(',');

    const updated = await prisma.taskDelegation.update({
      where: { id },
      data: updateData,
      include: {
        delegate: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      delegation: {
        id: updated.id,
        delegate: updated.delegate,
        canCreateTasks: updated.canCreateTasks,
        canEditTasks: updated.canEditTasks,
        canDeleteTasks: updated.canDeleteTasks,
        canCreateCategories: updated.canCreateCategories,
        hiddenCategoryIds: updated.hiddenCategoryIds ? updated.hiddenCategoryIds.split(',').filter(Boolean) : [],
        status: updated.status,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur updateDelegation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Supprimer une délégation
const deleteDelegation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que la délégation appartient à l'utilisateur (en tant qu'owner)
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!delegation) {
      return res.status(404).json({ error: 'Délégation non trouvée.' });
    }

    await prisma.taskDelegation.delete({
      where: { id }
    });

    res.json({ message: 'Délégation supprimée.' });
  } catch (error) {
    console.error('Erreur deleteDelegation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Accepter une invitation
const acceptDelegation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'invitation est pour cet utilisateur
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        id,
        delegateId: userId,
        status: 'pending'
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!delegation) {
      return res.status(404).json({ error: 'Invitation non trouvée.' });
    }

    const updated = await prisma.taskDelegation.update({
      where: { id },
      data: { status: 'accepted' },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      delegation: {
        id: updated.id,
        owner: updated.owner,
        canCreateTasks: updated.canCreateTasks,
        canEditTasks: updated.canEditTasks,
        canDeleteTasks: updated.canDeleteTasks,
        canCreateCategories: updated.canCreateCategories,
        status: updated.status,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur acceptDelegation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Refuser une invitation
const rejectDelegation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'invitation est pour cet utilisateur
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        id,
        delegateId: userId,
        status: 'pending'
      }
    });

    if (!delegation) {
      return res.status(404).json({ error: 'Invitation non trouvée.' });
    }

    // Supprimer l'invitation au lieu de la marquer comme rejetée
    await prisma.taskDelegation.delete({
      where: { id }
    });

    res.json({ message: 'Invitation refusée.' });
  } catch (error) {
    console.error('Erreur rejectDelegation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Se retirer d'une délégation (en tant que délégué)
const leaveDelegation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est bien le délégué
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        id,
        delegateId: userId,
        status: 'accepted'
      }
    });

    if (!delegation) {
      return res.status(404).json({ error: 'Délégation non trouvée.' });
    }

    await prisma.taskDelegation.delete({
      where: { id }
    });

    res.json({ message: 'Vous avez quitté cette délégation.' });
  } catch (error) {
    console.error('Erreur leaveDelegation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Récupérer les tâches d'un owner (pour un délégué)
const getOwnerTasks = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur a une délégation acceptée pour cet owner
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        ownerId,
        delegateId: userId,
        status: 'accepted'
      }
    });

    if (!delegation) {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    // Récupérer les catégories cachées
    const hiddenCategoryIds = delegation.hiddenCategoryIds
      ? delegation.hiddenCategoryIds.split(',').filter(Boolean)
      : [];

    // Récupérer les tâches en excluant celles des catégories cachées
    const whereClause = {
      userId: ownerId
    };

    if (hiddenCategoryIds.length > 0) {
      whereClause.OR = [
        { categoryId: null },
        { categoryId: { notIn: hiddenCategoryIds } }
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      tasks,
      permissions: {
        canCreateTasks: delegation.canCreateTasks,
        canEditTasks: delegation.canEditTasks,
        canDeleteTasks: delegation.canDeleteTasks,
        canCreateCategories: delegation.canCreateCategories
      }
    });
  } catch (error) {
    console.error('Erreur getOwnerTasks:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Récupérer les catégories d'un owner (pour un délégué)
const getOwnerCategories = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur a une délégation acceptée pour cet owner
    const delegation = await prisma.taskDelegation.findFirst({
      where: {
        ownerId,
        delegateId: userId,
        status: 'accepted'
      }
    });

    if (!delegation) {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    // Récupérer les catégories cachées
    const hiddenCategoryIds = delegation.hiddenCategoryIds
      ? delegation.hiddenCategoryIds.split(',').filter(Boolean)
      : [];

    // Récupérer les catégories en excluant les cachées
    const categories = await prisma.category.findMany({
      where: {
        userId: ownerId,
        id: { notIn: hiddenCategoryIds.length > 0 ? hiddenCategoryIds : [] }
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        taskCount: c._count.tasks
      })),
      permissions: {
        canCreateCategories: delegation.canCreateCategories
      }
    });
  } catch (error) {
    console.error('Erreur getOwnerCategories:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

module.exports = {
  searchUsers,
  getDelegations,
  createDelegation,
  updateDelegation,
  deleteDelegation,
  acceptDelegation,
  rejectDelegation,
  leaveDelegation,
  getOwnerTasks,
  getOwnerCategories
};
