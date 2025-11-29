# 📋 TASK LIST - Task Manager v2.0

## 🎯 Instructions d'utilisation

Ce fichier sert de **checklist de progression** pour le développement complet de l'application.

**Comment l'utiliser :**
1. ✅ Coche chaque tâche une fois complétée : `- [x]` 
2. 📝 Claude Code peut lire ce fichier à chaque session pour savoir où reprendre
3. 🔄 Si arrêt puis reprise : Claude Code voit directement ce qui reste à faire
4. ➕ Ajoute de nouvelles tâches dans la section "FEATURES FUTURES"

**Commande pour Claude Code :**
```
"Lis le fichier TASK-LIST.md pour voir la progression actuelle.
Continue à partir de la première tâche non cochée."
```

---

## 📊 PROGRESSION GLOBALE

**Phase actuelle** : 🔴 Phase 0 - Préparation

**Statut global** :
- [ ] Phase 0 : Préparation (0/4)
- [ ] Phase 1 : Infrastructure Docker (0/8)
- [ ] Phase 2 : Backend - Base de données (0/6)
- [ ] Phase 3 : Backend - Authentification (0/9)
- [ ] Phase 4 : Backend - Gestion des tâches (0/12)
- [ ] Phase 5 : Frontend - Setup (0/10)
- [ ] Phase 6 : Frontend - Authentification (0/8)
- [ ] Phase 7 : Frontend - Dashboard (0/15)
- [ ] Phase 8 : Frontend - Fonctionnalités (0/12)
- [ ] Phase 9 : Design - shadcn/ui (0/10)
- [ ] Phase 10 : Tests & Validation (0/12)
- [ ] Phase 11 : Déploiement (0/6)

**TOTAL** : 0/112 tâches complétées

---

## 🔧 PHASE 0 : PRÉPARATION

**Objectif** : Setup initial du projet

### Structure de base
- [ ] Créer le dossier racine `task-manager-v2/`
- [ ] Créer les sous-dossiers `backend/`, `frontend/`
- [ ] Créer le fichier `.env` à la racine
- [ ] Créer le fichier `.gitignore`

**Validation Phase 0** : ✅ Structure de dossiers créée

---

## 🐳 PHASE 1 : INFRASTRUCTURE DOCKER

**Objectif** : Configuration Docker complète

### Docker Compose
- [ ] Créer `docker-compose.yml` à la racine
- [ ] Configurer le service `db` (PostgreSQL 15)
- [ ] Configurer le service `backend` (Node.js 18)
- [ ] Configurer le service `frontend` (React + Nginx)
- [ ] Définir le network `taskmanager_network`
- [ ] Définir le volume `postgres_data`

### Dockerfiles
- [ ] Créer `backend/Dockerfile` (avec Prisma)
- [ ] Créer `frontend/Dockerfile` (multi-stage avec Nginx)

**Validation Phase 1** : ✅ `docker-compose up` démarre les 3 containers

**Commande de test** :
```bash
docker-compose up -d
docker ps  # Doit montrer 3 containers running
```

---

## 🗄️ PHASE 2 : BACKEND - BASE DE DONNÉES

**Objectif** : Setup Prisma et schéma de base de données

### Configuration Prisma
- [ ] Créer `backend/prisma/schema.prisma`
- [ ] Définir le modèle `User` avec tous les champs
- [ ] Définir le modèle `Task` avec tous les champs
- [ ] Ajouter les indexes nécessaires
- [ ] Ajouter la relation `User` → `Task[]`

### Initialisation
- [ ] Générer le client Prisma : `npx prisma generate`

**Validation Phase 2** : ✅ `npx prisma generate` sans erreur

**Fichiers créés** :
- `backend/prisma/schema.prisma`

---

## 🔐 PHASE 3 : BACKEND - AUTHENTIFICATION

**Objectif** : Système d'authentification complet avec JWT

### Structure
- [ ] Créer `backend/src/index.js` (entry point)
- [ ] Créer `backend/src/config/database.js` (Prisma client)
- [ ] Créer `backend/src/utils/jwt.js` (génération/vérification JWT)
- [ ] Créer `backend/src/middleware/auth.js` (middleware JWT)

### Routes Auth
- [ ] Créer `backend/src/routes/auth.routes.js`
- [ ] Créer `backend/src/controllers/auth.controller.js`
- [ ] Implémenter `POST /api/v1/auth/register` (avec bcrypt)
- [ ] Implémenter `POST /api/v1/auth/login` (avec JWT)
- [ ] Implémenter `GET /api/v1/auth/me` (protégé)

**Validation Phase 3** : ✅ Inscription et connexion fonctionnent

**Tests à effectuer** :
```bash
# Test register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"Test123!","firstName":"John"}'

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

---

## 📝 PHASE 4 : BACKEND - GESTION DES TÂCHES

**Objectif** : CRUD complet des tâches avec filtres et recherche

### Routes Tasks
- [ ] Créer `backend/src/routes/tasks.routes.js`
- [ ] Créer `backend/src/controllers/tasks.controller.js`

### Endpoints
- [ ] Implémenter `GET /api/v1/tasks` (avec query params)
- [ ] Ajouter le filtre par `status` (active, completed, all)
- [ ] Ajouter le filtre par `importance` (low, normal, high)
- [ ] Ajouter la recherche dans `title` et `description`
- [ ] Ajouter le tri par `created_at`, `due_date`, `importance`, `title`
- [ ] Implémenter `POST /api/v1/tasks` (création)
- [ ] Implémenter `PUT /api/v1/tasks/:id` (modification complète)
- [ ] Implémenter `PATCH /api/v1/tasks/:id/complete` (marquer terminé)
- [ ] Implémenter `PATCH /api/v1/tasks/:id/reopen` (réouvrir)
- [ ] Implémenter `DELETE /api/v1/tasks/:id`

### Sécurité
- [ ] Vérifier que chaque endpoint est protégé par le middleware JWT
- [ ] Vérifier que chaque utilisateur ne voit que ses propres tâches

**Validation Phase 4** : ✅ Tous les endpoints tasks fonctionnent avec JWT

**Tests à effectuer** :
```bash
# Récupérer le token du login
TOKEN="jwt_token_here"

# Test création
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ma tâche","description":"Description test","importance":"normal"}'

# Test liste
curl -X GET "http://localhost:3000/api/v1/tasks?status=active" \
  -H "Authorization: Bearer $TOKEN"

# Test recherche
curl -X GET "http://localhost:3000/api/v1/tasks?search=test" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚛️ PHASE 5 : FRONTEND - SETUP

**Objectif** : Configuration React + Vite + TailwindCSS

### Installation
- [ ] Initialiser Vite : `npm create vite@latest frontend -- --template react`
- [ ] Installer les dépendances : `npm install`
- [ ] Installer React Router : `npm install react-router-dom`
- [ ] Installer Axios : `npm install axios`
- [ ] Installer Lucide React : `npm install lucide-react`

### Configuration TailwindCSS
- [ ] Installer TailwindCSS : `npm install -D tailwindcss postcss autoprefixer`
- [ ] Initialiser TailwindCSS : `npx tailwindcss init -p`
- [ ] Configurer `tailwind.config.js` (dark mode, colors)
- [ ] Créer `src/index.css` avec directives Tailwind

### Structure
- [ ] Créer la structure de dossiers (pages, components, services, hooks)

**Validation Phase 5** : ✅ `npm run dev` lance l'app React

**Fichiers créés** :
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

---

## 🔑 PHASE 6 : FRONTEND - AUTHENTIFICATION

**Objectif** : Pages de connexion/inscription + gestion du token

### Services
- [ ] Créer `frontend/src/services/api.js` (axios avec interceptor)
- [ ] Créer `frontend/src/services/auth.js` (login, register, logout)

### Hooks
- [ ] Créer `frontend/src/hooks/useAuth.js` (state utilisateur)

### Pages
- [ ] Créer `frontend/src/pages/Login.jsx`
- [ ] Créer `frontend/src/pages/Register.jsx`
- [ ] Créer le formulaire de connexion (email, password)
- [ ] Créer le formulaire d'inscription (email, username, password, firstName, lastName)

### Routing
- [ ] Configurer React Router dans `src/App.jsx`
- [ ] Créer `ProtectedRoute` component

**Validation Phase 6** : ✅ Connexion et inscription fonctionnent, token stocké

**Tests à effectuer** :
```
1. S'inscrire avec un nouvel utilisateur
2. Se connecter avec cet utilisateur
3. Vérifier que le token est dans localStorage
4. Vérifier la redirection vers /dashboard
```

---

## 📊 PHASE 7 : FRONTEND - DASHBOARD

**Objectif** : Page principale avec liste des tâches

### Layout
- [ ] Créer `frontend/src/components/Layout.jsx` (header, nav, footer)
- [ ] Créer `frontend/src/pages/Dashboard.jsx`
- [ ] Ajouter le header avec logo et menu utilisateur
- [ ] Ajouter le bouton "Nouvelle tâche"
- [ ] Ajouter le toggle dark mode

### Services Tasks
- [ ] Créer `frontend/src/services/tasks.js` (fetchTasks, createTask, etc.)
- [ ] Créer `frontend/src/hooks/useTasks.js` (state et actions)

### Composants
- [ ] Créer `frontend/src/components/TaskCard.jsx`
- [ ] Créer `frontend/src/components/TaskList.jsx`
- [ ] Créer `frontend/src/components/TaskModal.jsx` (création/édition)
- [ ] Créer `frontend/src/components/SearchBar.jsx`
- [ ] Créer `frontend/src/components/FilterBar.jsx` (statut, importance)
- [ ] Créer `frontend/src/components/ThemeToggle.jsx`

### Fonctionnalités de base
- [ ] Afficher la liste des tâches
- [ ] Gérer le loading state
- [ ] Gérer les erreurs

**Validation Phase 7** : ✅ Dashboard affiche les tâches de l'utilisateur connecté

---

## ✨ PHASE 8 : FRONTEND - FONCTIONNALITÉS

**Objectif** : Toutes les interactions utilisateur

### CRUD Tasks
- [ ] Implémenter la création de tâche (modal)
- [ ] Implémenter la modification de tâche (modal)
- [ ] Implémenter la suppression de tâche (confirmation)
- [ ] Implémenter marquer comme complétée
- [ ] Implémenter réouvrir une tâche

### Recherche et filtres
- [ ] Implémenter la recherche en temps réel (debounce 300ms)
- [ ] Implémenter le filtre par statut (Toutes, Actives, Complétées)
- [ ] Implémenter le filtre par importance
- [ ] Implémenter le tri (date création, échéance, importance, titre)

### UX
- [ ] Ajouter les animations de transition
- [ ] Ajouter les toast notifications (succès, erreur)
- [ ] Ajouter les états de chargement (spinners)
- [ ] Rendre l'interface responsive (mobile, tablet, desktop)

**Validation Phase 8** : ✅ Toutes les fonctionnalités marchent

**Tests à effectuer** :
```
1. Créer une tâche → vérifier qu'elle apparaît
2. Modifier une tâche → vérifier les changements
3. Marquer comme complétée → vérifier le changement de statut
4. Supprimer une tâche → vérifier qu'elle disparaît
5. Rechercher "test" → vérifier le filtrage
6. Filtrer par "actives" → vérifier le filtrage
7. Trier par "importance" → vérifier l'ordre
8. Tester sur mobile → vérifier le responsive
```

---

## 🎨 PHASE 9 : DESIGN - SHADCN/UI

**Objectif** : Améliorer l'UI avec shadcn/ui

### Installation shadcn/ui
- [ ] Initialiser shadcn/ui : `npx shadcn-ui@latest init`
- [ ] Installer les composants nécessaires

### Migration des composants
- [ ] Remplacer TaskCard par la version shadcn/ui (Card, Badge, Button)
- [ ] Remplacer TaskModal par Dialog + Form
- [ ] Installer react-hook-form et zod : `npm install react-hook-form @hookform/resolvers zod`
- [ ] Ajouter la validation dans TaskModal
- [ ] Remplacer les filtres par Tabs (shadcn/ui)
- [ ] Remplacer le menu utilisateur par DropdownMenu
- [ ] Ajouter les StatsCards (Card avec statistiques)

### Polish
- [ ] Vérifier que le dark mode fonctionne avec shadcn/ui
- [ ] Ajuster les couleurs du thème
- [ ] Tester toutes les animations

**Validation Phase 9** : ✅ Design moderne au niveau SaaS 2024

**Fichier de référence** : `exemples-concrets-shadcn.md`

---

## 🧪 PHASE 10 : TESTS & VALIDATION

**Objectif** : S'assurer que tout fonctionne

### Tests Backend
- [ ] Tester l'inscription (email unique, validation)
- [ ] Tester la connexion (mauvais password, token valide)
- [ ] Tester GET /tasks avec tous les query params
- [ ] Tester la création de tâche (validation des champs)
- [ ] Tester l'isolation des données (user A ne voit pas les tâches de user B)
- [ ] Tester la suppression de tâche

### Tests Frontend
- [ ] Tester le flow complet : inscription → connexion → dashboard
- [ ] Tester la création de tâche avec validation
- [ ] Tester la recherche avec différents termes
- [ ] Tester les filtres (statut, importance)
- [ ] Tester le tri (tous les modes)
- [ ] Tester le responsive (mobile, tablet, desktop)

### Tests Intégration
- [ ] Tester le refresh de page (token persiste ?)
- [ ] Tester la déconnexion (token supprimé ?)
- [ ] Tester les erreurs 401 (redirection vers login ?)
- [ ] Tester avec 2 utilisateurs différents (isolation ?)
- [ ] Tester le dark mode (persiste après refresh ?)
- [ ] Tester la performance (Lighthouse score >90 ?)

**Validation Phase 10** : ✅ Tous les tests passent

---

## 🚀 PHASE 11 : DÉPLOIEMENT

**Objectif** : Préparer pour la production

### Configuration production
- [ ] Créer `.env.production` avec variables sécurisées
- [ ] Générer un JWT_SECRET fort (32+ caractères aléatoires)
- [ ] Configurer CORS pour le domaine de production
- [ ] Ajouter rate limiting sur les routes auth

### Documentation
- [ ] Créer `README.md` avec instructions de démarrage
- [ ] Créer `.env.example` avec les variables nécessaires

### Build
- [ ] Tester `docker-compose up --build` en mode production
- [ ] Vérifier les logs des 3 containers

**Validation Phase 11** : ✅ App prête pour la production

---

## 🎯 FEATURES FUTURES (À ajouter plus tard)

**Instructions** : Ajoute ici les nouvelles fonctionnalités à développer.
Chaque feature doit avoir sa propre section avec des tâches détaillées.

### FEATURE 1 : Tags pour les tâches

**Objectif** : Permettre d'ajouter des tags aux tâches

**Priorité** : 🟡 Moyenne

- [ ] Backend : Créer le modèle `Tag` dans Prisma
- [ ] Backend : Créer la relation Many-to-Many `Task ↔ Tag`
- [ ] Backend : Ajouter endpoint `GET /api/v1/tags` (liste des tags)
- [ ] Backend : Modifier `POST /api/v1/tasks` pour accepter `tags[]`
- [ ] Backend : Modifier `GET /api/v1/tasks` pour filtrer par tag
- [ ] Frontend : Ajouter un composant `TagInput` (multi-select)
- [ ] Frontend : Ajouter les tags dans TaskCard (badges)
- [ ] Frontend : Ajouter le filtre par tag dans FilterBar
- [ ] Tests : Valider la création de tâche avec tags
- [ ] Tests : Valider le filtrage par tag

**Estimation** : 1 jour

---

### FEATURE 2 : Pièces jointes

**Objectif** : Permettre d'ajouter des fichiers aux tâches

**Priorité** : 🟢 Basse

- [ ] Backend : Installer multer pour upload de fichiers
- [ ] Backend : Créer endpoint `POST /api/v1/tasks/:id/attachments`
- [ ] Backend : Stocker les fichiers (S3 ou local)
- [ ] Backend : Créer endpoint `GET /api/v1/tasks/:id/attachments`
- [ ] Backend : Créer endpoint `DELETE /api/v1/attachments/:id`
- [ ] Frontend : Ajouter zone de drag & drop dans TaskModal
- [ ] Frontend : Afficher les pièces jointes dans TaskCard
- [ ] Frontend : Permettre le téléchargement des fichiers
- [ ] Tests : Upload et download de fichiers

**Estimation** : 2 jours

---

### FEATURE 3 : Notifications par email

**Objectif** : Envoyer des rappels par email

**Priorité** : 🟡 Moyenne

- [ ] Backend : Installer nodemailer
- [ ] Backend : Configurer le service SMTP (SendGrid, Mailgun, etc.)
- [ ] Backend : Créer un cron job pour vérifier les tâches à échéance
- [ ] Backend : Créer le template d'email de rappel
- [ ] Backend : Envoyer email 1 jour avant l'échéance
- [ ] Frontend : Ajouter option "Activer les rappels email" dans le profil
- [ ] Tests : Vérifier l'envoi des emails

**Estimation** : 1.5 jours

---

### FEATURE 4 : Sous-tâches

**Objectif** : Permettre de créer des sous-tâches

**Priorité** : 🔴 Haute

- [ ] Backend : Modifier le modèle `Task` pour ajouter `parentId`
- [ ] Backend : Créer la relation auto-référentielle
- [ ] Backend : Modifier les endpoints pour gérer les sous-tâches
- [ ] Backend : Ajouter la logique : tâche parent complétée si toutes les sous-tâches complétées
- [ ] Frontend : Ajouter bouton "Ajouter une sous-tâche" dans TaskCard
- [ ] Frontend : Afficher les sous-tâches dans une liste indentée
- [ ] Frontend : Permettre le drag & drop pour réordonner
- [ ] Tests : Création et complétion des sous-tâches

**Estimation** : 2 jours

---

### FEATURE 5 : Partage de tâches

**Objectif** : Permettre de partager des tâches avec d'autres utilisateurs

**Priorité** : 🟡 Moyenne

- [ ] Backend : Créer le modèle `TaskShare` (taskId, userId, permission)
- [ ] Backend : Créer endpoint `POST /api/v1/tasks/:id/share`
- [ ] Backend : Modifier `GET /api/v1/tasks` pour inclure les tâches partagées
- [ ] Backend : Gérer les permissions (read, write)
- [ ] Frontend : Ajouter bouton "Partager" dans TaskCard
- [ ] Frontend : Créer modal de partage avec sélection d'utilisateurs
- [ ] Frontend : Afficher un badge "Partagée" sur les tâches partagées
- [ ] Tests : Partage et permissions

**Estimation** : 2 jours

---

### FEATURE 6 : Vue Kanban

**Objectif** : Afficher les tâches en colonnes (À faire, En cours, Terminé)

**Priorité** : 🔴 Haute

- [ ] Backend : Ajouter le champ `column` au modèle Task (todo, in_progress, done)
- [ ] Backend : Modifier les endpoints pour supporter le champ `column`
- [ ] Frontend : Installer @dnd-kit/core pour le drag & drop
- [ ] Frontend : Créer le composant `KanbanBoard`
- [ ] Frontend : Créer les colonnes (À faire, En cours, Terminé)
- [ ] Frontend : Permettre le drag & drop entre colonnes
- [ ] Frontend : Ajouter un toggle "Vue Liste / Vue Kanban"
- [ ] Tests : Drag & drop et changement de colonne

**Estimation** : 1.5 jours

---

### FEATURE 7 : Export des tâches

**Objectif** : Exporter les tâches en CSV ou PDF

**Priorité** : 🟢 Basse

- [ ] Backend : Installer csv-writer
- [ ] Backend : Créer endpoint `GET /api/v1/tasks/export/csv`
- [ ] Backend : Créer endpoint `GET /api/v1/tasks/export/pdf` (avec pdfkit)
- [ ] Frontend : Ajouter bouton "Exporter" dans le header
- [ ] Frontend : Créer modal avec choix du format (CSV, PDF)
- [ ] Frontend : Déclencher le téléchargement
- [ ] Tests : Export CSV et PDF

**Estimation** : 1 jour

---

### FEATURE 8 : Statistiques avancées

**Objectif** : Dashboard avec graphiques et métriques

**Priorité** : 🟡 Moyenne

- [ ] Backend : Créer endpoint `GET /api/v1/stats`
- [ ] Backend : Calculer les métriques (taux de complétion, temps moyen, etc.)
- [ ] Frontend : Installer recharts ou chart.js
- [ ] Frontend : Créer la page `Stats.jsx`
- [ ] Frontend : Créer graphique : Tâches complétées par jour (7 derniers jours)
- [ ] Frontend : Créer graphique : Répartition par importance
- [ ] Frontend : Afficher les métriques (temps moyen de complétion, etc.)
- [ ] Tests : Vérifier les calculs de statistiques

**Estimation** : 1.5 jours

---

## 📝 NOTES & OBSERVATIONS

**Section pour noter les problèmes rencontrés et les solutions**

### Session 1 - [Date]
- Problème : ...
- Solution : ...

### Session 2 - [Date]
- Problème : ...
- Solution : ...

---

## 🎯 BACKLOG (Idées futures)

**Idées à explorer plus tard**

- [ ] Mode hors-ligne avec synchronisation
- [ ] Application mobile (React Native)
- [ ] Intégration calendrier (Google Calendar, Outlook)
- [ ] Webhook pour intégrations externes
- [ ] API publique avec clés d'API
- [ ] Thèmes personnalisables
- [ ] Multi-langues (i18n)
- [ ] Mode focus (pomodoro timer)
- [ ] Récurrence des tâches (quotidien, hebdomadaire, etc.)
- [ ] Templates de tâches

---

## 📊 MÉTRIQUES

**Suivi de progression**

| Phase | Tâches | Complétées | Progression | Temps estimé |
|-------|--------|------------|-------------|--------------|
| Phase 0 | 4 | 0 | 0% | 15 min |
| Phase 1 | 8 | 0 | 0% | 1h |
| Phase 2 | 6 | 0 | 0% | 1h |
| Phase 3 | 9 | 0 | 0% | 3h |
| Phase 4 | 12 | 0 | 0% | 4h |
| Phase 5 | 10 | 0 | 0% | 2h |
| Phase 6 | 8 | 0 | 0% | 3h |
| Phase 7 | 15 | 0 | 0% | 4h |
| Phase 8 | 12 | 0 | 0% | 4h |
| Phase 9 | 10 | 0 | 0% | 6h |
| Phase 10 | 12 | 0 | 0% | 4h |
| Phase 11 | 6 | 0 | 0% | 2h |
| **TOTAL** | **112** | **0** | **0%** | **34h** |

---

## 🚦 STATUS DES FEATURES

| Feature | Priorité | Statut | Estimation |
|---------|----------|--------|------------|
| Tags | 🟡 Moyenne | 📋 À faire | 1 jour |
| Pièces jointes | 🟢 Basse | 📋 À faire | 2 jours |
| Notifications email | 🟡 Moyenne | 📋 À faire | 1.5 jours |
| Sous-tâches | 🔴 Haute | 📋 À faire | 2 jours |
| Partage | 🟡 Moyenne | 📋 À faire | 2 jours |
| Vue Kanban | 🔴 Haute | 📋 À faire | 1.5 jours |
| Export | 🟢 Basse | 📋 À faire | 1 jour |
| Statistiques | 🟡 Moyenne | 📋 À faire | 1.5 jours |

---

**Dernière mise à jour** : 26 novembre 2025
**Version** : 1.0.0
**Status** : 🔴 Projet non démarré
