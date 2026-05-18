# Tracker

Tracker is a study-progress web app for SNBT preparation. It combines checklist tracking, tryout score logging, progress charts, and an SNBT score calculator in one React application.

## Features

- Demo mode without an account.
- Supabase email and password authentication.
- Spreadsheet-derived study checklist with TRUE/FALSE progress columns.
- Collapsible checklist sections with remembered expanded state.
- Tryout table with up to 100 rows.
- Tryout and calculator charts powered by Chart.js.
- SNBT calculator that can save results to the tryout table.
- Per-user color theme storage.

## Tech Stack

- React 19
- Vite
- TypeScript
- Supabase
- Chart.js
- Iconify
- Vitest

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

## Environment Variables

Tracker uses these Vite environment variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The publishable Supabase key is safe to expose in the browser. Do not add a Supabase service role key to this project.

## Supabase Setup

Run `supabase/schema.sql` in the Supabase SQL Editor. The schema creates user profiles, checklist state, tryout rows, profile triggers, and Row Level Security policies.

## Checklist Data

The checked-in checklist data lives in `src/data/checklists.ts`. To regenerate it from exported spreadsheet HTML files, set `TRACKER_SOURCE_DIR` to the folder that contains the exported files, then run:

```bash
npm run extract:data
```

## Scripts

```bash
npm run dev
npm test
npm run build
npm run preview
npm run extract:data
```

## Deployment

The app is ready for Vercel. Add the Supabase environment variables in the Vercel project settings, then connect this repository to Vercel.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
