# CLAUDE.md

## Project Overview

This is a TypeScript/Next.js learning project that demonstrates LLM tool-calling patterns through a practical application: an AI-powered packing checklist generator.

**Learning Goals:**
1. How to invoke tools from LLM responses
2. How to stream actions from the frontend
3. Implement a chat interface using streaming to collaborate with AI

**Application Features:**
- Conversational interface to gather trip details (destination, dates)
- Weather API integration to fetch forecasts for trip dates
- AI-generated packing recommendations based on trip context
- PDF generation from HTML checklist
- Real-time streaming of AI actions and tool invocations

## Development Commands

### Dependencies
```bash
# Install dependencies
npm install
```

### Next.js Development
```bash
# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Linting

This project uses **ESLint** with Next.js and TypeScript configurations.

```bash
# Run linter
npm run lint
```

#### ESLint Configuration

- Config file: `eslint.config.mjs` using flat config format with FlatCompat
- Extends `next/core-web-vitals` and `next/typescript`
- Strict TypeScript rules are set to "warn" to allow incremental fixes

#### Linting Patterns and Solutions

**Empty object return types:**
- DO NOT use `ActionResult<{}>` - it's ambiguous
- Use explicit union types: `Promise<{ success: true } | { success: false; error: string }>`

**External images:**
- Use inline disable for `@next/next/no-img-element` when displaying external CDN images
- Add comment explaining why Next.js Image component isn't needed

### Database Migrations

This project uses **Drizzle ORM** for database schema management and migrations.

#### Migration Commands
```bash
# Generate a new migration after changing lib/schema.ts
npm run db:generate

# Apply pending migrations to the database
npm run db:migrate

# Push schema changes directly to DB (dev only, skips migration files)
npm run db:push

# Pull existing database schema into TypeScript
npm run db:pull

# Launch Drizzle Studio (visual database browser)
npm run db:studio
```

#### Migration Workflow

**Making schema changes:**
1. Edit the schema definition in `lib/schema.ts`
2. Run `npm run db:generate` to create a timestamped migration SQL file
3. Review the generated SQL in `drizzle/migrations/`
4. Run `npm run db:migrate` to apply the migration
5. Commit both `lib/schema.ts` and the migration files

**Schema definition:**
- The TypeScript schema is in `lib/schema.ts`
- Drizzle auto-generates TypeScript types from the schema
- Use exported types in Server Actions and queries

**Migration files:**
- Stored in `drizzle/migrations/` (version controlled)
- Each migration is timestamped and tracked in `__drizzle_migrations` table
- Migrations are idempotent and safe to run multiple times

**For new databases:**
- Run `npm run db:migrate` to create tables and apply all migrations

## Architecture

### Core Components

**Database Schema** (`lib/schema.ts`)
- Drizzle ORM schema definition
- Auto-generates TypeScript types for type-safe queries
- Database connection managed by `lib/db.ts` singleton using libsql client
- Tables:
  - `conversations` - Chat history with AI
  - `checklists` - Generated packing checklists
  - `checklist_items` - Individual items in checklists
  - `tool_invocations` - Log of LLM tool calls for learning/debugging

**Weather Integration** (`lib/weather.ts`)
- Fetches weather forecasts for trip dates
- Used as a tool that the LLM can invoke
- Demonstrates async tool calling patterns

**PDF Generation** (`lib/pdf.ts`)
- Converts HTML checklist to PDF
- Server action for generating downloadable documents
- Demonstrates file generation as an LLM tool

**Chat Interface** (`app/chat/page.tsx`)
- Interactive streaming chat with AI
- Real-time display of tool invocations
- Message history and context management

**LLM Integration** (`lib/llm/`)
- Tool definition and registration system
- Streaming response handler
- Tool invocation parser and executor
- Example tools: weather fetching, PDF generation, checklist creation

### Database Schema

**Unified Database Client:**
- Uses `@libsql/client` for all environments (local development, production, CI)
- **Local Development**: Connects to local SQLite file via `file:./database.db` URL
- **Production/CI**: Connects to Turso (cloud SQLite) via HTTPS URL
- Database selection is automatic based on environment variables

**Connection Logic** (`lib/db.ts`):
- If `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set, connects to Turso
- Otherwise, uses local SQLite file via libsql's `file:` protocol
- Singleton pattern ensures one connection per process
- Returns Drizzle ORM instance for type-safe queries

**Schema:**
- Schema defined in `lib/schema.ts`
- Migrations stored in `drizzle/migrations/`

**Environment Variables:**
- `TURSO_DATABASE_URL`: Turso database URL (e.g., `libsql://db-name.turso.io`)
- `TURSO_AUTH_TOKEN`: Turso authentication token
- `WEATHER_API_KEY`: API key for weather service
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`: LLM provider credentials
- See `.env.example` for setup instructions

The local database file is encrypted with git-crypt and should not be committed unencrypted.

### Security & Secrets
- API keys should be stored in `.env.local` only

## CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/ci-cd.yml`):

**On every push/PR:**
1. Install dependencies (`npm ci`)
2. Run linter (`npm run lint`) - must pass with 0 errors
3. Run tests (`npm test`)
4. Build application (`npm run build`) - must succeed

**On push to main branch only:**
5. Run production database migrations on Turso
   - Uses `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from GitHub secrets
   - Automatically applies pending migrations to production database
6. Deploy to Vercel (only if migrations succeed)
   - Uses Vercel CLI to deploy to production
   - Ensures database is migrated before new code goes live

**On pull requests:**
7. Create or update Turso branch database for the PR via Platform API
   - Branch database named `packing-list-pr-<number>`
   - Seeded from production database (schema + data copy)
   - Provides isolated database for preview testing
8. Run migrations on branch database
9. Deploy preview to Vercel with branch database credentials (7-day tokens)
10. Comment on PR with preview URL and database info
11. Auto-cleanup branch database when PR closes (via API)

**GitHub Secrets Required:**
- `TURSO_DATABASE_URL`: Production database URL
- `TURSO_AUTH_TOKEN`: Production database auth token
- `TURSO_API_TOKEN`: Turso Platform API token for managing branch databases
- `TURSO_ORG_NAME`: Turso organization name
- `TURSO_PRIMARY_DB_NAME`: Name of primary database to branch from
- `VERCEL_TOKEN`: Vercel API token for deployments
- `VERCEL_ORG_ID`: Vercel organization/team ID
- `VERCEL_PROJECT_ID`: Vercel project ID

**Migration Strategy:**
- Local development: Migrations run against local `database.db`
- Production: Migrations auto-run via GitHub Actions on main branch merges
- Migration script (`lib/migrate.ts`) automatically detects environment

## Deployment

**Vercel Deployment:**

This project is configured for deployment on Vercel.

**Quick Start:**
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy

**Deployment Strategy:**
- **Production (main branch)**: Controlled by GitHub Actions
  - Automatic Vercel deployments are disabled for production
  - GitHub Actions runs migrations first, then deploys to Vercel
  - Ensures database schema is updated before new code goes live
- **Preview (pull requests)**: Controlled by GitHub Actions with Turso database branching
  - Each PR gets an isolated Turso database branch via Platform API
  - Branch database is seeded from production (schema + data copy)
  - Migrations run on branch database before preview deployment
  - Temporary credentials (7-day expiration) generated via API
  - Preview deployment uses branch database credentials
  - Safe testing of schema changes and features without affecting production
  - Branch database automatically deleted via API when PR closes
  - No CLI installation required - all operations use Turso Platform API

**Environment Variables Required in Vercel:**
- `TURSO_DATABASE_URL` - Production database URL
- `TURSO_AUTH_TOKEN` - Production database auth token
- `WEATHER_API_KEY` - Weather API credentials
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM provider credentials

## Development Workflow

### Test-Driven Development (TDD) - REQUIRED

**For ALL new features, Claude MUST follow strict TDD:**

1. **Write failing tests first** - Before any implementation code
2. **Run tests to confirm failure** - Verify test is meaningful
3. **Implement minimal code** - Just enough to make test pass
4. **Run tests to confirm pass** - Verify implementation works
5. **Suggest Refactor opportunities** - Improve code while keeping tests green
6. **Commit with tests** - Each feature includes its tests

**Exception:** User explicitly says "skip TDD" or "no tests needed" for specific work.

**Example TDD workflow:**
```bash
# 1. Write test
# 2. Run: npm test -- path/to/test.ts (should FAIL)
# 3. Implement feature
# 4. Run: npm test -- path/to/test.ts (should PASS)
# 5. Run: npm test (all tests should PASS)
# 6. Think about potential refactorings in the code base, given the added code. Suggest to the user if they want to implement any of those.
# 7. Commit with message including test coverage
```

### Refactoring Workflow - REQUIRED

**For ALL refactoring tasks, Claude MUST:**

1. **Analyze current code** - Identify refactoring opportunities
2. **Create refactoring plan** - Document proposed changes
3. **Present plan to user** - Wait for approval before proceeding
4. **Execute incrementally** - One refactoring at a time
5. **Test after each change** - Run `npm test` to verify no regression
6. **Commit after each refactoring** - Keep git history clean and logical

**Refactoring commit format:**
```
Refactor: <what was extracted/changed>

<Brief description of changes>

Changes:
- <Specific change 1>
- <Specific change 2>

Benefits:
- <Benefit 1>
- <Benefit 2>
```

### Code Organization Principles

**File organization:**

1. **Extract utility functions** - Pure functions go to `lib/` with tests
2. **Extract state management** - Reducers go to `state/` subdirectory with tests
3. **Extract components** - Large JSX blocks (>30 lines) become separate components
4. **Avoid inline objects** - Use factory functions for test fixtures
5. **Single responsibility** - Files should have one clear purpose

**File size targets:**
- Page components: ~400 lines or less
- Utility modules: ~100 lines or less
- Components: ~150 lines or less
- Test files: Unlimited (comprehensive coverage preferred)

**Module structure:**
```
feature/
├── page.tsx                 # Main page (orchestrator)
├── state/
│   ├── reducer.ts          # State management
│   └── reducer.test.ts     # Reducer tests
├── components/
│   ├── ComponentA.tsx      # UI component
│   └── ComponentB.tsx      # UI component
└── hooks/
    ├── useFeature.ts       # Custom hook
    └── useFeature.test.ts  # Hook tests
```

### Test Organization

**Shared test helpers:**
- Location: `lib/test-helpers/`
- Purpose: Eliminate duplicate mock factories

**Test file structure:**
```typescript
// 1. Imports
import { describe, it, expect } from 'vitest'
import { functionToTest } from './module'
import { createMockConversation } from '@/lib/test-helpers/fixtures'

// 2. Test fixtures (use shared factories when possible)
// Only create local fixtures if truly unique to this test

// 3. Test suites
describe('Feature', () => {
  describe('specific behavior', () => {
    it('does something specific', () => {
      // Arrange
      const input = createMockConversation({ id: 'test-123' })

      // Act
      const result = functionToTest(input)

      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

**Test factory guidelines:**
- Use shared factories from `lib/test-helpers/fixtures.ts`
- Only create inline objects when testing edge cases
- Override defaults using spread operator: `createMockConversation({ id: 'custom' })`

### Git Commit Strategy

**Incremental commits preferred:**
- One logical change per commit
- Tests should pass after each commit
- Clear, descriptive commit messages
- Include emoji when using Claude Code: 🤖

**Commit message format:**
```
<Type>: <Short description>

<Detailed description of changes>

<List of specific changes>
- Change 1
- Change 2

<Benefits or context>
- Benefit 1
- Benefit 2

All <N> tests passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring (no behavior change)
- `test:` - Adding or updating tests
- `docs:` - Documentation changes
- `chore:` - Build/tooling changes

### Example Session Patterns

**Adding a new feature (TDD):**
```
1. User: "Add weather tool for LLM"
2. Claude: "I'll use TDD. First, writing tests..."
3. Claude: Creates test file with failing tests
4. Claude: Runs tests (shows failures)
5. Claude: Implements function
6. Claude: Runs tests (shows passes)
7. Claude: Think about refactoring opportunities
8. Claude: Present the plan and ask for input
9. Claude: Commits with test coverage note
```

**Refactoring existing code:**
```
1. User: "Refactor the chat interface"
2. Claude: "I'll analyze and create a refactoring plan..."
3. Claude: Presents 5 refactoring opportunities
4. User: "Approve all"
5. Claude: Executes one at a time, testing after each
6. Claude: Commits after each successful refactoring
7. Claude: Provides summary of all changes
```

**When NOT to follow these patterns:**
- User explicitly requests different workflow
- Emergency hotfixes (but add tests after)
- Experimental/prototype code (but document as such)

## LLM Tool-Calling Patterns

### Tool Definition

Tools are defined in `lib/llm/tools/` with the following structure:

```typescript
export const weatherTool = {
  name: 'get_weather',
  description: 'Fetches weather forecast for a location and date range',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or coordinates' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
    },
    required: ['location', 'startDate', 'endDate']
  },
  execute: async (params) => {
    // Implementation
  }
}
```

### Streaming Responses

The chat interface demonstrates:
- Server-sent events for streaming LLM responses
- Real-time display of tool invocations
- Progressive UI updates as tools execute

### Tool Invocation Flow

1. User sends message
2. LLM determines if tools are needed
3. Tool calls streamed to frontend
4. Tools execute server-side
5. Results returned to LLM
6. LLM generates final response
7. Response streamed to user

## Future Work

See `Stories.md` for planned features and current priorities, including:
- Additional weather API providers
- More sophisticated packing algorithms
- PDF styling improvements
- Multi-day trip planning
- Collaborative checklist sharing
- Tool call analytics and debugging UI
