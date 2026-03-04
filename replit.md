# SJP Community Platform

## Overview
The SJP Community Platform is a private, mobile-first web application designed for Saint John's Program for Real Change, a Sacramento-based nonprofit assisting women experiencing homelessness, addiction, justice involvement, and domestic violence. The platform aims to provide a supportive digital community, facilitate access to resources, and empower beneficiaries through features like guided storytelling, progress tracking, and peer interaction.

## User Preferences
I prefer clear, concise, and professional communication. Please prioritize iterative development, providing updates and asking for confirmation before implementing major changes or complex features. For code, I appreciate well-structured, readable, and maintainable solutions.

## System Architecture
The platform is built with a React, TypeScript, Tailwind CSS frontend using `shadcn/ui`, a Node.js and Express backend, and a PostgreSQL database with Drizzle ORM. Authentication is session-based with `bcryptjs`. Routing is handled by `wouter` on the frontend and Express on the backend.

### UI/UX Decisions
- **Responsive Design**: Mobile-first approach with a bottom navigation bar for small screens and a fixed left sidebar for desktop (`md:` breakpoint at 768px).
- **Color Scheme**: Uses SJP brand colors: primary teal (`#34737A`), with complementary dark teal, deepest teal, red accent (`#D32027`), muted accent, and various text/background shades. Avatar colors rotate through 5 brand colors.
- **Page Differentiation**: Each primary page (Home, Community, Resources, Events, Profile, Admin) features a subtle 3px top border in a distinct accent color for visual identity.
- **Component Reusability**: Common components like `AvatarCircle`, `BottomNav`, `PostCard`, `CommunityFeed`, `EventCard`, and `MyJourney` are centralized.

### Technical Implementations
- **Database Schema**: Comprehensive Drizzle schema covering users, posts, replies, resources, events, stories, reactions, surveys, and user progress.
- **API Structure**: Express API routes enforce session authentication and role-based access (`requireAuth`, `requireStaffOrAdmin`, `requireAdmin`).
- **State Management**: TanStack Query is used for data fetching, with `staleTime: Infinity` requiring explicit query invalidation after mutations.
- **Image Handling**: Client-side image resizing/compression and server-side storage for user avatars and venue photos.
- **AI Guide**: Implements a Retrieval-Augmented Generation (RAG) pattern using `gpt-4o-mini` for content search, crisis detection, and response generation, with a focus on citation and trusted sources. Supports hybrid search combining keyword matching with vector similarity via pgvector.
- **Document RAG System**: Admin can upload PDF/DOCX/TXT files that are automatically chunked, embedded via OpenAI `text-embedding-3-small`, and stored in PostgreSQL with pgvector HNSW indexing. The AI Guide performs hybrid search (keyword + vector cosine similarity) to find relevant document content alongside FAQs, resources, events, and trusted answers.

### Feature Specifications
- **Admin Panel**: Provides CRUD operations for resources, events, stories (with approval workflow), surveys (aggregate stats), and user management (roles, stage, graduation).
- **Guided Storytelling**: A multi-step form for alumni to share their stories with privacy controls and an admin review process.
- **Alumni Survey**: Interval-based check-in forms to track key progress metrics (employment, housing, etc.).
- **Reactions System**: Emoji reactions on community posts with toggle functionality and count display.
- **My Journey Progress Dashboard**: Visual progress tracking for clients/alumni across predefined pillars, editable by staff/admin.
- **Home Page Layout**: Structured sections (Hero Banner, My Journey, Stories of Change, Next Event, Community Feed) with distinct headers and content displays.
- **Community Feed**: Supports various post types (update, win, question, need) with filtering and a pinned post feature. Milestone posts have a unique visual treatment and selection process.
- **Event Detail Pages**: Dedicated pages for events displaying detailed information, venue photos, and host profiles.
- **User Profile Photos**: Staff/admin can upload profile photos via a dedicated UI, with client-side processing and server-side storage.

## External Dependencies
- **PostgreSQL**: Primary database.
- **OpenAI**: Utilized for the AI Guide feature (`gpt-4o-mini`) via Replit AI Integrations.
- **Multer**: Used for handling `multipart/form-data` for file uploads on the server.
- **pdf-parse**: PDF text extraction for document RAG pipeline.
- **mammoth**: Word document (.docx) text extraction for document RAG pipeline.
- **pgvector**: PostgreSQL extension (v0.8.0) for vector similarity search with HNSW indexing.
- **`bcryptjs`**: For password hashing and secure authentication.
- **`wouter`**: Frontend routing.
- **`react-router-dom`**: Used for frontend routing.
- **`tailwindcss`**: CSS framework for styling.
- **`shadcn/ui`**: UI component library.
- **TanStack Query**: For data fetching, caching, and state management.
- **Unsplash**: Placeholder images for seeded venue locations.
- **Apple/Google Maps**: Integration for "Get Directions" links on event detail pages.