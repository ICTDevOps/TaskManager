# Spécifications Techniques - Task Manager Multi-utilisateur v2.0

## 📋 Vue d'ensemble du projet

### Contexte
Refonte complète d'une application web de gestion de tâches existante pour la transformer en une solution multi-utilisateur avec une architecture moderne et scalable.

### Objectifs principaux
- ✅ Passer d'une application mono-utilisateur à multi-utilisateur
- ✅ Remplacer le backend N8N/Microsoft 365 Todo par une API REST et PostgreSQL
- ✅ Containeriser l'ensemble de l'application avec Docker
- ✅ Conserver toutes les fonctionnalités existantes et améliorer l'UX
- ✅ Ajouter l'authentification et la gestion des utilisateurs

---

## 🏗️ Architecture cible

### Stack technique recommandée

#### Frontend
- **Framework**: React avec Vite (ou Vue.js selon préférence)
- **Styling**: TailwindCSS (comme l'actuel) ou styled-components
- **State Management**: React Context API + hooks (ou Redux si complexité)
- **HTTP Client**: Axios ou Fetch API
- **Routing**: React Router v6

#### Backend
- **Framework**: Node.js avec Express (ou Python FastAPI)
- **ORM**: Prisma (Node.js) ou SQLAlchemy (Python)
- **Authentification**: JWT (JSON Web Tokens)
- **Validation**: Zod (Node.js) ou Pydantic (Python)
- **Documentation API**: Swagger/OpenAPI

#### Base de données
- **SGBD**: PostgreSQL 15+
- **Migrations**: Prisma Migrate ou Alembic
- **Connexion**: pg (Node.js) ou asyncpg (Python)

#### Infrastructure
- **Containerisation**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (pour servir le frontend et router vers l'API)
- **Orchestration**: Docker Compose pour le développement

### Architecture des containers

```
┌─────────────────────────────────────────┐
│           Nginx (Port 80/443)           │
│         (Reverse Proxy + Static)        │
└────────────┬────────────────────────────┘
             │
             ├─────────────┬──────────────┐
             │             │              │
             ▼             ▼              ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Frontend  │  │  Backend   │  │ PostgreSQL │
    │  (Static)  │  │    API     │  │            │
    │            │  │  (Node.js) │  │   (DB)     │
    └────────────┘  └────────────┘  └────────────┘
```

---

## 📊 Modèle de données (PostgreSQL)

### Table: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  theme_preference VARCHAR(20) DEFAULT 'light', -- 'light' | 'dark' | 'system'
  language VARCHAR(10) DEFAULT 'fr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### Table: tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  importance VARCHAR(20) DEFAULT 'normal', -- 'low' | 'normal' | 'high'
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'completed' | 'archived'
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMP,
  position INTEGER DEFAULT 0, -- Pour l'ordre personnalisé
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_importance CHECK (importance IN ('low', 'normal', 'high')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'completed', 'archived'))
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_importance ON tasks(importance);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
```

### Table: tags (optionnel - pour évolution future)
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1', -- Hex color
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, name)
);

CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (task_id, tag_id)
);
```

---

## 🔌 API REST - Endpoints

### Authentification

#### POST /api/v1/auth/register
Créer un nouveau compte utilisateur
```json
Request:
{
  "email": "olivier@example.com",
  "username": "olivier",
  "password": "SecurePassword123!",
  "first_name": "Olivier",
  "last_name": "Dupont"
}

Response (201):
{
  "user": {
    "id": "uuid",
    "email": "olivier@example.com",
    "username": "olivier",
    "first_name": "Olivier",
    "last_name": "Dupont"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/v1/auth/login
Connexion utilisateur
```json
Request:
{
  "email": "olivier@example.com",
  "password": "SecurePassword123!"
}

Response (200):
{
  "user": { ... },
  "token": "jwt_token_here"
}
```

#### POST /api/v1/auth/logout
Déconnexion (optionnel si JWT stateless)

#### GET /api/v1/auth/me
Récupérer les infos de l'utilisateur connecté
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "user": { ... }
}
```

---

### Gestion des tâches

#### GET /api/v1/tasks
Récupérer toutes les tâches de l'utilisateur
```
Headers: Authorization: Bearer {token}

Query params:
- status: 'active' | 'completed' | 'archived' | 'all' (default: 'active')
- sort_by: 'created_at' | 'due_date' | 'importance' | 'title' (default: 'created_at')
- sort_order: 'asc' | 'desc' (default: 'desc')
- search: string (recherche dans titre et description)
- importance: 'low' | 'normal' | 'high'
- limit: number (pagination)
- offset: number (pagination)

Response (200):
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Tâche importante",
      "description": "Description détaillée",
      "importance": "high",
      "status": "active",
      "due_date": "2025-12-31",
      "due_time": null,
      "position": 0,
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-20T10:00:00Z",
      "completed_at": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### GET /api/v1/tasks/:id
Récupérer une tâche spécifique
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "task": { ... }
}
```

#### POST /api/v1/tasks
Créer une nouvelle tâche
```json
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Nouvelle tâche",
  "description": "Description de la tâche",
  "importance": "normal",
  "due_date": "2025-12-31",
  "due_time": "14:30:00"
}

Response (201):
{
  "task": { ... }
}
```

#### PUT /api/v1/tasks/:id
Mettre à jour une tâche
```json
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Titre modifié",
  "description": "Description modifiée",
  "importance": "high",
  "due_date": "2025-12-25"
}

Response (200):
{
  "task": { ... }
}
```

#### PATCH /api/v1/tasks/:id/complete
Marquer une tâche comme terminée
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "task": {
    "status": "completed",
    "completed_at": "2025-11-26T15:30:00Z"
  }
}
```

#### PATCH /api/v1/tasks/:id/reopen
Réouvrir une tâche terminée
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "task": {
    "status": "active",
    "completed_at": null
  }
}
```

#### DELETE /api/v1/tasks/:id
Supprimer une tâche
```
Headers: Authorization: Bearer {token}

Response (204): No Content
```

---

### Statistiques utilisateur

#### GET /api/v1/stats
Récupérer les statistiques de l'utilisateur
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "total_tasks": 42,
  "active_tasks": 15,
  "completed_tasks": 27,
  "high_priority_tasks": 5,
  "overdue_tasks": 3,
  "tasks_completed_this_week": 8,
  "completion_rate": 64.3
}
```

---

## 🎨 Fonctionnalités Frontend

### Pages principales

#### 1. Page de connexion/inscription (`/login`, `/register`)
- Formulaire de connexion avec email/mot de passe
- Lien vers la page d'inscription
- Validation des champs côté client
- Messages d'erreur clairs

#### 2. Dashboard principal (`/dashboard`)
- **Header**:
  - Logo et titre de l'app
  - Statistiques compactes (tâches actives, complétées)
  - Bouton de recherche
  - Toggle dark/light mode
  - Menu utilisateur (profil, déconnexion)

- **Barre de filtres et tri**:
  - Filtres par statut (Toutes, Actives, Complétées)
  - Tri (Date création, Échéance, Importance)
  - Champ de recherche en temps réel

- **Liste des tâches**:
  - Affichage en cartes (comme l'actuel)
  - Badge d'importance avec couleurs (Faible: bleu, Normal: vert, Élevée: rouge)
  - Date d'échéance visible
  - Actions rapides: éditer, marquer terminée, supprimer
  - État vide avec illustration si aucune tâche

- **Bouton flottant (+)**: Créer une nouvelle tâche

- **Navigation mobile (bottom bar)**:
  - Toutes les tâches
  - Actives
  - Complétées
  - Bouton central pour créer

#### 3. Modal de création/édition de tâche
- Champs:
  - Titre (requis)
  - Description (requis, textarea)
  - Importance (dropdown: Faible, Normal, Élevée)
  - Date d'échéance (date picker)
  - Heure d'échéance (time picker, optionnel)
- Boutons: Annuler / Enregistrer
- Validation des champs
- Fermeture au clic sur le backdrop

#### 4. Page de profil (`/profile`)
- Informations personnelles (nom, email, avatar)
- Préférences (thème, langue)
- Statistiques personnelles
- Bouton de déconnexion

### Fonctionnalités UX à conserver

1. **Recherche en temps réel**
   - Recherche instantanée dans titre + description
   - Bouton pour effacer la recherche
   - Compteur de résultats

2. **Tri et filtrage**
   - Dropdown de tri avec icônes
   - Persistance du choix de tri dans localStorage
   - Animation des changements

3. **Mode sombre/clair**
   - Toggle dans le header
   - Persistance dans localStorage
   - Transition fluide

4. **Édition en ligne**
   - Possibilité d'éditer directement dans la carte
   - Boutons Annuler/Enregistrer
   - Animation d'entrée/sortie du mode édition

5. **Notifications toast**
   - Succès, erreur, info
   - Auto-dismiss après 3s
   - Position en haut à droite

6. **Responsive design**
   - Adaptation mobile/tablet/desktop
   - Bottom navigation sur mobile
   - Touch gestures (swipe pour actions)

7. **États de chargement**
   - Skeleton loaders pour les cartes
   - Spinner lors du fetch
   - État vide avec illustration

8. **Auto-refresh**
   - Rafraîchissement automatique toutes les 5 minutes
   - Bouton de refresh manuel
   - Indicateur visuel du dernier refresh

---

## 🐳 Configuration Docker

### Structure des fichiers

```
task-manager-v2/
├── docker-compose.yml
├── .env
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── utils/
│       └── App.jsx
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json (si TypeScript)
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── models/
│       ├── middleware/
│       ├── config/
│       └── index.js
└── database/
    ├── init.sql
    └── migrations/
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Base de données PostgreSQL
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
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - taskmanager_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: taskmanager_backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
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
      - "443:443"
    networks:
      - taskmanager_network
    volumes:
      - ./frontend/nginx.conf:/etc/nginx/nginx.conf:ro

networks:
  taskmanager_network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

### Dockerfile Frontend (Multi-stage build)

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

### Dockerfile Backend

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### Fichier .env

```env
# Base de données
DB_USER=taskmanager_user
DB_PASSWORD=SecurePassword123!
DB_NAME=taskmanager_db
DATABASE_URL=postgresql://taskmanager_user:SecurePassword123!@db:5432/taskmanager_db

# Backend
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 🔒 Sécurité

### Authentification JWT

1. **Génération du token** lors du login/register
2. **Stockage côté client**: localStorage ou httpOnly cookie (préférable)
3. **Envoi du token**: Header `Authorization: Bearer {token}`
4. **Middleware backend**: Vérifier le token sur chaque requête protégée
5. **Expiration**: 7 jours par défaut, refresh token optionnel

### Validation des données

1. **Backend**: Validation stricte avec Zod/Pydantic
2. **Frontend**: Validation des formulaires avant envoi
3. **Sanitization**: Échapper les entrées utilisateur (XSS)

### CORS

```javascript
// Configuration CORS dans le backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### Rate Limiting

```javascript
// Limiter les tentatives de login
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: 'Trop de tentatives, réessayez plus tard'
});

app.use('/api/v1/auth/login', authLimiter);
```

---

## 🧪 Tests

### Tests unitaires Backend
- Tester les routes API
- Tester les fonctions de validation
- Tester les middlewares d'authentification
- **Framework**: Jest ou Vitest

### Tests d'intégration
- Tester les flux complets (création utilisateur + tâches)
- Tester l'authentification end-to-end

### Tests Frontend
- Composants React avec React Testing Library
- Tests d'intégration des pages

---

## 📦 Migration des données

### Script de migration depuis Microsoft 365 Todo

```javascript
// migration.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateFromM365(userId, n8nWebhookUrl) {
  // 1. Récupérer les tâches depuis N8N/M365
  const response = await axios.get(n8nWebhookUrl);
  const m365Tasks = response.data;
  
  // 2. Transformer et insérer dans PostgreSQL
  for (const task of m365Tasks) {
    await prisma.task.create({
      data: {
        userId: userId,
        title: task.title,
        description: task.body?.content || '',
        importance: task.importance || 'normal',
        status: task.status === 'completed' ? 'completed' : 'active',
        dueDate: task.dueDateTime?.dateTime ? 
          new Date(task.dueDateTime.dateTime) : null,
        createdAt: new Date(task.createdDateTime)
      }
    });
  }
  
  console.log(`✅ ${m365Tasks.length} tâches migrées avec succès`);
}

// Exécution
migrateFromM365('user-uuid-here', 'https://ain8n.ict-expertise.com/webhook/get-todotasks');
```

---

## 🚀 Déploiement

### Étapes de déploiement

1. **Prérequis**:
   - Docker et Docker Compose installés
   - Ports 80, 443, 3000, 5432 disponibles

2. **Configuration**:
   ```bash
   cp .env.example .env
   # Éditer .env avec vos valeurs
   ```

3. **Build et lancement**:
   ```bash
   docker-compose up -d --build
   ```

4. **Vérification**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **Initialisation de la base**:
   ```bash
   docker-compose exec backend npm run migrate
   docker-compose exec backend npm run seed # Optionnel
   ```

6. **Accès**:
   - Frontend: http://localhost
   - API: http://localhost:3000/api/v1
   - Swagger: http://localhost:3000/api-docs

### Production

- Utiliser un reverse proxy externe (Traefik, Nginx)
- Certificats SSL avec Let's Encrypt
- Variables d'environnement sécurisées
- Backups automatiques de la base de données
- Monitoring (Prometheus + Grafana)
- Logs centralisés (ELK Stack)

---

## 📝 Checklist de développement

### Phase 1: Setup initial
- [ ] Initialiser les dépôts Git (mono-repo ou multi-repos)
- [ ] Configurer Docker et Docker Compose
- [ ] Créer la structure de base (frontend/backend/database)
- [ ] Installer les dépendances

### Phase 2: Backend
- [ ] Modèle de données PostgreSQL
- [ ] Configuration Prisma/ORM
- [ ] Routes d'authentification (register/login)
- [ ] Middleware JWT
- [ ] Routes CRUD des tâches
- [ ] Route de statistiques
- [ ] Tests unitaires
- [ ] Documentation Swagger

### Phase 3: Frontend
- [ ] Configuration React + Vite + TailwindCSS
- [ ] Layout de base (header, navigation)
- [ ] Pages login/register
- [ ] Service d'authentification (axios)
- [ ] Dashboard avec liste de tâches
- [ ] Modal de création/édition
- [ ] Recherche et filtres
- [ ] Tri des tâches
- [ ] Mode dark/light
- [ ] Responsive design

### Phase 4: Intégration
- [ ] Connexion frontend-backend
- [ ] Gestion des erreurs
- [ ] Toast notifications
- [ ] Loading states
- [ ] Gestion du token JWT
- [ ] Tests d'intégration

### Phase 5: Migration & Déploiement
- [ ] Script de migration M365 → PostgreSQL
- [ ] Build des images Docker
- [ ] Tests en environnement de staging
- [ ] Documentation utilisateur
- [ ] Déploiement en production

### Phase 6: Améliorations futures
- [ ] Système de tags
- [ ] Pièces jointes
- [ ] Rappels/notifications
- [ ] Partage de tâches entre utilisateurs
- [ ] Tableau Kanban
- [ ] Export CSV/PDF
- [ ] API publique avec clés

---

## 💡 Conseils pour Claude Code

Lorsque tu utiliseras ce document avec Claude Code, voici comment procéder:

1. **Commence par le backend**:
   - Génère d'abord la structure de la base de données
   - Implémente les routes d'authentification
   - Puis les routes CRUD des tâches

2. **Ensuite le frontend**:
   - Setup React avec les routes
   - Implémente l'authentification
   - Puis les composants de gestion de tâches

3. **Demande à Claude Code de**:
   - Générer les Dockerfiles
   - Créer le docker-compose.yml
   - Écrire les tests
   - Documenter le code

4. **Utilise des prompts comme**:
   ```
   "Génère le schéma Prisma complet basé sur les spécifications de la table users et tasks"
   
   "Crée le controller Express pour l'authentification avec JWT, incluant register et login"
   
   "Implémente le composant React TaskCard avec toutes les actions (edit, complete, delete)"
   
   "Génère le docker-compose.yml complet avec PostgreSQL, Backend Node.js et Frontend Nginx"
   ```

---

## 📚 Ressources utiles

- [Prisma Documentation](https://www.prisma.io/docs)
- [React Router](https://reactrouter.com)
- [JWT.io](https://jwt.io)
- [Docker Compose](https://docs.docker.com/compose)
- [TailwindCSS](https://tailwindcss.com)
- [Express.js](https://expressjs.com)

---

**Version**: 2.0.0  
**Auteur**: Olivier  
**Date**: 26 novembre 2025  
**Status**: Spécifications validées - Prêt pour développement
