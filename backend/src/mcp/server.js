const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const {
  CallToolRequestSchema,
  ListToolsRequestSchema
} = require('@modelcontextprotocol/sdk/types.js')

const prisma = require('../config/database')
const { hashToken } = require('../middleware/pat')
const tasksTools = require('./tools/tasks.tools')
const categoriesTools = require('./tools/categories.tools')

/**
 * Crée une instance du serveur MCP pour un utilisateur authentifié
 * @param {Object} authContext - Contexte d'authentification { user, apiToken }
 */
const createMcpServer = (authContext) => {
  const server = new Server(
    {
      name: 'taskmanager-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  )

  // Stocker le contexte d'auth dans le serveur
  server.authContext = authContext

  // Liste des outils disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...tasksTools.getToolDefinitions(),
        ...categoriesTools.getToolDefinitions()
      ]
    }
  })

  // Gestionnaire d'appel d'outils
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    // Récupérer le contexte utilisateur depuis le serveur
    const { user, apiToken } = server.authContext || {}

    if (!user) {
      return {
        content: [{ type: 'text', text: 'Erreur: Utilisateur non authentifié.' }],
        isError: true
      }
    }

    try {
      // Router vers le bon handler
      if (name.startsWith('tasks_')) {
        return await tasksTools.handleTool(name, args, user, apiToken)
      }

      if (name.startsWith('categories_')) {
        return await categoriesTools.handleTool(name, args, user, apiToken)
      }

      return {
        content: [{ type: 'text', text: `Outil inconnu: ${name}` }],
        isError: true
      }
    } catch (error) {
      console.error(`Erreur MCP tool ${name}:`, error)
      return {
        content: [{ type: 'text', text: `Erreur: ${error.message}` }],
        isError: true
      }
    }
  })

  return server
}

/**
 * Authentifie un utilisateur via PAT pour MCP
 */
const authenticatePat = async (token) => {
  if (!token || !token.startsWith('pat_')) {
    return null
  }

  const tokenHash = hashToken(token)

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      }
    }
  })

  if (!apiToken || !apiToken.isActive || !apiToken.user.isActive) {
    return null
  }

  // Vérifier l'expiration
  if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
    return null
  }

  // Mettre à jour lastUsedAt
  prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() }
  }).catch(err => console.error('Erreur mise à jour lastUsedAt MCP:', err))

  return {
    user: apiToken.user,
    apiToken: {
      id: apiToken.id,
      name: apiToken.name,
      permissions: {
        canReadTasks: apiToken.canReadTasks,
        canCreateTasks: apiToken.canCreateTasks,
        canUpdateTasks: apiToken.canUpdateTasks,
        canDeleteTasks: apiToken.canDeleteTasks,
        canReadCategories: apiToken.canReadCategories,
        canCreateCategories: apiToken.canCreateCategories
      }
    }
  }
}

/**
 * Configure les routes MCP (SSE + Streamable HTTP) sur l'application Express
 */
const setupMcpRoutes = (app) => {
  // Map pour stocker les transports actifs par sessionId (SSE)
  const activeTransports = new Map()

  // Map pour stocker les sessions Streamable HTTP
  const streamableSessions = new Map()

  // Endpoint SSE pour la connexion MCP
  app.get('/mcp/sse', async (req, res) => {
    // Extraire le token du header Authorization
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis.' })
    }

    const token = authHeader.split(' ')[1]
    const auth = await authenticatePat(token)

    if (!auth) {
      return res.status(401).json({ error: 'Token API invalide ou expiré.' })
    }

    console.log(`MCP SSE connexion: ${auth.user.username}`)

    // Créer le serveur MCP avec le contexte d'authentification
    const server = createMcpServer(auth)

    // Créer le transport SSE avec l'URL des messages
    const transport = new SSEServerTransport('/mcp/messages', res)

    // Récupérer le sessionId généré par le transport
    const sessionId = transport.sessionId

    // Stocker le transport avec le contexte utilisateur
    activeTransports.set(sessionId, {
      transport,
      context: auth,
      server
    })

    console.log(`MCP session créée: ${sessionId}`)

    // Connecter le serveur au transport avec le contexte
    await server.connect(transport)

    // Nettoyer à la déconnexion
    res.on('close', () => {
      console.log(`MCP SSE déconnexion: ${auth.user.username} (session: ${sessionId})`)
      activeTransports.delete(sessionId)
      server.close()
    })
  })

  // Endpoint pour recevoir les messages MCP
  app.post('/mcp/messages', async (req, res) => {
    // Récupérer le sessionId depuis la query string
    const sessionId = req.query.sessionId

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId requis dans la query string.' })
    }

    // Trouver le transport actif pour cette session
    const session = activeTransports.get(sessionId)

    if (!session) {
      return res.status(400).json({ error: 'Session MCP non trouvée. Reconnectez-vous à /mcp/sse.' })
    }

    // Vérifier l'authentification
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const auth = await authenticatePat(token)

      if (auth && auth.user.id !== session.context.user.id) {
        return res.status(403).json({ error: 'Token ne correspond pas à la session.' })
      }
    }

    try {
      // Traiter le message via le transport SSE
      await session.transport.handlePostMessage(req, res)
    } catch (error) {
      console.error('Erreur MCP message:', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur interne du serveur MCP.' })
      }
    }
  })

  // ==========================================
  // Streamable HTTP Transport (nouveau standard)
  // ==========================================

  // POST /mcp - Traiter les requêtes JSON-RPC (mode stateless ou stateful)
  app.post('/mcp', async (req, res) => {
    // Extraire le token du header Authorization
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Token d\'authentification requis.' },
        id: null
      })
    }

    const token = authHeader.split(' ')[1]
    const auth = await authenticatePat(token)

    if (!auth) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Token API invalide ou expiré.' },
        id: null
      })
    }

    // Vérifier si c'est une session existante
    const sessionId = req.headers['mcp-session-id']
    let session = sessionId ? streamableSessions.get(sessionId) : null

    if (session) {
      // Session existante - utiliser le transport existant
      try {
        await session.transport.handleRequest(req, res)
      } catch (error) {
        console.error('Erreur MCP Streamable HTTP (session existante):', error)
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Erreur interne du serveur MCP.' },
            id: null
          })
        }
      }
    } else {
      // Nouvelle session - créer un nouveau serveur et transport
      console.log(`MCP Streamable HTTP connexion: ${auth.user.username}`)

      try {
        const server = createMcpServer(auth)
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => require('crypto').randomUUID(),
          onsessioninitialized: (newSessionId) => {
            console.log(`MCP Streamable session créée: ${newSessionId}`)
            streamableSessions.set(newSessionId, {
              transport,
              server,
              context: auth,
              createdAt: new Date()
            })
          }
        })

        // Connecter le serveur au transport
        await server.connect(transport)

        // Gérer la fermeture
        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid) {
            console.log(`MCP Streamable session fermée: ${sid}`)
            streamableSessions.delete(sid)
            server.close()
          }
        }

        // Traiter la requête
        await transport.handleRequest(req, res)
      } catch (error) {
        console.error('Erreur MCP Streamable HTTP (nouvelle session):', error)
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Erreur interne du serveur MCP.' },
            id: null
          })
        }
      }
    }
  })

  // GET /mcp - SSE stream pour les notifications serveur (mode stateful)
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id']

    if (!sessionId) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Header mcp-session-id requis pour le mode SSE.' },
        id: null
      })
    }

    const session = streamableSessions.get(sessionId)
    if (!session) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Session non trouvée.' },
        id: null
      })
    }

    // Vérifier l'authentification
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const auth = await authenticatePat(token)
      if (auth && auth.user.id !== session.context.user.id) {
        return res.status(403).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Token ne correspond pas à la session.' },
          id: null
        })
      }
    }

    try {
      await session.transport.handleRequest(req, res)
    } catch (error) {
      console.error('Erreur MCP Streamable GET:', error)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Erreur interne.' },
          id: null
        })
      }
    }
  })

  // DELETE /mcp - Fermer une session
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id']

    if (!sessionId) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Header mcp-session-id requis.' },
        id: null
      })
    }

    const session = streamableSessions.get(sessionId)
    if (!session) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Session non trouvée.' },
        id: null
      })
    }

    // Vérifier l'authentification
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const auth = await authenticatePat(token)
      if (auth && auth.user.id !== session.context.user.id) {
        return res.status(403).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Token ne correspond pas à la session.' },
          id: null
        })
      }
    }

    try {
      await session.transport.handleRequest(req, res)
      streamableSessions.delete(sessionId)
      session.server.close()
      console.log(`MCP Streamable session supprimée: ${sessionId}`)
    } catch (error) {
      console.error('Erreur MCP Streamable DELETE:', error)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Erreur interne.' },
          id: null
        })
      }
    }
  })

  // Endpoint info MCP
  app.get('/mcp/info', (req, res) => {
    res.json({
      name: 'TaskManager MCP Server',
      version: '1.1.0',
      description: 'Serveur MCP pour gérer les tâches via des agents IA',
      transports: {
        streamableHttp: {
          endpoint: '/mcp',
          methods: ['POST', 'GET', 'DELETE'],
          description: 'Nouveau standard MCP (recommandé)'
        },
        sse: {
          endpoint: '/mcp/sse',
          messagesEndpoint: '/mcp/messages',
          description: 'Legacy SSE transport (deprecated)'
        }
      },
      authentication: 'Bearer Token (PAT)',
      tools: [
        'tasks_list',
        'tasks_get',
        'tasks_create',
        'tasks_update',
        'tasks_complete',
        'tasks_reopen',
        'tasks_delete',
        'categories_list',
        'categories_create'
      ]
    })
  })

  console.log('🔌 MCP routes configurées:')
  console.log('   - Streamable HTTP: POST/GET/DELETE /mcp (recommandé)')
  console.log('   - SSE (legacy): /mcp/sse, /mcp/messages')
  console.log('   - Info: /mcp/info')
}

module.exports = {
  createMcpServer,
  setupMcpRoutes,
  authenticatePat
}
