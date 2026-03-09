# AGENTS.md — AI Agent Guidelines

> This document serves as the entry point for AI agents working on this codebase.
> Each major directory contains an `INSTRUCTIONS.md` with folder-specific rules.

## Project Overview

**MemoryApp** — A voice-and-text memory capture app built with React, Vite, TypeScript, Tailwind CSS, and Supabase (via Lovable Cloud). Users record memories via voice/text, and AI automatically enriches them with metadata (people, locations, sentiment, actions, etc.).

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | React 18 + TypeScript                           |
| Build        | Vite                                            |
| Styling      | Tailwind CSS + shadcn/ui + Framer Motion        |
| State        | TanStack React Query                            |
| Routing      | React Router v6                                 |
| Backend      | Supabase (Auth, Database, Edge Functions, Storage) |
| AI Models    | Lovable AI Gateway (Gemini, GPT)                |

## Directory Structure & Instructions

When working in any of the directories below, **always reference the corresponding `INSTRUCTIONS.md`** for folder-specific dos and don'ts.

| Directory                | Purpose                          | Instructions                                       |
| ------------------------ | -------------------------------- | -------------------------------------------------- |
| `src/components/`        | Reusable UI components           | [`src/components/INSTRUCTIONS.md`](src/components/INSTRUCTIONS.md) |
| `src/pages/`             | Route-level page components      | [`src/pages/INSTRUCTIONS.md`](src/pages/INSTRUCTIONS.md)           |
| `src/hooks/`             | Custom React hooks               | [`src/hooks/INSTRUCTIONS.md`](src/hooks/INSTRUCTIONS.md)           |
| `src/contexts/`          | React context providers          | [`src/contexts/INSTRUCTIONS.md`](src/contexts/INSTRUCTIONS.md)     |
| `src/constants/`         | Static config & content          | [`src/constants/INSTRUCTIONS.md`](src/constants/INSTRUCTIONS.md)   |
| `src/integrations/`      | Third-party integrations         | [`src/integrations/INSTRUCTIONS.md`](src/integrations/INSTRUCTIONS.md) |
| `src/lib/`               | Utility functions                | [`src/lib/INSTRUCTIONS.md`](src/lib/INSTRUCTIONS.md)               |
| `supabase/functions/`    | Supabase Edge Functions          | [`supabase/functions/INSTRUCTIONS.md`](supabase/functions/INSTRUCTIONS.md) |

## Global Rules

### Do

- Use **semantic Tailwind tokens** (`bg-primary`, `text-foreground`, etc.) — never hardcode colors.
- Keep components **small and focused** — extract when a file exceeds ~200 lines.
- Use **TypeScript strict mode** — no `any` unless absolutely necessary.
- Use **TanStack Query** for all server state — never use `useEffect` for data fetching.
- Batch independent tool/API calls in parallel.
- Write RLS policies for every new table.
- Use the Lovable AI Gateway for AI features — never ask users for API keys when supported models suffice.

### Don't

- **Never** edit `src/integrations/supabase/client.ts` or `src/integrations/supabase/types.ts` — these are auto-generated.
- **Never** edit `.env`, `supabase/config.toml`, or lock files — these are managed by the platform.
- **Never** store secrets in code — use Supabase secrets or connectors.
- **Never** use `localStorage` for auth/role checks — always validate server-side.
- **Never** modify Supabase reserved schemas (`auth`, `storage`, `realtime`, `vault`).
- **Never** use `ALTER DATABASE` statements in migrations.
- **Never** use CHECK constraints for time-based validation — use triggers instead.

## Authentication & Security

- Roles are stored in a **separate `user_roles` table** — never on profiles.
- Use `SECURITY DEFINER` functions for role checks to avoid RLS recursion.
- Always implement proper auth flows when creating tables with RLS.
- No anonymous signups — always use email/password with verification.

## Commit & Change Guidelines

- Verify changes compile before finalizing.
- Run existing tests if available (`vitest`).
- When adding database changes, use the migration tool — never raw SQL files.
- Invalidate relevant React Query caches after mutations.
