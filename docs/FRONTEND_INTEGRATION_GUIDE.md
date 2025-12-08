# Guide d'Intégration API Frontend - Brandium v2.0

**Version:** 2.0.0
**Date:** Décembre 2024
**Branch:** `feat/improve-linkedin-generation`

---

## 📋 Table des Matières

1. [Vue d'ensemble des changements](#vue-densemble-des-changements)
2. [Breaking Changes & Migration](#breaking-changes--migration)
3. [Nouvelles Routes](#nouvelles-routes)
   - [Hook Generation](#1-hook-generation)
   - [Template Management](#2-template-management)
   - [Post Iterations](#3-post-iterations)
   - [Variant Generation](#4-variant-generation)
   - [Post Ideas](#5-post-ideas)
4. [Routes Modifiées](#routes-modifiées)
5. [Nouveaux Modèles de Données](#nouveaux-modèles-de-données)
6. [Codes d'Erreur](#codes-derreur)
7. [Exemples de Flux Complets](#exemples-de-flux-complets)

---

## 🎯 Vue d'ensemble des changements

### Nouvelles Fonctionnalités Majeures

Cette version apporte **5 nouvelles fonctionnalités majeures** pour améliorer la génération de contenu LinkedIn :

| Fonctionnalité | Endpoints | Description |
|----------------|-----------|-------------|
| **🎣 Hook Generation** | `POST /api/generate/hooks` | Génération de 4 types d'accroches (question, stat, story, bold_opinion) |
| **📝 Templates** | `GET/POST/PUT/DELETE /api/templates/*` | Système de templates réutilisables avec variables dynamiques |
| **🔄 Iterations Spécialisées** | `POST /api/posts/:id/iterate` | 6 types d'itérations one-click (shorter, stronger_hook, etc.) |
| **🎨 Variant Generation** | `POST /api/generate` (nouveau param) | Génération de 2-4 variantes A/B (direct, storytelling, etc.) |
| **💡 Post Ideas** | `POST/GET /api/ideas/*` | Génération et stockage d'idées de posts |

### Statistiques

- **17 nouveaux endpoints**
- **4 nouveaux modèles** (Template, PostVersion, PostIdea, HistoricalPost)
- **2 routes modifiées** (POST /api/generate, GET /api/posts)
- **Backward compatible** (sauf indication contraire)

---

## ⚠️ Breaking Changes & Migration

### Breaking Changes

#### 1. Structure de réponse modifiée pour `POST /api/generate`

**Avant :**
```json
{
  "message": "Post generated successfully",
  "data": {
    "post": { "id": "...", "generatedText": "..." },
    "usage": { "totalTokens": 350 }
  }
}
```

**Après (avec variants=1, comportement par défaut) :**
```json
{
  "message": "Post generated successfully",
  "data": {
    "post": {
      "id": "...",
      "totalVersions": 1
    },
    "version": {
      "id": "...",
      "versionNumber": 1,
      "generatedText": "...",
      "isSelected": true,
      "approach": null,
      "format": "opinion",
      "usage": { "totalTokens": 350 }
    }
  }
}
```

**Après (avec variants >= 2) :**
```json
{
  "message": "3 post variants generated successfully",
  "data": {
    "variants": [
      {
        "postId": "uuid-1",
        "versionId": "uuid-v1",
        "versionNumber": 1,
        "generatedText": "Direct approach post...",
        "approach": "direct",
        "format": "opinion",
        "usage": { "totalTokens": 320 }
      },
      // ... 2 more variants
    ],
    "totalVariants": 3,
    "context": { "profile": {...}, "platform": {...} }
  }
}
```

**Migration requise :**
```typescript
// AVANT
const { post, usage } = response.data;
const text = post.generatedText;

// APRÈS (pour variants=1 ou non spécifié)
const { post, version } = response.data;
const text = version.generatedText;

// APRÈS (pour variants >= 2)
const { variants } = response.data;
const texts = variants.map(v => v.generatedText);
```

#### 2. Nouveau champ `totalVersions` dans le modèle Post

Le champ `generatedText` a été supprimé du modèle `Post`. Utilisez `PostVersion` à la place.

**Migration :**
```typescript
// AVANT
const post = await fetch(`/api/posts/${postId}`);
const text = post.generatedText;

// APRÈS
const post = await fetch(`/api/posts/${postId}`);
const selectedVersion = post.versions.find(v => v.isSelected);
const text = selectedVersion.generatedText;
```

### Backward Compatibility

✅ **Les endpoints suivants restent 100% compatibles :**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/profiles/*`
- `GET/POST/PUT/DELETE /api/projects/*`
- `GET/POST/PUT/DELETE /api/platforms/*`
- `DELETE /api/posts/:id`

---

## 📡 Nouvelles Routes

### 1. Hook Generation

Génère 4 suggestions d'accroches optimisées pour différents déclencheurs psychologiques.

#### `POST /api/generate/hooks`

**Description :** Génère 4 hooks (question, stat, story, bold_opinion) pour un post LinkedIn.

**Authentication :** Requise (Bearer token)

**Request Body :**

```typescript
{
  rawIdea: string;          // REQUIRED - L'idée du post (5-500 caractères)
  goal?: string;            // OPTIONAL - Objectif du post
  profileId?: string;       // OPTIONAL - UUID du profil pour personnalisation
  count?: number;           // OPTIONAL - Nombre de hooks (1-10, default: 4)
}
```

**Response 200 - Success :**

```json
{
  "message": "Hooks generated successfully",
  "data": {
    "hooks": [
      {
        "type": "question",
        "text": "Ever wonder why 90% of LinkedIn posts get ignored?",
        "estimatedEngagement": 9
      },
      {
        "type": "stat",
        "text": "83% of content creators say their biggest mistake was not testing hooks.",
        "estimatedEngagement": 8
      },
      {
        "type": "story",
        "text": "Three months ago, I made a post that got 2 likes. Last week? 10,000 views.",
        "estimatedEngagement": 9
      },
      {
        "type": "bold_opinion",
        "text": "Stop optimizing for the algorithm. Start optimizing for humans.",
        "estimatedEngagement": 8
      }
    ],
    "totalHooks": 4
  }
}
```

**Hook Types :**

| Type | Description | Engagement Potentiel | Use Case |
|------|-------------|---------------------|----------|
| `question` | Question provocante/relatable | 8-10 | Curiosité, engagement |
| `stat` | Statistique surprenante | 7-9 | Crédibilité, autorité |
| `story` | Moment personnel | 8-10 | Connexion émotionnelle |
| `bold_opinion` | Opinion controversée | 7-10 | Polarisation, débat |

**Response Codes :**

| Code | Message | Description |
|------|---------|-------------|
| `200` | Success | Hooks générés avec succès |
| `400` | Validation Error | `rawIdea` manquant ou invalide |
| `401` | Unauthorized | Token manquant ou invalide |
| `404` | Not Found | `profileId` n'existe pas |
| `500` | Server Error | Erreur LLM ou serveur |

**Exemples d'Erreurs :**

```json
// 400 - rawIdea manquant
{
  "error": "Validation Error",
  "details": [
    {
      "field": "rawIdea",
      "message": "rawIdea is required and must be a non-empty string"
    }
  ]
}

// 400 - count invalide
{
  "error": "Validation Error",
  "details": [
    {
      "field": "count",
      "message": "count must be between 1 and 10"
    }
  ]
}

// 404 - profileId invalide
{
  "error": "Not Found",
  "message": "Profile not found"
}
```

**Exemples de Code Frontend :**

```typescript
// Exemple 1 : Génération basique sans profil
const generateHooks = async (rawIdea: string) => {
  const response = await fetch('/api/generate/hooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ rawIdea })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate hooks');
  }

  const { data } = await response.json();
  return data.hooks;
};

// Utilisation
const hooks = await generateHooks('Share tips about productivity');
// hooks = [{ type: 'question', text: '...', estimatedEngagement: 9 }, ...]
```

```typescript
// Exemple 2 : Avec profil et goal
const generatePersonalizedHooks = async (params: {
  rawIdea: string;
  goal?: string;
  profileId?: string;
}) => {
  const response = await fetch('/api/generate/hooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });

  const { data } = await response.json();
  return data.hooks;
};

// Utilisation
const hooks = await generatePersonalizedHooks({
  rawIdea: 'Talk about remote work productivity',
  goal: 'Educate professionals',
  profileId: 'user-profile-uuid'
});
```

**Use Cases :**

1. **Use Case 1 : Améliorer un post existant**
   - User écrit un brouillon de post
   - Frontend appelle `/api/generate/hooks` avec le rawIdea
   - User sélectionne un hook pour remplacer son ouverture

2. **Use Case 2 : A/B testing de hooks**
   - User génère 4 hooks
   - User teste 2 hooks différents sur LinkedIn
   - User track les performances pour optimiser

3. **Use Case 3 : Inspiration pour débuter**
   - User n'a qu'une vague idée
   - Frontend génère des hooks pour différents angles
   - User choisit l'angle le plus prometteur

**Notes Importantes :**

- ⚡ Temps de génération : ~2-3 secondes
- 💰 Coût moyen : ~350 tokens par requête
- 🔄 Les hooks sont générés dynamiquement (pas de cache)
- 📊 `estimatedEngagement` est une estimation heuristique (1-10)
- 🎯 Temperature LLM : 0.8 (créativité élevée)

---

### 2. Template Management

Système de templates réutilisables avec variables dynamiques (`{{variable_name}}`).

#### `GET /api/templates`

**Description :** Liste tous les templates accessibles à l'utilisateur (ses templates + templates système + templates publics).

**Authentication :** Requise

**Query Parameters :**

```typescript
{
  category?: 'announcement' | 'tutorial' | 'experience' | 'question' | 'tip' | 'milestone' | 'behind-the-scenes' | 'testimonial' | 'poll' | 'event';
  isSystem?: boolean;       // Filter system templates
  isPublic?: boolean;       // Filter public templates
  profileId?: string;       // Filter by profile
  platformId?: string;      // Filter by platform
  search?: string;          // Search in name/description
  limit?: number;           // Default: 20
  offset?: number;          // Default: 0
}
```

**Response 200:**

```json
{
  "data": [
    {
      "id": "template-uuid",
      "userId": "user-uuid",
      "profileId": null,
      "name": "Product Launch - Standard",
      "description": "Template pour annoncer un nouveau produit",
      "category": "announcement",
      "content": "🚀 Excited to announce {{product_name}}!\n\n{{product_description}}\n\n✨ Key features:\n• {{feature_1}}\n• {{feature_2}}\n• {{feature_3}}\n\n{{cta}}",
      "variables": [
        {
          "name": "product_name",
          "description": "Product name",
          "required": true
        },
        {
          "name": "cta",
          "description": "Call to action",
          "required": false,
          "defaultValue": "Try it now →"
        }
      ],
      "exampleVariables": {
        "product_name": "QuickTask Pro",
        "product_description": "A productivity tool...",
        "feature_1": "AI-powered task prioritization",
        "feature_2": "Real-time collaboration",
        "feature_3": "Seamless integrations",
        "cta": "Start your free trial →"
      },
      "platformId": null,
      "isSystem": false,
      "isPublic": false,
      "usageCount": 5,
      "tags": ["product", "launch", "saas"],
      "createdAt": "2024-12-07T10:00:00Z",
      "updatedAt": "2024-12-07T10:00:00Z"
    }
  ],
  "count": 1,
  "total": 1
}
```

---

#### `POST /api/templates`

**Description :** Crée un nouveau template.

**Authentication :** Requise

**Request Body :**

```typescript
{
  name: string;                     // REQUIRED (max 255 chars)
  description?: string;             // OPTIONAL
  category: TemplateCategory;       // REQUIRED
  content: string;                  // REQUIRED - Template with {{variables}}
  variables: Array<{                // REQUIRED - Array of variable definitions
    name: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }>;
  exampleVariables?: Record<string, string>;  // OPTIONAL
  profileId?: string;               // OPTIONAL
  platformId?: string;              // OPTIONAL
  isPublic?: boolean;               // OPTIONAL (default: false)
  tags?: string[];                  // OPTIONAL
}
```

**Response 201:**

```json
{
  "message": "Template created successfully",
  "data": { /* template object */ }
}
```

**Errors :**
- `400` - Validation error (variables mismatch, missing required fields)
- `404` - Profile or platform not found

---

#### `POST /api/generate/from-template`

**Description :** Génère un post à partir d'un template en remplaçant les variables.

**Authentication :** Requise

**Request Body :**

```typescript
{
  templateId: string;                   // REQUIRED
  variables: Record<string, string>;    // REQUIRED - Variable values
  profileId?: string;                   // OPTIONAL - For tone/style
  platformId?: string;                  // OPTIONAL - For guidelines
}
```

**Response 200:**

```json
{
  "message": "Post generated from template successfully",
  "data": {
    "post": {
      "id": "post-uuid",
      "totalVersions": 1
    },
    "version": {
      "id": "version-uuid",
      "versionNumber": 1,
      "generatedText": "🚀 Excited to announce QuickTask Pro!\n\nA productivity tool...",
      "isSelected": true,
      "usage": {
        "promptTokens": 150,
        "completionTokens": 200,
        "totalTokens": 350
      }
    },
    "template": {
      "id": "template-uuid",
      "name": "Product Launch - Standard",
      "usageCount": 6
    }
  }
}
```

**Use Case Example:**

```typescript
// 1. Fetch available templates
const templates = await fetch('/api/templates?category=announcement');

// 2. User selects template and fills variables
const selectedTemplate = templates.data[0];
const variables = {
  product_name: "My App",
  product_description: "Revolutionary task manager",
  feature_1: "Smart scheduling",
  feature_2: "Team collaboration",
  feature_3: "Mobile app"
};

// 3. Generate post from template
const post = await fetch('/api/generate/from-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    templateId: selectedTemplate.id,
    variables
  })
});
```

---

### 3. Post Iterations

Système d'itérations one-click pour affiner un post existant.

#### `POST /api/posts/:postId/iterate`

**Description :** Crée une nouvelle version d'un post en appliquant une transformation spécialisée.

**Authentication :** Requise

**URL Parameters :**
- `postId` : UUID du post à itérer

**Request Body :**

```typescript
{
  type: 'shorter' | 'stronger_hook' | 'more_personal' | 'add_data' | 'simplify' | 'custom';
  feedback?: string;        // REQUIRED si type='custom', IGNORED sinon
  maxTokens?: number;       // OPTIONAL (default: 2000)
}
```

**Types d'Itérations :**

| Type | Description | Effet | Temps |
|------|-------------|-------|-------|
| `shorter` | Réduit de ~30% | Supprime redondances, garde l'essentiel | ~5-10s |
| `stronger_hook` | Améliore les 2-3 premières lignes | Hook plus percutant | ~5-10s |
| `more_personal` | Ajoute anecdote personnelle | +2-4 lignes authentiques | ~10-15s |
| `add_data` | Ajoute stats/métriques | 1-2 data points | ~10-15s |
| `simplify` | Élimine jargon | Langage accessible | ~5-10s |
| `custom` | Applique feedback utilisateur | Variable | ~10-20s |

**Response 200:**

```json
{
  "message": "Post iteration created successfully",
  "data": {
    "version": {
      "id": "new-version-uuid",
      "postId": "post-uuid",
      "versionNumber": 2,
      "generatedText": "Shortened version of the post...",
      "iterationType": "shorter",
      "iterationPrompt": "Make this post more concise. Target: ~350 characters...",
      "isSelected": false,
      "usage": {
        "promptTokens": 450,
        "completionTokens": 280,
        "totalTokens": 730
      }
    },
    "post": {
      "id": "post-uuid",
      "totalVersions": 2
    }
  }
}
```

**Errors :**
- `400` - Type invalide ou feedback manquant pour custom
- `404` - Post not found
- `500` - LLM error

**Frontend Example:**

```typescript
// Iteration workflow
const iteratePost = async (postId: string, type: IterationType) => {
  const response = await fetch(`/api/posts/${postId}/iterate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type })
  });

  const { data } = await response.json();
  return data.version;
};

// Use Case: User clicks "Make it shorter"
const shorterVersion = await iteratePost(postId, 'shorter');

// Use Case: User provides custom feedback
const customVersion = await fetch(`/api/posts/${postId}/iterate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'custom',
    feedback: 'Add a specific example from the tech industry'
  })
});
```

---

#### `PUT /api/posts/:postId/versions/:versionId/select`

**Description :** Marque une version comme sélectionnée (isSelected=true). Toutes les autres versions du même post sont automatiquement désélectionnées.

**Authentication :** Requise

**Response 200:**

```json
{
  "message": "Version selected successfully",
  "data": {
    "version": {
      "id": "version-uuid",
      "versionNumber": 2,
      "isSelected": true
    }
  }
}
```

---

### 4. Variant Generation

Génère 2-4 variantes d'un post avec différentes approches (direct, storytelling, data-driven, emotional).

#### `POST /api/generate` (MODIFIÉ)

**Nouveau paramètre :** `variants`

**Request Body :**

```typescript
{
  // Params existants
  rawIdea: string;
  goal?: string;
  profileId?: string;
  projectId?: string;
  platformId?: string;

  // NOUVEAU
  variants?: number;        // 1-4, default: 1
}
```

**Behavior :**

- `variants=1` (default) : Comportement classique (1 post, 1 version)
- `variants=2-4` : Génère plusieurs variantes avec différentes approches

**Response si variants=1 :**

```json
{
  "message": "Post generated successfully",
  "data": {
    "post": { "id": "...", "totalVersions": 1 },
    "version": {
      "id": "...",
      "versionNumber": 1,
      "generatedText": "...",
      "approach": null,
      "format": "opinion",
      "usage": { "totalTokens": 350 }
    }
  }
}
```

**Response si variants >= 2 :**

```json
{
  "message": "3 post variants generated successfully",
  "data": {
    "variants": [
      {
        "postId": "uuid-1",
        "versionId": "uuid-v1",
        "versionNumber": 1,
        "generatedText": "Clear, concise post...",
        "approach": "direct",
        "format": "opinion",
        "usage": { "promptTokens": 200, "completionTokens": 150, "totalTokens": 350 }
      },
      {
        "postId": "uuid-2",
        "versionId": "uuid-v2",
        "versionNumber": 1,
        "generatedText": "Last year, I learned...",
        "approach": "storytelling",
        "format": "story",
        "usage": { "promptTokens": 210, "completionTokens": 280, "totalTokens": 490 }
      },
      {
        "postId": "uuid-3",
        "versionId": "uuid-v3",
        "versionNumber": 1,
        "generatedText": "According to research...",
        "approach": "data-driven",
        "format": "opinion",
        "usage": { "promptTokens": 220, "completionTokens": 200, "totalTokens": 420 }
      }
    ],
    "totalVariants": 3,
    "context": {
      "profile": { "id": "...", "name": "..." },
      "project": null,
      "platform": { "id": "...", "name": "LinkedIn" },
      "historicalPostsUsed": 5
    }
  }
}
```

**Approaches :**

| Approach | Temperature | Style | Best For |
|----------|-------------|-------|----------|
| `direct` | 0.5 | Concis, factuel | Annonces, conversions |
| `storytelling` | 0.7 | Narratif, personnel | Engagement, authenticité |
| `data-driven` | 0.6 | Stats, research | Crédibilité, B2B |
| `emotional` | 0.8 | Empathique, inspirant | Community, inspiration |

**Frontend Example:**

```typescript
// A/B Testing workflow
const generateVariants = async (rawIdea: string, count: number = 3) => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rawIdea,
      goal: 'Educate and engage',
      variants: count
    })
  });

  const { data } = await response.json();
  
  if (count === 1) {
    return [data.version];
  } else {
    return data.variants;
  }
};

// Use Case: User wants to test different approaches
const variants = await generateVariants('Share insights about remote work', 3);
// Returns 3 posts: direct, storytelling, data-driven

// Display variants for selection
variants.forEach(variant => {
  console.log(`${variant.approach}: ${variant.generatedText}`);
});
```

---

### 5. Post Ideas Generation

Système de génération et stockage d'idées de posts pour inspiration.

#### `POST /api/ideas/generate`

**Description :** Génère 5-10 idées de posts basées sur un thème ou contexte.

**Authentication :** Requise

**Request Body :**

```typescript
{
  theme: string;            // REQUIRED - Thème général (ex: "productivity tips")
  goal?: string;            // OPTIONAL - Objectif des posts
  profileId?: string;       // OPTIONAL - Pour personnalisation
  count?: number;           // OPTIONAL - Nombre d'idées (3-20, default: 10)
}
```

**Response 200:**

```json
{
  "message": "10 post ideas generated successfully",
  "data": {
    "ideas": [
      {
        "id": "idea-uuid-1",
        "title": "The 2-Minute Rule for Beating Procrastination",
        "description": "Share how starting with just 2 minutes can overcome the resistance to begin difficult tasks",
        "suggestedGoal": "Educate and inspire",
        "relevanceScore": 9,
        "tags": ["productivity", "procrastination", "tips"],
        "generationContext": {
          "theme": "productivity tips",
          "profileId": "user-profile-uuid"
        },
        "isUsed": false,
        "usedAt": null,
        "createdAt": "2024-12-07T10:00:00Z"
      },
      {
        "id": "idea-uuid-2",
        "title": "Why Your To-Do List Is Sabotaging You",
        "description": "Explain the psychology behind endless to-do lists and introduce the concept of a 'focus list' with 3 priorities max",
        "suggestedGoal": "Challenge common beliefs",
        "relevanceScore": 8,
        "tags": ["productivity", "time-management", "psychology"],
        "generationContext": {
          "theme": "productivity tips",
          "profileId": "user-profile-uuid"
        },
        "isUsed": false,
        "usedAt": null,
        "createdAt": "2024-12-07T10:00:00Z"
      }
      // ... 8 more ideas
    ],
    "totalIdeas": 10,
    "usage": {
      "promptTokens": 250,
      "completionTokens": 400,
      "totalTokens": 650
    }
  }
}
```

**Errors :**
- `400` - Theme manquant ou count invalide
- `401` - Unauthorized
- `404` - Profile not found
- `500` - LLM error

---

#### `GET /api/ideas`

**Description :** Liste toutes les idées générées par l'utilisateur.

**Authentication :** Requise

**Query Parameters :**

```typescript
{
  isUsed?: boolean;         // Filter used/unused ideas
  search?: string;          // Search in title/description
  tags?: string[];          // Filter by tags
  sortBy?: 'createdAt' | 'relevanceScore';
  order?: 'ASC' | 'DESC';
  limit?: number;           // Default: 20
  offset?: number;          // Default: 0
}
```

**Response 200:**

```json
{
  "data": [
    {
      "id": "idea-uuid",
      "title": "The 2-Minute Rule for Beating Procrastination",
      "description": "Share how starting with just 2 minutes...",
      "suggestedGoal": "Educate and inspire",
      "relevanceScore": 9,
      "tags": ["productivity", "procrastination", "tips"],
      "isUsed": false,
      "usedAt": null,
      "createdAt": "2024-12-07T10:00:00Z"
    }
  ],
  "count": 1,
  "total": 1
}
```

---

#### `POST /api/ideas/:ideaId/use`

**Description :** Marque une idée comme utilisée et génère un post à partir de celle-ci.

**Authentication :** Requise

**Request Body :**

```typescript
{
  profileId?: string;       // OPTIONAL
  platformId?: string;      // OPTIONAL
  variants?: number;        // OPTIONAL (1-4, default: 1)
}
```

**Response 200:**

```json
{
  "message": "Post generated from idea successfully",
  "data": {
    "idea": {
      "id": "idea-uuid",
      "isUsed": true,
      "usedAt": "2024-12-07T10:30:00Z"
    },
    "post": {
      "id": "post-uuid",
      "totalVersions": 1
    },
    "version": {
      "id": "version-uuid",
      "versionNumber": 1,
      "generatedText": "Full post content based on the idea...",
      "usage": { "totalTokens": 450 }
    }
  }
}
```

---

#### `DELETE /api/ideas/:ideaId`

**Description :** Supprime une idée.

**Authentication :** Requise

**Response 200:**

```json
{
  "message": "Idea deleted successfully"
}
```

---

**Frontend Example - Complete Ideas Workflow:**

```typescript
// Step 1: Generate ideas
const generateIdeas = async (theme: string) => {
  const response = await fetch('/api/ideas/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      theme,
      count: 10
    })
  });

  const { data } = await response.json();
  return data.ideas;
};

// Step 2: List saved ideas
const listIdeas = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/api/ideas?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { data } = await response.json();
  return data;
};

// Step 3: Use an idea to generate a post
const useIdea = async (ideaId: string) => {
  const response = await fetch(`/api/ideas/${ideaId}/use`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      profileId: 'user-profile-uuid',
      variants: 1
    })
  });

  const { data } = await response.json();
  return {
    post: data.post,
    version: data.version
  };
};

// Step 4: Delete unused ideas
const deleteIdea = async (ideaId: string) => {
  await fetch(`/api/ideas/${ideaId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

// Complete Use Case
async function ideaWorkflow() {
  // 1. User enters theme
  const theme = "remote work productivity";
  
  // 2. Generate ideas
  const ideas = await generateIdeas(theme);
  console.log(`Generated ${ideas.length} ideas`);
  
  // 3. User reviews and selects one
  const selectedIdea = ideas[0];
  
  // 4. Generate post from idea
  const { post, version } = await useIdea(selectedIdea.id);
  console.log('Post generated:', version.generatedText);
  
  // 5. (Optional) Delete unused ideas
  const unusedIdeas = ideas.slice(1);
  await Promise.all(unusedIdeas.map(idea => deleteIdea(idea.id)));
}
```

---

## 🔄 Routes Modifiées

### `GET /api/posts/:postId`

**MODIFIÉ :** Retourne maintenant l'historique complet des versions.

**Avant :**

```json
{
  "data": {
    "id": "post-uuid",
    "userId": "user-uuid",
    "profileId": "profile-uuid",
    "projectId": null,
    "platformId": "platform-uuid",
    "goal": "Educate and engage",
    "rawIdea": "Share insights about remote work",
    "generatedText": "Remote work has transformed...",
    "createdAt": "2024-12-01T10:00:00Z",
    "updatedAt": "2024-12-01T10:00:00Z"
  }
}
```

**Après :**

```json
{
  "data": {
    "id": "post-uuid",
    "userId": "user-uuid",
    "profileId": "profile-uuid",
    "projectId": null,
    "platformId": "platform-uuid",
    "goal": "Educate and engage",
    "rawIdea": "Share insights about remote work",
    "totalVersions": 3,
    "createdAt": "2024-12-01T10:00:00Z",
    "updatedAt": "2024-12-07T15:30:00Z",
    "versions": [
      {
        "id": "version-uuid-1",
        "versionNumber": 1,
        "generatedText": "Remote work has transformed...",
        "iterationType": null,
        "iterationPrompt": null,
        "approach": null,
        "format": "opinion",
        "isSelected": false,
        "promptTokens": 200,
        "completionTokens": 150,
        "totalTokens": 350,
        "createdAt": "2024-12-01T10:00:00Z"
      },
      {
        "id": "version-uuid-2",
        "versionNumber": 2,
        "generatedText": "73% of remote workers report...",
        "iterationType": "add_data",
        "iterationPrompt": "Add concrete data, statistics...",
        "approach": null,
        "format": "opinion",
        "isSelected": false,
        "promptTokens": 450,
        "completionTokens": 280,
        "totalTokens": 730,
        "createdAt": "2024-12-05T14:20:00Z"
      },
      {
        "id": "version-uuid-3",
        "versionNumber": 3,
        "generatedText": "Last year, I almost gave up on remote work...",
        "iterationType": "more_personal",
        "iterationPrompt": "Add a personal anecdote...",
        "approach": null,
        "format": "story",
        "isSelected": true,
        "promptTokens": 500,
        "completionTokens": 320,
        "totalTokens": 820,
        "createdAt": "2024-12-07T15:30:00Z"
      }
    ]
  }
}
```

**Changements clés :**
- ❌ `generatedText` supprimé du Post
- ✅ `totalVersions` ajouté
- ✅ `versions` array ajouté (historique complet)
- ✅ Chaque version contient `isSelected`, `iterationType`, `approach`, `format`, token usage

**Migration Frontend :**

```typescript
// AVANT
const post = await fetchPost(postId);
const text = post.generatedText;

// APRÈS
const post = await fetchPost(postId);
const selectedVersion = post.versions.find(v => v.isSelected) || post.versions[post.versions.length - 1];
const text = selectedVersion.generatedText;

// Afficher toutes les versions
post.versions.forEach((version, index) => {
  console.log(`Version ${version.versionNumber}: ${version.generatedText.substring(0, 50)}...`);
  console.log(`Type: ${version.iterationType || 'initial'}`);
  console.log(`Selected: ${version.isSelected}`);
});
```

---

### `POST /api/generate`

**MODIFIÉ :** Nouveau paramètre `variants` pour génération A/B.

**Voir section [4. Variant Generation](#4-variant-generation) pour les détails complets.**

**Résumé des changements :**
- ✅ Nouveau paramètre optionnel : `variants` (1-4, default: 1)
- ✅ Structure de réponse différente selon la valeur de `variants`
- ✅ Backward compatible si `variants` n'est pas fourni (comportement default = 1)

---

## 📦 Autres Endpoints Templates

### `PUT /api/templates/:templateId`

**Description :** Met à jour un template existant.

**Authentication :** Requise (doit être le propriétaire ou admin)

**Request Body :** Mêmes champs que POST (tous optionnels)

**Response 200:**

```json
{
  "message": "Template updated successfully",
  "data": { /* updated template */ }
}
```

**Errors :**
- `403` - Not authorized (not owner)
- `404` - Template not found

---

### `DELETE /api/templates/:templateId`

**Description :** Supprime un template.

**Authentication :** Requise (doit être le propriétaire ou admin)

**Response 200:**

```json
{
  "message": "Template deleted successfully"
}
```

**Errors :**
- `403` - Cannot delete system templates
- `404` - Template not found

---

### `POST /api/templates/:templateId/duplicate`

**Description :** Duplique un template (utile pour personnaliser un template système ou public).

**Authentication :** Requise

**Request Body :**

```typescript
{
  name?: string;            // OPTIONAL - New name (default: "Copy of [original name]")
}
```

**Response 201:**

```json
{
  "message": "Template duplicated successfully",
  "data": {
    "original": { "id": "original-uuid", "name": "Original Template" },
    "duplicate": {
      "id": "new-uuid",
      "userId": "user-uuid",
      "name": "Copy of Original Template",
      "isSystem": false,
      "isPublic": false
      // ... rest of template data (copied from original)
    }
  }
}
```

**Use Case :**

```typescript
// User finds a system template they like but wants to customize
const systemTemplates = await fetch('/api/templates?isSystem=true');
const productLaunchTemplate = systemTemplates.data.find(t => t.category === 'announcement');

// Duplicate it
const duplicated = await fetch(`/api/templates/${productLaunchTemplate.id}/duplicate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My Custom Product Launch'
  })
});

// Now user can edit their copy
await fetch(`/api/templates/${duplicated.data.duplicate.id}`, {
  method: 'PUT',
  body: JSON.stringify({
    content: "🎉 Launching {{product}}! Custom content here..."
  })
});
```

---

### `POST /api/templates/:templateId/render`

**Description :** Prévisualise le rendu d'un template avec des variables sans créer de post.

**Authentication :** Requise

**Request Body :**

```typescript
{
  variables: Record<string, string>;    // Variable values
}
```

**Response 200:**

```json
{
  "message": "Template rendered successfully",
  "data": {
    "rendered": "🚀 Excited to announce QuickTask Pro!\n\nA productivity tool that helps teams prioritize...\n\n✨ Key features:\n• AI-powered task prioritization\n• Real-time collaboration\n• Seamless integrations\n\nStart your free trial →",
    "template": {
      "id": "template-uuid",
      "name": "Product Launch - Standard"
    },
    "missingVariables": [],
    "unusedVariables": []
  }
}
```

**Errors :**
- `400` - Missing required variables

```json
{
  "error": "Validation Error",
  "message": "Missing required variables",
  "details": {
    "missing": ["product_name", "feature_1"]
  }
}
```

**Use Case :**

```typescript
// Preview before generating
const preview = await fetch(`/api/templates/${templateId}/render`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    variables: {
      product_name: "My App",
      product_description: "Amazing tool",
      feature_1: "Feature 1",
      feature_2: "Feature 2",
      feature_3: "Feature 3"
    }
  })
});

// Show preview to user
console.log(preview.data.rendered);

// If user approves, generate actual post
if (userApproves) {
  const post = await fetch('/api/generate/from-template', {
    method: 'POST',
    body: JSON.stringify({
      templateId,
      variables: preview.variables
    })
  });
}
```

---

### `GET /api/templates/suggestions`

**Description :** Suggère des templates basés sur le rawIdea de l'utilisateur.

**Authentication :** Requise

**Query Parameters :**

```typescript
{
  rawIdea: string;          // REQUIRED - The post idea
  limit?: number;           // Default: 5
}
```

**Response 200:**

```json
{
  "message": "Template suggestions found",
  "data": {
    "suggestions": [
      {
        "template": { /* template object */ },
        "matchScore": 0.85,
        "matchReason": "Content matches 'announcement' category and contains product-related keywords"
      },
      {
        "template": { /* template object */ },
        "matchScore": 0.72,
        "matchReason": "Similar structure and tone detected"
      }
    ],
    "totalSuggestions": 2
  }
}
```

---

### `POST /api/templates/find-similar`

**Description :** Trouve des templates similaires à un contenu donné.

**Authentication :** Requise

**Request Body :**

```typescript
{
  content: string;          // REQUIRED - Content to match against
  limit?: number;           // Default: 5
}
```

**Response 200:**

```json
{
  "data": [
    {
      "template": { /* template object */ },
      "similarityScore": 0.78
    }
  ],
  "count": 1
}
```

---

### `GET /api/templates/statistics`

**Description :** Statistiques d'utilisation des templates.

**Authentication :** Requise

**Response 200:**

```json
{
  "data": {
    "totalTemplates": 25,
    "userTemplates": 15,
    "systemTemplates": 10,
    "publicTemplates": 5,
    "mostUsed": [
      {
        "id": "template-uuid",
        "name": "Product Launch - Standard",
        "category": "announcement",
        "usageCount": 142
      }
    ],
    "byCategory": {
      "announcement": 8,
      "tutorial": 5,
      "experience": 4,
      "question": 3,
      "tip": 5
    }
  }
}
```

---

## 📊 Nouveaux Modèles de Données

### Template

```typescript
interface Template {
  id: string;                               // UUID
  userId: string | null;                    // NULL for system templates
  profileId: string | null;                 // Optional profile association
  name: string;                             // Max 255 chars
  description: string | null;
  category: TemplateCategory;
  content: string;                          // Template with {{variables}}
  variables: TemplateVariable[];            // Array of variable definitions
  exampleVariables: Record<string, string> | null;
  platformId: string | null;                // Optional platform association
  isSystem: boolean;                        // System templates (non-modifiable)
  isPublic: boolean;                        // Public templates (discoverable)
  usageCount: number;                       // Incremented on each use
  tags: string[];                           // Array of tags
  createdAt: string;                        // ISO 8601
  updatedAt: string;                        // ISO 8601
}

type TemplateCategory =
  | 'announcement'
  | 'tutorial'
  | 'experience'
  | 'question'
  | 'tip'
  | 'milestone'
  | 'behind-the-scenes'
  | 'testimonial'
  | 'poll'
  | 'event';

interface TemplateVariable {
  name: string;                             // Variable name (used in {{name}})
  description: string;                      // Human-readable description
  required: boolean;                        // Must be provided
  defaultValue?: string;                    // Optional default value
}
```

**Exemple complet :**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "profileId": null,
  "name": "Product Launch - SaaS",
  "description": "Template optimized for announcing new SaaS features",
  "category": "announcement",
  "content": "🚀 Introducing {{product_name}}!\n\n{{description}}\n\n✨ What's new:\n{{#each features}}\n• {{this}}\n{{/each}}\n\n{{cta}}",
  "variables": [
    {
      "name": "product_name",
      "description": "Name of the product or feature",
      "required": true
    },
    {
      "name": "description",
      "description": "Brief description (1-2 sentences, max 280 chars)",
      "required": true
    },
    {
      "name": "features",
      "description": "List of key features (3-5 items)",
      "required": true
    },
    {
      "name": "cta",
      "description": "Call to action",
      "required": false,
      "defaultValue": "Try it now →"
    }
  ],
  "exampleVariables": {
    "product_name": "QuickTask 2.0",
    "description": "A revolutionary task management tool with AI-powered prioritization.",
    "features": "Smart scheduling\nTeam collaboration\nMobile app",
    "cta": "Get early access →"
  },
  "platformId": "linkedin-uuid",
  "isSystem": false,
  "isPublic": true,
  "usageCount": 47,
  "tags": ["product", "launch", "saas", "b2b"],
  "createdAt": "2024-11-15T09:30:00Z",
  "updatedAt": "2024-12-07T14:20:00Z"
}
```

---

### PostVersion

```typescript
interface PostVersion {
  id: string;                               // UUID
  postId: string;                           // Parent post UUID
  versionNumber: number;                    // Sequential: 1, 2, 3...
  generatedText: string;                    // The actual post content
  iterationType: IterationType | null;      // NULL for initial, type for iterations
  iterationPrompt: string | null;           // Instructions used (NULL for initial)
  approach: VariantApproach | null;         // NULL or 'direct'/'storytelling'/etc.
  format: LinkedInFormat;                   // 'story', 'opinion', or 'debate'
  isSelected: boolean;                      // Only ONE per post should be true
  promptTokens: number | null;              // LLM prompt tokens
  completionTokens: number | null;          // LLM completion tokens
  totalTokens: number | null;               // Sum of prompt + completion
  createdAt: string;                        // ISO 8601
  updatedAt: string;                        // ISO 8601
}

type IterationType =
  | 'shorter'
  | 'stronger_hook'
  | 'more_personal'
  | 'add_data'
  | 'simplify'
  | 'custom';

type VariantApproach =
  | 'direct'
  | 'storytelling'
  | 'data-driven'
  | 'emotional';

type LinkedInFormat =
  | 'story'      // Narrative with personal experience
  | 'opinion'    // Viewpoint or advice
  | 'debate';    // Challenging conventional wisdom
```

**Exemple complet :**

```json
{
  "id": "version-uuid",
  "postId": "post-uuid",
  "versionNumber": 3,
  "generatedText": "Last year, I made a mistake that cost me 3 clients.\n\nI was so focused on perfecting my product that I forgot to listen to what my customers actually needed...",
  "iterationType": "more_personal",
  "iterationPrompt": "Add a personal anecdote or concrete example to make this post more relatable...",
  "approach": null,
  "format": "story",
  "isSelected": true,
  "promptTokens": 520,
  "completionTokens": 340,
  "totalTokens": 860,
  "createdAt": "2024-12-07T15:45:00Z",
  "updatedAt": "2024-12-07T15:45:00Z"
}
```

**Relation avec Post :**

```typescript
interface Post {
  id: string;
  userId: string;
  profileId: string | null;
  projectId: string | null;
  platformId: string | null;
  goal: string | null;
  rawIdea: string;
  totalVersions: number;                    // Count of versions
  createdAt: string;
  updatedAt: string;
  
  // Relations (populated in GET requests)
  versions?: PostVersion[];                 // Array of all versions
}
```

---

### PostIdea

```typescript
interface PostIdea {
  id: string;                               // UUID
  userId: string;                           // Owner UUID
  title: string;                            // Short title (max 255 chars)
  description: string;                      // Detailed description
  suggestedGoal: string | null;             // Suggested post goal
  relevanceScore: number;                   // 1-10, how relevant/promising
  tags: string[];                           // Categorization tags
  generationContext: {                      // Context used for generation
    theme: string;
    profileId?: string;
    goal?: string;
  };
  isUsed: boolean;                          // Marked true when used
  usedAt: string | null;                    // Timestamp when used (ISO 8601)
  createdAt: string;                        // ISO 8601
  updatedAt: string;                        // ISO 8601
}
```

**Exemple complet :**

```json
{
  "id": "idea-uuid",
  "userId": "user-uuid",
  "title": "The 10-Minute Rule for Maximum Productivity",
  "description": "Share how dedicating the first 10 minutes of work to planning can increase daily output by 30%. Include personal experience of implementing this with team and seeing immediate results.",
  "suggestedGoal": "Educate and inspire professionals",
  "relevanceScore": 9,
  "tags": ["productivity", "time-management", "leadership", "tips"],
  "generationContext": {
    "theme": "productivity hacks for remote workers",
    "profileId": "profile-uuid",
    "goal": "Help remote workers be more effective"
  },
  "isUsed": false,
  "usedAt": null,
  "createdAt": "2024-12-05T11:20:00Z",
  "updatedAt": "2024-12-05T11:20:00Z"
}
```

---

### HistoricalPost

```typescript
interface HistoricalPost {
  id: string;                               // UUID
  userId: string;                           // Owner UUID
  siteIdentifier: string;                   // External platform identifier
  content: string;                          // Original post content
  publishedAt: string;                      // When published (ISO 8601)
  externalUrl: string | null;               // Link to original post
  engagement: {                             // Engagement metrics
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    engagementRate?: number;
  };
  metadata: {                               // Additional data
    platform?: string;                      // 'linkedin', 'twitter', etc.
    format?: string;                        // Detected format
    topics?: string[];                      // Detected topics
    performance?: 'low' | 'medium' | 'high';
  };
  createdAt: string;                        // ISO 8601
  updatedAt: string;                        // ISO 8601
}
```

**Exemple complet :**

```json
{
  "id": "historical-uuid",
  "userId": "user-uuid",
  "siteIdentifier": "linkedin-post-12345",
  "content": "Excited to share that our team just crossed 10,000 users!\n\nHere's what we learned along the way:\n• Listen more than you talk\n• Ship fast, iterate faster\n• Your customers are your best teachers\n\nGrateful for this journey. 🚀",
  "publishedAt": "2024-11-20T09:15:00Z",
  "externalUrl": "https://linkedin.com/posts/username_12345",
  "engagement": {
    "likes": 342,
    "comments": 28,
    "shares": 15,
    "views": 8540,
    "engagementRate": 4.5
  },
  "metadata": {
    "platform": "linkedin",
    "format": "milestone",
    "topics": ["startup", "growth", "lessons"],
    "performance": "high"
  },
  "createdAt": "2024-11-20T09:30:00Z",
  "updatedAt": "2024-11-21T14:20:00Z"
}
```

**Usage :** Les `HistoricalPost` sont utilisés pour :
1. Analyser le style d'écriture de l'utilisateur
2. Identifier les posts performants
3. Entraîner le LLM à reproduire le ton/style qui fonctionne
4. Suggérer des sujets similaires qui ont bien performé

---

### Hook

```typescript
interface Hook {
  type: HookType;                           // Hook category
  text: string;                             // The actual hook (1-3 lines)
  estimatedEngagement: number;              // Predicted engagement (1-10)
}

type HookType =
  | 'question'                              // Curiosity-driven question
  | 'stat'                                  // Data-backed statistic
  | 'story'                                 // Personal moment/anecdote
  | 'bold_opinion';                         // Provocative statement
```

**Exemple complet :**

```json
[
  {
    "type": "question",
    "text": "Ever wonder why most LinkedIn posts get ignored?",
    "estimatedEngagement": 9
  },
  {
    "type": "stat",
    "text": "73% of content creators say they waste 2+ hours per week staring at a blank screen.",
    "estimatedEngagement": 8
  },
  {
    "type": "story",
    "text": "Three months ago, I posted something that got 2 likes. Yesterday? 10,000 views. Here's what changed.",
    "estimatedEngagement": 10
  },
  {
    "type": "bold_opinion",
    "text": "Stop optimizing for the algorithm. Start optimizing for humans.",
    "estimatedEngagement": 8
  }
}
```

---

## ⚠️ Codes d'Erreur

### Structure Standard des Erreurs

Toutes les erreurs suivent ce format :

```json
{
  "error": "Error Type",              // Type d'erreur
  "message": "Human-readable message", // Message descriptif
  "details"?: any                      // Détails supplémentaires (optionnel)
}
```

### Codes HTTP et Types d'Erreurs

| Code HTTP | Error Type | Description | Exemples |
|-----------|------------|-------------|----------|
| `400` | `Validation Error` | Données invalides ou manquantes | rawIdea manquant, count invalide, variables manquantes |
| `401` | `Unauthorized` | Token manquant ou invalide | JWT expiré, token non fourni |
| `403` | `Forbidden` | Action non autorisée | Modification template system, accès ressource autre user |
| `404` | `Not Found` | Ressource inexistante | Post/Profile/Template non trouvé |
| `409` | `Conflict` | Conflit de données | Duplication email, contrainte unique |
| `429` | `Rate Limit Exceeded` | Trop de requêtes | LLM rate limit, API rate limit |
| `500` | `Server Error` | Erreur serveur interne | LLM error, database error |
| `503` | `Service Unavailable` | Service temporairement indisponible | LLM API down |

---

### Exemples Détaillés par Code

#### 400 - Validation Error

**Cas 1 : Champ requis manquant**

```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "rawIdea",
      "message": "rawIdea is required and must be a non-empty string",
      "type": "required"
    }
  ]
}
```

**Cas 2 : Valeur invalide**

```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "count",
      "message": "count must be between 1 and 10",
      "type": "range",
      "value": 15,
      "min": 1,
      "max": 10
    }
  ]
}
```

**Cas 3 : Variables manquantes dans template**

```json
{
  "error": "Validation Error",
  "message": "Missing required variables",
  "details": {
    "missing": ["product_name", "feature_1", "feature_2"],
    "provided": ["description", "cta"]
  }
}
```

**Cas 4 : Variables ne correspondent pas au contenu**

```json
{
  "error": "Validation Error",
  "message": "Template validation failed: variables do not match content placeholders",
  "details": {
    "inContent": ["product_name", "description", "feature_1"],
    "inVariables": ["product_name", "wrong_variable"],
    "missing": ["description", "feature_1"],
    "extra": ["wrong_variable"]
  }
}
```

---

#### 401 - Unauthorized

**Cas 1 : Token manquant**

```json
{
  "error": "Unauthorized",
  "message": "No authorization token provided"
}
```

**Cas 2 : Token invalide**

```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

**Cas 3 : Token expiré**

```json
{
  "error": "Unauthorized",
  "message": "Token expired",
  "details": {
    "expiredAt": "2024-12-06T10:00:00Z"
  }
}
```

---

#### 403 - Forbidden

**Cas 1 : Modification template système**

```json
{
  "error": "Forbidden",
  "message": "Cannot modify or delete system templates"
}
```

**Cas 2 : Accès ressource autre utilisateur**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

---

#### 404 - Not Found

**Cas 1 : Ressource non trouvée**

```json
{
  "error": "Not Found",
  "message": "Post not found",
  "details": {
    "resourceType": "Post",
    "resourceId": "00000000-0000-0000-0000-000000000000"
  }
}
```

**Cas 2 : Profile non trouvé**

```json
{
  "error": "Not Found",
  "message": "Profile not found"
}
```

---

#### 429 - Rate Limit Exceeded

**Cas 1 : LLM API rate limit**

```json
{
  "error": "Rate Limit Exceeded",
  "message": "OpenAI API rate limit exceeded. Please try again later.",
  "details": {
    "retryAfter": 30,
    "resetAt": "2024-12-07T10:05:00Z"
  }
}
```

**Cas 2 : Application rate limit**

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please slow down.",
  "details": {
    "limit": 60,
    "window": "1 minute",
    "retryAfter": 15
  }
}
```

---

#### 500 - Server Error

**Cas 1 : LLM generation error**

```json
{
  "error": "Server Error",
  "message": "Failed to generate content. Please try again.",
  "details": {
    "llmError": "context_length_exceeded"
  }
}
```

**Cas 2 : Database error**

```json
{
  "error": "Server Error",
  "message": "An unexpected error occurred. Please try again later."
}
```

---

### Handling Errors Frontend

```typescript
// Error handling helper
interface ApiError {
  error: string;
  message: string;
  details?: any;
}

async function handleApiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error: ApiError = await response.json();

      switch (response.status) {
        case 400:
          // Validation errors - show user-friendly messages
          if (error.details && Array.isArray(error.details)) {
            const fieldErrors = error.details
              .map((d) => `${d.field}: ${d.message}`)
              .join('\n');
            throw new Error(`Validation failed:\n${fieldErrors}`);
          }
          throw new Error(error.message || 'Invalid request');

        case 401:
          // Unauthorized - redirect to login
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');

        case 403:
          // Forbidden - show permission error
          throw new Error(error.message || 'You don\'t have permission to do this');

        case 404:
          // Not found - handle gracefully
          throw new Error(error.message || 'Resource not found');

        case 429:
          // Rate limit - show retry message
          const retryAfter = error.details?.retryAfter || 60;
          throw new Error(
            `Too many requests. Please try again in ${retryAfter} seconds.`
          );

        case 500:
        case 503:
          // Server errors - show generic error
          throw new Error(
            'Something went wrong on our end. Please try again later.'
          );

        default:
          throw new Error(error.message || 'An unexpected error occurred');
      }
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error. Please check your connection.');
  }
}

// Usage
try {
  const data = await handleApiCall<HooksResponse>('/api/generate/hooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ rawIdea: 'Test idea' })
  });
  
  // Success
  console.log(data.data.hooks);
} catch (error) {
  // Error already formatted for user
  showErrorToast(error.message);
}
```

---

## 🔄 Exemples de Flux Complets

### Flux 1 : Génération Simple de Post

**Scénario :** User veut générer un post basique sans options avancées.

```typescript
async function basicPostGeneration(rawIdea: string, profileId: string) {
  // Step 1: Generate post
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rawIdea,
      goal: 'Educate and engage',
      profileId
    })
  });

  const { data } = await response.json();

  // Step 2: Display generated post
  console.log('Generated Post:');
  console.log(data.version.generatedText);
  console.log('Format:', data.version.format);
  console.log('Tokens used:', data.version.usage.totalTokens);

  return {
    postId: data.post.id,
    versionId: data.version.id,
    text: data.version.generatedText
  };
}

// Usage
const post = await basicPostGeneration(
  'Share insights about remote work productivity',
  'profile-uuid'
);
```

---

### Flux 2 : Génération avec Hook Suggestions

**Scénario :** User veut d'abord générer des hooks, en choisir un, puis générer le post complet.

```typescript
async function postGenerationWithHooks(rawIdea: string, profileId: string) {
  // Step 1: Generate hook suggestions
  const hooksResponse = await fetch('/api/generate/hooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rawIdea,
      profileId,
      count: 4
    })
  });

  const { data: hooksData } = await hooksResponse.json();

  // Step 2: User selects their favorite hook
  console.log('Available hooks:');
  hooksData.hooks.forEach((hook, index) => {
    console.log(`${index + 1}. [${hook.type}] ${hook.text} (${hook.estimatedEngagement}/10)`);
  });

  const selectedHook = hooksData.hooks[0]; // User picks the first one

  // Step 3: Generate full post using selected hook as starting point
  const enhancedIdea = `${selectedHook.text}\n\n[Continue with]: ${rawIdea}`;

  const postResponse = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rawIdea: enhancedIdea,
      goal: 'Educate and engage',
      profileId
    })
  });

  const { data: postData } = await postResponse.json();

  return {
    hook: selectedHook,
    post: postData.version.generatedText
  };
}

// Usage
const result = await postGenerationWithHooks(
  'Remote work productivity tips',
  'profile-uuid'
);
console.log('Final Post:', result.post);
```

---

### Flux 3 : A/B Testing avec Variants

**Scénario :** User veut générer plusieurs variantes pour tester différentes approches.

```typescript
async function abTestingWorkflow(rawIdea: string, profileId: string) {
  // Step 1: Generate 3 variants
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rawIdea,
      goal: 'Educate and engage',
      profileId,
      variants: 3  // Generate 3 different approaches
    })
  });

  const { data } = await response.json();

  // Step 2: Display all variants for comparison
  console.log(`Generated ${data.totalVariants} variants:\n`);

  data.variants.forEach((variant, index) => {
    console.log(`\n=== Variant ${index + 1}: ${variant.approach.toUpperCase()} ===`);
    console.log(variant.generatedText);
    console.log(`Format: ${variant.format}`);
    console.log(`Tokens: ${variant.usage.totalTokens}`);
    console.log('---');
  });

  // Step 3: User selects best variant (or tests multiple)
  const selectedVariant = data.variants[1]; // User picks storytelling

  // Step 4: (Optional) Iterate on selected variant
  const iteratedResponse = await fetch(`/api/posts/${selectedVariant.postId}/iterate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'add_data'  // Add statistics to storytelling approach
    })
  });

  const { data: iteratedData } = await iteratedResponse.json();

  return {
    variants: data.variants,
    selected: selectedVariant,
    improved: iteratedData.version
  };
}

// Usage
const abTest = await abTestingWorkflow(
  'Share lessons about remote team management',
  'profile-uuid'
);
```

---

### Flux 4 : Template-Based Generation

**Scénario :** User utilise un template prédéfini pour standardiser ses posts d'annonces.

```typescript
async function templateBasedGeneration() {
  // Step 1: Find appropriate template
  const templatesResponse = await fetch(
    '/api/templates?category=announcement&isSystem=true',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { data: templates } = await templatesResponse.json();
  const productLaunchTemplate = templates[0];

  console.log('Using template:', productLaunchTemplate.name);
  console.log('Required variables:', productLaunchTemplate.variables.filter(v => v.required));

  // Step 2: Preview template with variables
  const variables = {
    product_name: 'QuickTask Pro',
    product_description: 'AI-powered task management for remote teams',
    feature_1: 'Smart prioritization',
    feature_2: 'Team collaboration',
    feature_3: 'Mobile app',
    cta: 'Start free trial →'
  };

  const previewResponse = await fetch(
    `/api/templates/${productLaunchTemplate.id}/render`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ variables })
    }
  );

  const { data: previewData } = await previewResponse.json();

  console.log('Preview:');
  console.log(previewData.rendered);

  // Step 3: User approves, generate actual post
  const generateResponse = await fetch('/api/generate/from-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      templateId: productLaunchTemplate.id,
      variables,
      profileId: 'profile-uuid'
    })
  });

  const { data: postData } = await generateResponse.json();

  console.log('Generated post from template:');
  console.log(postData.version.generatedText);
  console.log('Template usage count:', postData.template.usageCount);

  return postData;
}

// Usage
const templatePost = await templateBasedGeneration();
```

---

### Flux 5 : Iteration Workflow

**Scénario :** User génère un post, puis l'affine progressivement avec plusieurs itérations.

```typescript
async function iterationWorkflow(postId: string) {
  // Step 1: Fetch original post
  const postResponse = await fetch(`/api/posts/${postId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data: post } = await postResponse.json();
  const originalVersion = post.versions.find(v => v.versionNumber === 1);

  console.log('Original post:');
  console.log(originalVersion.generatedText);
  console.log(`Length: ${originalVersion.generatedText.length} chars\n`);

  // Step 2: Make it shorter
  const shorterResponse = await fetch(`/api/posts/${postId}/iterate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'shorter' })
  });

  const { data: shorterData } = await shorterResponse.json();
  console.log('After "shorter" iteration:');
  console.log(shorterData.version.generatedText);
  console.log(`Length: ${shorterData.version.generatedText.length} chars\n`);

  // Step 3: Strengthen the hook
  const hookedResponse = await fetch(`/api/posts/${postId}/iterate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'stronger_hook' })
  });

  const { data: hookedData } = await hookedResponse.json();
  console.log('After "stronger_hook" iteration:');
  console.log(hookedData.version.generatedText);
  console.log('---\n');

  // Step 4: Add data to boost credibility
  const dataResponse = await fetch(`/api/posts/${postId}/iterate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'add_data' })
  });

  const { data: dataData } = await dataResponse.json();
  console.log('After "add_data" iteration:');
  console.log(dataData.version.generatedText);

  // Step 5: Fetch all versions to compare
  const finalPostResponse = await fetch(`/api/posts/${postId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data: finalPost } = await finalPostResponse.json();

  console.log(`\n=== ALL VERSIONS (${finalPost.totalVersions}) ===`);
  finalPost.versions.forEach(version => {
    console.log(`\nVersion ${version.versionNumber} [${version.iterationType || 'original'}]:`);
    console.log(version.generatedText.substring(0, 100) + '...');
    console.log(`Selected: ${version.isSelected}`);
  });

  // Step 6: User selects best version
  const bestVersionId = dataData.version.id; // User picks version with data

  await fetch(`/api/posts/${postId}/versions/${bestVersionId}/select`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('\nSelected best version:', bestVersionId);

  return finalPost;
}

// Usage
const refinedPost = await iterationWorkflow('existing-post-uuid');
```

---

### Flux 6 : Ideas to Post Pipeline

**Scénario :** User génère des idées de posts pour la semaine, puis en utilise une pour créer un post.

```typescript
async function ideasToPosts() {
  // Step 1: Generate ideas for the week
  const ideasResponse = await fetch('/api/ideas/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      theme: 'productivity and remote work tips',
      goal: 'Educate professionals',
      profileId: 'profile-uuid',
      count: 10
    })
  });

  const { data: ideasData } = await ideasResponse.json();

  console.log(`Generated ${ideasData.totalIdeas} ideas:\n`);
  ideasData.ideas.forEach((idea, index) => {
    console.log(`${index + 1}. ${idea.title} (Score: ${idea.relevanceScore}/10)`);
    console.log(`   ${idea.description}`);
    console.log(`   Tags: ${idea.tags.join(', ')}\n`);
  });

  // Step 2: Save ideas for later (already saved automatically)
  console.log('Ideas saved to database ✓');

  // Step 3: Later - list unused ideas
  const unusedIdeasResponse = await fetch('/api/ideas?isUsed=false&sortBy=relevanceScore&order=DESC', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data: unusedIdeas } = await unusedIdeasResponse.json();

  console.log(`\n=== Unused Ideas (${unusedIdeas.length}) ===`);

  // Step 4: Use highest-scoring idea to generate post
  const bestIdea = unusedIdeas[0];
  console.log(`\nUsing idea: ${bestIdea.title}`);

  const postResponse = await fetch(`/api/ideas/${bestIdea.id}/use`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      profileId: 'profile-uuid',
      variants: 2  // Generate 2 variants to test
    })
  });

  const { data: postData } = await postResponse.json();

  console.log('\n=== Post Generated from Idea ===');
  if (postData.variants) {
    postData.variants.forEach(variant => {
      console.log(`\n[${variant.approach}]:`);
      console.log(variant.generatedText);
    });
  } else {
    console.log(postData.version.generatedText);
  }

  console.log(`\nIdea marked as used: ${bestIdea.id}`);

  // Step 5: Check remaining unused ideas
  const remainingResponse = await fetch('/api/ideas?isUsed=false', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data: remainingIdeas, total } = await remainingResponse.json();
  console.log(`\nRemaining unused ideas: ${total}`);

  return {
    ideasGenerated: ideasData.totalIdeas,
    ideaUsed: bestIdea,
    postGenerated: postData
  };
}

// Usage
const pipeline = await ideasToPosts();
```

---

## 💡 Bonnes Pratiques & Optimisations

### Performance & UX

#### 1. Loading States

Toutes les générations LLM prennent du temps. Implémente toujours des loading states :

```typescript
function PostGenerator() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const generate = async () => {
    setLoading(true);
    setProgress('Analyzing your idea...');

    try {
      // Simulate progress for better UX
      setTimeout(() => setProgress('Generating content...'), 1000);
      setTimeout(() => setProgress('Optimizing for LinkedIn...'), 2000);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawIdea: userInput,
          profileId
        })
      });

      const { data } = await response.json();
      setGeneratedPost(data.version.generatedText);
      setProgress('Done! ✓');
    } catch (error) {
      setProgress('');
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <ProgressIndicator message={progress} />}
      <button onClick={generate} disabled={loading}>
        {loading ? progress : 'Generate Post'}
      </button>
    </>
  );
}
```

---

#### 2. Debouncing & Throttling

Pour les features comme template preview ou search :

```typescript
import { debounce } from 'lodash';

// Debounce template preview
const previewTemplate = debounce(async (templateId, variables) => {
  const response = await fetch(`/api/templates/${templateId}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ variables })
  });

  const { data } = await response.json();
  setPreview(data.rendered);
}, 500); // Wait 500ms after user stops typing

// Usage
const handleVariableChange = (name: string, value: string) => {
  const newVariables = { ...variables, [name]: value };
  setVariables(newVariables);
  previewTemplate(templateId, newVariables);
};
```

---

#### 3. Caching

Cache les templates, profiles, platforms pour éviter les requêtes répétées :

```typescript
// Simple in-memory cache with TTL
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();

  set(key: string, data: T, ttlMs: number = 300000) {
    // 5 min default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const templatesCache = new SimpleCache<Template[]>();

async function fetchTemplates(category?: string) {
  const cacheKey = `templates-${category || 'all'}`;
  const cached = templatesCache.get(cacheKey);

  if (cached) {
    console.log('Using cached templates');
    return cached;
  }

  const response = await fetch(`/api/templates?category=${category || ''}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data } = await response.json();
  templatesCache.set(cacheKey, data);

  return data;
}
```

---

### Gestion d'État

#### State Management Recommendations

Pour une app complexe avec beaucoup de features :

```typescript
// Using Zustand (lightweight state management)
import create from 'zustand';

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  
  // Current context
  selectedProfile: Profile | null;
  selectedPlatform: Platform | null;
  
  // Post generation
  currentPost: Post | null;
  versions: PostVersion[];
  selectedVersion: PostVersion | null;
  
  // UI state
  isGenerating: boolean;
  
  // Actions
  setToken: (token: string) => void;
  setSelectedProfile: (profile: Profile) => void;
  setCurrentPost: (post: Post) => void;
  addVersion: (version: PostVersion) => void;
  selectVersion: (versionId: string) => void;
}

const useStore = create<AppState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  selectedProfile: null,
  selectedPlatform: null,
  currentPost: null,
  versions: [],
  selectedVersion: null,
  isGenerating: false,

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },

  setSelectedProfile: (profile) => set({ selectedProfile: profile }),

  setCurrentPost: (post) => set({
    currentPost: post,
    versions: post.versions || [],
    selectedVersion: post.versions?.find(v => v.isSelected) || null
  }),

  addVersion: (version) => set((state) => ({
    versions: [...state.versions, version]
  })),

  selectVersion: (versionId) => set((state) => ({
    selectedVersion: state.versions.find(v => v.id === versionId) || null
  }))
}));

// Usage in components
function PostEditor() {
  const { currentPost, selectedVersion, addVersion } = useStore();

  const iterate = async (type: IterationType) => {
    const response = await fetch(`/api/posts/${currentPost.id}/iterate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type })
    });

    const { data } = await response.json();
    addVersion(data.version);
  };

  return (
    <div>
      <p>{selectedVersion?.generatedText}</p>
      <button onClick={() => iterate('shorter')}>Make Shorter</button>
    </div>
  );
}
```

---

### Sécurité

#### 1. Token Storage

```typescript
// ❌ BAD - Storing token in localStorage is vulnerable to XSS
localStorage.setItem('token', token);

// ✅ BETTER - Use httpOnly cookies (set from backend)
// Backend sets: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict

// ✅ ALTERNATIVE - Secure storage with encryption
import SecureLS from 'secure-ls';
const ls = new SecureLS({ encodingType: 'aes' });
ls.set('token', token);
```

#### 2. Token Refresh

```typescript
// Implement token refresh logic
async function refreshToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include' // Send httpOnly cookie
  });

  const { token } = await response.json();
  return token;
}

// Intercept 401 errors and refresh
async function apiCall(url: string, options: RequestInit) {
  let response = await fetch(url, options);

  if (response.status === 401) {
    // Try to refresh token
    const newToken = await refreshToken();
    if (newToken) {
      // Retry with new token
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`
      };
      response = await fetch(url, options);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}
```

#### 3. Input Sanitization

```typescript
// Sanitize user input before sending to API
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  // Remove HTML tags
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  
  // Trim whitespace
  return cleaned.trim();
}

// Usage
const rawIdea = sanitizeInput(userInput);
await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({ rawIdea })
});
```

---

### Optimisation des Coûts (Tokens)

#### 1. Éviter les Générations Inutiles

```typescript
// Cache des hooks générés récemment
const recentHooks = new Map<string, Hook[]>();

async function generateHooksWithCache(rawIdea: string) {
  const cacheKey = rawIdea.toLowerCase().trim();

  // Check if we generated hooks for similar idea recently
  if (recentHooks.has(cacheKey)) {
    console.log('Using cached hooks');
    return recentHooks.get(cacheKey)!;
  }

  // Generate new hooks
  const response = await fetch('/api/generate/hooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ rawIdea })
  });

  const { data } = await response.json();
  
  // Cache for 10 minutes
  recentHooks.set(cacheKey, data.hooks);
  setTimeout(() => recentHooks.delete(cacheKey), 600000);

  return data.hooks;
}
```

#### 2. Utiliser Templates pour Standardiser

Les templates consomment moins de tokens que les générations complètes :

```typescript
// ❌ Coûteux - Génération complète à chaque fois
await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    rawIdea: 'Announce our new feature X'  // ~500 tokens
  })
});

// ✅ Économique - Template pré-rempli
await fetch('/api/generate/from-template', {
  method: 'POST',
  body: JSON.stringify({
    templateId: 'announcement-template',
    variables: { feature: 'X' }  // ~200 tokens
  })
});
```

#### 3. Limiter les Variantes

```typescript
// User peut choisir combien de variantes
function VariantSelector() {
  const [variantCount, setVariantCount] = useState(1);

  return (
    <>
      <label>Number of variants to generate:</label>
      <select value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))}>
        <option value={1}>1 (fastest, cheapest)</option>
        <option value={2}>2 (recommended for A/B)</option>
        <option value={3}>3 (full comparison)</option>
        <option value={4}>4 (all approaches) - Most expensive</option>
      </select>

      <button onClick={() => generate(variantCount)}>
        Generate {variantCount === 1 ? 'Post' : `${variantCount} Variants`}
      </button>

      <p className="cost-estimate">
        Estimated cost: ~{variantCount * 400} tokens
      </p>
    </>
  );
}
```

---

### Accessibilité (a11y)

```typescript
// Accessible loading state
function AccessibleLoader({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">{message}</span>
      <span aria-hidden="true">{message}</span>
    </div>
  );
}

// Accessible error messages
function ErrorMessage({ error }: { error: string }) {
  return (
    <div role="alert" aria-live="assertive" className="error">
      <span className="sr-only">Error: </span>
      {error}
    </div>
  );
}
```

---

### Tracking & Analytics

```typescript
// Track API usage for analytics
interface UsageMetrics {
  feature: string;
  tokensUsed: number;
  duration: number;
  success: boolean;
}

async function trackGeneration(
  feature: string,
  apiCall: () => Promise<any>
) {
  const startTime = Date.now();
  
  try {
    const response = await apiCall();
    const duration = Date.now() - startTime;

    // Track success
    analytics.track('generation_success', {
      feature,
      tokensUsed: response.usage?.totalTokens || 0,
      duration,
      timestamp: new Date().toISOString()
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track failure
    analytics.track('generation_failure', {
      feature,
      error: error.message,
      duration,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}

// Usage
const post = await trackGeneration('post_generation', async () => {
  const response = await fetch('/api/generate', {...});
  return await response.json();
});
```

---

## 🎯 Quick Reference Cheat Sheet

### Essential Endpoints

| Feature | Method | Endpoint | Key Params |
|---------|--------|----------|-----------|
| Generate Post | `POST` | `/api/generate` | `rawIdea`, `variants?` |
| Generate Hooks | `POST` | `/api/generate/hooks` | `rawIdea`, `count?` |
| Iterate Post | `POST` | `/api/posts/:id/iterate` | `type`, `feedback?` |
| List Templates | `GET` | `/api/templates` | `category?`, `isSystem?` |
| Generate from Template | `POST` | `/api/generate/from-template` | `templateId`, `variables` |
| Generate Ideas | `POST` | `/api/ideas/generate` | `theme`, `count?` |
| Use Idea | `POST` | `/api/ideas/:id/use` | `variants?` |

### Iteration Types Quick Reference

| Type | Effect | Time | Token Cost |
|------|--------|------|------------|
| `shorter` | -30% length | 5-10s | ~730 |
| `stronger_hook` | Better opening | 5-10s | ~700 |
| `more_personal` | Add anecdote | 10-15s | ~850 |
| `add_data` | Add stats | 10-15s | ~820 |
| `simplify` | Remove jargon | 5-10s | ~750 |
| `custom` | User feedback | 10-20s | Variable |

### Variant Approaches

| Approach | Temp | Style | Best For | Avg Tokens |
|----------|------|-------|----------|------------|
| `direct` | 0.5 | Concise, factual | Conversions, B2B | ~350 |
| `storytelling` | 0.7 | Narrative, personal | Engagement | ~490 |
| `data-driven` | 0.6 | Stats, research | Credibility | ~420 |
| `emotional` | 0.8 | Empathetic, inspiring | Community | ~450 |

---

## 📚 Additional Resources

- **Detailed Guides:**
  - [docs/API_TEMPLATES.md](./API_TEMPLATES.md) - Complete template system guide
  - [docs/ITERATION_TYPES.md](./ITERATION_TYPES.md) - All iteration types with examples
  - [docs/VARIANT_GENERATION.md](./VARIANT_GENERATION.md) - Variant generation strategies
  - [docs/TESTING.md](./TESTING.md) - Testing guide for backend integration

- **GitHub Issues:** For bugs or feature requests
- **Support:** Contact backend team for API questions

---

**Document Version:** 2.0.0
**Last Updated:** Décembre 2024
**Author:** Backend Team - Brandium

---

