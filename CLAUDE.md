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

```
src/                        # TypeScript source files
├── app.ts                  # Express server, middleware setup, route mounting
├── config/
│   ├── database.ts         # Sequelize config (dev/test/prod environments)
│   └── constants.ts        # App constants
├── controllers/            # Route handlers (Auth, Profile, Project, Platform, Post, Generate)
├── middleware/             # authMiddleware (JWT verification), validation, error handling
├── models/                 # Sequelize models with TypeScript interfaces
├── routes/                 # API route definitions
├── services/               # Business logic (LLMService for OpenAI)
├── utils/                  # Helpers (promptBuilder for AI context construction)
└── types/                  # Custom TypeScript type definitions

dist/                       # Compiled JavaScript (git ignored)
migrations/                 # Sequelize migrations (JavaScript - CLI requirement)
seeders/                    # Database seeders (JavaScript - CLI requirement)
tests/
├── unit/                   # Unit tests
└── integration/            # API tests
```

## Data Models

- **User**: Authentication (email, passwordHash)
- **Profile**: Personas with name, bio, toneTags, doRules, dontRules (JSONB arrays)
- **Project**: name, description, audience, keyMessages
- **Platform**: name, styleGuidelines, maxLength
- **Post**: Links profile/project/platform + goal, rawIdea, generatedText

All models use UUID primary keys and belong to User via `userId` foreign key.

## API Structure

All endpoints under `/api/` are protected by JWT except:
- `GET /health` - Health check
- `POST /api/auth/register` and `POST /api/auth/login`

Generation endpoint `POST /api/generate` takes profileId, projectId, platformId, goal, rawIdea and returns AI-generated post content.

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
