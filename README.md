# Task Manager v2.0

> **Available in:** 🇬🇧 [English](README.md) | 🇫🇷 [Français](README.fr.md)

A multi-user task management application with a modern interface, delegation system, and admin panel.

**Includes an MCP Server (Model Context Protocol)** enabling AI agents (Claude Desktop, N8N, etc.) to manage your tasks autonomously.

## Features

### For Users
- **Authentication**: Register and login (email or username)
- **Task Management**: Create, edit, delete, mark as completed
- **Categories**: Organize tasks with custom colored categories
- **Advanced Filters**: By status, priority, category + text search
- **Sorting**: By due date, priority, or creation date
- **Export**: Download tasks as JSON or XML
- **Import**: Import tasks from JSON or XML files with duplicate handling (New v0.7)
- **Settings**: Edit profile, email, and password
- **Theme**: Light mode / Dark mode

### Task Delegation (New v2.0)
- **Sharing**: Invite other users to manage your tasks
- **Granular Permissions**: Set rights (create, edit, delete, categories)
- **Hidden Categories**: Hide certain categories from delegates
- **Default Context**: Choose which context to display at login (own tasks or owner's tasks)
- **Activity Log**: Track actions performed by delegates

### For Administrators
- **Dashboard**: Global statistics (users, tasks, completion rate)
- **User Management**: Activate/deactivate, delete, promote to admin
- **Advanced Actions**: Change user password, export/import user tasks
- **API Access**: Enable/disable API access per user

### API & MCP Integration (New v0.6)
- **Personal Access Tokens (PAT)**: Create API tokens with granular permissions
- **MCP Server**: Native integration with AI agents (N8N, Claude Desktop, etc.)
- **HTTP Streamable**: New MCP standard (recommended)
- **SSE Transport**: Legacy support for backward compatibility
- **MCP Tools**: tasks_list, tasks_create, tasks_update, tasks_complete, categories_list, etc.

## Technologies

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express.js, Prisma ORM |
| Database | PostgreSQL 15 |
| Authentication | JWT, bcrypt, PAT (Personal Access Tokens) |
| MCP Server | @modelcontextprotocol/sdk v1.23.0 |
| Containerization | Docker, Docker Compose |
| Web Server | Nginx (production) |

## Prerequisites

- Docker and Docker Compose installed
- Available ports: 80 (frontend), 3000 (API), 5432 (PostgreSQL)

## Installation

### Option 1: Local Development

#### 1. Clone the project

```bash
git clone <repository-url>
cd TaskManager
```

#### 2. Environment Configuration

Create the `.env` file at the root:

```env
# Database
DB_USER=taskmanager_user
DB_PASSWORD=SecurePassword123!
DB_NAME=taskmanager_db
DATABASE_URL=postgresql://taskmanager_user:SecurePassword123!@db:5432/taskmanager_db

# Backend
NODE_ENV=development
JWT_SECRET=change_this_super_secret_key_in_production
JWT_EXPIRES_IN=7d
PORT=3000

# Frontend
VITE_API_URL=/api/v1
```

#### 3. Launch the application

```bash
docker-compose up --build -d
```

#### 4. Access the application

- **Application**: http://localhost
- **API**: http://localhost:3000/api/v1
- **Admin**: http://localhost/admin/login

### Option 2: Synology/Portainer Deployment

Use the `docker-compose.synology.yml` file which includes:
- Pre-built Docker images from Docker Hub (`lordbadack/taskmanager-*:0.7`)
- Generated passwords and secrets
- Automatic migrations at startup
- Automatic admin seeding
- MCP support (HTTP Streamable + SSE)

## Docker Hub Images

| Image | Tags |
|-------|------|
| `lordbadack/taskmanager-backend` | `0.7`, `0.6`, `0.5` |
| `lordbadack/taskmanager-frontend` | `0.7`, `0.6`, `0.5` |

## Default Administrator Account

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin` |

> **Important**: The password must be changed on first login.

## Project Structure

```
TaskManager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Data model
│   │   ├── seed.js            # Default admin creation
│   │   └── migrations/        # SQL migrations
│   ├── src/
│   │   ├── controllers/       # Business logic
│   │   ├── routes/            # API routes definition
│   │   ├── middleware/        # Middlewares (auth, admin)
│   │   └── index.js           # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Main pages
│   │   ├── services/          # API calls
│   │   ├── hooks/             # Custom React hooks
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── mcp-bridge/                # MCP bridge for Claude Desktop
│   ├── index.js               # stdio → HTTP bridge
│   └── package.json
├── docs/
│   └── API-MCP-INTEGRATION.md # API & MCP documentation
├── docker-compose.yml         # Local development
├── docker-compose.synology.yml # Synology/Portainer deployment
├── CHANGELOG.md
└── README.md
```

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | User profile |
| PATCH | `/api/v1/auth/profile` | Update profile |
| PATCH | `/api/v1/auth/email` | Update email |
| PATCH | `/api/v1/auth/password` | Update password |
| PATCH | `/api/v1/auth/default-context` | Set default context |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tasks` | List tasks |
| POST | `/api/v1/tasks` | Create a task |
| PUT | `/api/v1/tasks/:id` | Update a task |
| DELETE | `/api/v1/tasks/:id` | Delete a task |
| PATCH | `/api/v1/tasks/:id/complete` | Mark as completed |
| PATCH | `/api/v1/tasks/:id/reopen` | Reopen a task |
| GET | `/api/v1/tasks/export` | Export tasks |

**Filter parameters (GET /tasks)**:
- `status`: `all` | `active` | `completed`
- `priority`: `low` | `medium` | `high`
- `categoryId`: Category UUID
- `search`: Text search
- `sortBy`: `dueDate` | `priority` | `created_at`
- `sortOrder`: `asc` | `desc`
- `ownerId`: Owner UUID (for delegation)

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | List categories |
| POST | `/api/v1/categories` | Create a category |
| PUT | `/api/v1/categories/:id` | Update a category |
| DELETE | `/api/v1/categories/:id` | Delete a category |

### Delegations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/delegations` | List delegations (given and received) |
| POST | `/api/v1/delegations` | Create an invitation |
| PATCH | `/api/v1/delegations/:id` | Update permissions |
| DELETE | `/api/v1/delegations/:id` | Delete a delegation |
| POST | `/api/v1/delegations/:id/accept` | Accept an invitation |
| POST | `/api/v1/delegations/:id/reject` | Reject an invitation |
| POST | `/api/v1/delegations/:id/leave` | Leave a delegation |
| GET | `/api/v1/delegations/search-users` | Search users |

### Activity Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/activity` | Action history |

### Administration (requires admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/stats` | Global statistics |
| GET | `/api/v1/admin/users` | List users |
| GET | `/api/v1/admin/users/:id` | User details |
| PATCH | `/api/v1/admin/users/:id` | Update role/status/API access |
| PATCH | `/api/v1/admin/users/:id/password` | Change password |
| DELETE | `/api/v1/admin/users/:id` | Delete user |
| GET | `/api/v1/admin/users/:id/export` | Export user tasks |

### API Tokens (Personal Access Tokens)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tokens` | List user tokens |
| POST | `/api/v1/tokens` | Create a new token |
| DELETE | `/api/v1/tokens/:id` | Revoke a token |

**Available permissions**:
- `canReadTasks` - Read tasks
- `canCreateTasks` - Create tasks
- `canUpdateTasks` - Update tasks
- `canDeleteTasks` - Delete tasks
- `canReadCategories` - Read categories
- `canCreateCategories` - Create categories

### MCP Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mcp` | HTTP Streamable - JSON-RPC requests |
| GET | `/mcp` | HTTP Streamable - SSE stream (stateful) |
| DELETE | `/mcp` | HTTP Streamable - close session |
| GET | `/mcp/sse` | SSE legacy - connection |
| POST | `/mcp/messages` | SSE legacy - messages |
| GET | `/mcp/info` | MCP server information |

**Available MCP tools**:

| Tool | Description |
|------|-------------|
| `tasks_list` | List tasks with filters |
| `tasks_get` | Task details |
| `tasks_create` | Create a task |
| `tasks_update` | Update a task |
| `tasks_complete` | Mark as completed |
| `tasks_reopen` | Reopen a task |
| `tasks_delete` | Delete a task |
| `categories_list` | List categories |
| `categories_create` | Create a category |

> **Full documentation**: See [docs/API-MCP-INTEGRATION.md](docs/API-MCP-INTEGRATION.md)

## Data Model

### User
```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  username           String    @unique
  passwordHash       String
  firstName          String?
  lastName           String?
  themePreference    String    @default("light")
  defaultContext     String    @default("self")
  role               String    @default("user")
  mustChangePassword Boolean   @default(false)
  isActive           Boolean   @default(true)
  tasks              Task[]
  categories         Category[]
  delegationsGiven   TaskDelegation[] @relation("Owner")
  delegationsReceived TaskDelegation[] @relation("Delegate")
  activityLogs       ActivityLog[]
}
```

### TaskDelegation
```prisma
model TaskDelegation {
  id                  String   @id @default(uuid())
  ownerId             String
  delegateId          String
  canCreateTasks      Boolean  @default(false)
  canEditTasks        Boolean  @default(false)
  canDeleteTasks      Boolean  @default(false)
  canCreateCategories Boolean  @default(false)
  hiddenCategoryIds   String   @default("")
  status              String   @default("pending")
  owner               User     @relation("Owner")
  delegate            User     @relation("Delegate")
}
```

### ActivityLog
```prisma
model ActivityLog {
  id            String   @id @default(uuid())
  ownerId       String
  actorId       String
  targetOwnerId String?
  action        String
  entityType    String
  entityId      String?
  entityTitle   String
  details       String?
  createdAt     DateTime @default(now())
}
```

## Useful Commands

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f

# Logs for a specific service
docker-compose logs -f backend

# Rebuild images
docker-compose up --build -d

# Access backend shell
docker-compose exec backend sh

# Run admin seed
docker-compose exec backend npx prisma db seed

# Reset database
docker-compose exec backend npx prisma migrate reset
```

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with expiration (7 days)
- Personal Access Tokens (PAT) with SHA-256 hash
- Granular permissions on API tokens
- Input validation with Zod
- Security headers (Helmet)
- CORS protection
- Rate limiting on authentication
- Trust proxy for reverse proxy (Nginx)
- Admin account protected against deletion/deactivation
- API access audit (lastUsedAt, lastUsedIp)

## Contributing

Contributions are welcome! Feel free to submit pull requests.

For translations, please follow the naming convention: `README.<lang>.md` (e.g., `README.es.md` for Spanish).

## Author

**Olivier Malfroidt** - VnetConsult SRL - 2025

## License

MIT
