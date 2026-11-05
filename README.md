# VA Hub

Personal business management app for a Virtual Assistant business: clients, projects,
subprojects, tasks, leads and calendar in one place.

**Stack:** Next.js (App Router, TypeScript, Tailwind CSS) · Supabase (Postgres, Auth, Row Level Security) · Vercel

## Project layout

```
supabase/migrations/   Database tables, security rules and automatic setup (run in Supabase SQL Editor)
src/proxy.ts           Keeps you logged in and sends logged-out visitors to /login
src/lib/supabase/      Supabase connection helpers (browser + server)
src/app/(auth)/        Login, forgot password, reset password
src/app/(app)/         The app itself: Home, My Tasks, Calendar, Leads, Clients, Settings
src/components/        Sidebar / mobile navigation and shared UI pieces
```

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables) and in `.env.local` for local work:

| Name | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Connect (or Settings → API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same place: the publishable (or "anon public") key |

## Security model

- Every table has Row Level Security enabled.
- Data belongs to a **workspace**; people belong to workspaces as `owner`, `member` or `client`.
- Owners see everything. Members and clients (future) only see clients listed in `member_client_access`.
- Public sign-up is meant to be **disabled** in Supabase (Authentication → Sign In / Providers).

## Build phases

0. Foundation: login, layout, database, security ✅
1. Clients ✅
2. Projects and nested subprojects
3. Tasks, checklists, My Tasks
4. Kanban, recurring tasks
5. Leads, pipelines, follow-ups
6. CSV import/export, full backup export
7. Calendar and Dashboard
8. Global search, quick add, polish

_Live app: https://va-hub-six.vercel.app_
