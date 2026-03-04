# SJP Community Platform

A private, mobile-first community web app for Saint John's Program for Real Change — a Sacramento nonprofit serving women experiencing homelessness, addiction, justice involvement, and domestic violence.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Session-based with bcryptjs
- **Routing:** wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` — Drizzle schema with all 9 tables (users, posts, replies, resources, events, stories, reactions, surveys, user_progress)
- `server/db.ts` — Database connection
- `server/storage.ts` — IStorage interface + DatabaseStorage implementation
- `server/routes.ts` — Express API routes with session auth, role-based middleware (requireAuth, requireStaffOrAdmin, requireAdmin)
- `server/seed.ts` — Seed data (12 users, 12 resources, 7 events, 8 posts, 3 stories, 6 surveys)
- `client/src/lib/auth.tsx` — AuthProvider context with login/logout/demoLogin
- `client/src/components/` — Shared components (AvatarCircle, BottomNav, PostCard, CommunityFeed, EventCard, MyJourney)
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
- **Reactions System**: 6 emoji reactions (heart, clap, pray, fire, star, smile) on community posts. Toggle behavior — tapping same reaction removes it, tapping different one switches. Reaction counts displayed as badges below post content. Uses `reactions` table with unique user-per-post constraint (toggle logic in API).
- **Story Revision Workflow**: Admin/staff can now "Request Revision" on pending stories with a revision note. Stories get `revision_requested` status (orange badge). Alumni see revision banner on `/share-story` page with the staff note. Staff can still approve/community-only stories with revision_requested status.
- **Schema additions**: `reactions` table (id, postId, userId, reactionType, createdAt), `revision_note` column on stories, `revision_requested` added to `approval_status` enum, `reaction_type` enum.

## Color Fixes & Page Differentiation (Implemented)
- **Avatar colors**: All user avatars now use 5 brand colors rotating: #34737A (dark teal), #5DA592 (sage green), #D32027 (red), #979DB6 (dusty lavender), #EEBBA7 (peach). Applied to seed data, login demo buttons, and all avatar displays.
- **Role badges**: All role badges (Admin/Staff/Client/Alumni) now use #34737A dark teal background with white text.
- **Need post left border**: Confirmed #D32027 (true red).
- **Filter pills**: Active pill uses #34737A, inactive pills use #F1EFEF bg with #302D2E text.
- **Page differentiation**: Each page has a subtle accent for visual identity:
  - Home: Hero banner (no change needed)
  - Community: #34737A dark teal 3px top border, privacy banner changed to #FCF3EE cream bg
  - Resources: #5DA592 sage green 3px top border, #FAE8DF peach tint background strip behind filter pills
  - Events: #979DB6 dusty lavender 3px top border
  - Profile: #EEBBA7 peach 3px top border, #FCF3EE cream header section bg
  - Admin: #D32027 red 3px top border below title

## My Journey Progress Dashboard (Implemented)
- **Table**: `user_progress` (id, userId, pillar, progress 0-100) with unique constraint on (userId, pillar)
- **Component**: `client/src/components/my-journey.tsx` — SVG circular progress rings, positioned between hero banner and Stories carousel on Home page
- **Visibility**: Clients and alumni see their dashboard; staff/admin do not see it on their own Home page
- **Admin editing**: Admin Panel > Users tab includes pillar progress sliders (0-100) per user when editing
- **API**: GET `/api/progress/:userId` (auth), PUT `/api/admin/progress/:userId` (staff/admin)
- **Pillar colors**: Community #34737A, Confidence #979DB6, Resilience #D32027, Readiness #5DA592, Wellness #EEBBA7

## Home Page Layout Restructure (Implemented)
- **Layout order**: Hero Banner → My Journey → Stories of Change → Next Event → Community Feed
- **Section headers**: Each section below My Journey has a colored header with icon, title, and "See all →" / "Read more →" link
  - Stories of Change: #D32027 red, BookOpen icon
  - Next Event: #34737A teal, Calendar icon
  - Community Feed: #B8876F warm brown, MessageCircle icon
- **Stories of Change**: Single featured quote card with #FAE8DF peach bg, decorative quotation marks, italic text, author avatar + "Alumni" label. No carousel.
- **Next Event**: Collapsible card with colored date block (month + day), event name, time, location. Expands to show description + stage tags.
- **Community Feed**: Slim composer bar (pill shape, redirects to /community) → pinned posts → one latest post per category (need/win/question/update)
- **Category post cards**: Colored banner strip at top with dot + uppercase label + timestamp. Heart reaction count + reply count below content.
- **Post type banner colors**: Need=#FBEAEA/#D32027, Win=#E6F2EF/#5DA592, Question=#EDEEF3/#979DB6, Update=#E8F0F1/#34737A

## Community Feed Updates (Implemented)
- **Post types**: 4 types only — update, win, question, need (milestone removed)
- **Feed filters**: All, Needs, Wins, Questions
- **Pinned posts**: Displayed above the composer (below privacy banner), with #FAE8DF warm peach background, 📌 pin icon + "Pinned" label, no left border color treatment
- **Regular posts**: Displayed below the composer in the feed with white background and normal styling

## Staff Profile Photos (Implemented)
- **Schema**: `photoUrl` (text, nullable) added to `users` table
- **AvatarCircle component**: Updated to accept optional `photoUrl` prop. If present, renders circular `<img>` with `object-fit: cover`. Falls back to colored initial avatar on `onError`.
- **Profile page**: Staff/admin see "Add a photo" / "Change photo" link below avatar. URL input with validation (loads image to verify). Inline error for invalid URLs. Remove photo option.
- **Role guard**: PATCH `/api/users/:id` strips `photoUrl` from request body for non-staff/non-admin users
- **Consistency**: AvatarCircle with photoUrl used in: profile header, post cards, reply threads, home page (composer, story cards, category cards), admin panel user list
- **Edge cases**: Broken image URLs fall back silently to colored initial avatar via `onError` handler

## Event Detail Pages (Implemented)
- **Event detail route**: `/events/:id` — new page at `client/src/pages/event-detail.tsx`
- **Schema changes**: `venuePhotoUrl` (text, nullable) and `hostUserId` (uuid, nullable, FK to users) added to `events` table
- **Venue locations table**: `venue_locations` (id, name, photoUrl) — seeded with 5 campus locations with placeholder Unsplash images
- **Event cards**: Tappable → navigate to `/events/:id` (removed expand/collapse, now shows ChevronRight)
- **Detail page shows**: venue photo (if exists), event name, type badge, date, time, location with "Get Directions" link (Apple/Google Maps), full description, host card
- **Host card**: Shows staff avatar (photo or initial), name, role label, bio. Only appears when hostUserId is set.
- **Admin event form**: Location is now a dropdown with 5 known venues + "Other" option. Known venues auto-populate venue photo URL. Host dropdown lists staff/admin users. Venue photo URL field for manual override.
- **API routes**: GET `/api/events/:id` returns event with host user data, GET `/api/staff-users` returns staff/admin users, GET `/api/venue-locations` returns venue library

## Security
- `/api/users` protected by requireStaffOrAdmin (not just requireAuth)
- `/api/admin/*` endpoints protected by requireStaffOrAdmin
- `/api/admin/users/:id` protected by requireStaffOrAdmin (staff and admin can edit users)
- Admin page has frontend guard redirecting non-staff/admin to profile
- Story creation restricted to alumni role
- Survey creation restricted to alumni role
- `stripPasswords()` handles Date instances before object spread
