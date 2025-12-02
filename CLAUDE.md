# Task Manager - Documentation Claude Code

## Apercu du Projet

Application de gestion de taches multi-utilisateurs avec systeme de delegation et panneau d'administration.

- **Version actuelle** : 0.8
- **Stack** : React 18 + Express.js + PostgreSQL 15 + Prisma ORM
- **Conteneurisation** : Docker + Docker Compose
- **Deploiement** : Synology NAS via Portainer
- **Langues** : Francais et Anglais (i18next)

## Commandes Essentielles

### Docker - Developpement local

```bash
# Demarrer l'application
docker-compose up -d

# Demarrer avec rebuild
docker-compose up --build -d

# Arreter
docker-compose down

# Logs temps reel
docker-compose logs -f

# Logs d'un service specifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Acceder au shell du backend
docker-compose exec backend sh

# Redemarrer un service
docker-compose restart backend
```

### Prisma - Base de donnees

```bash
# Dans le conteneur backend ou avec DATABASE_URL defini
docker-compose exec backend npx prisma migrate dev      # Creer une migration
docker-compose exec backend npx prisma migrate deploy   # Appliquer les migrations
docker-compose exec backend npx prisma db seed          # Executer le seed (admin)
docker-compose exec backend npx prisma migrate reset    # Reset complet de la DB
docker-compose exec backend npx prisma studio           # Interface graphique
docker-compose exec backend npx prisma generate         # Regenerer le client
```

### Docker Hub - Publication

```bash
# Build sans cache (IMPORTANT pour les mises a jour)
docker-compose build --no-cache

# Tag des images
docker tag taskmanager-backend lordbadack/taskmanager-backend:0.8
docker tag taskmanager-backend lordbadack/taskmanager-backend:latest
docker tag taskmanager-frontend lordbadack/taskmanager-frontend:0.8
docker tag taskmanager-frontend lordbadack/taskmanager-frontend:latest

# Push sur Docker Hub
docker push lordbadack/taskmanager-backend:0.8
docker push lordbadack/taskmanager-backend:latest
docker push lordbadack/taskmanager-frontend:0.8
docker push lordbadack/taskmanager-frontend:latest
```

## Structure du Projet

```
TaskManager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modele de donnees
│   │   ├── seed.js                # Creation admin par defaut
│   │   └── migrations/            # Migrations SQL
│   ├── src/
│   │   ├── controllers/           # Logique metier
│   │   │   ├── auth.controller.js
│   │   │   ├── tasks.controller.js
│   │   │   ├── categories.controller.js
│   │   │   ├── admin.controller.js
│   │   │   ├── delegation.controller.js
│   │   │   └── activity.controller.js
│   │   ├── routes/                # Definition des routes API
│   │   ├── middleware/            # Middlewares (auth, admin)
│   │   └── index.js               # Point d'entree
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # Composants reutilisables
│   │   ├── pages/                 # Pages principales
│   │   ├── services/              # Appels API (api.js)
│   │   ├── hooks/                 # Hooks React (useAuth)
│   │   └── locales/               # Traductions i18n (fr/, en/)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docs/                          # Documentation
├── docker-compose.yml             # Developpement local
├── docker-compose.portainer.yml   # Deploiement Synology/Portainer
├── CLAUDE.md                      # Ce fichier
├── CHANGELOG.md
└── README.md
```

## Conventions de Code

### Langage et Messages

- **Interface utilisateur** : Multilingue (Francais par defaut, Anglais)
- **Messages d'erreur API** : Francais (backend)
- **Code et commentaires** : Anglais accepte
- **Commits** : Francais ou Anglais

### Nommage

| Element | Convention | Exemple |
|---------|------------|---------|
| Fichiers JS/JSX | camelCase | `auth.controller.js`, `useAuth.js` |
| Composants React | PascalCase | `TaskCard.jsx`, `SettingsPanel.jsx` |
| Variables/Fonctions | camelCase | `getUserById`, `isActive` |
| Constantes | UPPER_SNAKE_CASE | `JWT_SECRET`, `MAX_RETRIES` |
| Tables DB (Prisma) | PascalCase | `User`, `TaskDelegation` |
| Colonnes DB | camelCase | `passwordHash`, `createdAt` |
| Routes API | kebab-case | `/api/v1/auth/default-context` |

### Style de Code

- **Indentation** : 2 espaces
- **Quotes** : Single quotes pour JS, double quotes pour JSX attributes
- **Semicolons** : Pas de point-virgule (style ES6)
- **Trailing commas** : Oui
- **Max line length** : 100 caracteres

## Architecture Backend

### API REST - Prefixe `/api/v1`

| Route | Controleur | Description |
|-------|------------|-------------|
| `/auth/*` | auth.controller.js | Authentification, profil |
| `/tasks/*` | tasks.controller.js | CRUD taches, export |
| `/categories/*` | categories.controller.js | CRUD categories |
| `/delegations/*` | delegation.controller.js | Partage de taches |
| `/activity/*` | activity.controller.js | Journal d'activite |
| `/admin/*` | admin.controller.js | Administration (role admin requis) |

### Middlewares

- `auth.middleware.js` : Verification JWT, extraction user
- `admin.middleware.js` : Verification role admin

### Codes HTTP

| Code | Usage |
|------|-------|
| 200 | Succes GET/PUT/PATCH |
| 201 | Succes POST (creation) |
| 400 | Erreur de validation, donnees invalides |
| 401 | Non authentifie (token invalide/absent) |
| 403 | Acces refuse (pas les droits) |
| 404 | Ressource non trouvee |
| 500 | Erreur serveur |

**Important** : Utiliser 400 (et non 401) pour les erreurs de validation de mot de passe dans les endpoints de changement de mot de passe/email.

## Architecture Frontend

### Pages Principales

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Connexion (email ou username) |
| Register | `/register` | Inscription |
| Dashboard | `/dashboard` | Liste des taches, filtres, actions |
| AdminLogin | `/admin/login` | Connexion admin |
| Admin | `/admin` | Panneau d'administration |
| AdminChangePassword | `/admin/change-password` | Changement MDP obligatoire |

### Composants Cles

- `Header.jsx` : Navigation, theme, langue, deconnexion
- `TaskCard.jsx` : Affichage d'une tache
- `TaskModal.jsx` : Creation/edition de tache
- `CategoryManager.jsx` : Gestion des categories
- `SettingsPanel.jsx` : Parametres utilisateur
- `SharingPanel.jsx` : Gestion des delegations
- `ContextSelector.jsx` : Selection du contexte (ses taches ou delegue)
- `ActivityLogPanel.jsx` : Journal d'activite
- `LanguageSelector.jsx` : Selecteur de langue (drapeaux FR/EN)
- `TokenManager.jsx` : Gestion des tokens API (PAT)

### Gestion de l'Authentification

- Token JWT stocke dans `localStorage`
- Intercepteur Axios dans `services/api.js`
- Hook `useAuth` pour l'etat d'authentification
- **Exception** : Ne pas deconnecter sur 401 pour `/auth/password` et `/auth/email`
- **Redirection** : Vers `/admin/login` si sur une page admin

## Base de Donnees

### Modeles Prisma Principaux

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
  role               String    @default("user")  // "user" ou "admin"
  mustChangePassword Boolean   @default(false)
  isActive           Boolean   @default(true)
}

model Task {
  id          String    @id @default(uuid())
  userId      String
  title       String
  description String?
  priority    String    @default("medium")  // "low", "medium", "high"
  status      String    @default("active")  // "active", "completed"
  dueDate     DateTime?
  categoryId  String?
}

model Category {
  id     String @id @default(uuid())
  userId String
  name   String
  color  String @default("#3B82F6")
}

model TaskDelegation {
  id                  String  @id @default(uuid())
  ownerId             String
  delegateId          String
  canCreateTasks      Boolean @default(false)
  canEditTasks        Boolean @default(false)
  canDeleteTasks      Boolean @default(false)
  canCreateCategories Boolean @default(false)
  hiddenCategoryIds   String  @default("")
  status              String  @default("pending")  // "pending", "accepted", "rejected"
}

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

### Migrations

Les migrations sont dans `backend/prisma/migrations/`. En cas de probleme avec Prisma CLI (environnement non-interactif), creer manuellement le fichier SQL :

```
backend/prisma/migrations/YYYYMMDDHHMMSS_nom_migration/migration.sql
```

## Gestion des Versions

### Synchronisation Obligatoire

A chaque nouvelle version, mettre a jour :

1. **Footer** dans `frontend/src/pages/Login.jsx` et `Register.jsx`
2. **docker-compose.portainer.yml** : Tags des images
3. **README.md** : Section version et images Docker Hub
4. **CHANGELOG.md** : Nouvelles entrees

### Workflow de Release

```bash
# 1. Tester en local
docker-compose up --build -d

# 2. Verifier les fonctionnalites

# 3. Build et push Docker Hub
docker-compose build --no-cache
docker tag taskmanager-backend lordbadack/taskmanager-backend:X.X
docker tag taskmanager-frontend lordbadack/taskmanager-frontend:X.X
docker push lordbadack/taskmanager-backend:X.X
docker push lordbadack/taskmanager-frontend:X.X

# 4. Mettre a jour docker-compose.portainer.yml

# 5. Mettre a jour la documentation
```

## Points d'Attention

### Pieges Connus

1. **Migrations Prisma** : En environnement Docker, utiliser `migrate deploy` (pas `migrate dev`)
2. **Seed admin** : Doit etre execute apres les migrations (`npx prisma db seed`)
3. **Volume PostgreSQL** : Supprimer le volume si changement de nom de base de donnees
4. **Cache Docker** : Utiliser `--no-cache` pour les builds de production
5. **Intercepteur Axios** : Ne pas deconnecter sur les endpoints de changement de mot de passe

### Securite

- Mots de passe hashes avec bcrypt (10 rounds)
- JWT avec expiration 7 jours
- Validation des entrees avec Zod
- Headers de securite avec Helmet
- Protection CORS
- Rate limiting sur l'authentification
- Compte admin protege contre suppression/desactivation

### Compte Admin par Defaut

| Champ | Valeur |
|-------|--------|
| Username | `admin` |
| Password | `admin` |
| mustChangePassword | `true` |

## Variables d'Environnement

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@db:5432/taskmanager_db
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

### Frontend (.env)

```env
VITE_API_URL=/api/v1
```

## URLs de l'Application

### Developpement Local

- **Application** : http://localhost
- **API** : http://localhost:3000/api/v1
- **Admin** : http://localhost/admin/login

### Production (Synology)

- **Application** : http://[IP_SYNOLOGY]:8080
- **API** : http://[IP_SYNOLOGY]:8080/api/v1

## Tests Manuels API

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin"}'

# Avec token
TOKEN="eyJ..."
curl http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN"

# Export taches
curl "http://localhost:3000/api/v1/tasks/export?format=json" \
  -H "Authorization: Bearer $TOKEN"
```

## Internationalisation (i18n)

### Configuration

- **Librairie** : i18next + react-i18next
- **Langues** : Francais (fr) - defaut, Anglais (en)
- **Detection** : localStorage > navigateur
- **Stockage** : localStorage (cle: `language`)

### Structure des traductions

```
frontend/src/locales/
├── index.js              # Configuration i18next
├── fr/                   # Traductions francaises
│   ├── common.json       # Termes communs
│   ├── auth.json         # Authentification
│   ├── tasks.json        # Taches
│   ├── categories.json   # Categories
│   ├── settings.json     # Parametres
│   ├── admin.json        # Administration
│   ├── activity.json     # Journal d'activite
│   ├── delegation.json   # Delegations
│   └── tokens.json       # Tokens API
└── en/                   # Traductions anglaises
    └── (meme structure)
```

### Utilisation dans les composants

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation(['namespace'])
  return <p>{t('key.subkey')}</p>
}
```

### Ajout d'une nouvelle langue

1. Creer le dossier `frontend/src/locales/[code]/`
2. Copier tous les fichiers JSON de `fr/` ou `en/`
3. Traduire les valeurs
4. Ajouter les imports dans `locales/index.js`
5. Ajouter la langue dans `LanguageSelector.jsx`

## Documentation Additionnelle

- `README.md` : Documentation complete du projet (EN)
- `README.fr.md` : Documentation complete du projet (FR)
- `CHANGELOG.md` : Historique des versions
- `docs/QUICK-START.md` : Guide de demarrage rapide
- `docs/RECAP-FINAL.md` : Resume de l'etat du projet
