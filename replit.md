# SJP Community Platform

A private, mobile-first community web app for Saint John's Program for Real Change — a Sacramento nonprofit serving women experiencing homelessness, addiction, justice involvement, and domestic violence.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Session-based with bcryptjs
- **Routing:** wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` — Drizzle schema with all 8 tables (users, posts, replies, resources, events, stories, reactions, surveys)
- `server/db.ts` — Database connection
- `server/storage.ts` — IStorage interface + DatabaseStorage implementation
- `server/routes.ts` — Express API routes with session auth, role-based middleware (requireAuth, requireStaffOrAdmin, requireAdmin)
- `server/seed.ts` — Seed data (12 users, 12 resources, 7 events, 8 posts, 3 stories, 6 surveys)
- `client/src/lib/auth.tsx` — AuthProvider context with login/logout/demoLogin
- `client/src/components/` — Shared components (AvatarCircle, BottomNav, PostCard, CommunityFeed)
- `client/src/pages/` — 9 pages (login, home, community, resources, events, profile, admin, share-story, survey)

## Key Design Decisions
- Mobile-first at 430px max-width, centered on larger screens
- No dark mode (out of scope)
- Bottom nav with 5 tabs (Home, Community, Resources, Events, Profile)
- Content visibility rules enforced on backend (stage-based filtering)
- Demo quick-login buttons on login page for hackathon/testing
- Design tokens: Primary teal #34737A (SJP brand), dark teal #2C6169, deepest teal #1F4F49, red accent #D32027, muted accent #979DB6, text primary #302D2E, text secondary #868180, text muted #C7C2BF, page bg #FFFBF9, card bg white, light gray #F1EFEF
- `staleTime: Infinity` in queryClient — must explicitly invalidate queries after mutations
- `apiRequest(method, url, data)` — NOT `(url, options)` like fetch
- queryKey uses array format for TanStack Query: `["/api/endpoint", param]`

## Prompt 2 Features (Implemented)
- **Admin Panel** (`/admin`): 4-tab management (Resources, Events, Stories, Surveys) + Users tab (admin-only). Full CRUD for resources/events, story approval workflow (approve/community_only/revision_requested), survey aggregate stats, user role/stage/graduation management.
- **Guided Storytelling** (`/share-story`): 3-step form for alumni (Where were you? → What changed? → Where are you now?) with sharing permission toggle. Stories with sharing ON go to pending review; sharing OFF appear immediately in carousel.
- **Alumni Survey** (`/survey`): Interval-based (3/6/12 month) check-in form. Survey prompt card on Home page when due. Tracks employment, housing, raise/promotion, support needs.
- **Wiring**: Profile "Admin Panel" → `/admin`, Profile "Share Your Story" → `/share-story`, Home "Write it" → `/share-story`, Home survey card → `/survey`

## Post-Build Update Features (Implemented)
- **Reactions System**: 5 emoji reactions (heart, clap, pray, fire, star) on community posts. Toggle behavior — tapping same reaction removes it, tapping different one switches. Reaction counts displayed as badges below post content. Uses `reactions` table with unique user-per-post constraint (toggle logic in API).
- **Story Revision Workflow**: Admin/staff can now "Request Revision" on pending stories with a revision note. Stories get `revision_requested` status (orange badge). Alumni see revision banner on `/share-story` page with the staff note. Staff can still approve/community-only stories with revision_requested status.
- **Schema additions**: `reactions` table (id, postId, userId, reactionType, createdAt), `revision_note` column on stories, `revision_requested` added to `approval_status` enum, `reaction_type` enum.

## Security
- `/api/users` protected by requireStaffOrAdmin (not just requireAuth)
- `/api/admin/*` endpoints protected by requireStaffOrAdmin
- `/api/admin/users/:id` protected by requireAdmin (admin-only)
- Admin page has frontend guard redirecting non-staff/admin to profile
- Story creation restricted to alumni role
- Survey creation restricted to alumni role
- `stripPasswords()` handles Date instances before object spread
