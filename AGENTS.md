# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router routes, layouts, API routes.
- `components/`: Reusable UI and feature components (PascalCase exports, kebab-case files).
- `lib/`: Utilities, helpers, and shared logic.
- `prisma/`: `schema.prisma`, migrations, and seeds.
- `__tests__/`: Jest + Testing Library test suites (`*.test.tsx`).
- `public/`: Static assets. `types/`, `hooks/`, `config/`, `emails/` as named.
- Key configs: `env.mjs`, `tailwind.config.js`, `prettier.config.js`, `jest.config.js`.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js dev server.
- `npm run build`: Generate Prisma client, apply migrations, build app.
- `npm start`: Run production build locally.
- `npm run lint`: Lint with Next/ESLint.
- Tests: `npx jest` (JSDOM + @testing-library). Example: `npx jest __tests__/dashboard`.
- Prisma (local dev): `npx prisma migrate dev`, `npx prisma studio`.
- Optional DB: `docker compose up -d postgres` (see `docker-compose.yml`).

## Coding Style & Naming Conventions
- Formatting: Prettier enforced (2 spaces, `semi: false`, double quotes, sorted imports, Tailwind class sorting). Run before push.
- Linting: ESLint `next/core-web-vitals`.
- Naming: components in PascalCase, files/directories kebab-case; types in `types/`.
- Paths: Use `@/` alias (see `jest.config.js` and tsconfig paths).

## Testing Guidelines
- Frameworks: Jest + React Testing Library (`jest-environment-jsdom`).
- Location: `__tests__/**/*.test.tsx` mirroring `components/` feature areas.
- Scope: Write tests for new features and bug fixes; prefer user-facing queries (getByRole, getByText), avoid implementation details.

## Commit & Pull Request Guidelines
- Commits: Use concise, imperative messages. Prefer Conventional Commits where possible (`feat:`, `fix:`, `refactor:`). Group related changes.
- Pull Requests: Include summary, linked issues, screenshots for UI, test steps, and notes on DB/Prisma changes. Ensure `npm run lint` and tests pass.

## Security & Configuration Tips
- Secrets: Use `.env.local`; do not commit secrets. Variables are validated via `env.mjs`.
- Prisma: After schema changes, run `npx prisma generate` and `npx prisma migrate dev`.
