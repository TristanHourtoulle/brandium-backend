# Brandium Backend - Récapitulatif Complet du Projet

## Vue d'ensemble

**Brandium** est une API backend pour la génération personnalisée de posts sur les réseaux sociaux utilisant l'IA (OpenAI).

**Stack technique:**
- Node.js + Express 5.x
- TypeScript (mode strict)
- Sequelize ORM + PostgreSQL
- Authentification JWT
- API OpenAI
- Jest (tests)

---

## Structure du Projet

```
brandium-backend/
├── src/                          # Code source TypeScript
│   ├── app.ts                    # Serveur Express, configuration
│   ├── controllers/              # Gestionnaires de routes
│   │   ├── authController.ts
│   │   ├── profileController.ts
│   │   ├── projectController.ts
│   │   ├── platformController.ts
│   │   ├── postController.ts
│   │   └── generateController.ts
│   ├── middleware/               # Middlewares Express
│   │   ├── authMiddleware.ts     # Vérification JWT
│   │   ├── errorHandler.ts       # Gestion globale des erreurs
│   │   ├── validators.ts         # Validation des entrées
│   │   └── validateUUID.ts       # Validation UUID
│   ├── models/                   # Modèles Sequelize
│   │   ├── index.ts              # Export et associations
│   │   ├── User.ts
│   │   ├── Profile.ts
│   │   ├── Project.ts
│   │   ├── Platform.ts
│   │   └── Post.ts
│   ├── routes/                   # Définitions des routes
│   │   ├── authRoutes.ts
│   │   ├── profileRoutes.ts
│   │   ├── projectRoutes.ts
│   │   ├── platformRoutes.ts
│   │   ├── postRoutes.ts
│   │   └── generateRoutes.ts
│   ├── services/                 # Logique métier
│   │   └── LLMService.ts         # Intégration OpenAI
│   ├── utils/                    # Utilitaires
│   │   ├── controllerHelpers.ts  # Helpers pour réponses
│   │   └── promptBuilder.ts      # Construction des prompts IA
│   ├── types/                    # Types TypeScript
│   │   └── express.d.ts
│   └── config/                   # Configuration
│       ├── database.ts           # Config Sequelize
│       └── constants.ts          # Constantes applicatives
├── dist/                         # JavaScript compilé
├── migrations/                   # Migrations Sequelize (JS)
├── seeders/                      # Seeders de données (JS)
├── tests/                        # Tests Jest
│   ├── unit/                     # Tests unitaires
│   ├── integration/              # Tests d'intégration
│   └── helpers/                  # Utilitaires de test
└── Configuration files...
```

---

## Modèles de Données

### User (Utilisateur)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clé primaire |
| `email` | STRING(255) | Email unique, requis |
| `passwordHash` | STRING(255) | Mot de passe hashé (bcrypt) |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de modification |

**Fonctionnalités:**
- Hash automatique du mot de passe (hook beforeCreate/beforeUpdate)
- Méthode `comparePassword()` pour l'authentification
- `toJSON()` exclut le passwordHash des réponses

**Relations:** hasMany Profile, Project, Platform, Post

---

### Profile (Persona)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clé primaire |
| `userId` | UUID | FK → users (CASCADE) |
| `name` | STRING(255) | Nom du profil, requis |
| `bio` | TEXT | Biographie, optionnel |
| `toneTags` | JSONB[] | Tags de ton/style |
| `doRules` | JSONB[] | Règles à suivre |
| `dontRules` | JSONB[] | Règles à éviter |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de modification |

**Relations:** belongsTo User, hasMany Post

---

### Project (Projet)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clé primaire |
| `userId` | UUID | FK → users (CASCADE) |
| `name` | STRING(255) | Nom du projet, requis |
| `description` | TEXT | Description, optionnel |
| `audience` | TEXT | Audience cible, optionnel |
| `keyMessages` | JSONB[] | Messages clés |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de modification |

**Relations:** belongsTo User, hasMany Post

---

### Platform (Plateforme)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clé primaire |
| `userId` | UUID | FK → users (CASCADE) |
| `name` | STRING(100) | Nom de la plateforme, requis |
| `styleGuidelines` | TEXT | Directives de style |
| `maxLength` | INTEGER | Limite de caractères |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de modification |

**Relations:** belongsTo User, hasMany Post

---

### Post (Publication générée)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clé primaire |
| `userId` | UUID | FK → users (CASCADE), requis |
| `profileId` | UUID | FK → profiles (SET NULL) |
| `projectId` | UUID | FK → projects (SET NULL) |
| `platformId` | UUID | FK → platforms (SET NULL) |
| `goal` | TEXT | Objectif du post |
| `rawIdea` | TEXT | Idée brute de l'utilisateur, requis |
| `generatedText` | TEXT | Texte généré par l'IA, requis |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de modification |

**Relations:** belongsTo User, Profile, Project, Platform

---

## Endpoints API

### Authentification (`/api/auth`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/register` | Non | Inscription utilisateur |
| POST | `/api/auth/login` | Non | Connexion utilisateur |
| GET | `/api/auth/me` | Oui | Utilisateur courant |

**Register - Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"  // min 8 chars, majuscule, minuscule, chiffre
}
```

**Login - Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Réponse (register/login):**
```json
{
  "message": "...",
  "user": { "id", "email", "createdAt", "updatedAt" },
  "token": "jwt_token"
}
```

---

### Profiles (`/api/profiles`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/profiles` | Oui | Liste tous les profils |
| GET | `/api/profiles/:id` | Oui | Récupère un profil |
| POST | `/api/profiles` | Oui | Crée un profil |
| PUT | `/api/profiles/:id` | Oui | Met à jour un profil |
| DELETE | `/api/profiles/:id` | Oui | Supprime un profil |

**Create/Update - Body:**
```json
{
  "name": "Mon Profil",
  "bio": "Description...",
  "toneTags": ["professionnel", "inspirant"],
  "doRules": ["Utiliser des emojis", "Poser des questions"],
  "dontRules": ["Pas de jargon technique", "Éviter les hashtags"]
}
```

---

### Projects (`/api/projects`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/projects` | Oui | Liste tous les projets |
| GET | `/api/projects/:id` | Oui | Récupère un projet |
| POST | `/api/projects` | Oui | Crée un projet |
| PUT | `/api/projects/:id` | Oui | Met à jour un projet |
| DELETE | `/api/projects/:id` | Oui | Supprime un projet |

**Create/Update - Body:**
```json
{
  "name": "Mon Projet",
  "description": "Description du projet...",
  "audience": "Développeurs web, entrepreneurs tech",
  "keyMessages": ["Innovation", "Simplicité", "Performance"]
}
```

---

### Platforms (`/api/platforms`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/platforms` | Oui | Liste toutes les plateformes |
| GET | `/api/platforms/:id` | Oui | Récupère une plateforme |
| POST | `/api/platforms` | Oui | Crée une plateforme |
| PUT | `/api/platforms/:id` | Oui | Met à jour une plateforme |
| DELETE | `/api/platforms/:id` | Oui | Supprime une plateforme |

**Create/Update - Body:**
```json
{
  "name": "LinkedIn",
  "styleGuidelines": "Ton professionnel, utiliser des bullet points...",
  "maxLength": 3000
}
```

---

### Posts (`/api/posts`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/posts` | Oui | Liste les posts (paginé) |
| GET | `/api/posts/:id` | Oui | Récupère un post |
| DELETE | `/api/posts/:id` | Oui | Supprime un post |

**Query Parameters (GET /api/posts):**
- `page`: numéro de page (défaut: 1)
- `limit`: éléments par page (défaut: 10, max: 100)

**Réponse paginée:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Génération IA (`/api/generate`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/generate` | Oui | Génère un post avec l'IA |
| GET | `/api/generate/status` | Oui | État du rate limiting |

**Generate - Body:**
```json
{
  "profileId": "uuid",      // optionnel
  "projectId": "uuid",      // optionnel
  "platformId": "uuid",     // optionnel
  "goal": "Promouvoir mon nouveau produit",  // optionnel
  "rawIdea": "Je veux parler de..."  // REQUIS
}
```

**Réponse génération:**
```json
{
  "message": "Post generated successfully",
  "data": {
    "postId": "uuid",
    "generatedText": "Contenu généré par l'IA...",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350
    },
    "context": {
      "profile": { "id", "name" },
      "project": { "id", "name" },
      "platform": { "id", "name" }
    }
  }
}
```

**Status - Réponse:**
```json
{
  "data": {
    "rateLimit": {
      "requestsRemaining": 18,
      "tokensRemaining": 39500,
      "windowResetIn": 45
    },
    "service": "operational"
  }
}
```

---

### Endpoints Publics

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Info API |
| GET | `/health` | Health check |

---

## Service LLM (OpenAI)

**Fichier:** `src/services/LLMService.ts`

**Configuration:**
- Modèle: `gpt-4.1-mini` (configurable via env)
- Max tokens: 1000
- Température: 0.7
- Rate limits par minute:
  - Requêtes: 20
  - Tokens: 40,000

**Méthodes:**
- `generate(params)`: Génère du contenu via OpenAI
- `getRateLimitStatus()`: État actuel des limites
- `resetRateLimits()`: Reset (tests uniquement)

**Gestion des erreurs:**
- `RateLimitError`: Limite atteinte, inclut `retryAfter`
- `LLMServiceError`: Erreurs API avec codes spécifiques

---

## Construction des Prompts

**Fichier:** `src/utils/promptBuilder.ts`

Le prompt est construit dynamiquement à partir du contexte:

1. **Section Profile** (si fourni)
   - Nom de l'auteur
   - Bio
   - Tags de ton/style
   - Règles DO/DON'T

2. **Section Projet** (si fourni)
   - Nom du projet
   - Description
   - Audience cible
   - Messages clés

3. **Section Plateforme** (si fourni)
   - Nom de la plateforme
   - Directives de style
   - Limite de caractères

4. **Section Tâche** (toujours présent)
   - Objectif
   - Idée brute à transformer
   - Instructions de génération

---

## Middlewares

### authMiddleware
- Vérifie le token JWT dans l'header `Authorization: Bearer <token>`
- Attache l'utilisateur à `req.user`
- Erreurs: 401 (token manquant/invalide/expiré)

### errorHandler
- Gestionnaire global d'erreurs
- Mappe les erreurs Sequelize vers des réponses HTTP
- Mode dev: inclut les stack traces

### validators
- Validation des entrées avec express-validator
- Validateurs pour: auth, profiles, projects, platforms, posts, generate

---

## Tests

**22 fichiers de test au total**

### Tests Unitaires (11 fichiers)
- `authController.test.ts`
- `authMiddleware.test.ts`
- `controllerHelpers.test.ts`
- `errorHandler.test.ts`
- `generateController.test.ts`
- `llmService.test.ts`
- `platformController.test.ts`
- `postController.test.ts`
- `profileController.test.ts`
- `projectController.test.ts`
- `promptBuilder.test.ts`

### Tests d'Intégration (6 fichiers)
- `auth.test.ts`
- `generate.test.ts`
- `platforms.test.ts`
- `posts.test.ts`
- `profiles.test.ts`
- `projects.test.ts`

---

## Migrations

5 migrations dans `/migrations/`:

1. `create-users.js` - Table users
2. `create-profiles.js` - Table profiles avec JSONB
3. `create-projects.js` - Table projects avec JSONB
4. `create-platforms.js` - Table platforms
5. `create-posts.js` - Table posts avec FK

---

## Seeders

1 seeder avec données de démo:
- 1 utilisateur (tristan@brandium.local)
- 2 profils
- 2 projets
- 3 plateformes (LinkedIn, X, TikTok)
- 1 post exemple

---

## Variables d'Environnement

```bash
# Serveur
NODE_ENV=development
PORT=5000

# JWT
JWT_SECRET=your_secret_key    # REQUIS
JWT_EXPIRES_IN=7d

# Base de données (option 1: URL)
DATABASE_URL=postgresql://...

# Base de données (option 2: séparés)
DB_HOST=localhost
DB_PORT=5432
DB_USER=brandium_user
DB_PASSWORD=brandium_pass
DB_NAME=brandium_dev

# OpenAI
OPENAI_API_KEY=sk-...         # REQUIS pour génération
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MAX_REQUESTS_PER_MINUTE=20
OPENAI_MAX_TOKENS_PER_MINUTE=40000

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Commandes NPM

```bash
# Développement
npm run dev              # Hot reload avec nodemon
npm run build            # Compile TypeScript
npm start                # Build + run production

# Types
npm run typecheck        # Vérification types

# Tests
npm test                 # Tests en mode watch
npm run test:coverage    # Avec couverture

# Linting
npm run lint             # Vérification ESLint
npm run lint:fix         # Correction auto
npm run format           # Prettier

# Base de données
npm run setup            # Setup PostgreSQL
npm run db:migrate       # Exécute migrations
npm run db:migrate:undo  # Annule dernière migration
npm run db:seed          # Exécute seeders
npm run db:reset         # Reset complet
```

---

## Sécurité

- **Helmet**: Headers de sécurité HTTP
- **CORS**: Origines configurables
- **JWT**: Authentification stateless
- **bcrypt**: Hashage des mots de passe (cost factor 12)
- **UUID v4**: Identifiants non prédictibles
- **Validation**: Toutes les entrées utilisateur validées
- **Rate Limiting**: Sur le service LLM

---

## Déploiement

**Compatible Railway:**
- Bind sur 0.0.0.0
- Support DATABASE_URL
- SSL en production
- Health check avant connexion DB

---

## Dépendances Principales

**Production:**
- express@5.2.1
- sequelize@6.37.7 + pg@8.16.3
- jsonwebtoken@9.0.2
- bcrypt@6.0.0
- openai@6.9.1
- helmet@8.1.0
- express-validator@7.3.1

**Développement:**
- typescript@5.9.3
- jest@30.2.0
- ts-node@10.9.2
- nodemon@3.1.11
- supertest@7.1.4
- eslint@9.39.1 + prettier@3.7.4

---

*Généré le 4 décembre 2025*
