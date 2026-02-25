# Life OS — Product Spec & Architecture

## Overview
Personal "Life OS" to-do tracker. Mobile-first, Vercel-deployed, Supabase-backed.

## Core Entities

### Spaces
Top-level organization buckets. Pre-seeded defaults: Personal, Work, Home, Health, Social.
- Fields: id, name, emoji, color, owner_id, position, created_at

### Projects
Live inside a Space. Each has a "type" that unlocks special UI modes.
- Fields: id, space_id, name, emoji, type (standard | grocery | workout | recipe | planning), position, created_at
- Types:
  - **standard** — normal task list
  - **grocery** — checklist with optional store sections
  - **workout** — templates + completion streaks
  - **recipe** — ingredients, steps, link, "planned this week"
  - **planning** — events + tasks + checklist + timeline

### Items
The universal record. Behavior adapts based on parent project type.
- Fields: id, project_id, title, notes, status (todo | in_progress | done), priority (none | low | medium | high | urgent), due_date, due_time, is_recurring, recurrence_rule, tags (text[]), position, created_at, updated_at, completed_at
- Extra fields for recipe items: ingredients (jsonb), steps (jsonb), source_url, planned_this_week (bool)
- Extra fields for workout items: sets (jsonb), streak_count, last_completed

### Shares
- Fields: id, project_id, invited_by, invited_user_id, role (view | edit), invite_token, accepted, created_at

### Profiles
- Fields: id (= auth.uid), email, display_name, avatar_url, created_at

## Key Screens (Mobile-First)

1. **Home** — Today view: due today + overdue + quick add
2. **Spaces** — Grid of spaces with project counts
3. **Space Detail** — List of projects in a space
4. **Project Detail** — Items list, adapts UI by project type
5. **Item Detail** — Full edit view with notes, dates, tags, priority
6. **Calendar** — Month view with dots on days that have items, day detail below
7. **Quick Add** — Modal/sheet: title + optional project picker + due date
8. **Settings** — Profile, manage spaces
9. **Share** — Generate invite link for a project, manage collaborators

## MVP Scope
- Auth (email/password)
- Spaces CRUD (pre-seeded)
- Projects CRUD with type selection
- Items CRUD with all fields
- Quick add from anywhere
- Grocery list mode (checklist)
- Calendar view (month + day)
- Share a project (invite link, view/edit roles)
- Mobile-first responsive UI
- Deploy to Vercel

## v1 Additions (post-MVP)
- Workout tracker with streaks
- Recipe mode with ingredients/steps
- Planning mode with timeline
- Recurring tasks engine
- PWA + offline
- Google Calendar 2-way sync
- File attachments
- Search

## Tech Stack
- Next.js 14+ (App Router) + TypeScript
- Supabase (Postgres + Auth + Realtime)
- Tailwind CSS
- Vercel deployment
- Auth: email/password via Supabase

## Data Model (Supabase Tables)

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | = auth.users.id |
| email | text | |
| display_name | text | |
| avatar_url | text | nullable |
| created_at | timestamptz | default now() |

### spaces
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| owner_id | uuid FK → profiles | |
| name | text | |
| emoji | text | default '📁' |
| color | text | default '#6366f1' |
| position | int | for ordering |
| created_at | timestamptz | |

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| space_id | uuid FK → spaces | |
| owner_id | uuid FK → profiles | |
| name | text | |
| emoji | text | |
| type | text | 'standard','grocery','workout','recipe','planning' |
| position | int | |
| created_at | timestamptz | |

### items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| created_by | uuid FK → profiles | |
| title | text | |
| notes | text | nullable |
| status | text | 'todo','in_progress','done' |
| priority | text | 'none','low','medium','high','urgent' |
| due_date | date | nullable |
| due_time | time | nullable |
| is_recurring | bool | default false |
| recurrence_rule | text | nullable |
| tags | text[] | default '{}' |
| position | int | |
| metadata | jsonb | for recipe/workout extra fields |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| completed_at | timestamptz | nullable |

### project_shares
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| invited_by | uuid FK → profiles | |
| invited_user_id | uuid FK → profiles | nullable until accepted |
| role | text | 'view','edit' |
| invite_token | text UNIQUE | for invite links |
| accepted | bool | default false |
| created_at | timestamptz | |

## RLS Policies (Summary)
- **profiles**: Users can read/update own profile
- **spaces**: Owner can CRUD. Read if owner.
- **projects**: Owner can CRUD. Shared users can read (+ write if role=edit)
- **items**: Same as parent project permissions
- **project_shares**: Owner of project can manage. Invited user can read own shares.

## API Design
All via Next.js Server Actions (no API routes needed for MVP).
- `createSpace`, `updateSpace`, `deleteSpace`
- `createProject`, `updateProject`, `deleteProject`
- `createItem`, `updateItem`, `deleteItem`, `toggleItem`, `reorderItems`
- `createShareLink`, `acceptInvite`, `removeCollaborator`
- `getCalendarItems(month, year)`

## Auth Flow
1. Sign up: email + password → Supabase creates user → trigger creates profile
2. Sign in: email + password → session cookie via @supabase/ssr
3. Middleware checks session on protected routes
4. Password reset via Supabase built-in

## Sharing Flow
1. Project owner clicks "Share" → generates invite token
2. Share link: `/invite/{token}`
3. Recipient clicks link → must sign in/up → token resolves → added as collaborator
4. Shared projects appear in recipient's sidebar under "Shared with me"

## Deployment
- **Local**: `npm run dev` with `.env.local` containing Supabase keys
- **Vercel**: Connect repo, add env vars, deploy. Supabase handles DB.

## Build Phases

### Phase 1: Foundation
- [x] Project init (Next.js + Supabase + Tailwind)
- [ ] Supabase schema + RLS
- [ ] Auth (sign up, sign in, middleware, profile)
- [ ] App shell (mobile nav, layout)

### Phase 2: Core CRUD
- [ ] Spaces (list, create, edit, delete)
- [ ] Projects (list, create, edit, delete, type selection)
- [ ] Items (list, create, edit, delete, status toggle, priority, due date, tags)
- [ ] Quick add

### Phase 3: Special Modes + Calendar
- [ ] Grocery list mode
- [ ] Calendar view
- [ ] Today view (home screen)

### Phase 4: Sharing
- [ ] Generate invite link
- [ ] Accept invite flow
- [ ] Shared projects display
- [ ] Permission enforcement

### Phase 5: Polish
- [ ] Seed data script
- [ ] Deploy instructions
- [ ] Mobile QA
- [ ] Basic tests
