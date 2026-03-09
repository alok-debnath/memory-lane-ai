# Constants — INSTRUCTIONS.md

## Purpose

Static configuration, content strings, and lookup data used across the app.

## Do

- Use `as const` for type safety on static objects.
- Group related constants in a single file (e.g., `pageInfo.ts`).
- Export typed interfaces alongside constants.

## Don't

- **Never** put runtime logic or API calls in constants files.
- **Never** store secrets or environment-specific values here.
- **Never** duplicate constants that exist in the database schema.

## Conventions

- File naming: `camelCase.ts`.
- Use descriptive keys that match their usage context.
