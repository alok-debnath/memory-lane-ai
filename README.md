# MemoryApp — Voice & Text Memory Capture

A full-stack memory capture application where users record memories via voice or text, and AI automatically enriches them with metadata (people, locations, sentiment, actions, etc.). Built with React + Vite + Tailwind CSS on the frontend and Supabase (via Lovable Cloud) on the backend.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Routing](#routing)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Edge Functions (Backend)](#edge-functions-backend)
- [AI Integration](#ai-integration)
- [Design System](#design-system)
- [Key Libraries](#key-libraries)
- [Custom Hooks](#custom-hooks)
- [Timezone Handling](#timezone-handling)
- [File Storage](#file-storage)
- [Testing](#testing)
- [Coding Conventions](#coding-conventions)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Framework      | React 18 + TypeScript (strict)                                |
| Build          | Vite 5 with SWC (via `@vitejs/plugin-react-swc`)             |
| Styling        | Tailwind CSS 3 + `tailwindcss-animate` + `@tailwindcss/typography` |
| UI Components  | shadcn/ui (Radix UI primitives + CVA variants)                |
| Animation      | Framer Motion 12                                              |
| State (server) | TanStack React Query 5                                        |
| State (client) | React Context (auth, theme)                                   |
| Routing        | React Router v6                                               |
| Forms          | React Hook Form + Zod validation                              |
| Charts         | Recharts                                                      |
| Markdown       | react-markdown                                                |
| Icons          | lucide-react                                                  |
| Backend        | Supabase (Auth, PostgreSQL, Edge Functions, Storage)           |
| AI Gateway     | Lovable AI Gateway (Gemini, GPT models)                       |
| Date Utilities | date-fns + date-fns-tz                                        |

---

## Project Structure

```
├── public/                      # Static assets (favicon, robots.txt)
├── src/
│   ├── App.tsx                  # Root component, routing, providers
│   ├── main.tsx                 # Vite entry point
│   ├── index.css                # Tailwind config + design tokens (HSL)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (DO NOT EDIT)
│   │   ├── dashboard/           # Dashboard-specific components
│   │   ├── diary/               # Diary-specific components
│   │   ├── AppLayout.tsx        # Main layout shell (sidebar + bottom nav)
│   │   ├── AIChatPanel.tsx      # AI conversational chat panel
│   │   ├── VoiceRecorder.tsx    # Voice recording component
│   │   ├── MemoryCard.tsx       # Memory display card
│   │   ├── NewMemoryDialog.tsx  # Create memory dialog
│   │   ├── EditMemoryDialog.tsx # Edit memory dialog
│   │   └── ...                  # Other feature components
│   ├── pages/                   # Route-level page components
│   │   ├── Auth.tsx             # Login/signup
│   │   ├── Dashboard.tsx        # Home dashboard
│   │   ├── Diary.tsx            # Daily diary entries
│   │   ├── Timeline.tsx         # Memory timeline view
│   │   ├── Reminders.tsx        # Reminder management
│   │   ├── Documents.tsx        # Document extraction viewer
│   │   ├── Stats.tsx            # Analytics & statistics
│   │   ├── Review.tsx           # Spaced repetition review
│   │   ├── KnowledgeGraph.tsx   # Knowledge graph visualization
│   │   ├── Profile.tsx          # User settings + notification prefs
│   │   └── SharedMemory.tsx     # Public shared memory view
│   ├── hooks/
│   │   ├── useAIChat.ts         # AI chat state & streaming
│   │   ├── useVoiceInput.ts     # Voice recording + transcription
│   │   ├── useTTS.ts            # Text-to-speech
│   │   ├── useTimezone.ts       # Timezone utilities
│   │   └── use-mobile.tsx       # Responsive breakpoint detection
│   ├── contexts/
│   │   └── AuthContext.tsx       # Auth state, session, timezone sync
│   ├── constants/
│   │   └── pageInfo.ts          # Page metadata for info buttons
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts        # Auto-generated Supabase client (DO NOT EDIT)
│   │       └── types.ts         # Auto-generated DB types (DO NOT EDIT)
│   └── lib/
│       ├── utils.ts             # cn() utility for Tailwind class merging
│       ├── invokeEdge.ts        # Edge function wrapper with timezone injection
│       └── timezone.ts          # Timezone detection utilities
├── supabase/
│   ├── config.toml              # Supabase project config (DO NOT EDIT)
│   ├── migrations/              # SQL migrations (managed by platform)
│   └── functions/               # Edge Functions (Deno runtime)
│       ├── process-memory/      # AI memory enrichment & metadata extraction
│       ├── process-diary/       # Diary analysis, grammar correction, insights
│       ├── process-document/    # Document text extraction & classification
│       ├── memory-chat/         # Conversational AI over user's memory corpus
│       ├── semantic-search/     # Vector similarity search across memories
│       ├── detect-conflicts/    # Find contradictory information
│       ├── backfill-embeddings/ # Generate embeddings for existing memories
│       └── send-reminders/      # Scheduled reminder email delivery
├── AGENTS.md                    # AI agent guidelines
├── tailwind.config.ts           # Tailwind configuration
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
└── vitest.config.ts             # Vitest test configuration
```

Each major directory contains an `INSTRUCTIONS.md` with folder-specific rules. Refer to `AGENTS.md` for the full AI agent contract.

---

## Getting Started

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies (Node.js required)
npm install

# Start dev server (port 8080)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   React SPA                      │
│  (React Router → Pages → Components → Hooks)     │
│  State: React Query (server) + Context (client)  │
└──────────────┬──────────────────┬────────────────┘
               │ Supabase SDK     │ invokeEdge()
               ▼                  ▼
┌──────────────────────┐  ┌────────────────────────┐
│  Supabase Database   │  │   Edge Functions        │
│  (PostgreSQL + RLS)  │  │   (Deno runtime)        │
│  + pgvector          │  │   ↕ Lovable AI Gateway  │
│  + pg_trgm           │  │   ↕ Transactional Email │
└──────────────────────┘  └────────────────────────┘
```

- **Frontend** communicates with the database directly via the Supabase JS client (with RLS enforcing access control) and with Edge Functions via `invokeEdge()`.
- **Edge Functions** handle AI processing, email delivery, and operations requiring the service role key.
- **AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) is used for all AI calls — no user API keys needed.

---

## Routing

| Path               | Page Component   | Auth Required | Description                    |
| ------------------ | ---------------- | ------------- | ------------------------------ |
| `/`                | Dashboard        | ✅            | Home — summary, nudges, flashbacks |
| `/diary`           | Diary            | ✅            | Daily diary entries            |
| `/timeline`        | Timeline         | ✅            | Chronological memory view      |
| `/reminders`       | Reminders        | ✅            | Upcoming & past reminders      |
| `/stats`           | Stats            | ✅            | Charts & analytics             |
| `/documents`       | Documents        | ✅            | Extracted document viewer      |
| `/review`          | Review           | ✅            | Spaced repetition flashcards   |
| `/graph`           | KnowledgeGraph   | ✅            | Knowledge graph visualization  |
| `/profile`         | Profile          | ✅            | Settings, timezone, notifications |
| `/auth`            | Auth             | ❌            | Login / signup                 |
| `/forgot-password` | ForgotPassword   | ❌            | Password reset request         |
| `/reset-password`  | ResetPassword    | ❌            | Password reset form            |
| `/shared/:token`   | SharedMemory     | ❌            | Public shared memory view      |

Protected routes use `<ProtectedRoute>` wrapper → redirects to `/auth` if unauthenticated. Auth routes redirect to `/` if already logged in.

---

## Authentication

- **Provider**: Supabase Auth (email + password)
- **Context**: `AuthContext.tsx` provides `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`, `timezone`, `updateTimezone`
- **Profile sync**: On login, creates/fetches a `profiles` row and syncs the user's timezone
- **No anonymous signups** — email verification required by default
- **Roles**: Stored in a separate `user_roles` table (not on profiles) using `SECURITY DEFINER` functions to avoid RLS recursion

---

## Database Schema

### Tables

| Table                      | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `memory_notes`             | Core memory storage with rich metadata         |
| `memory_attachments`       | Files attached to memories                     |
| `memory_history`           | Edit/delete audit trail (auto-snapshot trigger)|
| `document_extractions`     | Extracted text & metadata from documents       |
| `diary_entries`            | Daily diary entries with AI insights           |
| `chat_messages`            | AI chat conversation history                   |
| `review_schedule`          | Spaced repetition scheduling                   |
| `shared_memories`          | Public share tokens for memories               |
| `ai_nudges`               | AI-generated proactive nudges                  |
| `notification_preferences` | Per-user notification channel settings         |
| `profiles`                 | User timezone and metadata                     |

### Key Extensions

- **pgvector** — Vector similarity search on `memory_notes.embedding` and `document_extractions.embedding`
- **pg_trgm** — Trigram-based fuzzy text search on titles and content

### Notable Database Functions

| Function                 | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `match_memories`         | Vector similarity search against embeddings  |
| `match_documents`        | Vector search on document extractions        |
| `fuzzy_search_memories`  | Trigram-based fuzzy text search              |
| `get_flashback_memories` | "On this day" memories from previous years   |
| `get_memories_paginated` | Cursor-based pagination with category filter |
| `cleanup_old_history`    | Prune audit trail older than 7 days          |
| `snapshot_memory_change` | Trigger: auto-snapshot on memory update/delete|

### Row-Level Security (RLS)

Every table has RLS enabled. All policies enforce `auth.uid() = user_id` so users can only access their own data. The exception is `shared_memories` which allows public `SELECT` by token.

---

## Edge Functions (Backend)

All edge functions run on **Deno** and are deployed automatically. They live in `supabase/functions/<name>/index.ts`.

| Function              | Trigger      | Description                                                        |
| --------------------- | ------------ | ------------------------------------------------------------------ |
| `process-memory`      | On create    | AI extracts title, category, mood, people, locations, actions, sentiment, tags, reminder dates from raw text |
| `process-diary`       | On create    | Grammar correction, mood/energy analysis, topic extraction, personality insights |
| `process-document`    | On upload    | Document text extraction, type classification, key details, expiry dates |
| `memory-chat`         | User message | Conversational AI with tool-calling (search, create, update, delete memories) |
| `semantic-search`     | On search    | Generates query embedding → vector similarity match                |
| `detect-conflicts`    | On demand    | Finds contradictory information across memories                    |
| `backfill-embeddings` | Manual       | Generates embeddings for memories missing them                     |
| `send-reminders`      | Cron/manual  | Finds due reminders, generates AI email content, sends via transactional email API, advances recurring reminders |

### Edge Function Patterns

```typescript
// Standard CORS headers (required in every function)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-timezone, ...",
};

// Always handle OPTIONS preflight
if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

// Get user timezone from header
const userTz = req.headers.get("x-user-timezone") || "UTC";

// AI calls via Lovable AI Gateway
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [...] }),
});

// Secrets via Deno.env.get()
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```

---

## AI Integration

All AI calls go through the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`), which is OpenAI-compatible. No user API keys required.

### Models Used

| Model                              | Used In                        | Purpose                           |
| ---------------------------------- | ------------------------------ | --------------------------------- |
| `google/gemini-3-flash-preview`    | `process-memory`               | Memory metadata extraction        |
| `google/gemini-2.5-flash-lite`     | `send-reminders`               | Friendly reminder email generation|
| `google/gemini-2.5-flash`          | `memory-chat`, `process-diary` | Conversational AI, diary analysis |
| `openai/gpt-5`                     | Available for complex reasoning| Heavy reasoning tasks             |

### AI Chat (`memory-chat`)

The chat function implements **tool-calling** with the following tools:

- `search_memories` — Semantic + fuzzy search across user's memory corpus
- `create_memory` — Create a new memory from conversation
- `update_memory` — Edit an existing memory
- `delete_memory` — Remove a memory
- `search_documents` — Search extracted document content

The AI has access to user context, timezone, and memory corpus to provide personalized responses.

---

## Design System

### Tokens (HSL-based, in `index.css`)

Light and dark modes are defined via CSS custom properties. All colors use HSL format.

| Token              | Light                    | Usage                      |
| ------------------ | ------------------------ | -------------------------- |
| `--background`     | `30 10% 97%`            | Page background            |
| `--foreground`     | `220 25% 8%`            | Primary text               |
| `--primary`        | `36 85% 52%`            | Amber/gold brand color     |
| `--secondary`      | `220 14% 95%`           | Secondary surfaces         |
| `--accent`         | `36 50% 93%`            | Warm accent highlights     |
| `--muted`          | `220 14% 95%`           | Subdued backgrounds        |
| `--destructive`    | `0 72% 51%`             | Error/delete actions       |

### Fonts

- **Display**: Space Grotesk (headings)
- **Body**: Inter (body text)

### Animations

Framer Motion is used for page transitions, card animations, and micro-interactions. Common patterns:
- `AnimatePresence` for enter/exit transitions
- `motion.div` with `initial`, `animate`, `exit` props
- Staggered children animations via `variants`

### Component Library

shadcn/ui components live in `src/components/ui/`. **Do not edit these directly** — customize via variants in your own components using `cva()`.

---

## Key Libraries

| Library                    | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `@tanstack/react-query`    | Server state management, caching, mutations|
| `react-hook-form` + `zod`  | Form state + schema validation             |
| `framer-motion`            | Animations and transitions                 |
| `date-fns` + `date-fns-tz` | Date formatting and timezone conversion    |
| `recharts`                 | Data visualization charts                  |
| `react-markdown`           | Rendering AI responses                     |
| `cmdk`                     | Command palette (unified command panel)    |
| `sonner`                   | Toast notifications                        |
| `vaul`                     | Drawer component                           |
| `react-resizable-panels`   | Resizable panel layouts                    |
| `embla-carousel-react`     | Carousel/slider                            |
| `next-themes`              | Light/dark theme toggling                  |
| `lucide-react`             | Icon library (exclusive)                   |

---

## Custom Hooks

| Hook              | File                   | Purpose                                        |
| ----------------- | ---------------------- | ---------------------------------------------- |
| `useAIChat`       | `hooks/useAIChat.ts`   | Chat state, streaming reveal, file upload, TTS |
| `useVoiceInput`   | `hooks/useVoiceInput.ts`| Web Speech API recording + transcription       |
| `useTTS`          | `hooks/useTTS.ts`      | Text-to-speech via SpeechSynthesis API         |
| `useTimezone`     | `hooks/useTimezone.ts` | Timezone-aware date formatting                 |
| `useMobile`       | `hooks/use-mobile.tsx` | Responsive breakpoint detection                |
| `useAuth`         | `contexts/AuthContext`  | Auth state consumer hook                       |

---

## Timezone Handling

Timezone is a first-class concern throughout the app:

1. **Detection**: Browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` on first load
2. **Storage**: Persisted in `profiles.timezone` column
3. **Edge injection**: `invokeEdge()` auto-attaches `x-user-timezone` header to every edge function call
4. **AI processing**: Edge functions use the timezone header to correctly convert user-spoken times (e.g., "9:30 AM IST") to UTC for storage
5. **Display**: Frontend formats all dates back to the user's timezone using `date-fns-tz`

---

## File Storage

- **Bucket**: `memory-attachments` (public)
- **Path convention**: `<context>/<user_id>/<timestamp>-<filename>`
  - Memory attachments: `attachments/<user_id>/...`
  - Chat attachments: `chat/<user_id>/...`
- **Access**: Public URLs via `supabase.storage.from('memory-attachments').getPublicUrl(path)`

---

## Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch
```

- **Framework**: Vitest + jsdom
- **Utilities**: `@testing-library/react`, `@testing-library/jest-dom`
- **Config**: `vitest.config.ts` with path aliases matching Vite
- Test files: `src/test/` directory

---

## Coding Conventions

### General

- Use **TypeScript strict mode** — avoid `any` unless absolutely necessary
- Use **semantic Tailwind tokens** — never hardcode colors (`text-white`, `bg-black`)
- Use `cn()` from `@/lib/utils` for conditional Tailwind class merging
- Keep components under ~200 lines; pages under ~250 lines
- Use TanStack React Query for all data fetching — never `useEffect` for data fetching
- Icons: `lucide-react` exclusively

### File Naming

| Type        | Convention              | Example                  |
| ----------- | ----------------------- | ------------------------ |
| Components  | `PascalCase.tsx`        | `MemoryCard.tsx`         |
| Pages       | `PascalCase.tsx`        | `Dashboard.tsx`          |
| Hooks       | `useCamelCase.ts`       | `useAIChat.ts`           |
| Utilities   | `camelCase.ts`          | `invokeEdge.ts`          |
| Constants   | `camelCase.ts`          | `pageInfo.ts`            |
| Contexts    | `PascalCaseContext.tsx`  | `AuthContext.tsx`         |

### Auto-Generated Files (DO NOT EDIT)

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`

---

## Environment Variables

Managed automatically by Lovable Cloud. Available in frontend via `import.meta.env`:

| Variable                        | Usage                           |
| ------------------------------- | ------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key        |
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project identifier     |

Edge function secrets (available via `Deno.env.get()`):

| Secret                     | Purpose                              |
| -------------------------- | ------------------------------------ |
| `LOVABLE_API_KEY`          | Lovable AI Gateway authentication    |
| `SUPABASE_URL`             | Supabase project URL (server-side)   |
| `SUPABASE_ANON_KEY`        | Supabase public key                  |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase admin key (bypasses RLS)    |
| `SUPABASE_DB_URL`          | Direct database connection string    |

---

## Deployment

- **Frontend**: Deploy via Lovable → Share → Publish. Frontend changes require clicking "Update" in the publish dialog.
- **Backend**: Edge functions and database migrations deploy **automatically** on save.
- **Custom domains**: Settings → Domains → Connect Domain (paid plan required).

---

## License

Private project. All rights reserved.
