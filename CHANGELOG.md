# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [0.8] - 2025-12-02

### Ajouté
- **Support multilingue** : Interface disponible en Français et Anglais
- **Sélecteur de langue** : Composant LanguageSelector disponible sur toutes les pages d'authentification et dans les paramètres
- **Système i18n complet** : Utilisation de i18next et react-i18next
- **Détection automatique** : La langue du navigateur est détectée automatiquement
- **Persistance** : Le choix de langue est sauvegardé dans localStorage

### Modifié
- **Tous les composants** : Traduction de tous les textes statiques via le système i18n
- **Profil utilisateur** : Ajout de la sélection de langue dans les paramètres
- **README** : Documentation disponible en Français (README.fr.md) et Anglais (README.md)

### Structure i18n
```
frontend/src/locales/
├── index.js          # Configuration i18next
├── fr/               # Traductions françaises
│   ├── common.json
│   ├── auth.json
│   ├── tasks.json
│   ├── categories.json
│   ├── settings.json
│   ├── admin.json
│   ├── activity.json
│   ├── delegation.json
│   └── tokens.json
└── en/               # Traductions anglaises (même structure)
```

## [0.7] - 2025-12-01

### Ajouté
- **Import de tâches** : Possibilité d'importer des tâches depuis un fichier JSON ou XML
- **Validation import** : Vérification de la structure et des données lors de l'import
- **Bouton import** : Nouveau bouton dans le panneau des paramètres

### Modifié
- **Filtre par défaut** : Le filtre "Actives" est maintenant sélectionné par défaut au lieu de "Toutes"
- **UX améliorée** : Diverses améliorations de l'expérience utilisateur

## [0.6] - 2025-11-30

### Ajouté
- **Personal Access Tokens (PAT)** : Système de tokens d'accès API pour les utilisateurs
  - Création de tokens avec permissions granulaires (lecture, écriture, suppression)
  - Gestion des tokens (liste, révocation)
  - Date d'expiration configurable
- **MCP Server** : Serveur Model Context Protocol pour intégration avec Claude Desktop
  - Bridge MCP dans `mcp-bridge/`
  - Endpoints MCP pour la gestion des tâches
  - Configuration via variables d'environnement
- **Interface TokenManager** : Composant de gestion des tokens API dans les paramètres
- **Permission API** : Nouveau champ `canUseApi` dans le modèle User (activable par admin)

### Modifié
- **Panneau admin** : Ajout de la possibilité d'activer/désactiver l'accès API par utilisateur
- **Structure projet** : Ajout du dossier `mcp-bridge/` pour le serveur MCP

### Sécurité
- Tokens avec préfixe `pat_` pour identification claire
- Hashage sécurisé des tokens en base de données
- Permissions granulaires sur chaque token

## [0.4] - 2025-11-29

### Corrigé
- **Authentification admin** : Correction du problème de déconnexion lors du changement de mot de passe
- **Codes d'erreur HTTP** : Changement de 401 à 400 pour les erreurs de validation de mot de passe
- **Intercepteur Axios** : Ne déconnecte plus automatiquement sur les endpoints de changement de mot de passe/email
- **Redirection admin** : Redirige vers `/admin/login` au lieu de `/login` pour les pages d'administration

### Ajouté
- **Footer** : Ajout du footer "VnetConsult SRL © 2025 - Version 0.4" sur les pages Login et Register
- **Seed automatique** : L'utilisateur admin est automatiquement créé au démarrage via `npx prisma db seed`

### Modifié
- **docker-compose.portainer.yml** : Mise à jour des images vers 0.4 et ajout de la commande seed

## [0.3] - 2025-11-28

### Corrigé
- **Migration default_context** : Création manuelle de la migration pour la colonne `default_context` manquante
- **Migration target_owner_id** : Ajout de la colonne `target_owner_id` dans `activity_logs`

### Modifié
- **Footer** : Mise à jour de la version affichée

## [0.2] - 2025-11-28

### Ajouté
- **Footer avec version** : Ajout du numéro de version dans le footer des pages Login et Register

### Modifié
- **Images Docker** : Premier versionnage des images Docker Hub

## [2.0.0] - 2025-11-28

### Ajouté

#### Système d'authentification multi-utilisateurs
- Inscription avec email, nom d'utilisateur, prénom et nom
- Connexion avec email OU nom d'utilisateur
- Authentification JWT avec tokens sécurisés
- Gestion des sessions utilisateurs

#### Gestion des tâches
- Création, modification et suppression de tâches
- Champs : titre, description, date d'échéance, priorité (low/medium/high), statut
- Filtrage par statut (toutes, actives, complétées)
- Filtrage par priorité
- Filtrage par catégorie
- Recherche textuelle dans les tâches
- Tri par date d'échéance, priorité ou date de création
- Export des tâches en JSON ou XML

#### Système de catégories
- Création de catégories personnalisées par utilisateur
- Attribution de couleurs aux catégories (sélecteur de couleurs)
- Association des tâches à une catégorie
- Filtrage des tâches par catégorie

#### Panneau de paramètres utilisateur
- Modification du profil (prénom, nom)
- Changement d'adresse email (avec confirmation du mot de passe)
- Changement de mot de passe
- Export des tâches personnelles (JSON/XML)

#### Panneau d'administration
- Tableau de bord avec statistiques globales :
  - Nombre total d'utilisateurs (actifs/inactifs)
  - Nombre total de tâches (actives/complétées)
  - Taux de complétion global
  - Nombre de catégories
  - Top des utilisateurs les plus actifs
- Gestion des utilisateurs :
  - Liste de tous les utilisateurs avec recherche et filtres
  - Activation/désactivation de comptes
  - Promotion/rétrogradation du rôle administrateur
  - Changement de mot de passe d'un utilisateur
  - Suppression d'utilisateur (avec option d'export des tâches)
  - Export des tâches d'un utilisateur avant suppression
- Utilisateur administrateur par défaut (admin/admin)
- Changement de mot de passe obligatoire à la première connexion admin

#### Interface utilisateur
- Design moderne et responsive avec Tailwind CSS
- Mode sombre / Mode clair avec persistance
- Icônes Lucide React
- Animations et transitions fluides
- Messages d'erreur et de succès explicites
- Indicateurs de chargement

#### Infrastructure
- Architecture Docker multi-conteneurs
- Base de données PostgreSQL 15
- API REST Express.js avec validation Zod
- ORM Prisma pour la gestion de la base de données
- Frontend React 18 avec Vite
- Serveur Nginx pour le frontend en production
- Hot-reload en développement (nodemon)

### Sécurité
- Hashage des mots de passe avec bcrypt (10 rounds)
- Validation des entrées avec Zod
- Protection CORS configurée
- Headers de sécurité avec Helmet
- Rate limiting sur les endpoints sensibles
- Tokens JWT avec expiration
- Middleware d'authentification sur les routes protégées
- Middleware admin pour les routes d'administration
- Protection du compte admin par défaut (non supprimable, non désactivable)

## [1.0.0] - 2025-11-28

### Ajouté
- Version initiale avec structure de base
- Configuration Docker initiale
- Modèle de données Prisma de base
