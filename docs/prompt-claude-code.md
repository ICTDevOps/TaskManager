# 🤖 Prompt pour Claude Code - Task Manager Multi-utilisateur

## 📌 Contexte de la mission

Je veux que tu développes une application web de gestion de tâches multi-utilisateur complète avec les technologies suivantes:

### Stack technique imposée
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Node.js 18 + Express + Prisma ORM
- **Database**: PostgreSQL 15
- **Auth**: JWT (JSON Web Tokens)
- **Infrastructure**: Docker + Docker Compose

### Architecture cible
```
3 containers Docker:
1. Frontend (React + Nginx)
2. Backend (Express API REST)
3. Database (PostgreSQL)
```

---

## 🎯 Fonctionnalités requises

### Authentification
- ✅ Inscription utilisateur (email, username, password)
- ✅ Connexion (email + password)
- ✅ Protection des routes avec JWT
- ✅ Middleware d'authentification

### Gestion des tâches
- ✅ Créer une tâche (titre, description, importance, date échéance)
- ✅ Modifier une tâche
- ✅ Marquer comme terminée/réouvrir
- ✅ Supprimer une tâche
- ✅ Lister les tâches avec filtres (statut, importance)
- ✅ Recherche en temps réel (titre + description)
- ✅ Tri (date création, échéance, importance)

### Interface utilisateur
- ✅ Page login/register
- ✅ Dashboard avec liste de tâches en cartes
- ✅ Modal pour créer/éditer une tâche
- ✅ Champ de recherche avec clear button
- ✅ Filtres par statut (Toutes, Actives, Complétées)
- ✅ Dropdown de tri
- ✅ Toggle dark/light mode (persistant)
- ✅ Responsive (desktop + mobile)
- ✅ Bottom navigation sur mobile
- ✅ Toast notifications (succès/erreur)
- ✅ Loading states avec skeleton

---

## 📊 Schéma de base de données

### Table: users
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE, NOT NULL)
- username (VARCHAR, UNIQUE, NOT NULL)
- password_hash (VARCHAR, NOT NULL)
- first_name (VARCHAR)
- last_name (VARCHAR)
- theme_preference (VARCHAR, default: 'light')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Table: tasks
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- title (VARCHAR, NOT NULL)
- description (TEXT)
- importance (VARCHAR: 'low'|'normal'|'high', default: 'normal')
- status (VARCHAR: 'active'|'completed', default: 'active')
- due_date (DATE, nullable)
- due_time (TIME, nullable)
- completed_at (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Index sur: user_id, status, due_date, importance
```

---

## 🔌 API REST à implémenter

### Auth endpoints
```
POST   /api/v1/auth/register    - Créer un compte
POST   /api/v1/auth/login       - Se connecter
GET    /api/v1/auth/me          - Infos utilisateur (protégé)
```

### Tasks endpoints (tous protégés par JWT)
```
GET    /api/v1/tasks            - Liste des tâches (+ query params)
GET    /api/v1/tasks/:id        - Détail d'une tâche
POST   /api/v1/tasks            - Créer une tâche
PUT    /api/v1/tasks/:id        - Modifier une tâche
PATCH  /api/v1/tasks/:id/complete   - Marquer terminée
PATCH  /api/v1/tasks/:id/reopen     - Réouvrir
DELETE /api/v1/tasks/:id        - Supprimer
```

### Query params pour GET /api/v1/tasks
```
?status=active|completed|all (default: active)
&sort_by=created_at|due_date|importance (default: created_at)
&sort_order=asc|desc (default: desc)
&search=texte (recherche dans titre et description)
&importance=low|normal|high
```

---

## 🐳 Configuration Docker

### docker-compose.yml structure
```yaml
services:
  db:
    - Image: postgres:15-alpine
    - Variables: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    - Volume: postgres_data
    - Port: 5432
    - Healthcheck: pg_isready

  backend:
    - Build: ./backend/Dockerfile
    - Variables: DATABASE_URL, JWT_SECRET, NODE_ENV
    - Depends_on: db (avec healthcheck)
    - Port: 3000
    - Volume: ./backend (bind mount pour dev)

  frontend:
    - Build: ./frontend/Dockerfile (multi-stage)
    - Nginx pour servir le build React
    - Depends_on: backend
    - Port: 80
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

### Dockerfile Frontend (multi-stage)
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🎨 Design system (Frontend)

### Couleurs
```css
Primary: #6366f1 (indigo)
Success: #10b981 (green)
Warning: #f59e0b (orange)
Danger: #ef4444 (red)

Importance badges:
- Low: blue (#3b82f6)
- Normal: green (#10b981)
- High: red (#ef4444)
```

### Composants React à créer
```
- Layout.jsx (header + main + mobile nav)
- TaskCard.jsx (carte de tâche avec actions)
- TaskModal.jsx (modal création/édition)
- TaskList.jsx (grille de cartes)
- SearchBar.jsx (recherche avec clear)
- FilterBar.jsx (filtres + tri)
- ThemeToggle.jsx (dark/light)
- Toast.jsx (notifications)
- ProtectedRoute.jsx (HOC pour routes protégées)
```

### Structure des pages
```
/login          - Page de connexion
/register       - Page d'inscription
/dashboard      - Dashboard principal (protégé)
/               - Redirect vers /dashboard si auth, sinon /login
```

---

## 🔒 Sécurité à implémenter

### Backend
1. **Hash des passwords**: bcrypt (10 rounds)
2. **JWT**: 
   - Secret stocké en variable d'environnement
   - Expiration: 7 jours
   - Payload: { userId, email }
3. **Middleware auth**: Vérifier token sur routes protégées
4. **Validation**: Utiliser Zod pour valider les inputs
5. **CORS**: Autoriser uniquement le frontend
6. **Rate limiting**: 5 tentatives/15min sur /auth/login

### Frontend
1. **Token storage**: localStorage (ou httpOnly cookie si implémenté)
2. **Axios interceptor**: Ajouter token dans header Authorization
3. **Validation formulaires**: Avant soumission
4. **Redirect**: Si 401, rediriger vers /login

---

## 📁 Structure des fichiers attendue

```
task-manager-v2/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── TaskCard.jsx
│       │   ├── TaskModal.jsx
│       │   ├── TaskList.jsx
│       │   ├── SearchBar.jsx
│       │   ├── FilterBar.jsx
│       │   ├── ThemeToggle.jsx
│       │   └── Toast.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Dashboard.jsx
│       ├── services/
│       │   ├── api.js (axios config)
│       │   └── auth.js
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useTasks.js
│       │   └── useTheme.js
│       └── styles/
│           └── index.css
│
└── backend/
    ├── Dockerfile
    ├── package.json
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── index.js
        ├── config/
        │   └── database.js
        ├── middleware/
        │   ├── auth.js
        │   └── errorHandler.js
        ├── routes/
        │   ├── auth.routes.js
        │   └── tasks.routes.js
        ├── controllers/
        │   ├── auth.controller.js
        │   └── tasks.controller.js
        ├── models/ (si pas Prisma, sinon dans schema.prisma)
        └── utils/
            └── jwt.js
```

---

## 🚀 Instructions de démarrage

### Étape 1: Générer le projet
```bash
# Backend
mkdir backend && cd backend
npm init -y
npm install express prisma @prisma/client bcrypt jsonwebtoken cors dotenv
npm install -D nodemon

# Frontend
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom axios lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Étape 2: Initialiser Prisma
```bash
cd backend
npx prisma init
# Éditer prisma/schema.prisma avec les modèles User et Task
npx prisma generate
npx prisma migrate dev --name init
```

### Étape 3: Configurer les variables d'environnement
```bash
# .env à la racine
DATABASE_URL=postgresql://user:password@db:5432/taskmanager
JWT_SECRET=your_super_secret_key
VITE_API_URL=http://localhost:3000/api/v1
```

### Étape 4: Lancer avec Docker
```bash
docker-compose up --build
```

### Étape 5: Tester
```
Frontend: http://localhost
Backend API: http://localhost:3000/api/v1
```

---

## ✅ Checklist de validation

Avant de considérer le projet terminé, vérifie que:

### Backend
- [ ] Les 3 routes d'auth fonctionnent (register, login, me)
- [ ] Toutes les routes tasks fonctionnent avec JWT
- [ ] La recherche fonctionne dans titre + description
- [ ] Les filtres par statut et importance fonctionnent
- [ ] Le tri fonctionne (date, échéance, importance)
- [ ] Les erreurs sont gérées avec des codes HTTP corrects
- [ ] Les mots de passe sont hashés
- [ ] Les tokens JWT expirent après 7 jours

### Frontend
- [ ] Login/Register fonctionnent
- [ ] Redirection automatique si non authentifié
- [ ] Création/édition/suppression de tâches fonctionnent
- [ ] Recherche en temps réel fonctionne
- [ ] Filtres et tri fonctionnent
- [ ] Mode dark/light persiste après refresh
- [ ] Responsive sur mobile
- [ ] Toast notifications s'affichent
- [ ] Loading states visibles

### Docker
- [ ] docker-compose up lance les 3 containers
- [ ] La base de données se crée automatiquement
- [ ] Le backend se connecte à la base
- [ ] Le frontend communique avec le backend
- [ ] Les volumes persistent les données

---

## 💡 Conseils d'implémentation

### Ordre recommandé
1. **Setup Docker** → docker-compose.yml + Dockerfiles
2. **Database** → Prisma schema + migrations
3. **Backend Auth** → Register + Login + JWT middleware
4. **Backend Tasks** → CRUD complet avec filtres
5. **Frontend Auth** → Pages login/register + service auth
6. **Frontend Tasks** → Dashboard + composants
7. **Polish UX** → Dark mode, toast, loading states

### Patterns à utiliser
- **Backend**: Controller → Service → Repository (avec Prisma)
- **Frontend**: Pages → Components → Hooks → Services
- **Gestion d'état**: Context API + useState (pas besoin de Redux)
- **Formulaires**: Controlled components avec validation

### Bonnes pratiques
- ✅ Utilise des variables d'environnement pour tous les secrets
- ✅ Ajoute des try/catch partout
- ✅ Retourne des messages d'erreur clairs
- ✅ Utilise des status HTTP corrects (200, 201, 400, 401, 404, 500)
- ✅ Ajoute des commentaires pour les parties complexes
- ✅ Utilise des noms de variables explicites
- ✅ Suis les conventions de nommage (camelCase JS, snake_case SQL)

---

## 🎯 Exemple de prompt à donner à Claude Code

Pour générer le backend complet:
```
Génère le backend Express complet pour le Task Manager avec:
1. Structure de fichiers selon /backend dans les specs
2. Prisma schema avec les modèles User et Task
3. Routes d'authentification (register, login, me) avec JWT
4. Routes CRUD tasks avec filtres, recherche et tri
5. Middleware d'authentification
6. Gestion des erreurs centralisée
7. Configuration CORS et rate limiting
8. Hash bcrypt pour les mots de passe
9. Tous les controllers et routes bien organisés

Respecte exactement l'API définie dans les specs.
```

Pour générer le frontend complet:
```
Génère le frontend React complet pour le Task Manager avec:
1. Structure de fichiers selon /frontend dans les specs
2. Configuration Vite + TailwindCSS + React Router
3. Pages Login, Register, Dashboard
4. Composants TaskCard, TaskModal, TaskList, SearchBar, FilterBar
5. Service API avec axios et interceptor JWT
6. Hook useAuth pour la gestion d'authentification
7. Hook useTasks pour la gestion des tâches
8. Hook useTheme pour dark/light mode
9. Responsive design avec mobile bottom nav
10. Toast notifications

Utilise les couleurs et le design system définis dans les specs.
```

---

**Date**: 26 novembre 2025  
**Version**: 2.0.0  
**Prêt pour Claude Code** ✅
