const { z } = require('zod');
const prisma = require('../config/database');
const { createActivityLog } = require('./activity.controller');

// Schema pour la résolution des conflits
const conflictResolutionSchema = z.object({
  tasks: z.array(z.object({
    index: z.number(),
    title: z.string(),
    resolution: z.enum(['skip', 'overwrite', 'duplicate']),
    existingTaskId: z.string().uuid().optional()
  })),
  newTasks: z.array(z.object({
    index: z.number()
  }))
});

/**
 * Parse le contenu XML en tableau de tâches
 */
const parseXmlContent = (xmlContent) => {
  const tasks = [];

  // Regex pour extraire les tâches
  const taskRegex = /<task>([\s\S]*?)<\/task>/g;
  let match;

  while ((match = taskRegex.exec(xmlContent)) !== null) {
    const taskXml = match[1];

    const getValue = (tag) => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
      const m = taskXml.match(regex);
      return m ? m[1].trim() : null;
    };

    // Extraire la catégorie
    let category = null;
    const categoryMatch = taskXml.match(/<category>([\s\S]*?)<\/category>/);
    if (categoryMatch && categoryMatch[1].trim()) {
      const catContent = categoryMatch[1];
      const catName = catContent.match(/<name>([\s\S]*?)<\/name>/);
      const catColor = catContent.match(/<color>([\s\S]*?)<\/color>/);
      if (catName) {
        category = {
          name: catName[1].trim(),
          color: catColor ? catColor[1].trim() : '#6366f1'
        };
      }
    }

    tasks.push({
      id: getValue('id'),
      title: getValue('title'),
      description: getValue('description') || null,
      status: getValue('status') || 'active',
      importance: getValue('importance') || 'normal',
      category,
      dueDate: getValue('dueDate') || null,
      dueTime: getValue('dueTime') || null,
      completedAt: getValue('completedAt') || null,
      createdAt: getValue('createdAt'),
      updatedAt: getValue('updatedAt')
    });
  }

  return tasks;
};

/**
 * Unescape les entités XML
 */
const unescapeXml = (str) => {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

/**
 * Analyse le fichier d'import et détecte les conflits
 * POST /api/v1/tasks/import/analyze
 */
const analyzeImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { content, format = 'json' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Contenu du fichier requis.' });
    }

    let tasksToImport = [];

    // Parser le contenu selon le format
    if (format === 'xml') {
      tasksToImport = parseXmlContent(content);
      // Unescape les valeurs XML
      tasksToImport = tasksToImport.map(task => ({
        ...task,
        title: unescapeXml(task.title),
        description: unescapeXml(task.description),
        category: task.category ? {
          name: unescapeXml(task.category.name),
          color: task.category.color
        } : null
      }));
    } else {
      // JSON format
      try {
        const parsed = JSON.parse(content);
        tasksToImport = parsed.tasks || parsed;
      } catch (e) {
        return res.status(400).json({ error: 'Format JSON invalide.' });
      }
    }

    if (!Array.isArray(tasksToImport) || tasksToImport.length === 0) {
      return res.status(400).json({ error: 'Aucune tâche trouvée dans le fichier.' });
    }

    // Récupérer les tâches existantes de l'utilisateur
    const existingTasks = await prisma.task.findMany({
      where: { userId },
      select: { id: true, title: true, status: true, importance: true }
    });

    // Créer un map des titres existants
    const existingTitleMap = new Map();
    existingTasks.forEach(task => {
      const key = task.title.toLowerCase().trim();
      if (!existingTitleMap.has(key)) {
        existingTitleMap.set(key, []);
      }
      existingTitleMap.get(key).push(task);
    });

    // Analyser chaque tâche
    const conflicts = [];
    const newTasks = [];

    tasksToImport.forEach((task, index) => {
      if (!task.title) return; // Skip tasks without title

      const titleKey = task.title.toLowerCase().trim();
      const existing = existingTitleMap.get(titleKey);

      if (existing && existing.length > 0) {
        // Conflit détecté
        conflicts.push({
          index,
          importTask: {
            title: task.title,
            description: task.description,
            status: task.status,
            importance: task.importance,
            category: task.category,
            dueDate: task.dueDate,
            dueTime: task.dueTime
          },
          existingTasks: existing.map(e => ({
            id: e.id,
            title: e.title,
            status: e.status,
            importance: e.importance
          }))
        });
      } else {
        // Nouvelle tâche
        newTasks.push({
          index,
          task: {
            title: task.title,
            description: task.description,
            status: task.status,
            importance: task.importance,
            category: task.category,
            dueDate: task.dueDate,
            dueTime: task.dueTime
          }
        });
      }
    });

    res.json({
      totalInFile: tasksToImport.length,
      newTasks: newTasks.length,
      conflicts: conflicts.length,
      analysis: {
        newTasks,
        conflicts
      },
      // Renvoyer les données brutes pour l'étape d'application
      rawTasks: tasksToImport
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Applique l'import avec les résolutions de conflits
 * POST /api/v1/tasks/import/apply
 */
const applyImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rawTasks, resolutions } = req.body;

    if (!rawTasks || !Array.isArray(rawTasks)) {
      return res.status(400).json({ error: 'Données d\'import invalides.' });
    }

    if (!resolutions) {
      return res.status(400).json({ error: 'Résolutions requises.' });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Récupérer les catégories existantes
    const existingCategories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true }
    });
    const categoryMap = new Map(
      existingCategories.map(c => [c.name.toLowerCase(), c.id])
    );

    // Créer un map des résolutions par index
    const conflictResolutions = new Map();
    if (resolutions.conflicts) {
      resolutions.conflicts.forEach(r => {
        conflictResolutions.set(r.index, r);
      });
    }

    // Set des indices de nouvelles tâches à importer
    const newTaskIndices = new Set();
    if (resolutions.newTasks) {
      resolutions.newTasks.forEach(t => newTaskIndices.add(t.index));
    }

    // Traiter chaque tâche
    for (let i = 0; i < rawTasks.length; i++) {
      const task = rawTasks[i];

      if (!task.title) {
        results.errors.push({ index: i, error: 'Titre manquant' });
        continue;
      }

      try {
        // Vérifier si c'est un conflit
        const resolution = conflictResolutions.get(i);

        if (resolution) {
          // Gérer le conflit selon la résolution
          if (resolution.resolution === 'skip') {
            results.skipped++;
            continue;
          } else if (resolution.resolution === 'overwrite' && resolution.existingTaskId) {
            // Écraser la tâche existante
            await updateExistingTask(userId, resolution.existingTaskId, task, categoryMap);
            results.updated++;
          } else if (resolution.resolution === 'duplicate') {
            // Créer comme doublon
            await createNewTask(userId, task, categoryMap);
            results.created++;
          }
        } else if (newTaskIndices.has(i)) {
          // Nouvelle tâche à créer
          await createNewTask(userId, task, categoryMap);
          results.created++;
        }
      } catch (err) {
        results.errors.push({ index: i, title: task.title, error: err.message });
      }
    }

    // Log d'activité
    await createActivityLog({
      ownerId: userId,
      actorId: userId,
      action: 'imported_tasks',
      entityType: 'task',
      entityTitle: `Import de ${results.created + results.updated} tâches`,
      details: { created: results.created, updated: results.updated, skipped: results.skipped }
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle tâche à partir des données d'import
 */
const createNewTask = async (userId, taskData, categoryMap) => {
  // Gérer la catégorie
  let categoryId = null;
  if (taskData.category && taskData.category.name) {
    const catKey = taskData.category.name.toLowerCase();
    if (categoryMap.has(catKey)) {
      categoryId = categoryMap.get(catKey);
    } else {
      // Créer la catégorie
      const newCat = await prisma.category.create({
        data: {
          userId,
          name: taskData.category.name,
          color: taskData.category.color || '#6366f1'
        }
      });
      categoryMap.set(catKey, newCat.id);
      categoryId = newCat.id;
    }
  }

  // Créer la tâche
  await prisma.task.create({
    data: {
      userId,
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status || 'active',
      importance: taskData.importance || 'normal',
      categoryId,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      dueTime: taskData.dueTime || null,
      completedAt: taskData.completedAt ? new Date(taskData.completedAt) : null
    }
  });
};

/**
 * Met à jour une tâche existante avec les données d'import
 */
const updateExistingTask = async (userId, taskId, taskData, categoryMap) => {
  // Gérer la catégorie
  let categoryId = null;
  if (taskData.category && taskData.category.name) {
    const catKey = taskData.category.name.toLowerCase();
    if (categoryMap.has(catKey)) {
      categoryId = categoryMap.get(catKey);
    } else {
      // Créer la catégorie
      const newCat = await prisma.category.create({
        data: {
          userId,
          name: taskData.category.name,
          color: taskData.category.color || '#6366f1'
        }
      });
      categoryMap.set(catKey, newCat.id);
      categoryId = newCat.id;
    }
  }

  // Mettre à jour la tâche
  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status || 'active',
      importance: taskData.importance || 'normal',
      categoryId,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      dueTime: taskData.dueTime || null,
      completedAt: taskData.completedAt ? new Date(taskData.completedAt) : null
    }
  });
};

/**
 * Import pour admin - analyse le fichier pour un utilisateur spécifique
 * POST /api/v1/admin/users/:id/import/analyze
 */
const adminAnalyzeImport = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const { content, format = 'json' } = req.body;

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Contenu du fichier requis.' });
    }

    let tasksToImport = [];

    // Parser le contenu selon le format
    if (format === 'xml') {
      tasksToImport = parseXmlContent(content);
      tasksToImport = tasksToImport.map(task => ({
        ...task,
        title: unescapeXml(task.title),
        description: unescapeXml(task.description),
        category: task.category ? {
          name: unescapeXml(task.category.name),
          color: task.category.color
        } : null
      }));
    } else {
      try {
        const parsed = JSON.parse(content);
        tasksToImport = parsed.tasks || parsed;
      } catch (e) {
        return res.status(400).json({ error: 'Format JSON invalide.' });
      }
    }

    if (!Array.isArray(tasksToImport) || tasksToImport.length === 0) {
      return res.status(400).json({ error: 'Aucune tâche trouvée dans le fichier.' });
    }

    // Récupérer les tâches existantes de l'utilisateur cible
    const existingTasks = await prisma.task.findMany({
      where: { userId: targetUserId },
      select: { id: true, title: true, status: true, importance: true }
    });

    const existingTitleMap = new Map();
    existingTasks.forEach(task => {
      const key = task.title.toLowerCase().trim();
      if (!existingTitleMap.has(key)) {
        existingTitleMap.set(key, []);
      }
      existingTitleMap.get(key).push(task);
    });

    const conflicts = [];
    const newTasks = [];

    tasksToImport.forEach((task, index) => {
      if (!task.title) return;

      const titleKey = task.title.toLowerCase().trim();
      const existing = existingTitleMap.get(titleKey);

      if (existing && existing.length > 0) {
        conflicts.push({
          index,
          importTask: {
            title: task.title,
            description: task.description,
            status: task.status,
            importance: task.importance,
            category: task.category,
            dueDate: task.dueDate,
            dueTime: task.dueTime
          },
          existingTasks: existing.map(e => ({
            id: e.id,
            title: e.title,
            status: e.status,
            importance: e.importance
          }))
        });
      } else {
        newTasks.push({
          index,
          task: {
            title: task.title,
            description: task.description,
            status: task.status,
            importance: task.importance,
            category: task.category,
            dueDate: task.dueDate,
            dueTime: task.dueTime
          }
        });
      }
    });

    res.json({
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email
      },
      totalInFile: tasksToImport.length,
      newTasks: newTasks.length,
      conflicts: conflicts.length,
      analysis: {
        newTasks,
        conflicts
      },
      rawTasks: tasksToImport
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import pour admin - applique l'import pour un utilisateur spécifique
 * POST /api/v1/admin/users/:id/import/apply
 */
const adminApplyImport = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.user.id;
    const { rawTasks, resolutions } = req.body;

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    if (!rawTasks || !Array.isArray(rawTasks)) {
      return res.status(400).json({ error: 'Données d\'import invalides.' });
    }

    if (!resolutions) {
      return res.status(400).json({ error: 'Résolutions requises.' });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Récupérer les catégories de l'utilisateur cible
    const existingCategories = await prisma.category.findMany({
      where: { userId: targetUserId },
      select: { id: true, name: true }
    });
    const categoryMap = new Map(
      existingCategories.map(c => [c.name.toLowerCase(), c.id])
    );

    const conflictResolutions = new Map();
    if (resolutions.conflicts) {
      resolutions.conflicts.forEach(r => {
        conflictResolutions.set(r.index, r);
      });
    }

    const newTaskIndices = new Set();
    if (resolutions.newTasks) {
      resolutions.newTasks.forEach(t => newTaskIndices.add(t.index));
    }

    for (let i = 0; i < rawTasks.length; i++) {
      const task = rawTasks[i];

      if (!task.title) {
        results.errors.push({ index: i, error: 'Titre manquant' });
        continue;
      }

      try {
        const resolution = conflictResolutions.get(i);

        if (resolution) {
          if (resolution.resolution === 'skip') {
            results.skipped++;
            continue;
          } else if (resolution.resolution === 'overwrite' && resolution.existingTaskId) {
            await updateExistingTask(targetUserId, resolution.existingTaskId, task, categoryMap);
            results.updated++;
          } else if (resolution.resolution === 'duplicate') {
            await createNewTask(targetUserId, task, categoryMap);
            results.created++;
          }
        } else if (newTaskIndices.has(i)) {
          await createNewTask(targetUserId, task, categoryMap);
          results.created++;
        }
      } catch (err) {
        results.errors.push({ index: i, title: task.title, error: err.message });
      }
    }

    // Log d'activité pour l'admin
    await createActivityLog({
      ownerId: adminId,
      actorId: adminId,
      action: 'admin_imported_tasks',
      entityType: 'user',
      entityId: targetUserId,
      entityTitle: `Import pour ${targetUser.username}`,
      details: { created: results.created, updated: results.updated, skipped: results.skipped }
    });

    res.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      },
      results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeImport,
  applyImport,
  adminAnalyzeImport,
  adminApplyImport
};
