# Pages — INSTRUCTIONS.md

## Purpose

Route-level components rendered by React Router. Each file maps to a URL path.

## Do

- Use **TanStack Query** (`useQuery`, `useMutation`) for all data fetching.
- Keep pages as **orchestrators** — delegate UI to components, logic to hooks.
- Include `<PageInfoButton />` in the header for discoverability.
- Invalidate relevant query keys after mutations.
- Handle loading, empty, and error states gracefully.

## Don't

- **Never** put complex business logic directly in pages — extract to hooks.
- **Never** exceed ~250 lines — split into sub-components.
- **Never** duplicate data fetching patterns — create shared hooks instead.
- **Never** use `useEffect` for data fetching — use React Query.

## Conventions

- File naming: `PascalCase.tsx` matching the route name.
- Each page should have a clear heading (`h1`) and description.
- Wrap the page content in `<div className="space-y-*">` for consistent spacing.
