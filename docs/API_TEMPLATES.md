# Templates API - Guide Complet

## Vue d'ensemble

Les templates permettent de créer des structures de posts réutilisables avec des variables dynamiques. Parfait pour standardiser vos posts récurrents tout en maintenant la personnalisation.

## Catégories de Templates

### Liste complète des catégories

| Category | Description | Icon | Cas d'usage |
|----------|-------------|------|-------------|
| `announcement` | Lancements produit, nouvelles entreprise | 📢 | Nouvelle feature, partenariat, acquisition |
| `tutorial` | Guides pratiques, how-to | 📚 | Step-by-step, explications techniques |
| `experience` | Histoires personnelles, leçons apprises | 💭 | Échecs, succès, insights |
| `question` | Sondages, discussions | ❓ | Engagement, feedback communauté |
| `tip` | Conseils rapides, astuces | 💡 | Quick wins, productivity hacks |
| `milestone` | Célébrations, anniversaires | 🎯 | Objectifs atteints, anniversaires |
| `behind-the-scenes` | Coulisses, process | 🎬 | Culture d'équipe, day-in-the-life |
| `testimonial` | Success stories clients | ⭐ | Social proof, cas clients |
| `poll` | Votes, enquêtes | 📊 | Feedback, préférences |
| `event` | Webinars, conférences | 📅 | Meetups, workshops |

---

## Système de Variables

### Syntaxe

Les variables utilisent la syntaxe double accolade :

```text
{{variable_name}}
```

### Types de variables

#### 1. Variables requises

```json
{
  "name": "product_name",
  "description": "Nom du produit à annoncer",
  "required": true
}
```

#### 2. Variables optionnelles avec valeur par défaut

```json
{
  "name": "cta_text",
  "description": "Texte du call-to-action",
  "required": false,
  "defaultValue": "En savoir plus"
}
```

---

## Exemples de Templates par Catégorie

### 1. Announcement (📢)

#### Product Launch

```json
{
  "name": "Product Launch - Standard",
  "category": "announcement",
  "description": "Template pour annoncer un nouveau produit",
  "content": "🚀 Excited to announce {{product_name}}!\n\n{{product_description}}\n\n✨ Key features:\n• {{feature_1}}\n• {{feature_2}}\n• {{feature_3}}\n\n{{cta}}",
  "variables": [
    {
      "name": "product_name",
      "description": "Product name",
      "required": true
    },
    {
      "name": "product_description",
      "description": "Brief description (1-2 sentences)",
      "required": true
    },
    {
      "name": "feature_1",
      "description": "First key feature",
      "required": true
    },
    {
      "name": "feature_2",
      "description": "Second key feature",
      "required": true
    },
    {
      "name": "feature_3",
      "description": "Third key feature",
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
    "product_description": "A productivity tool that helps teams prioritize and collaborate effortlessly.",
    "feature_1": "AI-powered task prioritization",
    "feature_2": "Real-time collaboration",
    "feature_3": "Seamless integrations with 50+ tools",
    "cta": "Start your free trial →"
  }
}
```

**Résultat rendu :**

```text
🚀 Excited to announce QuickTask Pro!

A productivity tool that helps teams prioritize and collaborate effortlessly.

✨ Key features:
• AI-powered task prioritization
• Real-time collaboration
• Seamless integrations with 50+ tools

Start your free trial →
```

---

### 2. Tutorial (📚)

#### How-To Guide

```json
{
  "name": "How-To Guide - 3 Steps",
  "category": "tutorial",
  "description": "Guide pratique en 3 étapes",
  "content": "How to {{action}} in {{timeframe}}:\n\n1️⃣ {{step_1}}\n{{step_1_detail}}\n\n2️⃣ {{step_2}}\n{{step_2_detail}}\n\n3️⃣ {{step_3}}\n{{step_3_detail}}\n\n💡 Pro tip: {{pro_tip}}\n\nWhat's your experience with this? 👇",
  "variables": [
    {
      "name": "action",
      "description": "The action to accomplish",
      "required": true
    },
    {
      "name": "timeframe",
      "description": "How long it takes",
      "required": true
    },
    {
      "name": "step_1",
      "description": "First step title",
      "required": true
    },
    {
      "name": "step_1_detail",
      "description": "First step details",
      "required": true
    },
    {
      "name": "step_2",
      "description": "Second step title",
      "required": true
    },
    {
      "name": "step_2_detail",
      "description": "Second step details",
      "required": true
    },
    {
      "name": "step_3",
      "description": "Third step title",
      "required": true
    },
    {
      "name": "step_3_detail",
      "description": "Third step details",
      "required": true
    },
    {
      "name": "pro_tip",
      "description": "Additional expert tip",
      "required": false,
      "defaultValue": "Practice makes perfect!"
    }
  ]
}
```

---

### 3. Experience (💭)

#### Lesson Learned

```json
{
  "name": "Lesson Learned - Story",
  "category": "experience",
  "description": "Partager une leçon apprise",
  "content": "{{time_ago}}, I made a mistake that taught me {{lesson}}.\n\nHere's what happened:\n\n{{situation}}\n\n{{what_went_wrong}}\n\nWhat I learned:\n{{key_takeaway}}\n\nNow I always {{new_behavior}}.\n\nAnyone else learned this the hard way?",
  "variables": [
    {
      "name": "time_ago",
      "description": "When did this happen",
      "required": true
    },
    {
      "name": "lesson",
      "description": "The main lesson in one sentence",
      "required": true
    },
    {
      "name": "situation",
      "description": "Context of the situation",
      "required": true
    },
    {
      "name": "what_went_wrong",
      "description": "What went wrong",
      "required": true
    },
    {
      "name": "key_takeaway",
      "description": "The actionable takeaway",
      "required": true
    },
    {
      "name": "new_behavior",
      "description": "The behavior you changed",
      "required": true
    }
  ]
}
```

---

### 4. Question (❓)

#### Discussion Starter

```json
{
  "name": "Discussion Question",
  "category": "question",
  "description": "Lancer une discussion",
  "content": "{{hook_question}}\n\n{{context}}\n\nI've noticed {{observation}}.\n\nMy take: {{your_opinion}}\n\nBut I'm curious:\n{{main_question}}\n\nDrop your thoughts below 👇",
  "variables": [
    {
      "name": "hook_question",
      "description": "Opening question to grab attention",
      "required": true
    },
    {
      "name": "context",
      "description": "Brief context (1-2 sentences)",
      "required": true
    },
    {
      "name": "observation",
      "description": "What you've observed",
      "required": true
    },
    {
      "name": "your_opinion",
      "description": "Your perspective",
      "required": true
    },
    {
      "name": "main_question",
      "description": "The main question you're asking",
      "required": true
    }
  ]
}
```

---

### 5. Tip (💡)

#### Quick Tip

```json
{
  "name": "Quick Productivity Tip",
  "category": "tip",
  "description": "Astuce rapide et actionnable",
  "content": "💡 Quick tip: {{tip_title}}\n\n{{problem_it_solves}}\n\n✅ How to do it:\n{{action_steps}}\n\n⏱️ Time to implement: {{time_needed}}\n\n📊 Expected result: {{expected_outcome}}\n\nTry it and let me know how it goes!",
  "variables": [
    {
      "name": "tip_title",
      "description": "Short title of the tip",
      "required": true
    },
    {
      "name": "problem_it_solves",
      "description": "What problem does this solve",
      "required": true
    },
    {
      "name": "action_steps",
      "description": "Clear action steps",
      "required": true
    },
    {
      "name": "time_needed",
      "description": "How long to implement",
      "required": false,
      "defaultValue": "5 minutes"
    },
    {
      "name": "expected_outcome",
      "description": "What they'll achieve",
      "required": true
    }
  ]
}
```

---

### 6. Milestone (🎯)

#### Achievement Celebration

```json
{
  "name": "Milestone Celebration",
  "category": "milestone",
  "description": "Célébrer un jalon important",
  "content": "🎯 {{milestone_achieved}}!\n\n{{journey_start}}\n\n{{challenges_faced}}\n\nKey learnings along the way:\n• {{learning_1}}\n• {{learning_2}}\n• {{learning_3}}\n\n{{gratitude}}\n\nHere's to the next chapter! 🚀",
  "variables": [
    {
      "name": "milestone_achieved",
      "description": "The milestone (e.g., '1 year in business')",
      "required": true
    },
    {
      "name": "journey_start",
      "description": "How it started",
      "required": true
    },
    {
      "name": "challenges_faced",
      "description": "Main challenges overcome",
      "required": true
    },
    {
      "name": "learning_1",
      "description": "First key learning",
      "required": true
    },
    {
      "name": "learning_2",
      "description": "Second key learning",
      "required": true
    },
    {
      "name": "learning_3",
      "description": "Third key learning",
      "required": true
    },
    {
      "name": "gratitude",
      "description": "Who/what to thank",
      "required": false,
      "defaultValue": "Thank you to everyone who supported this journey."
    }
  ]
}
```

---

## API Endpoints

### Créer un template

```bash
POST /api/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Product Announcement",
  "description": "Template for product launches",
  "category": "announcement",
  "content": "Excited to announce {{product}}!...",
  "variables": [...],
  "exampleVariables": {...},
  "tags": ["product", "launch"],
  "isPublic": false
}
```

### Générer depuis un template

```bash
POST /api/generate/from-template
Authorization: Bearer {token}
Content-Type: application/json

{
  "templateId": "uuid",
  "variables": {
    "product_name": "My Product",
    "feature_1": "Amazing feature"
  },
  "profileId": "uuid",  // Optional - for tone/style
  "platformId": "uuid"  // Optional - for platform guidelines
}
```

### Trouver des templates similaires

```bash
POST /api/templates/find-similar
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "I want to announce a new feature...",
  "limit": 5
}
```

---

## Bonnes Pratiques

### 1. Naming Convention

✅ **BON** : "Product Launch - Tech SaaS"
❌ **MAUVAIS** : "template1"

### 2. Variables claires

✅ **BON** :
```json
{
  "name": "product_description",
  "description": "Brief product description (1-2 sentences, max 280 chars)"
}
```

❌ **MAUVAIS** :
```json
{
  "name": "desc",
  "description": "description"
}
```

### 3. Utiliser des exemples

Toujours fournir `exampleVariables` pour montrer le résultat attendu.

### 4. Tags pertinents

```json
{
  "tags": ["product", "launch", "saas", "b2b"]
}
```

Aide à la recherche et à l'organisation.

---

## Templates Système

Brandium inclut des templates système (`isSystem: true`) :

- Non modifiables
- Accessibles à tous les utilisateurs
- Couvrent les cas d'usage les plus communs
- Servent de point de départ

Pour les utiliser, dupliquez-les et personnalisez !

---

## FAQ

**Q: Peut-on utiliser des variables dans les variables ?**
A: Non, les variables ne sont pas récursives.

**Q: Combien de variables maximum ?**
A: Pas de limite technique, mais 10-15 max pour rester maintenable.

**Q: Peut-on partager des templates ?**
A: Oui, avec `isPublic: true`. Les autres utilisateurs peuvent les voir et les dupliquer.

**Q: Comment supprimer une variable d'un template ?**
A: Utilisez `PUT /api/templates/:id` avec la nouvelle liste de variables.

---

*Documentation générée automatiquement - Dernière mise à jour: Décembre 2024*
