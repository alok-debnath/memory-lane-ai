# Hooks — INSTRUCTIONS.md

## Purpose

Custom React hooks encapsulating reusable stateful logic, side effects, and abstractions.

## Do

- Prefix all hooks with `use` (e.g., `useTTS`, `useMobile`).
- Keep hooks **focused** — one concern per hook.
- Return stable references using `useCallback` and `useMemo` where appropriate.
- Type all return values explicitly.

## Don't

- **Never** include UI/JSX in hooks — hooks return data and handlers only.
- **Never** call Supabase directly without error handling.
- **Never** create hooks that duplicate React Query's caching — wrap queries in hooks instead.

## Conventions

- File naming: `use-kebab-case.ts` or `useCamelCase.ts`.
- Export: named export preferred for hooks.
