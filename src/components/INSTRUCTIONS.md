# Components — INSTRUCTIONS.md

## Purpose

Reusable UI components used across pages. Includes shadcn/ui primitives (`ui/`), feature components, and layout shells.

## Do

- Keep components **single-responsibility** — one component, one job.
- Use **semantic design tokens** (`bg-primary`, `text-muted-foreground`) — never raw colors.
- Use `framer-motion` for animations — prefer `AnimatePresence` for enter/exit transitions.
- Co-locate sub-components in folders (e.g., `dashboard/DashboardSummary.tsx`, `diary/DiaryEntryCard.tsx`).
- Accept data and callbacks via props — components should be **stateless** where possible.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Prefer shadcn/ui components (`Button`, `Dialog`, `Card`, etc.) over custom implementations.

## Don't

- **Never** modify files in `ui/` unless adding a new shadcn variant — these are managed by shadcn/ui.
- **Never** hardcode colors like `text-white`, `bg-black`, `bg-blue-500` — always use tokens.
- **Never** fetch data directly in components — lift data fetching to pages or hooks.
- **Never** import from `@/integrations/supabase/types.ts` to create types manually — use the auto-generated types.
- **Never** exceed ~200 lines — extract sub-components when approaching this limit.

## Conventions

- File naming: `PascalCase.tsx` for components.
- Props interface: `ComponentNameProps` (e.g., `MemoryCardProps`).
- Export: default export for the main component.
- Icons: use `lucide-react` exclusively.
