# Gauntlet QA Bug Report Dashboard

SvelteKit + shadcn-svelte dashboard for managing QA bug reports across multiple projects. Each project is stored in `data/projects/<slug>/report.json`.

## Stack

- [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Bun](https://bun.sh/)

## Getting started

```sh
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Data

- **Projects folder:** `data/projects/<slug>/report.json`
- **Evidence uploads:** `static/evidence/<slug>/`
- Each issue has a `status` field: `open`, `in_progress`, `fixed`, `wont_fix`
- Summary counts are derived automatically on read/write
- Edits from the UI are persisted via SvelteKit form actions with atomic file writes
- Legacy `data/report.json` is migrated automatically to `data/projects/gauntlet-minigames/`

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
bun run dev      # development server
bun run build    # production build
bun run preview  # preview production build
bun run check    # typecheck
```

## Deploying to Vercel

This app uses the [Vercel adapter](https://svelte.dev/docs/kit/adapter-vercel) and [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for persistent storage in production.

1. Push the repository to GitHub and import it in [Vercel](https://vercel.com/new).
2. In the Vercel project, create a **Blob** store (Storage → Blob).
3. Add the `BLOB_READ_WRITE_TOKEN` environment variable to the project (Vercel can link this automatically when you connect the Blob store).
4. Deploy. On first request, bundled `data/projects/**` seed data is copied into Blob if the store is empty.

**Local development** continues to use the filesystem (`data/projects/` and `static/evidence/`) when `BLOB_READ_WRITE_TOKEN` is not set.

**Evidence uploads** on Vercel are stored in Blob and served via public URLs. Existing `/evidence/...` paths from local dev still work when served from `static/`.
