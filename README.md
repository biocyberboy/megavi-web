## Megavi Web

Production ready Next.js 16 (App Router) project backed by Supabase + Prisma.

## Requirements

- Node.js 18+
- pnpm 8+
- A Supabase project with Postgres database access

## Local development

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` (not committed) and fill in the values:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server actions (keep private) |
| `DATABASE_URL` | Primary connection string for Prisma (connection pool) |
| `DIRECT_URL` | Direct connection string (used by migrations) |

## Production deployment (Vercel)

1. Push the repository to the git provider connected to Vercel.
2. In Vercel, create a new project and select the repo.
3. Keep project root as `./` and choose the **Next.js** framework preset.
4. Ensure the build command is `pnpm build` (default) and install command `pnpm install`.
5. Add the environment variables listed above to the **Production**, **Preview**, and **Development** environments.
6. Kick off the initial deploy; `pnpm postinstall` automatically runs `prisma generate`, and `prisma/seed.ts` is ignored in the build thanks to `.vercelignore`.

### Skipping seed on Vercel

Seeding is only run locally by executing:

```bash
pnpm prisma db seed
```

No seeding command is triggered automatically in Vercel, so the hosted database stays untouched.

## Post-deploy verification

After Vercel finishes deploying (expected URL `https://megavi-web.vercel.app`):

1. Visit `/api/health` (or the relevant endpoint) to confirm the server can reach the database. For Prisma, look for a `200` response that indicates a successful query.
2. Check `/admin` (protected) and `/blog` to confirm each route renders without runtime errors.
3. Tail logs in the Vercel dashboard to ensure there are no Prisma connection warnings.

## Useful scripts

- `pnpm lint` – Run ESLint
- `pnpm build` – Production build
- `pnpm start` – Serve production build locally
- `pnpm test:e2e` – Run E2E tests with Playwright
- `pnpm test:e2e:ui` – Run E2E tests in interactive UI mode
- `pnpm test:e2e:report` – View last test report

## Testing

This project includes a comprehensive E2E test suite using Playwright.

### Quick start
```bash
# Run smoke tests (recommended before deploy)
pnpm test:e2e smoke.spec.ts

# Run all tests
pnpm test:e2e

# Interactive mode (best for development)
pnpm test:e2e:ui
```

### Test coverage
- ✅ Homepage & Hero section
- ✅ Price dashboard with charts
- ✅ Blog listing & posts
- ✅ Admin panel
- ✅ API endpoints
- ✅ Navigation flows
- ✅ Performance metrics
- ✅ Accessibility checks

For detailed documentation, see:
- `e2e/README.md` - Complete testing guide
- `e2e/QUICK_START.md` - Quick reference
- `TEST_SUMMARY.md` - Test coverage summary
