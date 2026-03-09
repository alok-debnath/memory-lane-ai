# Contexts — INSTRUCTIONS.md

## Purpose

React Context providers for app-wide state (e.g., authentication).

## Do

- Use contexts **only** for truly global state (auth, theme).
- Provide a custom hook for consuming context (e.g., `useAuth`).
- Memoize context values to prevent unnecessary re-renders.

## Don't

- **Never** use context for server state — use React Query instead.
- **Never** store sensitive data (tokens, keys) in context beyond what Supabase manages.
- **Never** create new contexts without a clear justification — prefer React Query or props.

## Conventions

- File naming: `PascalCaseContext.tsx`.
- Always include a provider and a consumer hook in the same file.
