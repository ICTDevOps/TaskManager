# RÉCAPITULATIF FINAL - Task Manager v2.0

**Version actuelle : 0.4**

Ce document résume l'état du projet Task Manager.

---

## ÉTAT DU PROJET

### Version 0.4 (29 novembre 2025)

**Fonctionnalités implémentées :**
- Authentification multi-utilisateurs (email ou username)
- Gestion complète des tâches avec catégories colorées
- Système de délégation avec permissions granulaires
- Panneau d'administration complet
- Export JSON/XML des tâches
- Mode sombre / Mode clair
- Journal d'activité pour les délégations

### Images Docker Hub

| Image | Tag |
|-------|-----|
| `lordbadack/taskmanager-backend` | `0.4`, `latest` |
| `lordbadack/taskmanager-frontend` | `0.4`, `latest` |

---

## DÉPLOIEMENT

### Développement local

```bash
docker-compose up --build -d
```

- Application : http://localhost
- API : http://localhost:3000/api/v1
- Admin : http://localhost/admin/login

### Déploiement Synology/Portainer

Utiliser `docker-compose.portainer.yml` :

```bash
# Ou via Portainer : Stacks > Add Stack > Coller le contenu
```

### Compte administrateur par défaut

| Champ | Valeur |
|-------|--------|
| Username | `admin` |
| Password | `admin` |

> Le mot de passe doit être changé à la première connexion.

---

## STRUCTURE DU PROJET

```
TaskManager/
├── backend/
│   ├── prisma/              # Schéma et migrations
│   └── src/
│       ├── controllers/     # Logique métier
│       ├── routes/          # Définition des routes API
│       └── middleware/      # Auth, admin
├── frontend/
│   └── src/
│       ├── components/      # Composants réutilisables
│       ├── pages/           # Pages principales
│       ├── services/        # Appels API
│       └── hooks/           # Hooks React
├── docs/                    # Documentation
├── docker-compose.yml       # Développement local
└── docker-compose.portainer.yml  # Déploiement Synology
```

---

## TECHNOLOGIES

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express.js, Prisma ORM |
| Base de données | PostgreSQL 15 |
| Authentification | JWT, bcrypt |
| Conteneurisation | Docker, Docker Compose |
| Serveur web | Nginx (production) |

---

## HISTORIQUE DES VERSIONS

| Version | Date | Principales modifications |
|---------|------|---------------------------|
| 0.4 | 29/11/2025 | Fix auth admin, seed auto, footer |
| 0.3 | 28/11/2025 | Migration default_context |
| 0.2 | 28/11/2025 | Premier versionnage Docker Hub |
| 2.0.0 | 28/11/2025 | Version initiale complète |

---

## COMMANDES UTILES

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Logs
docker-compose logs -f

# Logs backend
docker-compose logs -f backend

# Reconstruire
docker-compose up --build -d

# Accéder au shell backend
docker-compose exec backend sh

# Exécuter le seed admin
docker-compose exec backend npx prisma db seed

# Réinitialiser la base de données
docker-compose exec backend npx prisma migrate reset
```

---

**Version actuelle** : 0.4
**Date de mise à jour** : 29 novembre 2025
**Auteur** : VnetConsult SRL
