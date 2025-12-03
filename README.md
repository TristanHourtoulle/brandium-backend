# Brandium Backend API

Backend API for personalized post generation for personal branding.

## Overview

Brandium is a tool that helps you generate personalized social media posts using AI. It stores your profiles, projects, and platform preferences, then generates optimized content via OpenAI.

### Key Features

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Profiles**: Store multiple personas with tone, rules, and bio
- **Projects**: Manage your projects with audience and key messages
- **Platforms**: Configure platforms (LinkedIn, X, TikTok, etc.) with style guidelines
- **AI Generation**: Generate posts using OpenAI GPT-4.1-mini
- **Post History**: Track all generated posts

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express 5.x |
| ORM | Sequelize 6.x |
| Database | PostgreSQL 14+ |
| Auth | JWT + bcrypt |
| AI | OpenAI API |
| Validation | express-validator |
| Security | helmet, cors |

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (via Homebrew: `brew install postgresql@14`)
- OpenAI API key

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/TristanHourtoulle/brandium-backend.git
cd brandium-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (especially OPENAI_API_KEY)
```

### 3. Setup database

```bash
npm run setup
```

This will:
- Check PostgreSQL installation
- Create user `brandium_user`
- Create databases `brandium_dev` and `brandium_test`
- Configure permissions

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. (Optional) Seed demo data

```bash
npm run db:seed
```

### 6. Start the server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload (nodemon) |
| `npm start` | Start in production mode |
| `npm test` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run setup` | Setup PostgreSQL database |
| `npm run db:migrate` | Run migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:seed` | Run all seeders |
| `npm run db:reset` | Reset DB (undo all + migrate + seed) |

## API Endpoints

### Health Check

```
GET /health
```

### Authentication

```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login
GET  /api/auth/me          # Get current user (protected)
```

### Profiles (protected)

```
GET    /api/profiles       # List all profiles
GET    /api/profiles/:id   # Get profile by ID
POST   /api/profiles       # Create profile
PUT    /api/profiles/:id   # Update profile
DELETE /api/profiles/:id   # Delete profile
```

### Projects (protected)

```
GET    /api/projects       # List all projects
GET    /api/projects/:id   # Get project by ID
POST   /api/projects       # Create project
PUT    /api/projects/:id   # Update project
DELETE /api/projects/:id   # Delete project
```

### Platforms (protected)

```
GET    /api/platforms       # List all platforms
GET    /api/platforms/:id   # Get platform by ID
POST   /api/platforms       # Create platform
PUT    /api/platforms/:id   # Update platform
DELETE /api/platforms/:id   # Delete platform
```

### Generation (protected)

```
POST /api/generate         # Generate post via OpenAI
```

**Request body:**
```json
{
  "profileId": "uuid",
  "projectId": "uuid",
  "platformId": "uuid",
  "goal": "Announce new feature",
  "rawIdea": "Just launched adaptive quizzes in Edukai!"
}
```

### Posts (protected)

```
GET    /api/posts          # List all posts (paginated)
GET    /api/posts/:id      # Get post by ID
DELETE /api/posts/:id      # Delete post
```

## Data Models

### User
- `id` (UUID)
- `email` (unique)
- `passwordHash`
- `createdAt`, `updatedAt`

### Profile
- `id` (UUID)
- `userId` (FK)
- `name`
- `bio`
- `toneTags` (JSONB array)
- `doRules` (JSONB array)
- `dontRules` (JSONB array)

### Project
- `id` (UUID)
- `userId` (FK)
- `name`
- `description`
- `audience`
- `keyMessages` (JSONB array)

### Platform
- `id` (UUID)
- `userId` (FK)
- `name`
- `styleGuidelines`
- `maxLength` (nullable)

### Post
- `id` (UUID)
- `userId` (FK)
- `profileId` (FK, nullable)
- `projectId` (FK, nullable)
- `platformId` (FK, nullable)
- `goal`
- `rawIdea`
- `generatedText`
- `createdAt`

## Project Structure

```
brandium-backend/
├── src/
│   ├── app.js              # Express server setup
│   ├── config/
│   │   ├── database.js     # Sequelize configuration
│   │   └── constants.js    # App constants
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth, validation, errors
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── services/           # Business logic (LLM, etc.)
│   └── utils/              # Helper functions
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # API tests
├── migrations/             # Database migrations
├── seeders/                # Database seeders
├── scripts/
│   └── setup-db.sh         # Database setup script
├── .env.example            # Environment template
├── .sequelizerc            # Sequelize CLI config
├── jest.config.js          # Jest configuration
├── eslint.config.js        # ESLint configuration
└── package.json
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `brandium_dev` |
| `DB_USER` | Database user | `brandium_user` |
| `DB_PASSWORD` | Database password | `brandium_pass` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_MODEL` | OpenAI model | `gpt-4.1-mini` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Development

### Code Style

- ESLint for linting
- Prettier for formatting
- Single quotes, semicolons, 2-space indent

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Database Commands

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-field

# Create new seeder
npx sequelize-cli seed:generate --name demo-data

# Reset everything
npm run db:reset
```

## License

MIT
