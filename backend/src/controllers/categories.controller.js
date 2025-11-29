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
const createCategorySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide').default('#6366f1'),
  icon: z.string().max(50).optional(),
  ownerId: z.string().uuid().optional() // Pour les délégués
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional().nullable()
});

// Helper: Vérifier les permissions de délégation pour les catégories
const checkCategoryDelegationPermission = async (actorId, ownerId, permission) => {
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
      return delegation.canCreateCategories;
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

const getCategories = async (req, res, next) => {
  try {
    const { ownerId } = req.query;
    const actorId = req.user.id;
    const targetOwnerId = ownerId || actorId;

    // Vérifier les permissions si on accède aux catégories de quelqu'un d'autre
    if (targetOwnerId !== actorId) {
      const hasAccess = await checkCategoryDelegationPermission(actorId, targetOwnerId, 'view');
      if (!hasAccess) {
        return res.status(403).json({ error: 'Accès non autorisé.' });
      }
    }

    // Récupérer les catégories cachées pour ce délégué
    const hiddenCategoryIds = await getHiddenCategoryIds(actorId, targetOwnerId);

    const whereClause = { userId: targetOwnerId };
    if (hiddenCategoryIds.length > 0) {
      whereClause.id = { notIn: hiddenCategoryIds };
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const actorId = req.user.id;

    const category = await prisma.category.findFirst({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    // Vérifier les permissions
    const hasAccess = await checkCategoryDelegationPermission(actorId, category.userId, 'view');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    // Vérifier si la catégorie est cachée
    const hiddenCategoryIds = await getHiddenCategoryIds(actorId, category.userId);
    if (hiddenCategoryIds.includes(category.id)) {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    res.json({ category });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const actorId = req.user.id;
    const targetOwnerId = data.ownerId || actorId;

    // Vérifier les permissions si on crée pour quelqu'un d'autre
    if (targetOwnerId !== actorId) {
      const hasPermission = await checkCategoryDelegationPermission(actorId, targetOwnerId, 'create');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de créer des catégories.' });
      }
    }

    // Check if category with same name exists
    const existing = await prisma.category.findFirst({
      where: {
        userId: targetOwnerId,
        name: { equals: data.name, mode: 'insensitive' }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà.' });
    }

    const category = await prisma.category.create({
      data: {
        userId: targetOwnerId,
        name: data.name,
        color: data.color,
        icon: data.icon || null
      }
    });

    // Log d'activité (pour owner ET actor si différents)
    await logActivityForBoth({
      ownerId: targetOwnerId,
      actorId,
      action: 'created_category',
      entityType: 'category',
      entityId: category.id,
      entityTitle: category.name
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const actorId = req.user.id;

    // Get the category first
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    // Seul le propriétaire peut modifier une catégorie
    if (existing.userId !== actorId) {
      return res.status(403).json({ error: 'Seul le propriétaire peut modifier cette catégorie.' });
    }

    // Check for duplicate name
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          userId: existing.userId,
          name: { equals: data.name, mode: 'insensitive' },
          id: { not: req.params.id }
        }
      });

      if (duplicate) {
        return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà.' });
      }
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.color && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon })
      }
    });

    // Log d'activité
    await createActivityLog({
      ownerId: existing.userId,
      actorId,
      action: 'updated_category',
      entityType: 'category',
      entityId: category.id,
      entityTitle: category.name
    });

    res.json({ category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const actorId = req.user.id;

    // Get the category first
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    // Seul le propriétaire peut supprimer une catégorie
    if (existing.userId !== actorId) {
      return res.status(403).json({ error: 'Seul le propriétaire peut supprimer cette catégorie.' });
    }

    const categoryName = existing.name;

    // Delete will set categoryId to null on tasks (SetNull)
    await prisma.category.delete({
      where: { id: req.params.id }
    });

    // Log d'activité
    await createActivityLog({
      ownerId: existing.userId,
      actorId,
      action: 'deleted_category',
      entityType: 'category',
      entityId: existing.id,
      entityTitle: categoryName
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};
