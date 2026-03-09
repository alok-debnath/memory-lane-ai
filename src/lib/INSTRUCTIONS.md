# Lib — INSTRUCTIONS.md

## Purpose

Pure utility functions with no side effects or React dependencies.

## Do

- Keep functions **pure** — same input, same output, no side effects.
- Write TypeScript with explicit input/output types.
- Use `cn()` (from `utils.ts`) for Tailwind class merging throughout the app.

## Don't

- **Never** import React or hooks in lib files.
- **Never** put API calls or stateful logic here.
- **Never** duplicate utilities available in installed packages (`date-fns`, `clsx`, etc.).

## Conventions

- File naming: `camelCase.ts`.
- Export named functions — no default exports.
