# MASTER SPEC - Task Manager v2.0 (Pour Claude Code)

## STACK TECHNIQUE IMPOSÉE

**Backend**
- Node.js 18
- Express.js
- Prisma ORM
- PostgreSQL 15
- JWT pour auth
- bcrypt pour passwords
- Zod pour validation

**Frontend**
- React 18
- Vite 5
- TailwindCSS 3
- React Router 6
- Axios
- Lucide React (icons)

**Infrastructure**
- Docker + Docker Compose
- 3 containers: db, backend, frontend

---

## SCHÉMA PRISMA (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               String   @id @default(uuid())
  email            String   @unique
  username         String   @unique
  passwordHash     String   @map("password_hash")
  firstName        String?  @map("first_name")
  lastName         String?  @map("last_name")
  themePreference  String   @default("light") @map("theme_preference")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  tasks            Task[]

  @@map("users")
}

model Task {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  title       String
  description String?   @db.Text
  importance  String    @default("normal")
  status      String    @default("active")
  dueDate     DateTime? @map("due_date") @db.Date
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([dueDate])
  @@index([importance])
  @@index([userId, status])
  @@map("tasks")
}
```

---

## API REST ENDPOINTS

### Authentication (Non protégé)

#### POST /api/v1/auth/register
```json
Request:
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response 201:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/v1/auth/login
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response 200:
{
  "user": { ... },
  "token": "jwt_token_here"
}
```

#### GET /api/v1/auth/me
```
Headers: Authorization: Bearer {token}

Response 200:
{
  "user": { ... }
}
```

### Tasks (Protégé par JWT)

#### GET /api/v1/tasks
```
Headers: Authorization: Bearer {token}

Query Params:
- status: 'active' | 'completed' | 'all' (default: 'active')
- sort_by: 'created_at' | 'due_date' | 'importance' | 'title' (default: 'created_at')
- sort_order: 'asc' | 'desc' (default: 'desc')
- search: string (recherche dans title et description)
- importance: 'low' | 'normal' | 'high'

Response 200:
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Task title",
      "description": "Description",
      "importance": "normal",
      "status": "active",
      "dueDate": "2025-12-31",
      "completedAt": null,
      "createdAt": "2025-11-26T10:00:00Z",
      "updatedAt": "2025-11-26T10:00:00Z"
    }
  ]
}
```

#### POST /api/v1/tasks
```json
Headers: Authorization: Bearer {token}

Request:
{
  "title": "New task",
  "description": "Task description",
  "importance": "normal",
  "dueDate": "2025-12-31"
}

Response 201:
{
  "task": { ... }
}
```

#### PUT /api/v1/tasks/:id
```json
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Updated title",
  "description": "Updated description",
  "importance": "high",
  "dueDate": "2025-12-25"
}

Response 200:
{
  "task": { ... }
}
```

#### PATCH /api/v1/tasks/:id/complete
```
Headers: Authorization: Bearer {token}

Response 200:
{
  "task": {
    "status": "completed",
    "completedAt": "2025-11-26T15:30:00Z"
  }
}
```

#### PATCH /api/v1/tasks/:id/reopen
```
Headers: Authorization: Bearer {token}

Response 200:
{
  "task": {
    "status": "active",
    "completedAt": null
  }
}
```

#### DELETE /api/v1/tasks/:id
```
Headers: Authorization: Bearer {token}

Response 204: No Content
```

---

## STRUCTURE BACKEND

```
backend/
├── Dockerfile
├── package.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.js                 # Entry point
    ├── config/
    │   └── database.js          # Prisma client
    ├── middleware/
    │   ├── auth.js              # JWT verification
    │   └── errorHandler.js      # Error handling
    ├── routes/
    │   ├── auth.routes.js       # Auth routes
    │   └── tasks.routes.js      # Tasks routes
    ├── controllers/
    │   ├── auth.controller.js   # Auth logic
    │   └── tasks.controller.js  # Tasks logic
    └── utils/
        └── jwt.js               # JWT helpers
```

### src/index.js
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');
const tasksRoutes = require('./routes/tasks.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', tasksRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Middleware auth.js
```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

---

## STRUCTURE FRONTEND

```
frontend/
├── Dockerfile
├── nginx.conf
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── components/
    │   ├── Layout.jsx
    │   ├── TaskCard.jsx
    │   ├── TaskModal.jsx
    │   ├── TaskList.jsx
    │   ├── SearchBar.jsx
    │   ├── FilterBar.jsx
    │   └── ThemeToggle.jsx
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   └── Dashboard.jsx
    ├── services/
    │   ├── api.js              # Axios config
    │   └── auth.js             # Auth service
    └── hooks/
        ├── useAuth.js
        ├── useTasks.js
        └── useTheme.js
```

### src/services/api.js
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

// Interceptor pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor pour gérer les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### src/hooks/useAuth.js
```javascript
import { useState, useEffect } from 'react';
import api from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, loading, login, logout };
};
```

---

## DOCKER CONFIGURATION

### docker-compose.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: taskmanager_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - taskmanager_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: taskmanager_backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"
    networks:
      - taskmanager_network
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: taskmanager_frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - taskmanager_network

networks:
  taskmanager_network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

### backend/Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

### frontend/Dockerfile
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### frontend/nginx.conf
```nginx
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }

    location /api {
      proxy_pass http://backend:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
```

---

## VARIABLES D'ENVIRONNEMENT (.env)

```env
# Database
DB_USER=taskmanager_user
DB_PASSWORD=SecurePassword123!
DB_NAME=taskmanager_db
DATABASE_URL=postgresql://taskmanager_user:SecurePassword123!@db:5432/taskmanager_db

# Backend
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
PORT=3000

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
```

---

## FONCTIONNALITÉS REQUISES

### Authentification
- ✅ Inscription avec validation email unique
- ✅ Connexion avec email + password
- ✅ Hash password avec bcrypt (10 rounds)
- ✅ JWT avec expiration 7 jours
- ✅ Middleware de protection des routes

### Gestion des tâches
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Marquer comme complétée/réouvrir
- ✅ Recherche dans titre + description
- ✅ Filtres par statut (active, completed)
- ✅ Filtres par importance (low, normal, high)
- ✅ Tri (date création, échéance, importance, titre)
- ✅ Isolation par utilisateur (chaque user voit ses tâches uniquement)

### Interface utilisateur
- ✅ Pages : Login, Register, Dashboard
- ✅ Composants : TaskCard, TaskModal, TaskList
- ✅ Recherche en temps réel
- ✅ Dropdown de tri
- ✅ Toggle dark/light mode (persistant)
- ✅ Responsive (desktop + mobile)
- ✅ Loading states
- ✅ Toast notifications (succès/erreur)

---

## RÈGLES DE SÉCURITÉ

### Backend
1. Hash passwords avec bcrypt (10 rounds)
2. JWT avec secret en variable d'environnement
3. Validation stricte des inputs avec Zod
4. CORS configuré (autoriser uniquement le frontend)
5. Helmet.js pour headers de sécurité
6. Rate limiting sur /auth/login (5 tentatives/15min)

### Frontend
1. Token stocké dans localStorage
2. Axios interceptor pour ajouter token automatiquement
3. Redirection vers /login si 401
4. Validation des formulaires avant soumission
5. Messages d'erreur clairs

---

## VALIDATION ZOD (Exemples)

### auth.controller.js
```javascript
const z = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
```

### tasks.controller.js
```javascript
const taskSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  importance: z.enum(['low', 'normal', 'high']),
  dueDate: z.string().datetime().optional(),
});
```

---

## COMPOSANTS REACT CLÉS

### TaskCard.jsx
```jsx
export function TaskCard({ task, onEdit, onDelete, onComplete }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold">{task.title}</h3>
        <span className={`px-2 py-1 rounded text-xs ${importanceColors[task.importance]}`}>
          {task.importance}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-4">{task.description}</p>
      {task.dueDate && (
        <div className="text-sm text-slate-500 mb-4">
          📅 {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onEdit(task.id)}>Éditer</button>
        <button onClick={() => onComplete(task.id)}>
          {task.status === 'completed' ? 'Réouvrir' : 'Terminer'}
        </button>
        <button onClick={() => onDelete(task.id)}>Supprimer</button>
      </div>
    </div>
  );
}
```

---

## COMMANDES ESSENTIELLES

### Backend
```bash
cd backend
npm init -y
npm install express prisma @prisma/client bcrypt jsonwebtoken cors dotenv helmet express-rate-limit zod
npm install -D nodemon

npx prisma init
npx prisma migrate dev --name init
npx prisma generate

npm run dev
```

### Frontend
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom axios lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

npm run dev
```

### Docker
```bash
docker-compose up --build
docker-compose down
docker-compose logs -f
```

---

## PRIORITÉS D'IMPLÉMENTATION

### Phase 1 (Jour 1)
1. Setup Docker (docker-compose.yml, Dockerfiles)
2. Schéma Prisma
3. Structure des dossiers

### Phase 2 (Jour 2)
1. Routes auth (register, login, me)
2. Middleware JWT
3. Controllers auth avec bcrypt

### Phase 3 (Jour 2-3)
1. Routes tasks CRUD
2. Filtres, recherche, tri
3. Validation Zod

### Phase 4 (Jour 3)
1. Frontend React setup
2. Pages Login, Register
3. Service API + hooks

### Phase 5 (Jour 3-4)
1. Dashboard
2. TaskCard, TaskModal
3. Fonctionnalités (recherche, filtres, tri)

### Phase 6 (Jour 4)
1. Dark mode
2. Toast notifications
3. Loading states
4. Responsive

---

## CRITÈRES DE VALIDATION

- [ ] docker-compose up lance les 3 containers
- [ ] Registration fonctionne
- [ ] Login fonctionne et retourne un JWT
- [ ] Toutes les routes tasks fonctionnent avec JWT
- [ ] Recherche fonctionne dans titre + description
- [ ] Filtres par statut fonctionnent
- [ ] Tri fonctionne
- [ ] Dark mode persiste après refresh
- [ ] Responsive sur mobile
- [ ] Toast notifications s'affichent
- [ ] Les tâches sont isolées par utilisateur

---

**VERSION**: 1.0.0  
**DATE**: 26 novembre 2025  
**FORMAT**: Optimisé pour Claude Code
