# Guide de Tests - Brandium Backend

## Vue d'ensemble

Le projet maintient une couverture de code élevée (~93%) avec 829 tests automatisés. Ce guide explique comment écrire, exécuter et maintenir les tests.

---

## Structure des Tests

```text
tests/
├── unit/                              # Tests unitaires (services, utils)
│   ├── authController.test.ts
│   ├── hookGenerationService.test.ts
│   ├── templateService.test.ts
│   ├── iterationPromptBuilder.test.ts
│   ├── variantGenerationService.test.ts
│   └── ...
└── integration/                       # Tests d'intégration (API endpoints)
    ├── auth.test.ts
    ├── profiles.test.ts
    ├── generate.test.ts
    ├── hookGeneration.test.ts
    ├── templates.test.ts
    ├── templateEdgeCases.test.ts
    ├── specializedIterations.test.ts
    ├── variantGeneration.test.ts
    └── ...
```

---

## Commandes

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/integration/templates.test.ts

# Run tests matching pattern
npm test -- -t "should generate hooks"

# Run with debug output
npm test -- --verbose
```

---

## Coverage Actuel

### Vue d'ensemble

```text
Statements   : 93.15% ✅ (2056/2207)
Branches     : 86.72% ⚠️  (1006/1160)
Functions    : 98.21% ✅ (220/224)
Lines        : 93.34% ✅ (1936/2074)
```

### Par Catégorie

| Category | Statements | Branches | Functions | Lines |
|----------|-----------|----------|-----------|-------|
| **Controllers** | 87.69% | 83.36% | 100% | 87.05% |
| **Services** | 96.13% | 87.39% | 96.73% | 97.07% |
| **Middleware** | 97.43% | 97.22% | 83.33% | 97.4% |
| **Models** | 100% | 75% | 100% | 100% |
| **Routes** | 100% | 100% | 100% | 100% |
| **Utils** | 98.19% | 91.2% | 100% | 98.63% |

### Fichiers avec coverage < 90%

| File | Coverage | Lignes non couvertes | Raison |
|------|----------|----------------------|--------|
| HookGenerationController.ts | 58.06% | 21-25, 30-34, 76-106 | Validations redondantes + error handling |
| TemplateController.ts | 82.4% | 46, 64-68, 87, etc. | Error paths difficiles à atteindre |

> **Note**: Les lignes non couvertes sont principalement du code défensif redondant déjà géré par les validateurs middleware.

---

## Écrire des Tests

### Tests d'Intégration

#### Structure de base

```typescript
import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Template } from '../../src/models';

describe('Feature API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear database
    await Template.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Register test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    authToken = res.body.token;
    userId = res.body.user.id;
  });

  describe('POST /api/your-endpoint', () => {
    it('should handle success case', async () => {
      const res = await request(app)
        .post('/api/your-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: 'value' })
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should return 404 for non-existent resource', async () => {
      await request(app)
        .get('/api/your-endpoint/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/your-endpoint')
        .send({ data: 'value' })
        .expect(401);
    });
  });
});
```

#### Bonnes pratiques

1. **Isolation complète** - Chaque test est indépendant
2. **Nettoyage** - beforeEach clear la DB
3. **Test des erreurs** - Pas seulement les success paths
4. **Assertions claires** - Testez la structure de la réponse

---

### Tests Unitaires

#### Exemple: Service

```typescript
import { TemplateService } from '../../src/services/TemplateService';
import { Template, User } from '../../src/models';
import { sequelize } from '../../src/config/database';

describe('TemplateService', () => {
  let service: TemplateService;
  let testUserId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    service = new TemplateService();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Template.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });

    const user = await User.create({
      email: 'test@example.com',
      passwordHash: 'hash',
    });
    testUserId = user.id;
  });

  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
      const template = await service.createTemplate({
        userId: testUserId,
        name: 'Test Template',
        category: 'announcement',
        content: 'Hello {{name}}',
        variables: [{ name: 'name', description: 'Name', required: true }],
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.variables).toHaveLength(1);
    });

    it('should validate variables match content', async () => {
      await expect(
        service.createTemplate({
          userId: testUserId,
          name: 'Invalid',
          category: 'announcement',
          content: 'Hello {{name}}',
          variables: [{ name: 'wrong', description: 'Wrong', required: true }],
        })
      ).rejects.toThrow('validation failed');
    });
  });
});
```

---

### Tests avec Mocks

#### Mock LLMService

```typescript
import { llmService } from '../../src/services/LLMService';

jest.mock('../../src/services/LLMService', () => ({
  llmService: {
    generate: jest.fn(),
  },
}));

const mockGenerate = llmService.generate as jest.Mock;

describe('Hook Generation', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it('should generate hooks', async () => {
    mockGenerate.mockResolvedValueOnce({
      text: '[TYPE: question]\n[HOOK: Test hook?]\n[ENGAGEMENT: 8]',
      usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
    });

    const response = await request(app)
      .post('/api/generate/hooks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rawIdea: 'Test' });

    expect(response.status).toBe(200);
    expect(response.body.data.hooks).toHaveLength(1);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
});
```

---

## Patterns de Tests Courants

### 1. Test CRUD Complet

```typescript
describe('Complete CRUD Flow', () => {
  it('should create, read, update, and delete', async () => {
    // CREATE
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test' })
      .expect(201);

    const id = createRes.body.data.id;

    // READ
    await request(app)
      .get(`/api/resources/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // UPDATE
    await request(app)
      .put(`/api/resources/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Updated' })
      .expect(200);

    // DELETE
    await request(app)
      .delete(`/api/resources/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify deletion
    await request(app)
      .get(`/api/resources/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
```

### 2. Test Isolation Utilisateur

```typescript
it('should not allow access to other user resources', async () => {
  // User 1 creates resource
  const res1 = await request(app)
    .post('/api/resources')
    .set('Authorization', `Bearer ${user1Token}`)
    .send({ name: 'User 1 Resource' })
    .expect(201);

  const resourceId = res1.body.data.id;

  // User 2 should NOT access it
  await request(app)
    .get(`/api/resources/${resourceId}`)
    .set('Authorization', `Bearer ${user2Token}`)
    .expect(404);
});
```

### 3. Test Validation

```typescript
describe('Validation', () => {
  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid', password: 'Password123' })
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
    expect(res.body.details).toBeDefined();
  });

  it('should reject missing required field', async () => {
    await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({}) // Missing name
      .expect(400);
  });
});
```

### 4. Test Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle empty arrays', async () => {
    const res = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('should handle special characters', async () => {
    await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Name with "quotes" and \'apostrophes\'' })
      .expect(201);
  });

  it('should handle very long input', async () => {
    const longString = 'a'.repeat(10000);
    await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: longString })
      .expect(400); // Should validate max length
  });
});
```

---

## Coverage Best Practices

### Pour atteindre 90%+

1. **Testez tous les paths d'erreur**
   - 404 (ressource non trouvée)
   - 400 (validation échouée)
   - 401 (non authentifié)
   - 403 (non autorisé)
   - 500 (erreur serveur)

2. **Testez les edge cases**
   - Empty arrays
   - Null/undefined values
   - Limites de longueur
   - Caractères spéciaux

3. **Testez l'isolation**
   - Multi-users
   - Permissions
   - Soft deletes

4. **Testez les validations**
   - Required fields
   - Format validation
   - Business rules

---

## Débugger les Tests

### Tests qui échouent aléatoirement

```typescript
// Problème: Dépendance sur l'ordre d'exécution
// Solution: Isolation complète avec beforeEach

beforeEach(async () => {
  // TOUJOURS nettoyer la DB
  await Model.destroy({ where: {}, truncate: true, cascade: true });
});
```

### Tests lents

```typescript
// Problème: Trop de requêtes DB
// Solution: Batching et fixtures

beforeAll(async () => {
  // Create test data ONCE
  testData = await createTestFixtures();
});
```

### Logs pendant les tests

```bash
# Afficher plus de détails
npm test -- --verbose

# Afficher les logs console
npm test -- --silent=false
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run db:migrate
      - run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## FAQ

**Q: Pourquoi certains controllers ont-ils < 90% de coverage ?**
A: Les lignes non couvertes sont du code défensif redondant déjà géré par les validateurs middleware.

**Q: Comment mocker OpenAI API ?**
A: Utilisez `jest.mock('../../src/services/LLMService')` comme montré ci-dessus.

**Q: Les tests sont lents, que faire ?**
A: Utilisez `--runInBand` (déjà configuré) et créez des fixtures dans `beforeAll` plutôt que `beforeEach`.

**Q: Comment tester un endpoint qui envoie des emails ?**
A: Mockez le service d'email dans les tests.

---

## Checklist pour Nouvelle Feature

Avant de merger:

- [ ] Tests d'intégration pour tous les endpoints
- [ ] Tests unitaires pour la logique métier
- [ ] Test des cas d'erreur (404, 400, 401, 500)
- [ ] Test d'isolation utilisateur
- [ ] Coverage > 90% pour les nouveaux fichiers
- [ ] Tous les tests passent (`npm test`)
- [ ] Pas de tests skippés (`it.skip` ou `describe.skip`)

---

*Documentation mise à jour: Décembre 2024*
