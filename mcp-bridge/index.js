#!/usr/bin/env node
/**
 * MCP Bridge - Connecte Claude Desktop au serveur TaskManager MCP
 * Ce script fait le pont entre stdio (Claude Desktop) et HTTP (TaskManager API)
 */

const readline = require('readline');

const API_URL = process.env.MCP_API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error(JSON.stringify({
    jsonrpc: '2.0',
    error: { code: -32600, message: 'MCP_AUTH_TOKEN non défini' },
    id: null
  }));
  process.exit(1);
}

// Outils disponibles
const tools = [
  {
    name: 'tasks_list',
    description: 'Liste les tâches de l\'utilisateur avec filtres optionnels',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'completed', 'all'], description: 'Filtre par statut' },
        categoryId: { type: 'string', description: 'Filtre par catégorie (UUID)' },
        importance: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Filtre par importance' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 50)' }
      }
    }
  },
  {
    name: 'tasks_get',
    description: 'Récupère les détails d\'une tâche spécifique',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID de la tâche (UUID)' }
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
        title: { type: 'string', description: 'Titre de la tâche' },
        description: { type: 'string', description: 'Description détaillée' },
        importance: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Niveau d\'importance (low, normal, high)' },
        categoryId: { type: 'string', description: 'ID de la catégorie (UUID)' },
        dueDate: { type: 'string', description: 'Date d\'échéance (YYYY-MM-DD)' },
        dueTime: { type: 'string', description: 'Heure d\'échéance (HH:MM)' }
      },
      required: ['title']
    }
  },
  {
    name: 'tasks_update',
    description: 'Met à jour une tâche existante',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID de la tâche (UUID)' },
        title: { type: 'string', description: 'Nouveau titre' },
        description: { type: 'string', description: 'Nouvelle description' },
        importance: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Nouvelle importance (low, normal, high)' },
        categoryId: { type: 'string', description: 'Nouvelle catégorie (UUID)' },
        dueDate: { type: 'string', description: 'Nouvelle date d\'échéance' },
        dueTime: { type: 'string', description: 'Nouvelle heure d\'échéance' }
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
        taskId: { type: 'string', description: 'ID de la tâche (UUID)' }
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
        taskId: { type: 'string', description: 'ID de la tâche (UUID)' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'tasks_delete',
    description: 'Supprime définitivement une tâche',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID de la tâche (UUID)' }
      },
      required: ['taskId']
    }
  },
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
        name: { type: 'string', description: 'Nom de la catégorie' },
        color: { type: 'string', description: 'Couleur hex (ex: #FF5733)' }
      },
      required: ['name']
    }
  }
];

// Fonction pour appeler l'API TaskManager
async function callApi(method, path, body = null) {
  const url = `${API_URL}${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Erreur API', status: response.status };
    }

    return data;
  } catch (error) {
    return { error: error.message };
  }
}

// Exécuter un outil
async function executeTool(name, args) {
  switch (name) {
    case 'tasks_list': {
      const params = new URLSearchParams();
      if (args.status && args.status !== 'all') params.append('status', args.status);
      if (args.categoryId) params.append('categoryId', args.categoryId);
      if (args.importance) params.append('importance', args.importance);
      if (args.limit) params.append('limit', args.limit);
      const query = params.toString();
      return await callApi('GET', `/api/v1/tasks${query ? '?' + query : ''}`);
    }

    case 'tasks_get':
      return await callApi('GET', `/api/v1/tasks/${args.taskId}`);

    case 'tasks_create':
      return await callApi('POST', '/api/v1/tasks', args);

    case 'tasks_update': {
      const { taskId, ...updateData } = args;
      return await callApi('PATCH', `/api/v1/tasks/${taskId}`, updateData);
    }

    case 'tasks_complete':
      return await callApi('PATCH', `/api/v1/tasks/${args.taskId}`, { status: 'completed' });

    case 'tasks_reopen':
      return await callApi('PATCH', `/api/v1/tasks/${args.taskId}`, { status: 'active' });

    case 'tasks_delete':
      return await callApi('DELETE', `/api/v1/tasks/${args.taskId}`);

    case 'categories_list':
      return await callApi('GET', '/api/v1/categories');

    case 'categories_create':
      return await callApi('POST', '/api/v1/categories', args);

    default:
      return { error: `Outil inconnu: ${name}` };
  }
}

// Traiter une requête JSON-RPC
async function handleRequest(request) {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'taskmanager-mcp',
            version: '1.0.0'
          }
        },
        id
      };

    case 'notifications/initialized':
      return null; // Pas de réponse pour les notifications

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        result: { tools },
        id
      };

    case 'tools/call': {
      const { name, arguments: args } = params;
      const result = await executeTool(name, args || {});

      return {
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        },
        id
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        error: { code: -32601, message: `Méthode non supportée: ${method}` },
        id
      };
  }
}

// Lire les requêtes depuis stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);

    if (response) {
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error: ' + error.message },
      id: null
    }));
  }
});

// Gérer la fermeture propre
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
