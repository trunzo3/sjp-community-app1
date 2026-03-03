# SJP Community Platform

A private, mobile-first community web app for Saint John's Program for Real Change — a Sacramento nonprofit serving women experiencing homelessness, addiction, justice involvement, and domestic violence.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Session-based with bcryptjs
- **Routing:** wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` — Drizzle schema with all 7 tables (users, posts, replies, resources, events, stories, surveys)
- `server/db.ts` — Database connection
- `server/storage.ts` — IStorage interface + DatabaseStorage implementation
- `server/routes.ts` — Express API routes with session auth
- `server/seed.ts` — Seed data (12 users, 12 resources, 7 events, 8 posts, 3 stories, 6 surveys)
- `client/src/lib/auth.tsx` — AuthProvider context with login/logout/demoLogin
- `client/src/components/` — Shared components (AvatarCircle, BottomNav, PostCard, CommunityFeed)
- `client/src/pages/` — 6 pages (login, home, community, resources, events, profile)

## Key Design Decisions
- Mobile-first at 430px max-width, centered on larger screens
- No dark mode (out of scope)
- Bottom nav with 5 tabs (Home, Community, Resources, Events, Profile)
- Content visibility rules enforced on backend (stage-based filtering)
- Demo quick-login buttons on login page for hackathon/testing
- Design tokens: Primary teal #0D9488, coral accent #FF6B6B, amber accent #F5A623

## Prompt 2 Will Add
- Admin Panel (four-tab management interface)
- Guided storytelling flow (three-step form)
- Alumni survey form (check-in questionnaire)
- User management screen
