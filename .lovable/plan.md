
## Data Flow Analysis

You're asking a great question about the architecture. Here's exactly how it works:

### Current Flow

1. **AI deletes memory** → Edge function (`memory-chat`) uses the **service role key** to delete from `memory_notes` table
2. **Edge function returns** `{ reply: "...", mutated: true }` when any create/update/delete succeeds
3. **Frontend receives response** → In `AIChatPanel.tsx` line 93:
   ```typescript
   if (data.mutated) queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
   ```
4. **React Query refetches** → `Dashboard.tsx` query with key `['memory-notes']` refetches all memories
5. **UI updates** with fresh data

### Is This Efficient?

**Pros:**
- Simple and reliable — always in sync
- React Query handles caching/deduplication

**Cons:**
- Full refetch on every mutation (even if AI just deleted 1 memory)
- Network roundtrip after every AI action

### Better Alternatives

| Approach | Description | Trade-off |
|----------|-------------|-----------|
| **Optimistic updates** | FE immediately removes the item, rollback on error | More complex, but instant UI |
| **Return delta from AI** | Edge function returns `{ deleted: [id1, id2], created: [...] }` and FE patches cache | Best of both worlds |
| **Supabase Realtime** | Subscribe to `memory_notes` table changes | Auto-sync, but adds websocket overhead |

### Recommendation

The current approach (refetch on `mutated: true`) is **fine for now** — React Query is efficient about this. If you want to optimize:

1. **Short-term**: Have the edge function return the specific IDs that changed, then use `queryClient.setQueryData` to patch the cache instead of refetching
2. **Long-term**: Enable Supabase Realtime for the `memory_notes` table — then any change (from AI or UI) auto-syncs to all open tabs

Would you like me to implement the delta-based cache update approach, or add Realtime subscriptions?
