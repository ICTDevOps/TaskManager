# TaskManager - Intégration API & MCP

## Vue d'ensemble

TaskManager permet aux agents IA (N8N, Claude Desktop, Make, etc.) de gérer les tâches via deux méthodes :

1. **API REST** avec Personal Access Token (PAT)
2. **Serveur MCP** (Model Context Protocol) via SSE

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         SERVEUR                              │
│                                                              │
│  ┌─────────┐     HTTP/SSE      ┌─────────────────────────┐  │
│  │  Agent  │ ───────────────── │  TaskManager Backend    │  │
│  │  (N8N)  │  :3000/mcp/sse    │        (API)            │  │
│  └─────────┘                   │                         │  │
│                                │  - REST API (/api/v1)   │  │
│                                │  - MCP SSE (/mcp/sse)   │  │
│  ┌─────────┐     HTTP          │  - MCP Messages         │  │
│  │ Claude  │ ───────────────── │    (/mcp/messages)      │  │
│  │ Desktop │  Bridge stdio     │                         │  │
│  └─────────┘                   └───────────┬─────────────┘  │
│                                            │                │
│                                      ┌─────▼─────┐         │
│                                      │ PostgreSQL│         │
│                                      │    (DB)   │         │
│                                      └───────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Prérequis

### Activer l'accès API pour un utilisateur

L'accès API doit être activé par un administrateur :

1. Se connecter en tant qu'admin
2. Aller dans **Administration > Utilisateurs**
3. Cliquer sur le badge **API** de l'utilisateur pour l'activer

### Créer un Personal Access Token (PAT)

1. Se connecter avec l'utilisateur
2. Aller dans **Paramètres > API**
3. Cliquer sur **Nouveau token**
4. Configurer les permissions :
   - `canReadTasks` - Lire les tâches
   - `canCreateTasks` - Créer des tâches
   - `canUpdateTasks` - Modifier des tâches
   - `canDeleteTasks` - Supprimer des tâches
   - `canReadCategories` - Lire les catégories
   - `canCreateCategories` - Créer des catégories
5. **Copier le token** (affiché une seule fois)

Format du token : `pat_[userId_prefix]_[random_32chars]`

Exemple : `pat_5203_aGfXuKTDNVIYUrK94kO9Avu3Kh5yN-x-`

---

## 2. API REST

### Authentification

Ajouter le header `Authorization` à chaque requête :

```
Authorization: Bearer pat_XXXX_XXXXXXXXXXXXXXXXXXXXXXXX
```

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/tasks` | Liste des tâches |
| GET | `/api/v1/tasks/:id` | Détails d'une tâche |
| POST | `/api/v1/tasks` | Créer une tâche |
| PATCH | `/api/v1/tasks/:id` | Modifier une tâche |
| DELETE | `/api/v1/tasks/:id` | Supprimer une tâche |
| GET | `/api/v1/categories` | Liste des catégories |
| POST | `/api/v1/categories` | Créer une catégorie |

### Exemples

#### Lister les tâches

```bash
curl -s "http://localhost:3000/api/v1/tasks" \
  -H "Authorization: Bearer pat_XXXX_XXXX"
```

#### Créer une tâche

```bash
curl -s -X POST "http://localhost:3000/api/v1/tasks" \
  -H "Authorization: Bearer pat_XXXX_XXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ma nouvelle tâche",
    "description": "Description détaillée",
    "importance": "high",
    "dueDate": "2025-12-01"
  }'
```

#### Marquer une tâche comme terminée

```bash
curl -s -X PATCH "http://localhost:3000/api/v1/tasks/UUID" \
  -H "Authorization: Bearer pat_XXXX_XXXX" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Valeurs valides

**Importance** : `low`, `normal`, `high`

**Status** : `active`, `completed`

---

## 3. Serveur MCP

Le serveur MCP permet une intégration native avec les clients MCP comme N8N.

### Transports disponibles

Le serveur supporte **deux transports** :

| Transport | Endpoint | Description |
|-----------|----------|-------------|
| **Streamable HTTP** | `/mcp` | Nouveau standard MCP (recommandé) |
| **SSE** (legacy) | `/mcp/sse` + `/mcp/messages` | Ancien transport, déprécié |

### Endpoints MCP

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/mcp` | POST | Streamable HTTP - requêtes JSON-RPC |
| `/mcp` | GET | Streamable HTTP - stream SSE (mode stateful) |
| `/mcp` | DELETE | Streamable HTTP - fermer une session |
| `/mcp/sse` | GET | SSE legacy - connexion SSE |
| `/mcp/messages` | POST | SSE legacy - envoi des requêtes |
| `/mcp/info` | GET | Informations sur le serveur MCP |

---

### 3.1 Transport Streamable HTTP (recommandé)

C'est le nouveau standard MCP, plus simple et plus efficace.

#### Headers requis

```
Authorization: Bearer pat_XXXX_XXXX
Content-Type: application/json
Accept: application/json, text/event-stream
```

#### Flux de connexion

1. Le client envoie `initialize` en POST vers `/mcp`
2. Le serveur répond avec un header `mcp-session-id`
3. Le client envoie `notifications/initialized`
4. Le client peut ensuite appeler `tools/list`, `tools/call`, etc.

#### Exemple

```bash
# 1. Initialize
curl -X POST "http://localhost:3000/mcp" \
  -H "Authorization: Bearer pat_XXXX_XXXX" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0.0"}},"id":1}'

# Récupérer mcp-session-id depuis les headers de réponse

# 2. Initialized notification
curl -X POST "http://localhost:3000/mcp" \
  -H "Authorization: Bearer pat_XXXX_XXXX" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}'

# 3. Appeler un outil
curl -X POST "http://localhost:3000/mcp" \
  -H "Authorization: Bearer pat_XXXX_XXXX" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tasks_list","arguments":{}},"id":2}'
```

---

### 3.2 Transport SSE (legacy)

Ancien transport, maintenu pour rétrocompatibilité.

#### Flux de connexion

1. Le client ouvre une connexion SSE vers `/mcp/sse` avec le token dans le header
2. Le serveur renvoie un `sessionId`
3. Le client envoie ses requêtes en POST vers `/mcp/messages?sessionId=XXX`
4. Les réponses sont envoyées via le flux SSE

### Outils MCP disponibles

| Outil | Description | Permissions requises |
|-------|-------------|---------------------|
| `tasks_list` | Liste les tâches avec filtres | `canReadTasks` |
| `tasks_get` | Détails d'une tâche | `canReadTasks` |
| `tasks_create` | Crée une nouvelle tâche | `canCreateTasks` |
| `tasks_update` | Modifie une tâche | `canUpdateTasks` |
| `tasks_complete` | Marque comme terminée | `canUpdateTasks` |
| `tasks_reopen` | Réouvre une tâche | `canUpdateTasks` |
| `tasks_delete` | Supprime une tâche | `canDeleteTasks` |
| `categories_list` | Liste les catégories | `canReadCategories` |
| `categories_create` | Crée une catégorie | `canCreateCategories` |

---

## 4. Configuration N8N

### Prérequis

- N8N version 1.x avec support MCP
- Node "MCP Client" disponible

### Configuration avec HTTP Streamable (recommandé)

1. Ajouter un node **AI Agent**
2. Connecter un **MCP Client** comme tool
3. Configurer le MCP Client :

| Paramètre | Valeur |
|-----------|--------|
| **Server Transport** | `HTTP Streamable` |
| **URL** | `http://BACKEND_HOST:3000/mcp` |
| **Authentication** | Header Auth |

4. Créer un credential **Header Auth** :

| Paramètre | Valeur |
|-----------|--------|
| **Name** | `Authorization` |
| **Value** | `Bearer pat_XXXX_XXXX` |

### Configuration avec SSE (legacy)

Si votre version de N8N ne supporte pas HTTP Streamable :

| Paramètre | Valeur |
|-----------|--------|
| **Server Transport** | `SSE` |
| **SSE URL** | `http://BACKEND_HOST:3000/mcp/sse` |
| **Authentication** | Header Auth |

### URLs selon l'environnement

| Environnement | HTTP Streamable | SSE (legacy) |
|---------------|-----------------|--------------|
| Même réseau Docker | `http://taskmanager-backend:3000/mcp` | `http://taskmanager-backend:3000/mcp/sse` |
| Même machine | `http://localhost:3000/mcp` | `http://localhost:3000/mcp/sse` |
| Réseau local | `http://192.168.X.X:3000/mcp` | `http://192.168.X.X:3000/mcp/sse` |

---

## 5. Configuration Claude Desktop

Claude Desktop utilise le transport **stdio**, pas SSE. Un bridge est nécessaire.

### Installation du bridge

1. Copier le dossier `mcp-bridge/` sur la machine Windows
2. S'assurer que Node.js est installé

### Configuration

Modifier le fichier `claude_desktop_config.json` :

**Windows** : `%APPDATA%\Claude\claude_desktop_config.json`
**macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux** : `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "taskmanager": {
      "command": "node",
      "args": ["C:\\chemin\\vers\\mcp-bridge\\index.js"],
      "env": {
        "MCP_AUTH_TOKEN": "pat_XXXX_XXXX",
        "MCP_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Redémarrer Claude Desktop

Après modification, redémarrer complètement Claude Desktop pour charger la configuration.

---

## 6. Sécurité

### Bonnes pratiques

- **Ne jamais partager** un token PAT
- Utiliser des **permissions minimales** (principe du moindre privilège)
- **Révoquer** les tokens non utilisés
- Définir une **date d'expiration** si possible

### Révocation d'un token

1. Aller dans **Paramètres > API**
2. Cliquer sur **Révoquer** sur le token concerné

### Audit

Chaque token enregistre :
- `lastUsedAt` : Dernière utilisation
- `lastUsedIp` : IP de la dernière requête

---

## 7. Dépannage

### Erreur "Token invalide"

- Vérifier que le token est correct et complet
- Vérifier que le token n'est pas expiré
- Vérifier que le token n'a pas été révoqué

### Erreur "Permission insuffisante"

- Vérifier les permissions du token dans Paramètres > API
- Le token doit avoir la permission correspondante à l'action

### Erreur "Accès API non autorisé"

- L'administrateur doit activer `canCreateApiTokens` pour l'utilisateur

### N8N : "Error in sub-node MCP Client"

- Vérifier l'URL du backend (accessible depuis N8N)
- Vérifier le format du header : `Authorization: Bearer pat_XXX`
- Vérifier les logs du backend pour plus de détails

### Claude Desktop : Connexion échouée

- Vérifier que Node.js est installé sur Windows
- Vérifier le chemin vers `index.js` dans la config
- Vérifier que `MCP_API_URL` est accessible

---

## 8. Référence API

### POST /api/v1/tasks

Créer une tâche.

**Body** :
```json
{
  "title": "string (requis)",
  "description": "string (optionnel)",
  "importance": "low | normal | high (défaut: normal)",
  "categoryId": "UUID (optionnel)",
  "dueDate": "YYYY-MM-DD (optionnel)",
  "dueTime": "HH:MM (optionnel)"
}
```

### PATCH /api/v1/tasks/:id

Modifier une tâche.

**Body** (tous les champs sont optionnels) :
```json
{
  "title": "string",
  "description": "string",
  "importance": "low | normal | high",
  "status": "active | completed",
  "categoryId": "UUID | null",
  "dueDate": "YYYY-MM-DD | null",
  "dueTime": "HH:MM | null"
}
```

### POST /api/v1/categories

Créer une catégorie.

**Body** :
```json
{
  "name": "string (requis)",
  "color": "#RRGGBB (défaut: #6366f1)"
}
```
