const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Récupérer le journal d'activité
const getActivityLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ownerId, page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let whereClause = {};

    if (ownerId && ownerId !== userId) {
      // Voir le journal d'un owner qu'on gère
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
      whereClause.ownerId = ownerId;
    } else {
      // Par défaut: voir son propre journal uniquement
      whereClause.ownerId = userId;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          actor: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          targetOwner: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.activityLog.count({ where: whereClause })
    ]);

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        owner: log.owner,
        actor: log.actor,
        targetOwner: log.targetOwner,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityTitle: log.entityTitle,
        details: log.details ? JSON.parse(log.details) : null,
        createdAt: log.createdAt,
        isOwnAction: log.actorId === userId,
        isForOther: log.targetOwnerId !== null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Erreur getActivityLog:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Fonction utilitaire pour créer une entrée dans le journal
const createActivityLog = async ({ ownerId, actorId, action, entityType, entityId, entityTitle, details, targetOwnerId }) => {
  try {
    await prisma.activityLog.create({
      data: {
        ownerId,
        actorId,
        action,
        entityType,
        entityId,
        entityTitle,
        details: details ? JSON.stringify(details) : null,
        targetOwnerId: targetOwnerId || null
      }
    });
  } catch (error) {
    console.error('Erreur createActivityLog:', error);
    // On ne lance pas d'erreur pour ne pas bloquer l'action principale
  }
};

module.exports = {
  getActivityLog,
  createActivityLog
};
