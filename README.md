# Gauntlet QA Bug Report Dashboard

SvelteKit + shadcn-svelte dashboard for the Gauntlet Minigames QA report. Bug data is stored in `data/report.json`.

## Stack

- [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Bun](https://bun.sh/)

## Getting started

```sh
cd app
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Data

- **Source of truth:** `data/report.json`
- Each issue has a `status` field: `open`, `in_progress`, `fixed`, `wont_fix`
- Summary counts are derived automatically on read/write
- Edits from the UI are persisted via SvelteKit form actions with atomic file writes

## Features

- Search, filter (severity, area, status), and sort bugs
- Shareable filter state via URL query params
- Severity guide, clean levels, and breakdown charts
- Bug detail sheet with inline editing
- Add new bugs with auto-generated IDs (`BUG-###`)
- Export filtered results as JSON

## Scripts

```sh
bun run dev      # development server
bun run build    # production build
bun run preview  # preview production build
bun run check    # typecheck
```
