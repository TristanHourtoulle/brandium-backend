# Feature: Génération d'Idées de Posts

> **Statut**: En planification
> **Branche Git**: `feat/post-idea-generation`
> **Estimation totale**: ~26.5 heures (3-4 jours temps plein)

---

## Table des Matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Core Feature](#phase-2-core-feature)
5. [Phase 3: Enhancement & Polish](#phase-3-enhancement--polish)
6. [Phase 4: Testing](#phase-4-testing)
7. [Fichiers à créer/modifier](#fichiers-à-créermodifier)
8. [Risques et mitigations](#risques-et-mitigations)
9. [Critères de succès](#critères-de-succès)

---

## 1. Vue d'ensemble

### Problème résolu

Actuellement, les utilisateurs doivent fournir une `rawIdea` pour générer un post. Cette fonctionnalité permet de générer **10 idées de posts** automatiquement basées sur le contexte de l'utilisateur, réduisant le "syndrome de la page blanche".

### Utilisateurs cibles

Tous les utilisateurs de Brandium cherchant de l'inspiration pour créer du contenu, particulièrement ceux gérant plusieurs personas ou projets.

### Fonctionnalités clés

| Fonctionnalité | Description |
|----------------|-------------|
| **Génération flexible** | Idées basées sur Profile, Project, Platform, ou combinaison |
| **Mode Auto** | L'IA choisit le meilleur contexte disponible |
| **Batch de 10 idées** | 10 idées variées en une seule requête |
| **Anti-répétition** | Analyse des HistoricalPosts pour éviter les doublons |
| **Contexte intelligent** | Suggestions pertinentes selon le contexte |

---

## 2. Architecture technique

### Flow de données

```
User Request (Flexible params)
        ↓
IdeaGenerationController
        ↓
Context Resolution Service ──→ Fetch Profile/Project/Platform/Historical Posts
        ↓
Prompt Builder (Ideas Mode) ──→ Build specialized prompt for idea generation
        ↓
LLM Service ──→ OpenAI API (generate 10 ideas)
        ↓
PostIdea Model ──→ Store ideas in database
        ↓
Response (10 ideas with metadata)
```

### Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/ideas/generate` | Génère 10 idées de posts |
| `GET` | `/api/ideas` | Liste les idées (avec filtres et pagination) |
| `GET` | `/api/ideas/:id` | Récupère une idée spécifique |
| `POST` | `/api/ideas/:id/use` | Marque une idée comme utilisée |
| `DELETE` | `/api/ideas/:id` | Supprime une idée |

### Request Body - POST /api/ideas/generate

```typescript
{
  // Option 1: Mode flexible (un ou plusieurs paramètres)
  profileId?: string;
  projectId?: string;
  platformId?: string;

  // Option 2: Mode automatique
  auto?: boolean;

  // Option 3: Contexte personnalisé
  customContext?: string;

  // Paramètres communs
  count?: number;              // Default: 10, Max: 20
  excludeRecentTopics?: boolean; // Default: true
}
```

### Response Format

```typescript
{
  message: string;
  data: {
    ideas: Array<{
      id: string;
      title: string;
      description: string;
      suggestedGoal?: string;
      relevanceScore: number;
      tags: string[];
    }>;
    context: {
      profile?: { id: string; name: string };
      project?: { id: string; name: string };
      platform?: { id: string; name: string };
      historicalPostsAnalyzed: number;
    };
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }
}
```

### Schéma Database - Table `post_ideas`

```sql
CREATE TABLE post_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,

  -- Idea content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  suggested_goal TEXT,
  relevance_score DECIMAL(3,2),
  tags JSONB DEFAULT '[]',

  -- Metadata
  generation_context JSONB,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_post_ideas_user_id ON post_ideas(user_id);
CREATE INDEX idx_post_ideas_profile_id ON post_ideas(profile_id);
CREATE INDEX idx_post_ideas_project_id ON post_ideas(project_id);
CREATE INDEX idx_post_ideas_platform_id ON post_ideas(platform_id);
CREATE INDEX idx_post_ideas_is_used ON post_ideas(is_used);
CREATE INDEX idx_post_ideas_created_at ON post_ideas(created_at DESC);
```

---

## Phase 1: Foundation

> **Durée estimée**: 4-6 heures
> **Objectif**: Mettre en place les bases (DB, Model, Service structure)

### 1.1 Database Setup

**Fichier**: `migrations/YYYYMMDDHHMMSS-create-post-ideas.js`

```bash
# Créer la migration
npx sequelize-cli migration:generate --name create-post-ideas
```

#### Tâches

- [ ] Créer la migration pour la table `post_ideas`
- [ ] Créer les indexes appropriés
- [ ] Tester la migration en local (`npm run db:migrate`)
- [ ] Tester le rollback (`npm run db:migrate:undo`)

#### Code de la migration

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('post_ideas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        field: 'user_id',
      },
      profileId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'profiles', key: 'id' },
        onDelete: 'SET NULL',
        field: 'profile_id',
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onDelete: 'SET NULL',
        field: 'project_id',
      },
      platformId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'platforms', key: 'id' },
        onDelete: 'SET NULL',
        field: 'platform_id',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      suggestedGoal: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'suggested_goal',
      },
      relevanceScore: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        field: 'relevance_score',
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      generationContext: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'generation_context',
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_used',
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'used_at',
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'posts', key: 'id' },
        onDelete: 'SET NULL',
        field: 'post_id',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at',
      },
    });

    // Create indexes
    await queryInterface.addIndex('post_ideas', ['user_id']);
    await queryInterface.addIndex('post_ideas', ['profile_id']);
    await queryInterface.addIndex('post_ideas', ['project_id']);
    await queryInterface.addIndex('post_ideas', ['platform_id']);
    await queryInterface.addIndex('post_ideas', ['is_used']);
    await queryInterface.addIndex('post_ideas', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('post_ideas');
  },
};
```

---

### 1.2 Model Creation

**Fichier**: `src/models/PostIdea.ts`

#### Tâches

- [ ] Créer le modèle `PostIdea` avec TypeScript
- [ ] Définir les interfaces (attributes, creation attributes)
- [ ] Configurer les associations (User, Profile, Project, Platform, Post)
- [ ] Ajouter les validations Sequelize
- [ ] Exporter le modèle dans `src/models/index.ts`

#### Structure du modèle

```typescript
import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  Association,
  BelongsToGetAssociationMixin,
} from 'sequelize';
import { sequelize } from '../config/database';

import type { User } from './User';
import type { Profile } from './Profile';
import type { Project } from './Project';
import type { Platform } from './Platform';
import type { Post } from './Post';

export interface GenerationContext {
  mode: 'auto' | 'manual' | 'custom';
  customContext?: string;
  historicalPostsCount: number;
  timestamp: string;
}

class PostIdea extends Model<
  InferAttributes<PostIdea>,
  InferCreationAttributes<PostIdea>
> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare userId: ForeignKey<User['id']>;
  declare profileId: CreationOptional<ForeignKey<Profile['id']> | null>;
  declare projectId: CreationOptional<ForeignKey<Project['id']> | null>;
  declare platformId: CreationOptional<ForeignKey<Platform['id']> | null>;
  declare postId: CreationOptional<ForeignKey<Post['id']> | null>;

  // Attributes
  declare title: string;
  declare description: string;
  declare suggestedGoal: CreationOptional<string | null>;
  declare relevanceScore: CreationOptional<number | null>;
  declare tags: CreationOptional<string[]>;
  declare generationContext: CreationOptional<GenerationContext | null>;
  declare isUsed: CreationOptional<boolean>;
  declare usedAt: CreationOptional<Date | null>;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare profile?: NonAttribute<Profile | null>;
  declare project?: NonAttribute<Project | null>;
  declare platform?: NonAttribute<Platform | null>;
  declare post?: NonAttribute<Post | null>;

  // Association methods
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getProfile: BelongsToGetAssociationMixin<Profile>;
  declare getProject: BelongsToGetAssociationMixin<Project>;
  declare getPlatform: BelongsToGetAssociationMixin<Platform>;
  declare getPost: BelongsToGetAssociationMixin<Post>;

  // Static associations object
  declare static associations: {
    user: Association<PostIdea, User>;
    profile: Association<PostIdea, Profile>;
    project: Association<PostIdea, Project>;
    platform: Association<PostIdea, Platform>;
    post: Association<PostIdea, Post>;
  };
}

// Model initialization and export...
```

---

### 1.3 Service Layer Setup

**Fichier**: `src/services/IdeaGenerationService.ts`

#### Tâches

- [ ] Créer le fichier service avec structure de base
- [ ] Définir les interfaces pour les paramètres et retours
- [ ] Implémenter la logique de résolution de contexte (auto-mode)
- [ ] Créer les méthodes stub (structure vide)

#### Interfaces principales

```typescript
export interface IdeaGenerationParams {
  userId: string;
  profileId?: string;
  projectId?: string;
  platformId?: string;
  auto?: boolean;
  customContext?: string;
  count?: number;
  excludeRecentTopics?: boolean;
}

export interface GeneratedIdea {
  title: string;
  description: string;
  suggestedGoal?: string;
  relevanceScore: number;
  tags: string[];
}

export interface IdeaGenerationResult {
  ideas: GeneratedIdea[];
  context: {
    profile?: { id: string; name: string };
    project?: { id: string; name: string };
    platform?: { id: string; name: string };
    historicalPostsAnalyzed: number;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ResolvedContext {
  profile: Profile | null;
  project: Project | null;
  platform: Platform | null;
  historicalPosts: HistoricalPost[];
  mode: 'auto' | 'manual' | 'custom';
}
```

#### Méthodes à implémenter

```typescript
class IdeaGenerationService {
  // Résout le contexte selon les paramètres
  async resolveContext(params: IdeaGenerationParams): Promise<ResolvedContext>;

  // Génère les idées via OpenAI
  async generateIdeas(params: IdeaGenerationParams): Promise<IdeaGenerationResult>;

  // Sauvegarde les idées en base
  async saveIdeas(ideas: GeneratedIdea[], params: SaveIdeasParams): Promise<PostIdea[]>;

  // Extrait les topics récents pour éviter les répétitions
  extractRecentTopics(historicalPosts: HistoricalPost[]): string[];

  // Parse la réponse JSON d'OpenAI
  parseOpenAIResponse(response: string): GeneratedIdea[];
}
```

---

### Checklist Phase 1

| Tâche | Fichier | Status |
|-------|---------|--------|
| Créer migration | `migrations/xxx-create-post-ideas.js` | [ ] |
| Tester migration up | - | [ ] |
| Tester migration down | - | [ ] |
| Créer modèle PostIdea | `src/models/PostIdea.ts` | [ ] |
| Exporter dans index | `src/models/index.ts` | [ ] |
| Créer service structure | `src/services/IdeaGenerationService.ts` | [ ] |
| Définir interfaces | `src/services/IdeaGenerationService.ts` | [ ] |
| Test TypeScript compile | `npm run typecheck` | [ ] |

**Commandes de validation**:
```bash
npm run typecheck
npm run db:migrate
npm run db:migrate:undo
npm run db:migrate
```

---

## Phase 2: Core Feature

> **Durée estimée**: 8-12 heures
> **Objectif**: Implémenter la logique métier et les endpoints

### 2.1 Prompt Engineering

**Fichier**: `src/utils/promptBuilder.ts`

#### Tâches

- [ ] Créer `buildIdeaGenerationPrompt()`
- [ ] Définir le format de sortie JSON structuré
- [ ] Intégrer l'analyse des posts historiques
- [ ] Ajouter des exemples d'idées dans le prompt système
- [ ] Créer `extractTopicsFromHistoricalPosts()`

#### Nouveau prompt système

```typescript
export interface IdeaPromptContext {
  profile?: Profile | null;
  project?: Project | null;
  platform?: Platform | null;
  historicalPosts?: HistoricalPost[];
  recentTopics?: string[];
  count: number;
  customContext?: string;
}

export function buildIdeaGenerationPrompt(context: IdeaPromptContext): string {
  const sections: string[] = [];

  // System instruction
  sections.push(`# TASK: Generate ${context.count} unique post ideas

You are an expert content strategist. Generate creative, engaging post ideas
that align with the provided context. Each idea should be distinct and actionable.

## OUTPUT FORMAT
Return a JSON array with exactly ${context.count} ideas:
\`\`\`json
[
  {
    "title": "Short catchy title (max 100 chars)",
    "description": "Detailed description of the post idea (2-3 sentences)",
    "suggestedGoal": "What this post aims to achieve",
    "relevanceScore": 0.85,
    "tags": ["tag1", "tag2", "tag3"]
  }
]
\`\`\`

IMPORTANT: Return ONLY valid JSON, no additional text.`);

  // Add profile context
  if (context.profile) {
    sections.push(buildProfileContext(context.profile));
  }

  // Add historical posts analysis
  if (context.historicalPosts?.length) {
    sections.push(buildHistoricalAnalysis(context.historicalPosts));
  }

  // Add topics to avoid
  if (context.recentTopics?.length) {
    sections.push(`## TOPICS TO AVOID (recently covered)
${context.recentTopics.map(t => `- ${t}`).join('\n')}`);
  }

  // Add project context
  if (context.project) {
    sections.push(buildProjectContext(context.project));
  }

  // Add platform context
  if (context.platform) {
    sections.push(buildPlatformContext(context.platform));
  }

  // Add custom context
  if (context.customContext) {
    sections.push(`## ADDITIONAL CONTEXT
${context.customContext}`);
  }

  return sections.join('\n\n---\n\n');
}
```

---

### 2.2 Controller Implementation

**Fichier**: `src/controllers/IdeaGenerationController.ts`

#### Tâches

- [ ] Implémenter `generateIdeas()` - endpoint principal
- [ ] Implémenter `listIdeas()` - liste avec filtres et pagination
- [ ] Implémenter `getIdeaById()` - récupération d'une idée
- [ ] Implémenter `useIdea()` - marquer comme utilisée
- [ ] Implémenter `deleteIdea()` - suppression
- [ ] Gestion d'erreurs appropriée

#### Structure du controller

```typescript
import { Request, Response, NextFunction } from 'express';
import { ideaGenerationService } from '../services/IdeaGenerationService';
import { PostIdea } from '../models';

/**
 * POST /api/ideas/generate
 * Generate post ideas based on context
 */
export const generateIdeas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { profileId, projectId, platformId, auto, customContext, count, excludeRecentTopics } = req.body;

    const result = await ideaGenerationService.generateIdeas({
      userId,
      profileId,
      projectId,
      platformId,
      auto,
      customContext,
      count: count || 10,
      excludeRecentTopics: excludeRecentTopics ?? true,
    });

    res.status(201).json({
      message: 'Ideas generated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ideas
 * List user's saved ideas with filters and pagination
 */
export const listIdeas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { profileId, projectId, platformId, isUsed, page = 1, limit = 20 } = req.query;

    // Build where clause
    const where: any = { userId };
    if (profileId) where.profileId = profileId;
    if (projectId) where.projectId = projectId;
    if (platformId) where.platformId = platformId;
    if (isUsed !== undefined) where.isUsed = isUsed === 'true';

    const offset = (Number(page) - 1) * Number(limit);

    const { rows: ideas, count: total } = await PostIdea.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: ['profile', 'project', 'platform'],
    });

    res.status(200).json({
      data: ideas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ideas/:id
 */
export const getIdeaById = async (/* ... */): Promise<void> => { /* ... */ };

/**
 * POST /api/ideas/:id/use
 */
export const useIdea = async (/* ... */): Promise<void> => { /* ... */ };

/**
 * DELETE /api/ideas/:id
 */
export const deleteIdea = async (/* ... */): Promise<void> => { /* ... */ };
```

---

### 2.3 Service Logic

**Fichier**: `src/services/IdeaGenerationService.ts`

#### Tâches

- [ ] Implémenter `resolveContext()` - résolution intelligente du contexte
- [ ] Implémenter `generateIdeas()` - orchestration complète
- [ ] Implémenter `extractRecentTopics()` - éviter les répétitions
- [ ] Implémenter `parseOpenAIResponse()` - parsing JSON robuste
- [ ] Implémenter `calculateRelevanceScore()` - scoring
- [ ] Gérer les différents modes (auto, manual, custom)

#### Logique du mode Auto

```typescript
async resolveContext(params: IdeaGenerationParams): Promise<ResolvedContext> {
  const { userId, profileId, projectId, platformId, auto } = params;

  let profile: Profile | null = null;
  let project: Project | null = null;
  let platform: Platform | null = null;
  let mode: 'auto' | 'manual' | 'custom' = 'manual';

  if (auto) {
    mode = 'auto';
    // Fetch user's most active/recent resources
    [profile, project, platform] = await Promise.all([
      Profile.findOne({
        where: { userId },
        order: [['updatedAt', 'DESC']]
      }),
      Project.findOne({
        where: { userId },
        order: [['updatedAt', 'DESC']]
      }),
      Platform.findOne({
        where: { userId },
        order: [['updatedAt', 'DESC']]
      }),
    ]);
  } else {
    // Manual mode: fetch specified resources
    [profile, project, platform] = await Promise.all([
      profileId ? findUserResource(Profile, profileId, userId) : null,
      projectId ? findUserResource(Project, projectId, userId) : null,
      platformId ? findUserResource(Platform, platformId, userId) : null,
    ]);
  }

  // Fetch historical posts if profile exists
  let historicalPosts: HistoricalPost[] = [];
  if (profile) {
    historicalPosts = await HistoricalPost.findAll({
      where: { profileId: profile.id, userId },
      order: [['publishedAt', 'DESC']],
      limit: 20,
    });
  }

  return { profile, project, platform, historicalPosts, mode };
}
```

---

### 2.4 Routes Setup

**Fichier**: `src/routes/ideas.ts`

#### Tâches

- [ ] Créer le fichier de routes
- [ ] Définir toutes les routes RESTful
- [ ] Ajouter les validateurs avec `express-validator`
- [ ] Intégrer `authMiddleware`
- [ ] Monter les routes dans `src/app.ts`

#### Structure des routes

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { ideaValidators } from '../middleware/validators';
import * as IdeaController from '../controllers/IdeaGenerationController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/ideas/generate - Generate new ideas
router.post('/generate', ideaValidators.generate, IdeaController.generateIdeas);

// GET /api/ideas - List ideas with filters
router.get('/', ideaValidators.list, IdeaController.listIdeas);

// GET /api/ideas/:id - Get single idea
router.get('/:id', ideaValidators.getById, IdeaController.getIdeaById);

// POST /api/ideas/:id/use - Mark idea as used
router.post('/:id/use', ideaValidators.use, IdeaController.useIdea);

// DELETE /api/ideas/:id - Delete idea
router.delete('/:id', ideaValidators.delete, IdeaController.deleteIdea);

export default router;
```

**Modification de `src/app.ts`**:

```typescript
import ideaRoutes from './routes/ideas';

// ... existing routes ...
app.use('/api/ideas', ideaRoutes);
```

---

### 2.5 Validators

**Fichier**: `src/middleware/validators/ideaValidators.ts`

```typescript
import { body, query, param } from 'express-validator';
import { handleValidationErrors } from './index';

export const ideaValidators = {
  generate: [
    body('profileId').optional().isUUID().withMessage('profileId must be a valid UUID'),
    body('projectId').optional().isUUID().withMessage('projectId must be a valid UUID'),
    body('platformId').optional().isUUID().withMessage('platformId must be a valid UUID'),
    body('auto').optional().isBoolean().withMessage('auto must be a boolean'),
    body('customContext').optional().isString().isLength({ max: 2000 }),
    body('count').optional().isInt({ min: 1, max: 20 }).withMessage('count must be between 1 and 20'),
    body('excludeRecentTopics').optional().isBoolean(),
    handleValidationErrors,
  ],

  list: [
    query('profileId').optional().isUUID(),
    query('projectId').optional().isUUID(),
    query('platformId').optional().isUUID(),
    query('isUsed').optional().isIn(['true', 'false']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors,
  ],

  getById: [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    handleValidationErrors,
  ],

  use: [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('generatePost').optional().isBoolean(),
    handleValidationErrors,
  ],

  delete: [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    handleValidationErrors,
  ],
};
```

---

### Checklist Phase 2

| Tâche | Fichier | Status |
|-------|---------|--------|
| Créer `buildIdeaGenerationPrompt()` | `src/utils/promptBuilder.ts` | [ ] |
| Créer `extractTopicsFromHistoricalPosts()` | `src/utils/promptBuilder.ts` | [ ] |
| Implémenter `generateIdeas()` controller | `src/controllers/IdeaGenerationController.ts` | [ ] |
| Implémenter `listIdeas()` controller | `src/controllers/IdeaGenerationController.ts` | [ ] |
| Implémenter `getIdeaById()` controller | `src/controllers/IdeaGenerationController.ts` | [ ] |
| Implémenter `useIdea()` controller | `src/controllers/IdeaGenerationController.ts` | [ ] |
| Implémenter `deleteIdea()` controller | `src/controllers/IdeaGenerationController.ts` | [ ] |
| Implémenter `resolveContext()` service | `src/services/IdeaGenerationService.ts` | [ ] |
| Implémenter `generateIdeas()` service | `src/services/IdeaGenerationService.ts` | [ ] |
| Implémenter `parseOpenAIResponse()` | `src/services/IdeaGenerationService.ts` | [ ] |
| Créer routes | `src/routes/ideas.ts` | [ ] |
| Créer validators | `src/middleware/validators/ideaValidators.ts` | [ ] |
| Monter routes dans app | `src/app.ts` | [ ] |
| Test manuel endpoint | Postman/curl | [ ] |

**Test rapide**:
```bash
npm run dev

# Test endpoint
curl -X POST http://localhost:3000/api/ideas/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auto": true}'
```

---

## Phase 3: Enhancement & Polish

> **Durée estimée**: 4-6 heures
> **Objectif**: Features avancées, robustesse, optimisations

### 3.1 Advanced Features

#### Tâches

- [ ] Système de tags automatique (extraction depuis description)
- [ ] Calcul de `relevanceScore` intelligent
- [ ] Système de déduplication d'idées
- [ ] Caching des résultats (optionnel)

#### Calcul du Relevance Score

```typescript
function calculateRelevanceScore(
  idea: GeneratedIdea,
  context: ResolvedContext,
): number {
  let score = 0.5; // Base score

  // Boost if matches profile tone
  if (context.profile?.toneTags?.length) {
    const matchingTags = idea.tags.filter(tag =>
      context.profile!.toneTags!.some(tone =>
        tag.toLowerCase().includes(tone.toLowerCase())
      )
    );
    score += matchingTags.length * 0.1;
  }

  // Boost if aligns with project audience
  if (context.project?.audience) {
    const audienceKeywords = context.project.audience.toLowerCase().split(' ');
    const descLower = idea.description.toLowerCase();
    const matches = audienceKeywords.filter(kw => descLower.includes(kw));
    score += matches.length * 0.05;
  }

  // Boost if matches platform style
  if (context.platform?.name) {
    const platformKeywords: Record<string, string[]> = {
      linkedin: ['professional', 'career', 'business', 'industry'],
      twitter: ['thread', 'hot take', 'trending', 'viral'],
      tiktok: ['trend', 'challenge', 'duet', 'viral'],
    };
    const keywords = platformKeywords[context.platform.name.toLowerCase()] || [];
    const descLower = idea.description.toLowerCase();
    if (keywords.some(kw => descLower.includes(kw))) {
      score += 0.15;
    }
  }

  return Math.min(1, Math.max(0, score));
}
```

---

### 3.2 Error Handling & Validation

#### Tâches

- [ ] Valider qu'au moins un contexte est fourni (sauf auto)
- [ ] Gérer utilisateur sans profil/projet/plateforme
- [ ] Gérer contexte insuffisant pour auto-mode
- [ ] Gérer rate limiting OpenAI
- [ ] Messages d'erreur explicites
- [ ] Fallbacks intelligents

#### Gestion des erreurs

```typescript
// Custom error classes
export class InsufficientContextError extends Error {
  constructor() {
    super('Insufficient context for idea generation. Please provide at least one of: profileId, projectId, platformId, or enable auto mode.');
    this.name = 'InsufficientContextError';
  }
}

export class NoResourcesError extends Error {
  constructor() {
    super('No profiles, projects, or platforms found. Please create at least one before generating ideas.');
    this.name = 'NoResourcesError';
  }
}

// In controller
if (error instanceof InsufficientContextError) {
  res.status(400).json({
    error: 'Validation Error',
    message: error.message,
    suggestion: 'Try adding profileId, projectId, or platformId, or set auto: true',
  });
  return;
}
```

---

### 3.3 Response Optimization

#### Tâches

- [ ] Structurer réponses JSON cohérentes
- [ ] Ajouter métadonnées utiles
- [ ] Optimiser requêtes DB (eager loading)
- [ ] Tracking tokens usage

#### Eager Loading

```typescript
const ideas = await PostIdea.findAll({
  where: { userId },
  include: [
    { model: Profile, as: 'profile', attributes: ['id', 'name'] },
    { model: Project, as: 'project', attributes: ['id', 'name'] },
    { model: Platform, as: 'platform', attributes: ['id', 'name'] },
  ],
  order: [['createdAt', 'DESC']],
  limit: 20,
});
```

---

### Checklist Phase 3

| Tâche | Status |
|-------|--------|
| Implémenter extraction de tags automatique | [ ] |
| Implémenter calcul de relevanceScore | [ ] |
| Implémenter déduplication d'idées | [ ] |
| Valider paramètres de requête | [ ] |
| Gérer cas limites (user sans ressources) | [ ] |
| Gérer rate limiting OpenAI | [ ] |
| Ajouter messages d'erreur explicites | [ ] |
| Implémenter fallbacks intelligents | [ ] |
| Optimiser eager loading | [ ] |
| Ajouter métadonnées dans réponses | [ ] |

---

## Phase 4: Testing

> **Durée estimée**: 6-8 heures
> **Objectif**: Couverture complète des tests

### 4.1 Unit Tests

**Fichier**: `tests/unit/services/IdeaGenerationService.test.ts`

#### Tests à écrire

```typescript
describe('IdeaGenerationService', () => {
  describe('resolveContext', () => {
    it('should fetch profile when profileId is provided', async () => {});
    it('should fetch all recent resources in auto mode', async () => {});
    it('should return empty context when no IDs provided and not auto', async () => {});
    it('should fetch historical posts when profile exists', async () => {});
  });

  describe('extractRecentTopics', () => {
    it('should extract topics from historical posts', async () => {});
    it('should return empty array when no historical posts', async () => {});
    it('should limit to last 10 topics', async () => {});
  });

  describe('parseOpenAIResponse', () => {
    it('should parse valid JSON response', async () => {});
    it('should handle malformed JSON gracefully', async () => {});
    it('should validate required fields in each idea', async () => {});
  });

  describe('calculateRelevanceScore', () => {
    it('should return base score for minimal context', async () => {});
    it('should boost score for matching profile tone', async () => {});
    it('should cap score at 1.0', async () => {});
  });
});
```

---

### 4.2 Integration Tests

**Fichier**: `tests/integration/ideas.test.ts`

#### Tests à écrire

```typescript
describe('POST /api/ideas/generate', () => {
  describe('Success cases', () => {
    it('should generate ideas with profileId only', async () => {});
    it('should generate ideas with projectId only', async () => {});
    it('should generate ideas with platformId only', async () => {});
    it('should generate ideas with multiple IDs', async () => {});
    it('should generate ideas in auto mode', async () => {});
    it('should respect count parameter', async () => {});
    it('should exclude recent topics when enabled', async () => {});
  });

  describe('Error cases', () => {
    it('should return 401 without authentication', async () => {});
    it('should return 400 with no context and auto=false', async () => {});
    it('should return 404 for non-existent profileId', async () => {});
    it('should return 404 for non-existent projectId', async () => {});
    it('should return 404 for non-existent platformId', async () => {});
    it('should return 400 for invalid count', async () => {});
    it('should return 429 on rate limit', async () => {});
  });
});

describe('GET /api/ideas', () => {
  it('should list user ideas with pagination', async () => {});
  it('should filter by profileId', async () => {});
  it('should filter by isUsed', async () => {});
  it('should return 401 without auth', async () => {});
});

describe('POST /api/ideas/:id/use', () => {
  it('should mark idea as used', async () => {});
  it('should set usedAt timestamp', async () => {});
  it('should return 404 for non-existent idea', async () => {});
  it('should return 403 for other user idea', async () => {});
});

describe('DELETE /api/ideas/:id', () => {
  it('should delete idea', async () => {});
  it('should return 404 for non-existent idea', async () => {});
  it('should return 403 for other user idea', async () => {});
});
```

---

### 4.3 Manual Testing Checklist

| Scénario | Status |
|----------|--------|
| Générer idées avec un profil tech | [ ] |
| Générer idées avec un profil marketing | [ ] |
| Vérifier diversité des 10 idées | [ ] |
| Vérifier respect du ton du profil | [ ] |
| Tester auto-mode avec plusieurs profils | [ ] |
| Vérifier évitement des topics récents | [ ] |
| Tester avec historical posts vides | [ ] |
| Valider format JSON des réponses | [ ] |
| Tester pagination sur liste d'idées | [ ] |
| Tester marquage "used" | [ ] |
| Tester suppression | [ ] |

---

### Checklist Phase 4

| Tâche | Status |
|-------|--------|
| Tests unitaires IdeaGenerationService | [ ] |
| Tests unitaires promptBuilder (nouvelles fonctions) | [ ] |
| Tests unitaires modèle PostIdea | [ ] |
| Mock des appels OpenAI | [ ] |
| Tests intégration POST /api/ideas/generate | [ ] |
| Tests intégration GET /api/ideas | [ ] |
| Tests intégration POST /api/ideas/:id/use | [ ] |
| Tests intégration DELETE /api/ideas/:id | [ ] |
| Tests de validation et erreurs | [ ] |
| Tests d'authentification | [ ] |
| Coverage > 80% sur nouveaux fichiers | [ ] |
| Tests manuels complets | [ ] |

**Commandes de test**:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/integration/ideas.test.ts
```

---

## Fichiers à créer/modifier

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `migrations/YYYYMMDDHHMMSS-create-post-ideas.js` | Migration DB |
| `src/models/PostIdea.ts` | Modèle Sequelize |
| `src/controllers/IdeaGenerationController.ts` | Controller REST |
| `src/services/IdeaGenerationService.ts` | Service métier |
| `src/routes/ideas.ts` | Routes Express |
| `src/middleware/validators/ideaValidators.ts` | Validateurs |
| `tests/unit/services/IdeaGenerationService.test.ts` | Tests unitaires |
| `tests/integration/ideas.test.ts` | Tests intégration |

### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `src/app.ts` | Ajouter import et montage des routes ideas |
| `src/models/index.ts` | Exporter PostIdea, configurer associations |
| `src/utils/promptBuilder.ts` | Ajouter `buildIdeaGenerationPrompt()` et helpers |
| `src/middleware/validators/index.ts` | Exporter ideaValidators |

---

## Risques et mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Parsing JSON OpenAI échoue | Élevé | Moyenne | Parsing robuste, retry, logs |
| Coût OpenAI élevé | Élevé | Élevée | Rate limiting, caching, count configurable |
| Qualité variable des idées | Moyen | Moyenne | Itérer sur prompts, feedback utilisateur |
| Auto-mode choisit mal | Moyen | Faible | Documenter, retourner contexte utilisé |
| Table grossit rapidement | Moyen | Élevée | TTL, job de nettoyage, indexes |
| Historical posts insuffisants | Faible | Élevée | Fonctionner avec 0, fallback générique |

---

## Critères de succès

### Fonctionnel
- [ ] `/api/ideas/generate` génère 10 idées uniques
- [ ] Les idées respectent le contexte fourni
- [ ] Le mode auto sélectionne intelligemment
- [ ] Les topics récents sont évités
- [ ] Tous les endpoints CRUD fonctionnent
- [ ] L'authentification JWT est respectée

### Technique
- [ ] Tests unitaires: >80% coverage
- [ ] Aucune erreur TypeScript
- [ ] Aucune erreur ESLint
- [ ] Rate limiting respecté

### Qualité
- [ ] Code suit les principes DRY, SRP
- [ ] Messages d'erreur clairs
- [ ] Réponses JSON cohérentes
- [ ] Performance <3s pour 10 idées

---

## Getting Started

```bash
# 1. Créer la branche
git checkout -b feat/post-idea-generation

# 2. Créer la migration
npx sequelize-cli migration:generate --name create-post-ideas

# 3. Développer Phase 1...

# 4. Valider régulièrement
npm run typecheck
npm run lint
npm test

# 5. Commit régulier
git add .
git commit -m "feat(ideas): add PostIdea model and migration"
```

---

*Document créé le: $(date)*
*Dernière mise à jour: À mettre à jour après chaque phase*
