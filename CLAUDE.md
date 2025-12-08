# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brandium is a backend API for personalized social media post generation using AI. It manages user authentication, profiles (personas), projects, platforms (LinkedIn, X, TikTok), and generates content via OpenAI.

**Tech Stack:** Node.js + Express 5.x + TypeScript + Sequelize ORM + PostgreSQL + JWT auth + OpenAI API

## Common Commands

```bash
# Development
npm run dev              # Start with hot reload (ts-node + nodemon)
npm run build            # Compile TypeScript to JavaScript
npm start                # Production mode (runs compiled JS)

# Type Checking
npm run typecheck        # Check types without compiling

# Testing
npm test                 # Run tests in watch mode
npm run test:coverage    # Run with coverage report

# Linting & Formatting
npm run lint             # Check code
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier

# Database
npm run setup            # Initial PostgreSQL setup (creates user + databases)
npm run db:migrate       # Run migrations
npm run db:migrate:undo  # Undo last migration
npm run db:seed          # Run all seeders
npm run db:reset         # Undo all + migrate + seed

# Create new migration/seeder (these stay in JavaScript)
npx sequelize-cli migration:generate --name <name>
npx sequelize-cli seed:generate --name <name>
```

## Architecture

```text
src/                        # TypeScript source files
├── app.ts                  # Express server, middleware setup, route mounting
├── config/
│   ├── database.ts         # Sequelize config (dev/test/prod environments)
│   └── constants.ts        # App constants
├── controllers/            # Route handlers
│   ├── AuthController.ts
│   ├── GenerateController.ts        # Post generation + variants
│   ├── HookGenerationController.ts  # Hook suggestions (NEW)
│   ├── TemplateController.ts        # Template CRUD (NEW)
│   ├── PostIterationController.ts   # Specialized iterations
│   └── ...
├── middleware/             # authMiddleware (JWT verification), validation, error handling
├── models/                 # Sequelize models with TypeScript interfaces
│   ├── Template.ts         # (NEW)
│   ├── PostVersion.ts      # Enhanced with iterationType, approach, format
│   ├── PostIdea.ts         # (NEW)
│   └── ...
├── routes/                 # API route definitions
│   ├── templates.ts        # (NEW)
│   ├── generate.ts         # Enhanced with hooks endpoint
│   └── ...
├── services/               # Business logic
│   ├── LLMService.ts       # OpenAI integration
│   ├── HookGenerationService.ts     # (NEW)
│   ├── TemplateService.ts           # (NEW)
│   ├── VariantGenerationService.ts  # (NEW)
│   └── ...
├── utils/                  # Helpers
│   ├── promptBuilder.ts             # AI context construction
│   ├── iterationPromptBuilder.ts    # (NEW) Specialized iteration prompts
│   └── ...
└── types/                  # Custom TypeScript type definitions
    ├── hook.ts             # (NEW)
    ├── iteration.ts        # (NEW)
    ├── template.ts         # (NEW)
    ├── variant.ts          # (NEW)
    └── ...

dist/                       # Compiled JavaScript (git ignored)
migrations/                 # Sequelize migrations (JavaScript - CLI requirement)
├── 20251207140538-create-templates.js  # (NEW)
└── ...
seeders/                    # Database seeders (JavaScript - CLI requirement)
├── 20251207141502-default-templates.js # (NEW)
└── ...
tests/
├── unit/                   # Unit tests
│   ├── hookGenerationService.test.ts    # (NEW)
│   ├── templateService.test.ts          # (NEW)
│   ├── iterationPromptBuilder.test.ts   # (NEW)
│   ├── variantGenerationService.test.ts # (NEW)
│   └── ...
└── integration/            # API tests
    ├── hookGeneration.test.ts           # (NEW)
    ├── templates.test.ts                # (NEW)
    ├── templateEdgeCases.test.ts        # (NEW)
    ├── specializedIterations.test.ts    # (NEW)
    ├── variantGeneration.test.ts        # (NEW)
    └── ...
```

## Data Models

- **User**: Authentication (email, passwordHash)
- **Profile**: Personas with name, bio, toneTags, doRules, dontRules (JSONB arrays)
- **Project**: name, description, audience, keyMessages
- **Platform**: name, styleGuidelines, maxLength
- **Post**: Links profile/project/platform + goal, rawIdea, generatedText
- **PostVersion**: versionNumber, generatedText, iterationPrompt, iterationType, approach, format, isSelected, promptTokens, completionTokens
- **PostIdea**: title, description, suggestedGoal, relevanceScore, tags (JSONB), generationContext (JSONB), isUsed, usedAt
- **Template**: name, description, category, content, variables (JSONB), exampleVariables (JSONB), tags (JSONB), isSystem, isPublic, usageCount
- **HistoricalPost**: content, publishedAt, externalUrl, engagement (JSONB), metadata (JSONB)

All models use UUID primary keys and belong to User via `userId` foreign key.

## API Structure

All endpoints under `/api/` are protected by JWT except:

- `GET /health` - Health check
- `POST /api/auth/register` and `POST /api/auth/login`

### Main Endpoints

- `POST /api/generate` - Generate post (supports variants parameter)
- `POST /api/generate/hooks` - Generate hook suggestions
- `POST /api/generate/from-template` - Generate from template
- `POST /api/posts/:id/iterate` - Create iteration (supports specialized types: shorter, stronger_hook, more_personal, add_data, simplify, custom)
- `POST /api/ideas/generate` - Generate post ideas
- Template CRUD: `GET/POST/PUT/DELETE /api/templates`
- Template actions: `POST /api/templates/:id/render`, `POST /api/templates/:id/duplicate`
- Template discovery: `GET /api/templates/suggestions`, `POST /api/templates/find-similar`, `GET /api/templates/statistics`

## Code Principles

**Priorities:** Maintainability, scalability, and clean code.

- **DRY (Don't Repeat Yourself)**: Extract shared logic into reusable functions in `utils/` or `services/`
- **Single Responsibility**: Each function/module should do one thing well
- **Small Functions**: Keep functions focused and under ~30 lines when possible
- **Separation of Concerns**: Controllers handle HTTP, services handle business logic, models handle data
- **Meaningful Names**: Use descriptive variable/function names that explain intent
- **Early Returns**: Prefer early returns over deeply nested conditionals
- **Type Safety**: Leverage TypeScript's type system, avoid `any` when possible

## Code Style

- **TypeScript**: ES modules with `import`/`export` for `src/` files
- **JavaScript**: CommonJS (`require`/`module.exports`) for migrations/seeders (Sequelize CLI requirement)
- Single quotes, semicolons, 2-space indent
- Unused function parameters prefixed with `_` (e.g., `_next`)
- ESLint configured in `eslint.config.js` with TypeScript support
- Strict TypeScript mode enabled (`strict: true` in tsconfig.json)

## TypeScript Guidelines

- Define interfaces for all data structures
- Use explicit return types for public functions
- Prefer `interface` over `type` for object shapes
- Use `unknown` instead of `any` when type is truly unknown
- Leverage utility types (Partial, Pick, Omit, etc.)

## Environment Variables

Required in `.env` (copy from `.env.example`):
- `JWT_SECRET` - Must be secure random string in production
- `OPENAI_API_KEY` - OpenAI API key
- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `CORS_ORIGIN` - Frontend URL (default: `http://localhost:3000`)

## Sequelize CLI Configuration

Paths configured in `.sequelizerc`:
- Config: `src/config/database.js` (compiled from TypeScript or kept as JS for CLI compatibility)
- Models: `src/models/`
- Migrations: `migrations/` (JavaScript files)
- Seeders: `seeders/` (JavaScript files)

**Note:** Sequelize CLI doesn't support TypeScript natively. Migrations and seeders remain in JavaScript, while models are written in TypeScript.
