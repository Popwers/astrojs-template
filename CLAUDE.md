# CLAUDE.md

This file provides guidance for AI assistants working with this Astro.js template codebase.

## Project Overview

This is an **Astro 5** web application template with React integration, designed for building server-rendered websites with Strapi CMS as the backend. It includes authentication, user management, SEO optimization, and Docker deployment support.

## Tech Stack

- **Framework**: Astro 5 (SSR mode with Node adapter)
- **UI**: React 18 + Tailwind CSS 4 + SCSS
- **Backend**: Strapi CMS (headless)
- **State Management**: @legendapp/state
- **Build Tools**: Bun (preferred), Node.js (runtime)
- **Linting/Formatting**: Biome (NOT ESLint/Prettier)
- **Git Hooks**: Husky + commitlint (conventional commits)
- **CI/CD**: GitHub Actions + semantic-release
- **Deployment**: Docker

## Project Structure

```
src/
├── actions/          # Astro actions for form handling
│   ├── schema/       # Zod validation schemas for actions
│   └── utility/      # Action helpers (scopedRequest, translations)
├── assets/           # Static assets (icons, logos)
├── components/       # Astro and React components
│   └── site/global/  # Shared UI components
├── data/             # Static data (routes, menu, cookies, schema.org)
├── interfaces/       # TypeScript interfaces
├── layouts/          # Astro layout templates
├── lib/              # Utility functions (strapi client, cookies, schema.org)
├── middleware/       # Astro middleware chain
├── pages/            # File-based routing
├── stores/           # State management stores
└── styles/           # Global styles (tailwind.css, global.scss, normalize.scss)
```

## Path Aliases

Configured in `tsconfig.json`:

- `@pages/*` → `src/pages/*`
- `@styles/*` → `src/styles/*`
- `@layouts/*` → `src/layouts/*`
- `@components/*` → `src/components/*`
- `@assets/*` → `src/assets/*`
- `@data/*` → `src/data/*`
- `@lib/*` → `src/lib/*`
- `@interfaces/*` → `src/interfaces/*`
- `@stores/*` → `src/stores/*`
- `@actions/*` → `src/actions/*`

**Always use path aliases** instead of relative imports.

## Commands

```bash
# Development
npm run dev           # Start dev server at localhost:4321

# Build
npm run build         # Production build to ./dist/

# Production
npm run start         # Run production server

# Testing
bun test              # Run tests with Bun

# Utilities
npm run astro         # Run Astro CLI commands
npm run upgrade       # Upgrade Astro dependencies
```

## Code Style Guidelines

### Biome Configuration

This project uses **Biome** for linting and formatting (not ESLint/Prettier):

- **Indentation**: Tabs (width: 4)
- **Quotes**: Single quotes for JS/TS, single quotes for JSX
- **Semicolons**: Always
- **Trailing commas**: ES5 style
- **Line width**: 110 characters
- **Line ending**: LF

Run Biome manually:
```bash
bunx @biomejs/biome check --write .
```

### TypeScript

- Strict mode enabled via `astro/tsconfigs/strict`
- Always define interfaces in `src/interfaces/`
- Use explicit types for function parameters and return values

### Component Conventions

- **Astro components**: `.astro` extension, use for static/server-rendered content
- **React components**: `.tsx` extension, use for interactive client-side features
- Component files use PascalCase
- Place shared components in `src/components/site/global/`

## Key Architectural Patterns

### Middleware Chain

Located in `src/middleware/index.ts`, executes in order:

1. `userDataHydratation` - Loads user data from cookies into `context.locals`
2. `checkRegistration` - Verifies registration completion
3. `restrictedWhenNotLogged` - Protects authenticated routes
4. `restrictedWhenLogged` - Redirects logged-in users from auth pages

### Astro Actions

Server-side form handlers in `src/actions/`:

- `auth` - Login, register, logout, email confirmation
- `user` - User profile management
- `password` - Password reset flows

Actions use Zod schemas from `src/actions/schema/` for validation.

### Strapi Integration

- API client in `src/lib/strapi.ts`
- Uses `fetchApi()` for GET requests, `submitApi()` for mutations
- Environment variables: `STRAPI_URL`, `STRAPI_TOKEN`
- All API calls have 30-second timeout

### Authentication

Cookie-based sessions with:
- `user_token` - JWT from Strapi
- `user_data` - Cached user object
- `user_data_timestamp` - Cache invalidation timestamp

Cookies configured in `src/data/cookieOptions.ts` (7-day expiry, httpOnly, secure).

### Route Protection

Defined in `src/data/routes.ts`:
- `RESTRICTED_WHEN_LOGGED_IN` - Auth pages (login, register, etc.)
- `RESTRICTED_WHEN_LOGGED_OUT` - Dashboard pages
- `NEED_REGISTER_ROUTES` - Routes requiring completed registration

## Environment Variables

Copy `.env.example` to `.env`:

```bash
STRAPI_URL=          # Strapi API URL
STRAPI_TOKEN=        # Strapi API token
```

Environment schema defined in `astro.config.mjs` using `envField`.

## Git Workflow

### Commit Messages

Uses conventional commits (enforced by commitlint):

```
type(scope): description

# Types: feat, fix, docs, style, refactor, test, chore
# Examples:
feat(auth): add password reset flow
fix(api): handle timeout errors
chore(deps): update dependencies
```

### Pre-commit Hooks

Husky runs on commit:
1. `bun test` - All tests must pass
2. `biome check --write --staged` - Format and lint staged files

### Releases

Semantic-release on `main` branch:
- Analyzes commits to determine version bump
- Generates changelog
- Creates GitHub release

## Docker Deployment

Multi-stage Dockerfile:
1. `base` - Node.js Alpine with dependencies
2. `prod-deps` - Production dependencies only
3. `build` - Build application
4. `runtime` - Minimal production image

```bash
docker build -t astro-app .
docker run -p 4321:4321 astro-app
```

## SEO Setup

- `astro-seo` for meta tags
- `astro-capo` for optimal head ordering
- `astro-seo-schema` for Schema.org structured data
- Configuration in `src/data/schema.org.ts`
- Sitemap auto-generated via `@astrojs/sitemap`

## Important Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro configuration, integrations, env schema |
| `biome.json` | Linting and formatting rules |
| `tsconfig.json` | TypeScript config with path aliases |
| `src/middleware/index.ts` | Middleware chain definition |
| `src/actions/index.ts` | Server action exports |
| `src/data/routes.ts` | Route protection definitions |
| `src/lib/strapi.ts` | Strapi API client |

## Common Tasks

### Adding a New Page

1. Create `.astro` file in `src/pages/`
2. Import appropriate layout from `@layouts/`
3. Add to route protection arrays if needed (`src/data/routes.ts`)

### Adding a New Action

1. Create Zod schema in `src/actions/schema/`
2. Create action handler in `src/actions/`
3. Export from `src/actions/index.ts`

### Adding a New Component

1. Create in `src/components/site/global/` for shared components
2. Use `.astro` for server components, `.tsx` for interactive React components
3. Import using path alias: `@components/site/global/ComponentName`

## Testing

```bash
bun test              # Run all tests
bun test --watch      # Watch mode
```

Tests run automatically in pre-commit hook and must pass.

## Troubleshooting

- **Biome errors**: Run `bunx @biomejs/biome check --write .`
- **Type errors**: Run `npm run astro check`
- **Strapi connection**: Verify `STRAPI_URL` and `STRAPI_TOKEN` in `.env`
- **Build cache issues**: Delete `./buildCache/` directory
