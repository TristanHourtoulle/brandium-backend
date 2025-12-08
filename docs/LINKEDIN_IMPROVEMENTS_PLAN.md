# Plan d'implémentation - Améliorations génération LinkedIn

## 1. Feature Overview

### Problème résolu

Actuellement, la génération de posts LinkedIn manque de flexibilité et d'outils pour optimiser l'engagement. Les utilisateurs ont besoin de plus de contrôle et d'insights pour créer du contenu performant.

### Pour qui ?

- Créateurs de contenu LinkedIn
- Freelances/entrepreneurs travaillant leur personal branding
- Growth marketers gérant plusieurs comptes

### Fonctionnalités clés

1. **Itérations spécialisées** - Types prédéfinis d'améliorations
2. **Hooks suggérés** - Générer plusieurs accroches au choix
3. **Score de viralité** - Analyse prédictive avec suggestions
4. **Variantes A/B** - Générer plusieurs versions
5. **Templates personnalisés** - Sauvegarder des structures qui marchent

---

## 2. Technical Design

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  - Hook selector component                                  │
│  - Iteration type picker                                    │
│  - Virality score display                                   │
│  - Variant comparison view                                  │
│  - Template library                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                            │
│  POST /api/generate/hooks                                   │
│  POST /api/posts/:id/iterate (enhanced)                     │
│  POST /api/posts/:id/analyze                                │
│  POST /api/generate/variants                                │
│  POST /api/templates                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
│  - templates table                                          │
│  - post_metrics table (virality scores)                     │
│  - iteration_types enum                                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/
├── controllers/
│   ├── HookGenerationController.ts
│   ├── ViralityAnalysisController.ts
│   └── TemplateController.ts
├── services/
│   ├── HookGenerationService.ts
│   ├── ViralityScoreService.ts
│   └── VariantGenerationService.ts
├── utils/
│   ├── iterationPromptBuilder.ts
│   └── viralityScorer.ts
└── models/
    ├── Template.ts
    └── PostMetrics.ts
```

---

## 3. Implementation Plan

### Phase 1: Itérations spécialisées (Quick Win - 1-2 jours)

**Priorité**: 🥇 Haute | **Effort**: Faible | **Impact**: Élevé

#### Tâches

- [ ] Définir les types d'itérations
- [ ] Créer un enum `IterationType`
- [ ] Enrichir `PostIterationController` avec type detection
- [ ] Ajouter des prompts spécialisés dans `iterationPromptBuilder.ts`
- [ ] Tester chaque type d'itération
- [ ] Documenter dans README

#### Types d'itérations

| Type | Description | Prompt Focus |
|------|-------------|--------------|
| `shorter` | Raccourcir le post | Garder l'essence, supprimer le superflu |
| `stronger_hook` | Améliorer l'accroche | Focus sur les 2-3 premières lignes |
| `more_personal` | Ajouter une anecdote | Injecter une expérience personnelle |
| `add_data` | Ajouter des stats | Inclure chiffres/données concrètes |
| `simplify` | Simplifier le langage | Réduire le niveau de lecture |
| `custom` | Feedback libre | Utiliser le feedback de l'utilisateur |

#### Fichiers à modifier

```typescript
// src/types/iteration.ts (NEW)
export type IterationType =
  | 'shorter'
  | 'stronger_hook'
  | 'more_personal'
  | 'add_data'
  | 'simplify'
  | 'custom';

// src/utils/iterationPromptBuilder.ts (NEW)
export function buildSpecializedIterationPrompt(
  type: IterationType,
  previousText: string,
  customFeedback?: string
): string {
  // Logic spécifique par type
}
```

#### API Enhancement

```typescript
// POST /api/posts/:postId/iterate
{
  "type": "stronger_hook" | "shorter" | "more_personal" | "add_data" | "simplify" | "custom",
  "feedback": "optional for custom type"
}
```

---

### Phase 2: Suggestions de hooks (2-3 jours)

**Priorité**: 🥈 Moyenne-Haute | **Effort**: Moyen | **Impact**: Élevé

#### Tâches

- [ ] Créer `HookGenerationService`
- [ ] Implémenter 4 types de hooks (question, stat, story, bold)
- [ ] Créer endpoint `/api/generate/hooks`
- [ ] Ajouter validation et tests
- [ ] Documenter l'API

#### Nouveaux fichiers

```typescript
// src/services/HookGenerationService.ts
export class HookGenerationService {
  async generateHooks(context: {
    rawIdea: string;
    goal?: string;
    profile?: Profile;
    count?: number;
  }): Promise<Hook[]> {
    // Generate 3-5 different hooks
  }
}

// src/controllers/HookGenerationController.ts
export const generateHooks = async (req, res) => {
  // Controller logic
}
```

#### Types

```typescript
interface Hook {
  type: 'question' | 'stat' | 'story' | 'bold_opinion';
  text: string;
  estimatedEngagement: number; // 1-10
}
```

#### API

```typescript
// POST /api/generate/hooks
{
  "rawIdea": "...",
  "goal": "...",
  "profileId": "optional",
  "count": 4
}

// Response
{
  "hooks": [
    { "type": "question", "text": "Tu passes combien d'heures...", "estimatedEngagement": 8 },
    { "type": "stat", "text": "73% des développeurs...", "estimatedEngagement": 7 },
    { "type": "story", "text": "La semaine dernière...", "estimatedEngagement": 9 },
    { "type": "bold_opinion", "text": "Les daily standups sont...", "estimatedEngagement": 8 }
  ]
}
```

---

### Phase 3: Variantes A/B (1-2 jours)

**Priorité**: 🥉 Moyenne | **Effort**: Faible | **Impact**: Moyen

#### Tâches

- [ ] Modifier `/api/generate` pour accepter `variants` param
- [ ] Créer `VariantGenerationService`
- [ ] Utiliser différentes températures/approches
- [ ] Retourner array de posts au lieu d'un seul
- [ ] Tester et documenter

#### API Enhancement

```typescript
// POST /api/generate
{
  "rawIdea": "...",
  "goal": "...",
  "variants": 3 // Generate 3 versions
}

// Response
{
  "variants": [
    { "version": 1, "text": "...", "approach": "direct", "format": "story" },
    { "version": 2, "text": "...", "approach": "storytelling", "format": "story" },
    { "version": 3, "text": "...", "approach": "data-driven", "format": "opinion" }
  ]
}
```

#### Approches de génération

| Approach | Temperature | Focus |
|----------|-------------|-------|
| `direct` | 0.5 | Straight to the point |
| `storytelling` | 0.7 | Narrative, personal |
| `data-driven` | 0.6 | Facts, stats, logic |
| `emotional` | 0.8 | Feelings, empathy |

---

### Phase 4: Score de viralité (3-4 jours)

**Priorité**: 4 | **Effort**: Moyen | **Impact**: Moyen

#### Tâches

- [ ] Créer table `post_metrics`
- [ ] Implémenter `ViralityScoreService`
- [ ] Définir critères de scoring (hook, readability, CTA, émotions)
- [ ] Créer endpoint `/api/posts/:id/analyze`
- [ ] Ajouter tests unitaires pour le scoring
- [ ] Intégrer dans le flow de génération

#### Database Migration

```sql
CREATE TABLE post_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  virality_score DECIMAL(3,1), -- 0.0 to 10.0
  hook_strength INT, -- 1-10
  readability_score INT,
  engagement_potential INT,
  emotional_resonance INT,
  suggestions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Service

```typescript
// src/services/ViralityScoreService.ts
export class ViralityScoreService {
  analyzePost(text: string): {
    viralityScore: number;
    breakdown: {
      hook_strength: number;
      readability: number;
      engagement_potential: number;
      emotional_resonance: number;
    };
    suggestions: string[];
  } {
    // Analyse avec règles heuristiques + potentiellement GPT
  }
}
```

#### Critères de scoring

| Critère | Poids | Mesure |
|---------|-------|--------|
| Hook Strength | 30% | Longueur, mots-clés percutants, question |
| Readability | 25% | Longueur phrases, paragraphes, niveau langue |
| Engagement Potential | 25% | CTA, question finale, hashtags |
| Emotional Resonance | 20% | Mots émotionnels, storytelling |

#### API

```typescript
// POST /api/posts/:id/analyze
// Response
{
  "viralityScore": 7.2,
  "breakdown": {
    "hook_strength": 8,
    "readability": 9,
    "engagement_potential": 6,
    "emotional_resonance": 7
  },
  "suggestions": [
    "Ajouter une question plus personnelle en fin de post",
    "Le hook pourrait être plus percutant",
    "Considérer ajouter un chiffre/stat"
  ]
}
```

---

### Phase 5: Templates personnalisés (4-5 jours)

**Priorité**: 5 | **Effort**: Élevé | **Impact**: Moyen

#### Tâches

- [ ] Créer modèle `Template`
- [ ] Implémenter CRUD pour templates
- [ ] Créer `TemplateController`
- [ ] Intégrer templates dans le flow de génération
- [ ] Ajouter tests complets
- [ ] Documenter

#### Database Schema

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  structure JSONB NOT NULL,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Structure JSONB Example

```json
{
  "sections": [
    { "name": "hook", "instruction": "Commencer par une question percutante" },
    { "name": "context", "instruction": "Donner le contexte en 2 lignes max" },
    { "name": "value", "instruction": "Expliquer la valeur ajoutée" },
    { "name": "proof", "instruction": "Ajouter un exemple concret" },
    { "name": "cta", "instruction": "Terminer par une question engageante" }
  ],
  "tone": "professional but warm",
  "maxLength": 1500
}
```

#### API Endpoints

```typescript
// CRUD pour templates
GET    /api/templates           // List user's templates
GET    /api/templates/:id       // Get template by ID
POST   /api/templates           // Create template
PUT    /api/templates/:id       // Update template
DELETE /api/templates/:id       // Delete template

// Utiliser un template pour générer
POST /api/generate
{
  "rawIdea": "...",
  "templateId": "uuid" // Use this template structure
}
```

---

## 4. File Changes Summary

### New Files

```
src/types/iteration.ts
src/controllers/HookGenerationController.ts
src/controllers/ViralityAnalysisController.ts
src/controllers/TemplateController.ts
src/services/HookGenerationService.ts
src/services/ViralityScoreService.ts
src/services/VariantGenerationService.ts
src/utils/iterationPromptBuilder.ts
src/utils/viralityScorer.ts
src/models/Template.ts
src/models/PostMetrics.ts
src/routes/hooks.ts
src/routes/templates.ts
migrations/XXXXXX-create-templates.js
migrations/XXXXXX-create-post-metrics.js
tests/unit/viralityScorer.test.ts
tests/unit/hookGeneration.test.ts
tests/unit/iterationPromptBuilder.test.ts
tests/integration/templates.test.ts
tests/integration/hooks.test.ts
```

### Modified Files

```
src/controllers/PostIterationController.ts (add type parameter)
src/controllers/GenerateController.ts (add variants support)
src/routes/index.ts (add new routes)
src/middleware/validators.ts (add new validations)
README.md (document new features)
```

---

## 5. Dependencies

**Aucune nouvelle dépendance npm requise** - tout peut être fait avec l'existant :

- OpenAI API (déjà intégré)
- Sequelize (ORM existant)
- Express validator (validation existante)

---

## 6. Testing Strategy

### Unit Tests

```typescript
// tests/unit/viralityScorer.test.ts
describe('ViralityScoreService', () => {
  it('should score a strong hook highly', () => {
    const score = scorer.analyzePost('Bold statement that challenges...');
    expect(score.breakdown.hook_strength).toBeGreaterThan(7);
  });

  it('should detect missing CTA', () => {
    const score = scorer.analyzePost('Post without question...');
    expect(score.suggestions).toContain(expect.stringContaining('CTA'));
  });
});

// tests/unit/hookGeneration.test.ts
describe('HookGenerationService', () => {
  it('should generate 4 different hook types', async () => {
    const hooks = await service.generateHooks({ rawIdea: '...' });
    expect(hooks).toHaveLength(4);
    const types = hooks.map(h => h.type);
    expect(types).toContain('question');
    expect(types).toContain('stat');
  });
});

// tests/unit/iterationPromptBuilder.test.ts
describe('iterationPromptBuilder', () => {
  it('should build shorter iteration prompt', () => {
    const prompt = buildSpecializedIterationPrompt('shorter', 'Long post...');
    expect(prompt).toContain('condense');
    expect(prompt).toContain('essential');
  });
});
```

### Integration Tests

```typescript
// tests/integration/specialized-iterations.test.ts
describe('POST /api/posts/:id/iterate', () => {
  it('should shorten the post when type is shorter', async () => {
    const response = await request(app)
      .post(`/api/posts/${postId}/iterate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'shorter' });

    expect(response.status).toBe(200);
    expect(response.body.data.generatedText.length)
      .toBeLessThan(originalLength);
  });

  it('should improve hook when type is stronger_hook', async () => {
    const response = await request(app)
      .post(`/api/posts/${postId}/iterate`)
      .send({ type: 'stronger_hook' });

    expect(response.status).toBe(200);
    // First lines should be different
  });
});
```

---

## 7. Estimation Réaliste

| Phase | Feature | Estimation | Priorité |
|-------|---------|------------|----------|
| 1 | Itérations spécialisées | 1-2 jours | 🥇 |
| 2 | Hooks suggérés | 2-3 jours | 🥈 |
| 3 | Variantes A/B | 1-2 jours | 🥉 |
| 4 | Score de viralité | 3-4 jours | 4 |
| 5 | Templates | 4-5 jours | 5 |

**Total estimé**: 11-16 jours de développement

---

## 8. Rollout Plan

### Semaine 1

- ✅ Itérations spécialisées (Phase 1)
- Tests et documentation
- Deploy to staging

### Semaine 2

- ✅ Suggestions de hooks (Phase 2)
- ✅ Variantes A/B (Phase 3)
- Deploy both to staging

### Semaine 3

- ✅ Score de viralité (Phase 4)
- Integration testing
- Production deploy Phase 1, 2 & 3

### Semaine 4

- ✅ Templates personnalisés (Phase 5)
- Full system testing
- Production deploy all features

---

## 9. Success Criteria

### Par feature

| Feature | Critères de succès |
|---------|-------------------|
| Itérations spécialisées | 5 types fonctionnels, tests passent |
| Hooks suggérés | 4 types de hooks, engagement score |
| Variantes A/B | 3 variantes différenciées |
| Score de viralité | Score précis, suggestions utiles |
| Templates | CRUD complet, intégration génération |

### Global

- [ ] Tous les tests passent (coverage > 90%)
- [ ] Documentation à jour
- [ ] Pas de régression sur les features existantes
- [ ] Performance acceptable (< 10s pour génération)

---

## 10. Next Steps

1. **Valider le plan** - Review avec l'équipe/stakeholders
2. **Commencer par Phase 1** - Itérations spécialisées (Quick Win)
3. **Implémenter feature par feature** - Ne pas tout faire en parallèle
4. **Tester chaque phase** - Avant de passer à la suivante
5. **Documenter au fur et à mesure** - README, API docs

---

*Document créé le: $(date)*
*Dernière mise à jour: $(date)*
