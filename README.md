# Gauntlet QA Bug Report Dashboard

SvelteKit + shadcn-svelte dashboard for managing QA bug reports across multiple projects. Report data is stored in **Neon PostgreSQL**; evidence uploads go to **Cloudflare R2**.

## Stack

- [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Neon PostgreSQL](https://neon.tech/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Bun](https://bun.sh/)

## Getting started

1. Copy `.env.example` to `.env` and fill in your Neon and R2 credentials.
2. Apply the database schema:

```sh
bun install
bun run db:migrate
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

On first startup, bundled `data/projects/**` seed JSON is imported into Neon when the database is empty.

## Data

- **Projects & issues:** Neon PostgreSQL (normalized tables)
- **Evidence uploads:** Cloudflare R2 bucket, served via `/evidence/...` redirect to the public R2 URL
- Each issue has a `status` field: `open`, `in_progress`, `fixed`, `wont_fix`
- Summary counts are derived automatically on read/write
- Edits from the UI are persisted via SvelteKit form actions

## Features

- Figma-style tabs for switching between open bug report projects
- Open Project dialog to browse and create projects
- Search, filter (severity, area, status), and sort bugs
- Shareable filter state via URL query params
- Severity guide, clean levels, and breakdown charts
- Bug detail sheet with inline editing
- Add new bugs with auto-generated IDs (`BUG-###`)
- Export filtered results as JSON or PDF

## Scripts

```sh
bun run dev        # development server
bun run build      # production build
bun run preview    # preview production build
bun run check      # typecheck
bun run db:migrate # apply PostgreSQL schema
```

## Deploying to Vercel

This app uses the [Vercel adapter](https://svelte.dev/docs/kit/adapter-vercel). Set these environment variables under **Settings → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 S3 API access key |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret |
| `R2_BUCKET` | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | Public `r2.dev` base URL for the bucket |

1. Push the repository to GitHub and import it in [Vercel](https://vercel.com/new).
2. Add all environment variables above.
3. Run `bun run db:migrate` once against your Neon database (locally or in CI).
4. **Redeploy** so serverless functions receive the new variables.
5. On first request, bundled seed data is imported if the database is empty.

Ensure your R2 bucket has **public access** enabled on the `r2.dev` subdomain for evidence files.
