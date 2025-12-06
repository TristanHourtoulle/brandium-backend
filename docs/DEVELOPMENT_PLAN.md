# Plan de Développement - Amélioration du Système de Génération

> Plan ultra-précis pour améliorer la qualité des posts générés sans créer de nouvelles routes API.
> Focus : Modifications des prompts, contexte, et logique de sélection existante.

---

## Contrainte Stratégique : LinkedIn ONLY

**Décision :** Pour ne pas s'éparpiller, nous nous concentrons **UNIQUEMENT sur LinkedIn**.

- Les prompts sont optimisés spécifiquement pour LinkedIn 2025
- Si la plateforme n'est pas LinkedIn → **Refuser la génération avec erreur 400**
- Cela permet d'avoir un système vraiment optimisé plutôt qu'un système générique moyen

### Pourquoi cette décision ?

1. **Qualité > Quantité** : Un prompt générique ne peut pas exceller sur toutes les plateformes
2. **Algorithmes différents** : LinkedIn ≠ Twitter ≠ TikTok (longueur, format, ton)
3. **Itération rapide** : On peut mesurer et améliorer plus vite sur une seule plateforme
4. **Extension future** : Une fois LinkedIn parfait, on pourra ajouter d'autres plateformes

---

## Phase 0 : Validation LinkedIn Only (Impact: CRITIQUE)

> **NOUVELLE PHASE** - À implémenter EN PREMIER

**Fichier :** `src/controllers/GenerateController.ts`
**Ligne :** Après la validation des IDs (ligne ~53)

### Implémentation

```typescript
// AJOUTER après la validation du platformId (ligne 53)

// LinkedIn-only validation
if (platform) {
  const platformName = platform.name.toLowerCase();
  const isLinkedIn = platformName === 'linkedin' || platformName.includes('linkedin');

  if (!isLinkedIn) {
    res.status(400).json({
      error: 'Platform Not Supported',
      message: `Generation is currently only supported for LinkedIn. Platform "${platform.name}" is not supported yet.`,
      supportedPlatforms: ['LinkedIn'],
    });
    return;
  }
}

// Si pas de platform spécifiée, on assume LinkedIn (comportement par défaut)
// Mais on log un warning pour tracking
if (!platform) {
  console.warn(`[Generate] No platform specified for user ${userId}, defaulting to LinkedIn behavior`);
}
```

### Même validation pour les itérations

**Fichier :** `src/controllers/PostIterationController.ts`
**Ou dans :** `src/services/PostVersionService.ts`

```typescript
// Dans createIteration, après avoir fetch le post (ligne ~96)

// LinkedIn-only validation for iterations
if (post.platform) {
  const platformName = post.platform.name.toLowerCase();
  const isLinkedIn = platformName === 'linkedin' || platformName.includes('linkedin');

  if (!isLinkedIn) {
    throw new Error(`Iterations are only supported for LinkedIn posts. This post uses "${post.platform.name}".`);
  }
}
```

### Ajouter une constante pour les plateformes supportées

**Fichier :** `src/config/constants.ts`

```typescript
// AJOUTER après PLATFORMS
export const SUPPORTED_PLATFORMS = {
  LINKEDIN: 'linkedin',
} as const;

export const SUPPORTED_PLATFORM_NAMES = ['linkedin'] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORM_NAMES)[number];

/**
 * Check if a platform name is supported for generation
 */
export function isPlatformSupported(platformName: string): boolean {
  return SUPPORTED_PLATFORM_NAMES.some(
    (supported) => platformName.toLowerCase().includes(supported)
  );
}
```

---

## Analyse du Système Actuel

### Architecture actuelle

```
Flux de génération :
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ GenerateController │ → │  promptBuilder.ts │ → │  LLMService.ts  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         ↓                       ↓
┌─────────────────────┐   ┌──────────────────────────┐
│ PostVersionService  │   │ historicalPostSelector.ts │
└─────────────────────┘   └──────────────────────────┘
```

### Fichiers clés à modifier

| Fichier | Rôle | Priorité |
|---------|------|----------|
| `src/services/LLMService.ts` | System prompt (lignes 188-191) | CRITIQUE |
| `src/utils/promptBuilder.ts` | Construction du prompt utilisateur | CRITIQUE |
| `src/utils/historicalPostSelector.ts` | Sélection des exemples | HAUTE |
| `src/config/constants.ts` | Paramètres LLM | MOYENNE |
| `src/services/PostVersionService.ts` | Logique d'itération | HAUTE |

### Problèmes identifiés dans le code actuel

#### 1. System prompt trop générique (LLMService.ts:188-191)
```typescript
// ACTUEL - Trop vague
content:
  'You are an expert social media content creator specialized in personal branding. ' +
  'You create engaging, authentic posts that resonate with the target audience while ' +
  'maintaining the user\'s unique voice and style.',
```

#### 2. Instructions de génération insuffisantes (promptBuilder.ts:117-124)
```typescript
// ACTUEL - Manque de directives LinkedIn spécifiques
task += '## Instructions\n';
task += '1. Transform the raw idea into an engaging social media post.\n';
task += '2. Apply the profile\'s tone and style if provided.\n';
task += '3. Consider the project\'s audience and key messages if provided.\n';
task += '4. Follow the platform\'s guidelines and character limits if provided.\n';
task += '5. Make the post authentic, engaging, and actionable.\n';
task += '6. Output ONLY the final post text, nothing else.\n';
```

#### 3. Prompt d'itération trop permissif (promptBuilder.ts:198-206)
```typescript
// ACTUEL - L'IA refait souvent tout le post
task += 'Modify the previous version according to the modification request while:\n';
task += '1. Maintaining the original context and constraints.\n';
task += '2. Preserving what works well in the previous version.\n';
task += '3. Making only the requested changes.\n';  // ← Pas assez strict
```

#### 4. Contexte des historical posts incomplet (historicalPostSelector.ts:215-222)
```typescript
// ACTUEL - Manque d'instructions sur COMMENT utiliser les exemples
context += 'The following are real examples of the author\'s previous posts. ';
context += 'Use these to understand and match their authentic writing style:\n\n';
// ↑ Ne dit pas de copier la structure, le hook style, etc.
```

---

## Plan de Développement

### Phase 1 : System Prompt LinkedIn 2025 (Impact: TRÈS ÉLEVÉ)

**Fichier :** `src/services/LLMService.ts`
**Lignes :** 186-200

**Modification :**

```typescript
// AVANT (ligne 188-191)
content:
  'You are an expert social media content creator...',

// APRÈS
content: `You are a LinkedIn ghostwriter who perfectly mimics the author's voice.
Your goal: produce a post the author can publish WITHOUT ANY modification.

LINKEDIN 2025 ALGORITHM RULES:
- Hook is CRITICAL: First 2-3 lines determine if reader clicks "See more"
- Optimal length: 1200-1800 characters (200-400 words)
- Mobile-first: 75% of users on mobile, use short paragraphs
- Reading level: Age 6-9 (conversational, easy while scrolling)
- Structure: Hook → Story/Value → Key Points → CTA
- Line break after each sentence for readability
- 1-3 emojis MAX (at line starts or before CTAs, NEVER mid-sentence)
- End with a question to drive comments
- NO external links in post body
- 3-5 hashtags maximum at the end

HOOK TYPES THAT WORK (pick one):
- Question challenging common belief
- Surprising statistic or precise number
- Bold opinion ("Unpopular opinion:", "Hot take:")
- Personal story opener with emotion
- Counter-intuitive statement

CRITICAL SUCCESS METRIC:
The author reads your post and thinks "I could have written this myself."
Match their tone, vocabulary, sentence structure, and emoji usage from examples.`,
```

**Fichier :** `src/config/constants.ts`

```typescript
// AJOUTER après OPENAI
export const LINKEDIN_GUIDELINES = {
  OPTIMAL_MIN_LENGTH: 1200,
  OPTIMAL_MAX_LENGTH: 1800,
  MAX_HASHTAGS: 5,
  MAX_EMOJIS: 3,
  HOOK_MAX_LINES: 3,
} as const;
```

---

### Phase 2 : Améliorer le Prompt de Génération (Impact: ÉLEVÉ)

**Fichier :** `src/utils/promptBuilder.ts`

#### 2.1 Modifier `buildTaskSection` (lignes 108-126)

```typescript
// REMPLACER la fonction buildTaskSection
function buildTaskSection(goal: string | null | undefined, rawIdea: string): string {
  let task = '# YOUR TASK\n\n';

  if (goal && goal.trim()) {
    task += `## Goal\n${goal.trim()}\n\n`;
  }

  task += `## Raw Idea to Transform\n${rawIdea.trim()}\n\n`;

  task += '## STRICT OUTPUT REQUIREMENTS\n\n';

  task += '### Structure (follow this order):\n';
  task += '1. **HOOK** (2-3 lines): Stop the scroll. Use question, stat, bold opinion, or story opener.\n';
  task += '2. **BODY** (main content): Develop your point with short paragraphs. One idea = one paragraph.\n';
  task += '3. **CTA** (last line): End with a question that invites comments.\n\n';

  task += '### Formatting Rules:\n';
  task += '- Line break after EVERY sentence (mobile readability)\n';
  task += '- Paragraphs of 1-3 lines maximum\n';
  task += '- Use → or - for lists, not bullets\n';
  task += '- Emojis: 0-3 max, only at line starts or before CTA\n';
  task += '- Hashtags: 3-5 at the very end, separated by spaces\n';
  task += '- Length: 1200-1800 characters ideal\n\n';

  task += '### Content Rules:\n';
  task += '- First person narrative\n';
  task += '- Conversational tone (reading age 6-9)\n';
  task += '- NO corporate jargon or buzzwords\n';
  task += '- NO external links in the post body\n';
  task += '- DO NOT start with "I" - vary your openings\n\n';

  task += '### Output:\n';
  task += 'Write ONLY the final LinkedIn post. No explanations, no alternatives, no meta-commentary.\n';

  return task;
}
```

#### 2.2 Améliorer `buildHistoricalPostsContext` (historicalPostSelector.ts:210-224)

```typescript
// REMPLACER la fonction buildHistoricalPostsContext
export function buildHistoricalPostsContext(posts: HistoricalPost[]): string {
  if (posts.length === 0) {
    return '';
  }

  let context = '# WRITING STYLE EXAMPLES (CRITICAL - MIMIC THIS STYLE)\n\n';

  context += 'These are the author\'s REAL past posts. Your job is to MATCH this style exactly:\n\n';

  context += '**ANALYZE AND COPY:**\n';
  context += '- How do they start their posts? (Hook style)\n';
  context += '- Sentence length: short? medium? mixed?\n';
  context += '- Do they use emojis? Where and how many?\n';
  context += '- How do they end? (Question? Statement? CTA?)\n';
  context += '- Vocabulary level: Simple or technical?\n';
  context += '- Personal stories or more abstract?\n\n';

  context += formatPostsForPrompt(posts);
  context += '\n\n';

  context += '**IMPORTANT:** If the examples above use emojis, use them similarly. ';
  context += 'If they don\'t, DON\'T add any. Match their exact style.';

  return context;
}
```

---

### Phase 3 : Mode d'Itération "Chirurgical" (Impact: TRÈS ÉLEVÉ)

**Fichier :** `src/utils/promptBuilder.ts`

#### 3.1 Remplacer `buildIterationTaskSection` (lignes 187-207)

```typescript
// REMPLACER la fonction buildIterationTaskSection
function buildIterationTaskSection(previousText: string, iterationPrompt: string): string {
  let task = '# PREVIOUS VERSION (DO NOT REWRITE ENTIRELY)\n\n';
  task += '```\n';
  task += previousText.trim();
  task += '\n```\n\n';

  task += '# MODIFICATION REQUEST\n\n';
  task += iterationPrompt.trim();
  task += '\n\n';

  task += '# STRICT MODIFICATION RULES\n\n';

  task += '**CRITICAL: This is a SURGICAL edit, NOT a rewrite.**\n\n';

  task += '## Before modifying, identify:\n';
  task += '1. The EXACT sentences/words that need to change\n';
  task += '2. Whether the request is about: content, tone, structure, or length\n\n';

  task += '## Rules:\n';
  task += '1. **KEEP** all parts NOT mentioned in the request **WORD FOR WORD**\n';
  task += '2. **ONLY** modify what is explicitly requested\n';
  task += '3. If the request is ambiguous, make the **MINIMAL** change possible\n';
  task += '4. **DO NOT** "improve", "enhance", or "fix" other parts\n';
  task += '5. **DO NOT** change the hook unless specifically asked\n';
  task += '6. **DO NOT** change the CTA unless specifically asked\n';
  task += '7. **PRESERVE** emoji usage, line breaks, and formatting\n\n';

  task += '## Output:\n';
  task += 'Output ONLY the modified post. If you changed more than requested, you FAILED.\n';

  return task;
}
```

---

### Phase 4 : Améliorer la Sélection des Posts Historiques (Impact: MOYEN)

**Fichier :** `src/utils/historicalPostSelector.ts`

#### 4.1 Ajouter un bonus pour les posts favoris (prépare la future feature)

```typescript
// MODIFIER calculatePostScore (lignes 79-114)
function calculatePostScore(
  post: HistoricalPost,
  targetPlatformId: string | null | undefined,
  options: PostSelectionOptions,
): ScoredPost {
  const engagementWeight = options.engagementWeight ?? 1.0;
  const recencyWeight = options.recencyWeight ?? 1.0;

  let score = 100;

  // Engagement bonus
  const totalEngagement = calculateTotalEngagement(post);
  const engagementBonus = Math.log(totalEngagement + 1) * 10 * engagementWeight;
  score += engagementBonus;

  // Recency bonus
  const recencyBonus = calculateRecencyScore(post.publishedAt) * recencyWeight;
  score += recencyBonus;

  // Platform matching bonus
  const matchesPlatform = targetPlatformId ? post.platformId === targetPlatformId : false;
  if (matchesPlatform) {
    score += 50;
  }

  // Content quality bonus (optimal LinkedIn length: 1200-1800)
  const contentLength = post.content?.length || 0;
  if (contentLength >= 1200 && contentLength <= 1800) {
    score += 30; // Ideal LinkedIn length bonus (increased from 20)
  } else if (contentLength >= 800 && contentLength <= 2000) {
    score += 15; // Good length
  } else if (contentLength < 300) {
    score -= 30; // Too short for LinkedIn
  }

  // NOUVEAU: Bonus pour posts avec bon engagement rate
  if (totalEngagement > 50) {
    score += 25; // High performer bonus
  }

  // FUTUR: Bonus favoris (préparé pour metadata.isFavorite)
  // if (post.metadata?.isFavorite) {
  //   score += 200; // Massive bonus for favorites
  // }

  return { post, score, matchesPlatform };
}
```

#### 4.2 Améliorer le formatage des posts pour le prompt

```typescript
// MODIFIER formatPostsForPrompt (lignes 162-205)
export function formatPostsForPrompt(posts: HistoricalPost[]): string {
  if (posts.length === 0) {
    return '';
  }

  const formattedPosts = posts
    .map((post, index) => {
      let formatted = `### Example ${index + 1}`;

      // Add date
      if (post.publishedAt) {
        const date = new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        formatted += ` (${date})`;
      }

      formatted += '\n';

      // Add engagement with context
      const engagement = post.engagement || {};
      const totalEngagement = calculateTotalEngagement(post);
      if (totalEngagement > 10) {
        const metrics: string[] = [];
        if (engagement.views) metrics.push(`${engagement.views} views`);
        if (engagement.likes) metrics.push(`${engagement.likes} likes`);
        if (engagement.comments) metrics.push(`${engagement.comments} comments`);
        if (engagement.shares) metrics.push(`${engagement.shares} shares`);
        if (metrics.length > 0) {
          // Add performance indicator
          let performanceLevel = 'Average';
          if (totalEngagement > 100) performanceLevel = 'HIGH PERFORMER';
          else if (totalEngagement > 50) performanceLevel = 'Good';

          formatted += `_${performanceLevel}: ${metrics.join(', ')}_\n`;
        }
      }

      // Add analysis hints
      const contentLength = post.content?.length || 0;
      const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(post.content);
      const endsWithQuestion = post.content.trim().endsWith('?');

      formatted += `_Style: ${contentLength} chars, ${hasEmojis ? 'uses emojis' : 'no emojis'}, ${endsWithQuestion ? 'ends with question' : 'statement ending'}_\n`;

      // Add content
      formatted += '\n```\n';
      formatted += post.content.trim();
      formatted += '\n```';

      return formatted;
    })
    .join('\n\n');

  return formattedPosts;
}
```

---

### Phase 5 : Ajuster les Paramètres LLM (Impact: MOYEN)

**Fichier :** `src/config/constants.ts`

```typescript
// MODIFIER OPENAI
export const OPENAI = {
  DEFAULT_MODEL: 'gpt-4.1-mini',
  DEFAULT_MAX_TOKENS: 1500,  // Augmenté de 1000 à 1500 pour posts plus longs
  DEFAULT_TEMPERATURE: 0.7,

  // NOUVEAU: Paramètres par type d'opération
  GENERATION: {
    temperature: 0.8,      // Plus créatif pour génération initiale
    maxTokens: 1500,
  },
  ITERATION: {
    temperature: 0.3,      // Plus déterministe pour modifications précises
    maxTokens: 1500,
  },
} as const;
```

**Fichier :** `src/services/LLMService.ts`

```typescript
// MODIFIER la méthode generate pour supporter différentes températures
async generate(params: GenerateParams & { mode?: 'generation' | 'iteration' }): Promise<GenerateResponse> {
  // ...
  const mode = params.mode || 'generation';
  const temperature = params.temperature ??
    (mode === 'iteration' ? OPENAI.ITERATION.temperature : OPENAI.GENERATION.temperature);
  // ...
}
```

---

## Checklist d'Implémentation

### Phase 0 : LinkedIn Only Validation (Priorité CRITIQUE)
- [ ] Ajouter `SUPPORTED_PLATFORMS` et `isPlatformSupported()` dans `constants.ts`
- [ ] Ajouter validation dans `GenerateController.ts` (ligne ~53)
- [ ] Ajouter validation dans `PostVersionService.ts` pour les itérations
- [ ] Tester qu'un post Twitter/TikTok est bien refusé (erreur 400)
- [ ] Tester qu'un post LinkedIn passe

### Phase 1 : System Prompt (Priorité 1)
- [ ] Modifier `LLMService.ts` lignes 186-200 avec le nouveau system prompt
- [ ] Ajouter `LINKEDIN_GUIDELINES` dans `constants.ts`
- [ ] Tester avec 3 générations différentes

### Phase 2 : Prompt de Génération (Priorité 1)
- [ ] Remplacer `buildTaskSection` dans `promptBuilder.ts`
- [ ] Modifier `buildHistoricalPostsContext` dans `historicalPostSelector.ts`
- [ ] Tester avec et sans historical posts

### Phase 3 : Mode Chirurgical (Priorité 2)
- [ ] Remplacer `buildIterationTaskSection` dans `promptBuilder.ts`
- [ ] Tester avec des demandes simples ("change le hook", "raccourcis")
- [ ] Tester avec des demandes complexes

### Phase 4 : Sélection Posts (Priorité 3)
- [ ] Modifier `calculatePostScore` avec nouveaux bonus
- [ ] Modifier `formatPostsForPrompt` avec analyse du style
- [ ] Vérifier que les meilleurs posts sont sélectionnés

### Phase 5 : Paramètres LLM (Priorité 3)
- [ ] Ajouter les constantes GENERATION/ITERATION
- [ ] Modifier LLMService pour supporter le mode
- [ ] Modifier PostVersionService pour passer mode='iteration'

---

## Tests de Validation

### Test 0 : Validation LinkedIn Only

```
# Test rejet plateforme non-LinkedIn
Input: platformId = ID d'une plateforme "Twitter" ou "TikTok"
Attendu: HTTP 400 avec message "Generation is currently only supported for LinkedIn"
Échec si: La génération se lance

# Test acceptation LinkedIn
Input: platformId = ID d'une plateforme "LinkedIn"
Attendu: Génération normale
Échec si: Erreur de plateforme non supportée

# Test sans plateforme (comportement par défaut)
Input: platformId = null
Attendu: Génération normale (assume LinkedIn)
Échec si: Erreur
```

### Test 1 : Qualité du Hook
```
Input: "Je veux parler de l'importance de la régularité dans les side projects"
Attendu: Hook percutant (stat, question, ou opinion forte)
Échec si: Commence par "Dans cet article..." ou "Aujourd'hui je vais..."
```

### Test 2 : Respect du Style
```
Setup: Ajouter 3 historical posts sans emojis
Input: Générer un nouveau post
Attendu: Le post généré n'a PAS d'emojis
Échec si: Emojis ajoutés alors que les exemples n'en ont pas
```

### Test 3 : Modification Chirurgicale
```
Post initial: "La discipline bat le talent. [...]" (500 chars)
Demande: "Rends le hook plus percutant"
Attendu: Seul le hook change, reste du post identique
Échec si: Le body ou le CTA a changé
```

### Test 4 : Longueur Optimale
```
Input: Idée simple
Attendu: Post entre 1200-1800 caractères
Échec si: < 800 ou > 2500 caractères
```

---

## Métriques de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Itérations moyennes avant publication | ~4-5 | ≤ 2 |
| Posts avec hook faible | ~60% | < 20% |
| Itérations qui "cassent" le post | ~40% | < 10% |
| Respect du style (emojis, structure) | ~50% | > 85% |
| Longueur dans le sweet spot | ~40% | > 75% |

---

## Ordre d'Implémentation Recommandé

```
Jour 1: Phase 0 (LinkedIn Only Validation) + Tests
       ↓
Jour 1: Phase 1 (System Prompt) + Tests
       ↓
Jour 2: Phase 2 (Prompt Génération) + Tests
       ↓
Jour 3: Phase 3 (Mode Chirurgical) + Tests
       ↓
Jour 4: Phase 4 + 5 (Sélection + Params) + Tests finaux
       ↓
Jour 5: Tests d'intégration + Ajustements
```

---

## Notes Importantes

1. **Pas de nouvelles routes API** - Toutes les modifications sont dans le code existant
2. **Pas de migrations DB** - Le champ `isFavorite` est préparé mais pas implémenté
3. **Backward compatible** - Les posts existants continueront de fonctionner
4. **Testable immédiatement** - Chaque phase peut être testée indépendamment
