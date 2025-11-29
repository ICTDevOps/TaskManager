# Résumé Express - Task Manager v2.0

**Version actuelle : 0.4**

**Pour les développeurs pressés qui veulent démarrer en 5 minutes.**

---

## Le projet en 3 lignes

Application de gestion de tâches **multi-utilisateur** avec **React + Express + PostgreSQL + Docker**. Inclut un système de **délégation de tâches**, un **panneau d'administration** et une interface moderne avec mode sombre.

---

## 📦 Ce que tu as reçu

| Fichier | Contenu | Quand l'utiliser |
|---------|---------|------------------|
| **00-INDEX.md** | Guide des documents | Commence par ici |
| **synthese-executive.md** | Vue globale + schémas | Comprendre le projet |
| **specs-task-manager-v2.md** | Specs techniques complètes | Référence détaillée |
| **prompt-claude-code.md** | Pour Claude Code | Générer le code |
| **checklist-developpement.md** | Commandes step-by-step | Pendant le dev |

---

## 🚀 Quick Start (5 min)

### Étape 1: Setup initial (2 min)
```bash
mkdir task-manager-v2 && cd task-manager-v2
mkdir frontend backend database
touch docker-compose.yml .env
```

### Étape 2: Configuration Docker (2 min)
Copie le contenu de **checklist-developpement.md** Section 4.1 dans `docker-compose.yml`

### Étape 3: Générer le code avec Claude Code (1 min)
Ouvre **prompt-claude-code.md** et copie les prompts dans Claude Code:
```
"Génère le backend Express complet basé sur prompt-claude-code.md"
"Génère le frontend React complet basé sur prompt-claude-code.md"
```

### Étape 4: Lancer
```bash
docker-compose up --build
```

App disponible sur http://localhost
Admin : http://localhost/admin/login (admin/admin)

---

## 🏗️ Architecture ultra-simplifiée

```
Frontend (React)  →  Backend (Express)  →  PostgreSQL
     ↓                      ↓                   ↓
   Port 80             Port 3000           Port 5432
     ↓                      ↓                   ↓
  Container 1          Container 2         Container 3
```

---

## 📊 Stack en un coup d'œil

**Frontend**: React 18 + Vite + TailwindCSS + React Router + Axios  
**Backend**: Node.js 18 + Express + Prisma + JWT + bcrypt  
**Database**: PostgreSQL 15  
**Infra**: Docker + Docker Compose + Nginx  

---

## Fonctionnalités clés

- Authentification (register/login avec JWT, email ou username)
- CRUD tâches (créer, modifier, supprimer, compléter)
- Catégories personnalisées avec couleurs
- Recherche en temps réel
- Filtres (statut, priorité, catégorie)
- Tri (date, échéance, priorité)
- **Délégation de tâches** (partage avec permissions granulaires)
- **Panneau d'administration** (stats, gestion utilisateurs)
- Dark/Light mode
- Export JSON/XML
- Responsive (mobile + desktop)

---

## Tables PostgreSQL

**users**: id, email, username, passwordHash, firstName, lastName, themePreference, defaultContext, role, isActive, mustChangePassword
**tasks**: id, userId, title, description, priority, status, dueDate, categoryId, createdAt
**categories**: id, userId, name, color
**task_delegations**: id, ownerId, delegateId, canCreateTasks, canEditTasks, canDeleteTasks, canCreateCategories, hiddenCategoryIds, status
**activity_logs**: id, ownerId, actorId, targetOwnerId, action, entityType, entityId, entityTitle, details, createdAt

---

## Pages principales

1. **Login/Register** (`/login`, `/register`)
2. **Dashboard** (`/dashboard`) - Liste des tâches avec filtres, catégories, partage
3. **Admin** (`/admin`) - Panneau d'administration
4. **Admin Login** (`/admin/login`) - Connexion administrateur

---

## 🔐 Sécurité

- Mots de passe hashés (bcrypt, 10 rounds)
- JWT avec expiration 7 jours
- Middleware d'authentification sur toutes les routes tasks
- CORS configuré
- Rate limiting (5 tentatives/15min sur login)
- Validation des inputs (Zod)

---

## 🐳 Docker - Les 3 containers

```yaml
1. db (PostgreSQL)
   - Port: 5432
   - Volume: postgres_data
   
2. backend (Express API)
   - Port: 3000
   - Dépend de: db
   
3. frontend (React + Nginx)
   - Port: 80
   - Dépend de: backend
```

---

## ⚡ Commandes essentielles

```bash
# Démarrer
docker-compose up --build

# Arrêter
docker-compose down

# Logs
docker-compose logs -f

# Entrer dans un container
docker-compose exec backend sh

# Prisma Studio (GUI base de données)
docker-compose exec backend npx prisma studio
```

---

## Déploiement Synology/Portainer

Utiliser `docker-compose.portainer.yml` avec les images Docker Hub pré-construites :
- `lordbadack/taskmanager-backend:0.4`
- `lordbadack/taskmanager-frontend:0.4`

---

## 📚 Où trouver quoi ?

**Architecture globale** → synthese-executive.md  
**API endpoints** → specs-task-manager-v2.md Section "API REST"  
**Modèle de données** → specs-task-manager-v2.md Section "Modèle de données"  
**Commandes Docker** → checklist-developpement.md Phase 4  
**Prompts Claude Code** → prompt-claude-code.md fin du document  
**Troubleshooting** → checklist-developpement.md Section "Troubleshooting"  

---

## ⚠️ Pièges à éviter

1. Ne pas oublier le `.env` (variables d'environnement)
2. Générer le client Prisma après chaque changement de schéma
3. Tester chaque feature avant de passer à la suivante
4. Ne pas exposer JWT_SECRET en production
5. Vérifier que les ports sont disponibles avant docker-compose up

---

## ✅ Checklist MVP

- [ ] Inscription fonctionne
- [ ] Connexion fonctionne
- [ ] Création de tâche fonctionne
- [ ] Modification de tâche fonctionne
- [ ] Suppression de tâche fonctionne
- [ ] Recherche fonctionne
- [ ] Filtres fonctionnent
- [ ] Tri fonctionne
- [ ] Dark mode fonctionne
- [ ] Responsive sur mobile

---

## 🎓 Ce que tu vas apprendre

✅ Docker multi-container  
✅ API REST + JWT  
✅ React hooks modernes  
✅ PostgreSQL + Prisma ORM  
✅ Architecture microservices  

---

## 🆘 En cas de problème

1. Vérifie le fichier `.env`
2. Vérifie les logs: `docker-compose logs -f`
3. Consulte **checklist-developpement.md** Section "Troubleshooting"
4. Redémarre: `docker-compose down && docker-compose up --build`

---

## 🏁 Pour démarrer MAINTENANT

```bash
# 1. Télécharge les 5 documents
# 2. Lis 00-INDEX.md (2 min)
# 3. Suis checklist-developpement.md Phase 1-4 (30 min)
# 4. Utilise prompt-claude-code.md avec Claude Code (15 min)
# 5. Lance docker-compose up --build
# 6. Profit! 🎉
```

---

**Temps de lecture**: 2 minutes
**Temps de setup**: 30 minutes
**Version actuelle**: 0.4

VnetConsult SRL - 2025
