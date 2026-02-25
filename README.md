# Life OS

A personal "Life Operating System" — a mobile-first to-do tracker that organizes your entire life: work, personal, health, social, and more.

## Features

- **Spaces & Projects** — Organize tasks into spaces (Personal, Work, Health, etc.) with projects inside each
- **Multiple Project Types** — Standard tasks, grocery lists, workouts, recipes, planning
- **Quick Add** — Fast task capture from anywhere in the app
- **Calendar View** — See all your items by date with a month overview
- **Sharing** — Share any project with others via invite link (view or edit access)
- **Mobile-First** — Designed for thumb-friendly iPhone use, works great on desktop too

## Tech Stack

- **Next.js 14+** (App Router) + TypeScript
- **Supabase** (Postgres + Auth + Row-Level Security)
- **Tailwind CSS** (dark theme, premium feel)
- **Vercel** deployment

## Getting Started

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. In **Authentication > Settings**, make sure email/password auth is enabled
4. Copy your project URL and anon key from **Settings > API**

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — create an account and your default spaces will be seeded automatically.

### 4. Deploy to Vercel

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain, e.g. `https://life-os.vercel.app`)
4. Deploy!

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes
│   │   ├── dashboard/      # Today view (home)
│   │   ├── spaces/         # All spaces & projects
│   │   ├── project/[id]/   # Single project view
│   │   ├── calendar/       # Calendar view
│   │   └── settings/       # Profile & settings
│   ├── auth/               # Login & signup
│   ├── invite/[token]/     # Accept invite flow
│   └── layout.tsx          # Root layout
├── components/             # Reusable UI components
├── lib/
│   ├── supabase/          # Supabase client config
│   ├── actions.ts         # Server actions (CRUD)
│   └── types.ts           # TypeScript types
└── middleware.ts           # Auth middleware
```

## Data Model

- **Spaces** — Top-level buckets (Personal, Work, Home, Health, Social)
- **Projects** — Live inside spaces, have a type (standard/grocery/workout/recipe/planning)
- **Items** — Tasks/notes with title, notes, status, priority, due date, tags
- **Project Shares** — Invite-based sharing with view/edit roles

## MVP Scope

What's included in this MVP:
- Email/password auth
- Spaces CRUD with pre-seeded defaults
- Projects CRUD with type selection
- Items CRUD with status, priority, due dates, tags, notes
- Quick add from any screen
- Grocery list mode (checklist behavior)
- Calendar view with month + day detail
- Project sharing via invite link
- Mobile-first responsive UI

## Coming in v1

- Workout tracker with streaks
- Recipe mode with ingredients/steps
- Planning mode with timeline
- Recurring tasks
- PWA + offline support
- Google Calendar sync
- File attachments
- Search
