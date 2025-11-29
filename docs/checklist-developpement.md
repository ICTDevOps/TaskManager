# ⚡ Checklist Pratique - Développement Task Manager v2

Guide étape par étape avec toutes les commandes ready-to-use.

---

## 🏗️ Phase 1: Setup du projet (30 min)

### 1.1 Créer la structure de base

```bash
# Créer le dossier principal
mkdir task-manager-v2
cd task-manager-v2

# Créer les sous-dossiers
mkdir frontend backend database

# Créer les fichiers de config à la racine
touch docker-compose.yml .env .env.example .gitignore README.md
```

### 1.2 Initialiser Git

```bash
git init
echo "node_modules" >> .gitignore
echo ".env" >> .gitignore
echo "dist" >> .gitignore
echo "*.log" >> .gitignore
echo "postgres_data" >> .gitignore
```

### 1.3 Créer le fichier .env

```bash
cat > .env << 'EOF'
# Database
DB_USER=taskmanager_user
DB_PASSWORD=SecurePassword123!
DB_NAME=taskmanager_db
DATABASE_URL=postgresql://taskmanager_user:SecurePassword123!@db:5432/taskmanager_db

# Backend
NODE_ENV=development
JWT_SECRET=change_this_super_secret_key_in_production_use_openssl_rand
JWT_EXPIRES_IN=7d
PORT=3000

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
EOF
```

```bash
cp .env .env.example
```

---

## 🗄️ Phase 2: Backend Setup (1h)

### 2.1 Initialiser le backend

```bash
cd backend

# Initialiser npm
npm init -y

# Installer les dépendances de production
npm install express prisma @prisma/client bcrypt jsonwebtoken cors dotenv express-rate-limit helmet

# Installer les dépendances de développement
npm install -D nodemon typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken
```

### 2.2 Configurer package.json

```bash
# Ajouter les scripts dans package.json
npm pkg set scripts.dev="nodemon src/index.js"
npm pkg set scripts.start="node src/index.js"
npm pkg set scripts.prisma:generate="prisma generate"
npm pkg set scripts.prisma:migrate="prisma migrate dev"
npm pkg set scripts.prisma:studio="prisma studio"
```

### 2.3 Initialiser Prisma

```bash
# Initialiser Prisma
npx prisma init

# Le fichier prisma/schema.prisma est créé automatiquement
```

### 2.4 Créer le schéma Prisma

Édite `prisma/schema.prisma` avec le contenu suivant:

```prisma
// prisma/schema.prisma
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
  avatarUrl        String?  @map("avatar_url")
  themePreference  String   @default("light") @map("theme_preference")
  language         String   @default("fr")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  lastLoginAt      DateTime? @map("last_login_at")
  isActive         Boolean  @default(true) @map("is_active")
  emailVerified    Boolean  @default(false) @map("email_verified")
  
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
  dueTime     DateTime? @map("due_time") @db.Time
  position    Int       @default(0)
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

### 2.5 Créer la structure des dossiers backend

```bash
mkdir -p src/{config,controllers,middleware,routes,utils}
touch src/index.js
touch src/config/database.js
touch src/controllers/auth.controller.js
touch src/controllers/tasks.controller.js
touch src/middleware/auth.js
touch src/middleware/errorHandler.js
touch src/routes/auth.routes.js
touch src/routes/tasks.routes.js
touch src/utils/jwt.js
```

### 2.6 Créer le Dockerfile backend

```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci --only=production

# Générer le client Prisma
RUN npx prisma generate

# Copier le reste du code
COPY . .

EXPOSE 3000

# Commande de démarrage
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
EOF
```

---

## ⚛️ Phase 3: Frontend Setup (1h)

### 3.1 Créer le projet React avec Vite

```bash
cd ../frontend

# Créer le projet Vite
npm create vite@latest . -- --template react

# Installer les dépendances
npm install

# Installer les dépendances supplémentaires
npm install react-router-dom axios lucide-react

# Installer TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.2 Configurer TailwindCSS

Édite `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        'primary-light': '#818cf8',
      }
    },
  },
  plugins: [],
}
```

Édite `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Variables CSS personnalisées */
:root {
  --primary: #6366f1;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

### 3.3 Créer la structure des dossiers frontend

```bash
mkdir -p src/{components,pages,services,hooks,utils,styles}
touch src/services/api.js
touch src/services/auth.js
touch src/hooks/useAuth.js
touch src/hooks/useTasks.js
touch src/hooks/useTheme.js
```

### 3.4 Créer le Dockerfile frontend (multi-stage)

```bash
cat > Dockerfile << 'EOF'
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci

# Copier le code source et builder
COPY . .
RUN npm run build

# Stage 2: Production avec Nginx
FROM nginx:alpine

# Copier le build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF
```

### 3.5 Créer la configuration Nginx

```bash
cat > nginx.conf << 'EOF'
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

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # React Router support
    location / {
      try_files $uri $uri/ /index.html;
    }

    # Proxy pour l'API
    location /api {
      proxy_pass http://backend:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
  }
}
EOF
```

---

## 🐳 Phase 4: Docker Setup (30 min)

### 4.1 Créer docker-compose.yml

```bash
cd ..

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
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

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: taskmanager_backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: ${PORT:-3000}
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
    command: npm run dev

  # Frontend (React + Nginx)
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
EOF
```

### 4.2 Créer le README.md

```bash
cat > README.md << 'EOF'
# 📝 Task Manager v2.0

Application web de gestion de tâches multi-utilisateur.

## 🚀 Démarrage rapide

### Prérequis
- Docker et Docker Compose installés
- Ports 80, 3000, 5432 disponibles

### Installation

1. Cloner le repository
```bash
git clone <repo-url>
cd task-manager-v2
```

2. Configurer les variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

3. Lancer l'application
```bash
docker-compose up --build
```

4. Accéder à l'application
- Frontend: http://localhost
- API: http://localhost:3000/api/v1

### Développement

#### Backend
```bash
cd backend
npm run dev           # Démarrer en mode dev
npm run prisma:studio # Ouvrir Prisma Studio
```

#### Frontend
```bash
cd frontend
npm run dev           # Démarrer Vite dev server
```

## 📚 Documentation

### Stack
- Frontend: React 18 + Vite + TailwindCSS
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL 15

### API Endpoints

**Auth**
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me

**Tasks** (protégé par JWT)
- GET /api/v1/tasks
- POST /api/v1/tasks
- PUT /api/v1/tasks/:id
- DELETE /api/v1/tasks/:id
- PATCH /api/v1/tasks/:id/complete
- PATCH /api/v1/tasks/:id/reopen

## 🛠️ Commandes utiles

```bash
# Arrêter les containers
docker-compose down

# Rebuild complet
docker-compose up --build --force-recreate

# Voir les logs
docker-compose logs -f

# Entrer dans un container
docker-compose exec backend sh
docker-compose exec db psql -U taskmanager_user -d taskmanager_db

# Nettoyer les volumes
docker-compose down -v
```

## 📄 License
MIT
EOF
```

---

## ✅ Phase 5: Vérification et Tests (30 min)

### 5.1 Vérifier la structure des fichiers

```bash
tree -L 3 -I 'node_modules|dist'
```

Devrait afficher:
```
task-manager-v2/
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── utils/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── components/
        ├── pages/
        ├── services/
        └── hooks/
```

### 5.2 Générer le client Prisma

```bash
cd backend
npx prisma generate
```

### 5.3 Tester la connexion Docker

```bash
# Retour à la racine
cd ..

# Build des images
docker-compose build

# Vérifier que les images sont créées
docker images | grep taskmanager
```

### 5.4 Lancer l'application

```bash
# Démarrer tous les services
docker-compose up

# Dans un autre terminal, vérifier les containers
docker-compose ps
```

Devrait afficher 3 containers running:
- taskmanager_db
- taskmanager_backend
- taskmanager_frontend

### 5.5 Tester la base de données

```bash
# Se connecter à PostgreSQL
docker-compose exec db psql -U taskmanager_user -d taskmanager_db

# Dans psql
\dt  # Lister les tables
\q   # Quitter
```

### 5.6 Tester le backend (une fois codé)

```bash
# Healthcheck
curl http://localhost:3000/health

# S'inscrire (exemple)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Password123!",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### 5.7 Tester le frontend

Ouvrir http://localhost dans le navigateur

---

## 🎯 Phase 6: Développement avec Claude Code

### 6.1 Demander à Claude Code de générer le backend

Prompt:
```
En te basant sur le fichier "prompt-claude-code.md", génère le backend Express complet avec:
1. Toutes les routes d'authentification (register, login, me)
2. Toutes les routes CRUD des tâches avec filtres, recherche et tri
3. Les middlewares (auth, errorHandler)
4. Les controllers (auth, tasks)
5. Le fichier index.js avec la configuration Express

Utilise exactement le schéma Prisma défini dans prisma/schema.prisma.
Ajoute des commentaires pour expliquer les parties importantes.
```

### 6.2 Tester le backend

```bash
cd backend
npm run dev

# Dans un autre terminal, tester avec curl ou Postman
```

### 6.3 Demander à Claude Code de générer le frontend

Prompt:
```
En te basant sur le fichier "prompt-claude-code.md", génère le frontend React complet avec:
1. Pages (Login, Register, Dashboard)
2. Composants (TaskCard, TaskModal, TaskList, SearchBar, FilterBar, ThemeToggle, Toast)
3. Services (api.js avec axios, auth.js)
4. Hooks (useAuth, useTasks, useTheme)
5. Configuration React Router
6. Design avec TailwindCSS selon le design system défini

Respecte la structure des dossiers et utilise les couleurs définies.
```

### 6.4 Tester le frontend en local

```bash
cd frontend
npm run dev

# Ouvrir http://localhost:5173
```

### 6.5 Tester l'intégration complète avec Docker

```bash
cd ..
docker-compose down
docker-compose up --build
```

---

## 🐛 Troubleshooting

### Problème: Le backend ne se connecte pas à la base

```bash
# Vérifier que la base est accessible
docker-compose exec backend ping db

# Vérifier les logs de la base
docker-compose logs db

# Recréer les containers
docker-compose down -v
docker-compose up --build
```

### Problème: Les migrations Prisma échouent

```bash
# Supprimer le dossier migrations et recommencer
rm -rf backend/prisma/migrations

# Recréer la migration
cd backend
npx prisma migrate dev --name init
```

### Problème: Le frontend ne communique pas avec le backend

Vérifier le fichier `.env`:
```bash
VITE_API_URL=http://localhost:3000/api/v1
```

Et dans `frontend/src/services/api.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
```

### Problème: Ports déjà utilisés

```bash
# Trouver les processus utilisant les ports
lsof -i :80
lsof -i :3000
lsof -i :5432

# Tuer le processus
kill -9 <PID>
```

---

## 📦 Commandes utiles quotidiennes

### Démarrage normal
```bash
docker-compose up
```

### Démarrage avec rebuild
```bash
docker-compose up --build
```

### Arrêt
```bash
docker-compose down
```

### Arrêt avec suppression des volumes (⚠️ perte de données)
```bash
docker-compose down -v
```

### Voir les logs en temps réel
```bash
docker-compose logs -f
docker-compose logs -f backend  # Juste le backend
```

### Exécuter une commande dans un container
```bash
docker-compose exec backend npm run prisma:studio
docker-compose exec backend npx prisma migrate dev
```

### Nettoyer complètement
```bash
docker-compose down -v
docker system prune -a
```

---

## 🎓 Prochaines étapes

Une fois le MVP fonctionnel:

1. **Tests**
   - [ ] Ajouter Jest pour les tests backend
   - [ ] Ajouter React Testing Library pour le frontend

2. **CI/CD**
   - [ ] Configurer GitHub Actions
   - [ ] Automatiser les tests
   - [ ] Automatiser le déploiement

3. **Features avancées**
   - [ ] Système de tags
   - [ ] Pièces jointes
   - [ ] Notifications push
   - [ ] Partage de tâches

4. **Performance**
   - [ ] Ajouter Redis pour le cache
   - [ ] Pagination côté serveur
   - [ ] Lazy loading des images

5. **Monitoring**
   - [ ] Logs centralisés (ELK)
   - [ ] Métriques (Prometheus)
   - [ ] Alertes

---

**Version**: 1.0.0  
**Date**: 26 novembre 2025  
**Status**: Prêt pour démarrage ✅
