const bcrypt = require('bcrypt');
const { z } = require('zod');
const prisma = require('../config/database');

// Validation schemas
const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  canCreateApiTokens: z.boolean().optional()
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mot de passe minimum 6 caractères')
});

// Get global statistics
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTasks,
      activeTasks,
      completedTasks,
      totalCategories
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({ where: { role: 'user', isActive: true } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'active' } }),
      prisma.task.count({ where: { status: 'completed' } }),
      prisma.category.count()
    ]);

    // Tasks created per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasksPerDay = await prisma.task.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Top users by task count
    const topUsers = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: {
        tasks: { _count: 'desc' }
      },
      take: 5
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      tasks: {
        total: totalTasks,
        active: activeTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 : 0
      },
      categories: {
        total: totalCategories
      },
      topUsers: topUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        taskCount: u._count.tasks
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
const getUsers = async (req, res, next) => {
  try {
    const { search = '', role = 'all', status = 'all' } = req.query;

    const where = {
      // Exclude the default admin from the list
      NOT: { username: 'admin' }
    };

    if (role !== 'all') {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        canCreateApiTokens: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            tasks: true,
            categories: true,
            apiTokens: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      users: users.map(u => ({
        ...u,
        taskCount: u._count.tasks,
        categoryCount: u._count.categories,
        apiTokenCount: u._count.apiTokens,
        _count: undefined
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Get single user details
const getUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        canCreateApiTokens: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            tasks: true,
            categories: true,
            apiTokens: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Prevent viewing default admin details
    if (user.username === 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    res.json({
      user: {
        ...user,
        taskCount: user._count.tasks,
        categoryCount: user._count.categories,
        apiTokenCount: user._count.apiTokens,
        _count: undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user (role, status)
const updateUser = async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Prevent modifying default admin
    if (existingUser.username === 'admin') {
      return res.status(403).json({ error: 'Impossible de modifier l\'administrateur par défaut.' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.canCreateApiTokens !== undefined && { canCreateApiTokens: data.canCreateApiTokens })
      },
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
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Change user password (admin action)
const changeUserPassword = async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Prevent changing default admin password via this route
    if (existingUser.username === 'admin') {
      return res.status(403).json({ error: 'Utilisez la route de changement de mot de passe personnel.' });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash }
    });

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    next(error);
  }
};

// Delete user and optionally export their tasks
const deleteUser = async (req, res, next) => {
  try {
    const { exportTasks = false } = req.query;

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          include: { category: true }
        },
        categories: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Prevent deleting default admin
    if (existingUser.username === 'admin') {
      return res.status(403).json({ error: 'Impossible de supprimer l\'administrateur par défaut.' });
    }

    let exportData = null;

    // Export tasks before deletion if requested
    if (exportTasks === 'true' && existingUser.tasks.length > 0) {
      exportData = {
        exportDate: new Date().toISOString(),
        user: {
          username: existingUser.username,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName
        },
        totalTasks: existingUser.tasks.length,
        tasks: existingUser.tasks.map(task => ({
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
          createdAt: task.createdAt
        }))
      };
    }

    // Delete user (cascade will delete tasks and categories)
    await prisma.user.delete({
      where: { id: req.params.id }
    });

    if (exportData) {
      res.json({
        message: 'Utilisateur supprimé avec succès.',
        export: exportData
      });
    } else {
      res.json({ message: 'Utilisateur supprimé avec succès.' });
    }
  } catch (error) {
    next(error);
  }
};

// Export user tasks (without deleting)
const exportUserTasks = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          include: { category: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const exportData = user.tasks.map(task => ({
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
      const escapeXml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';
      xml += `  <user>\n`;
      xml += `    <username>${escapeXml(user.username)}</username>\n`;
      xml += `    <email>${escapeXml(user.email)}</email>\n`;
      xml += `  </user>\n`;
      xml += `  <tasks>\n`;

      for (const task of exportData) {
        xml += '    <task>\n';
        xml += `      <id>${escapeXml(task.id)}</id>\n`;
        xml += `      <title>${escapeXml(task.title)}</title>\n`;
        xml += `      <description>${escapeXml(task.description || '')}</description>\n`;
        xml += `      <status>${escapeXml(task.status)}</status>\n`;
        xml += `      <importance>${escapeXml(task.importance)}</importance>\n`;
        if (task.category) {
          xml += `      <category>\n`;
          xml += `        <name>${escapeXml(task.category.name)}</name>\n`;
          xml += `        <color>${escapeXml(task.category.color)}</color>\n`;
          xml += `      </category>\n`;
        }
        xml += `      <createdAt>${task.createdAt ? task.createdAt.toISOString() : ''}</createdAt>\n`;
        xml += '    </task>\n';
      }

      xml += '  </tasks>\n</export>';

      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="${user.username}-tasks-export.xml"`);
      res.send(xml);
    } else {
      res.set('Content-Type', 'application/json');
      res.set('Content-Disposition', `attachment; filename="${user.username}-tasks-export.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        user: {
          username: user.username,
          email: user.email
        },
        totalTasks: exportData.length,
        tasks: exportData
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getUsers,
  getUser,
  updateUser,
  changeUserPassword,
  deleteUser,
  exportUserTasks
};
