# Edge Functions — INSTRUCTIONS.md

## Purpose

Supabase Edge Functions (Deno runtime) that handle server-side logic: AI processing, scheduled tasks, and secure operations.

## Do

- Use the **Lovable AI Gateway** for AI model calls — supported models don't require user API keys.
- Always authenticate requests using the `Authorization` header and Supabase client.
- Return proper HTTP status codes and JSON error messages.
- Handle CORS with the standard `OPTIONS` preflight pattern.
- Keep functions **focused** — one function per concern.

## Don't

- **Never** expose secrets in responses or logs.
- **Never** trust client-sent `user_id` — always derive from the auth token.
- **Never** use `npm` packages — Edge Functions run on Deno; use `esm.sh` or Deno-native imports.
- **Never** modify reserved schemas (`auth`, `storage`, `realtime`).
- **Never** write long-running synchronous operations — use background tasks or split into steps.

## Conventions

- Each function lives in its own folder: `supabase/functions/<function-name>/index.ts`.
- Use `Deno.env.get()` for secrets.
- Standard CORS headers:
  ```ts
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  ```
- Always handle the `OPTIONS` method for CORS preflight.

## Existing Functions

| Function              | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `process-memory`      | AI-powered memory enrichment & metadata extraction |
| `process-diary`       | Diary entry analysis, grammar correction, insights |
| `process-document`    | Document/file text extraction & classification   |
| `memory-chat`         | Conversational AI over user's memory corpus      |
| `semantic-search`     | Vector similarity search across memories         |
| `detect-conflicts`    | Find contradictory information across memories   |
| `backfill-embeddings` | Generate embeddings for existing memories        |
| `send-reminders`      | Scheduled reminder delivery                      |
