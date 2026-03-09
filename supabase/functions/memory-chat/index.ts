import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _supabase;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_memories",
      description: "Search through the user's memories using semantic + fuzzy search. Use this whenever the user asks about something they previously stored, asks a factual question, or wants to recall any information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query - use keywords and natural language" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "Search through the user's uploaded documents (warranties, receipts, PDFs, images) using semantic search. Use when the user asks about documents, warranties, receipts, or uploaded files.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query for documents" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memory",
      description: "Create a new memory note for the user. Use when they say 'remember', 'save', 'note down', or share information they want stored.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short descriptive title" },
          content: { type: "string", description: "Full content of the memory" },
          category: { type: "string", enum: ["personal", "work", "finance", "health", "other"] },
          reminder_date: { type: "string", description: "ISO 8601 date if they want a reminder, or null" },
          is_recurring: { type: "boolean" },
          recurrence_type: { type: "string", enum: ["yearly", "monthly", "weekly", "daily"] },
          tags: { type: "array", items: { type: "string" }, description: "Relevant tags for this memory" },
          mood: { type: "string", description: "Detected mood/sentiment" },
        },
        required: ["title", "content", "category", "is_recurring"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_memory",
      description: "Update an existing memory note. First search to find the memory, then update it.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "UUID of the memory to update" },
          title: { type: "string" },
          content: { type: "string" },
          category: { type: "string", enum: ["personal", "work", "finance", "health", "other"] },
          reminder_date: { type: "string", description: "ISO 8601 date or null" },
          is_recurring: { type: "boolean" },
          recurrence_type: { type: "string", enum: ["yearly", "monthly", "weekly", "daily"] },
          tags: { type: "array", items: { type: "string" } },
          mood: { type: "string" },
        },
        required: ["memory_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_memory",
      description: "Delete a memory note permanently. Always confirm with the user before deleting unless they are explicit.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "UUID of the memory to delete" },
        },
        required: ["memory_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_multiple_memories",
      description: "Delete multiple memory notes at once. Use when the user asks to delete several or all memories matching criteria.",
      parameters: {
        type: "object",
        properties: {
          memory_ids: { type: "array", items: { type: "string" }, description: "Array of memory UUIDs to delete" },
        },
        required: ["memory_ids"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_memories",
      description: "List memories with optional filters. Use for browsing, counting, or getting an overview.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 20)" },
          category: { type: "string", description: "Filter by category" },
          sort: { type: "string", enum: ["newest", "oldest"], description: "Sort order" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "Get statistics about the user's memories - counts by category, total count, recent activity, tags distribution, mood distribution.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_memories",
      description: "Retrieve all or filtered memories for analysis - patterns, trends, insights, summaries. Use when the user asks you to analyze, summarize, find patterns, or give insights about their data.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category filter" },
          limit: { type: "number", description: "Max memories to analyze (default 100)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "history",
      description: "Version control for memories. Actions: 'list' to see recent changes/deletions, 'undo' to revert the last change (optionally for a specific memory_id), 'restore' to restore a specific history_id snapshot.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "undo", "restore"], description: "What to do" },
          memory_id: { type: "string", description: "For 'undo': target a specific memory. For 'list': filter by memory." },
          history_id: { type: "string", description: "For 'restore': the specific snapshot to restore." },
          limit: { type: "number", description: "For 'list': max entries (default 20)" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "attach_file_to_memory",
      description: "Attach a file (image, document, etc.) that the user uploaded in chat to a memory. Use after creating a memory when the user shared files they want attached.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "UUID of the memory to attach the file to" },
          file_url: { type: "string", description: "The full URL of the uploaded file" },
          file_name: { type: "string", description: "Original file name" },
          file_type: { type: "string", description: "MIME type of the file" },
        },
        required: ["memory_id", "file_url", "file_name", "file_type"],
        additionalProperties: false,
      },
    },
  },
];

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text, dimensions: 768 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

async function executeTool(
  name: string,
  args: Record<string, any>,
  supabase: any,
  userId: string,
  apiKey: string,
): Promise<string> {
  switch (name) {
    case "search_memories": {
      const [semanticResults, fuzzyResults] = await Promise.all([
        (async () => {
          const embedding = await generateEmbedding(args.query, apiKey);
          if (!embedding) return [];
          const { data } = await supabase.rpc("match_memories", {
            query_embedding: embedding, match_threshold: 0.15, match_count: 15, p_user_id: userId,
          });
          return data || [];
        })(),
        (async () => {
          const { data } = await supabase.rpc("fuzzy_search_memories", {
            search_query: args.query, p_user_id: userId, similarity_threshold: 0.1, max_results: 15,
          });
          return data || [];
        })(),
      ]);
      const seen = new Set<string>();
      const merged = [];
      for (const item of [...semanticResults, ...fuzzyResults]) {
        if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
      }
      return JSON.stringify({ results: merged, count: merged.length });
    }

    case "search_documents": {
      const embedding = await generateEmbedding(args.query, apiKey);
      if (!embedding) return JSON.stringify({ results: [], count: 0 });
      const { data } = await supabase.rpc("match_documents", {
        query_embedding: embedding, match_threshold: 0.2, match_count: 10, p_user_id: userId,
      });
      return JSON.stringify({ results: data || [], count: (data || []).length });
    }

    case "create_memory": {
      const embedding = await generateEmbedding(`${args.title}. ${args.content}`, apiKey);
      const { data, error } = await supabase
        .from("memory_notes")
        .insert({
          title: args.title, content: args.content, category: args.category || "other",
          reminder_date: args.reminder_date || null, is_recurring: args.is_recurring || false,
          recurrence_type: args.recurrence_type || null, user_id: userId, embedding,
          tags: args.tags || [], mood: args.mood || null,
        })
        .select("id, title, category, created_at")
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, memory: data });
    }

    case "update_memory": {
      const updates: Record<string, any> = {};
      for (const key of ["title", "content", "category", "reminder_date", "is_recurring", "recurrence_type", "tags", "mood"]) {
        if (args[key] !== undefined) updates[key] = args[key];
      }
      if (args.title || args.content) {
        const { data: existing } = await supabase
          .from("memory_notes").select("title, content")
          .eq("id", args.memory_id).eq("user_id", userId).single();
        if (existing) {
          const emb = await generateEmbedding(`${args.title || existing.title}. ${args.content || existing.content}`, apiKey);
          if (emb) updates.embedding = emb;
        }
      }
      const { data, error } = await supabase
        .from("memory_notes").update(updates)
        .eq("id", args.memory_id).eq("user_id", userId)
        .select("id, title, category").single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, memory: data });
    }

    case "delete_memory": {
      const { error } = await supabase.from("memory_notes").delete()
        .eq("id", args.memory_id).eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true });
    }

    case "delete_multiple_memories": {
      const { error } = await supabase.from("memory_notes").delete()
        .in("id", args.memory_ids).eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, deleted_count: args.memory_ids.length });
    }

    case "list_memories": {
      let q = supabase.from("memory_notes")
        .select("id, title, content, category, reminder_date, is_recurring, recurrence_type, created_at, mood, tags")
        .eq("user_id", userId);
      if (args.category) q = q.eq("category", args.category);
      q = q.order("created_at", { ascending: args.sort === "oldest" });
      q = q.limit(args.limit || 20);
      const { data } = await q;
      return JSON.stringify({ memories: data || [], count: (data || []).length });
    }

    case "get_stats": {
      const { data: all } = await supabase
        .from("memory_notes")
        .select("id, category, mood, tags, created_at, is_recurring, reminder_date")
        .eq("user_id", userId);
      const memories = all || [];
      const total = memories.length;
      const categories: Record<string, number> = {};
      const moods: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};
      let withReminders = 0;
      let recurring = 0;

      for (const m of memories) {
        categories[m.category || "other"] = (categories[m.category || "other"] || 0) + 1;
        if (m.mood) moods[m.mood] = (moods[m.mood] || 0) + 1;
        if (m.tags) for (const t of m.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
        if (m.reminder_date) withReminders++;
        if (m.is_recurring) recurring++;
      }

      // Recent activity (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentCount = memories.filter((m: any) => m.created_at > weekAgo).length;

      // Top tags
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

      return JSON.stringify({
        total, categories, moods, topTags, withReminders, recurring, recentCount,
      });
    }

    case "analyze_memories": {
      let q = supabase.from("memory_notes")
        .select("id, title, content, category, mood, tags, created_at, reminder_date, is_recurring")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (args.category) q = q.eq("category", args.category);
      q = q.limit(args.limit || 100);
      const { data } = await q;
      return JSON.stringify({ memories: data || [], count: (data || []).length });
    }

    case "history": {
      if (args.action === "list") {
        let q = supabase.from("memory_history")
          .select("id, memory_id, action, snapshot, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (args.memory_id) q = q.eq("memory_id", args.memory_id);
        q = q.limit(args.limit || 20);
        const { data } = await q;
        return JSON.stringify({
          history: (data || []).map((h: any) => ({
            history_id: h.id, memory_id: h.memory_id,
            action: h.action === "delete" ? "deleted" : "edited",
            title: h.snapshot?.title, category: h.snapshot?.category,
            content_preview: h.snapshot?.content?.substring(0, 100),
            changed_at: h.created_at,
          })),
        });
      }

      // Resolve the history entry to restore
      let entryId = args.history_id;
      if (args.action === "undo" && !entryId) {
        let q = supabase.from("memory_history")
          .select("id").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(1);
        if (args.memory_id) q = q.eq("memory_id", args.memory_id);
        const { data } = await q;
        if (!data?.length) return JSON.stringify({ error: "Nothing to undo" });
        entryId = data[0].id;
      }
      if (!entryId) return JSON.stringify({ error: "history_id required for restore" });

      // Restore from snapshot
      const { data: h, error: hErr } = await supabase
        .from("memory_history").select("*")
        .eq("id", entryId).eq("user_id", userId).single();
      if (hErr || !h) return JSON.stringify({ error: "Snapshot not found" });

      const snap = h.snapshot;
      const mid = h.memory_id;
      const { data: exists } = await supabase
        .from("memory_notes").select("id").eq("id", mid).eq("user_id", userId).single();

      const fields = {
        title: snap.title, content: snap.content, category: snap.category,
        mood: snap.mood, tags: snap.tags, reminder_date: snap.reminder_date,
        is_recurring: snap.is_recurring, recurrence_type: snap.recurrence_type,
        capsule_unlock_date: snap.capsule_unlock_date, extracted_actions: snap.extracted_actions,
        embedding: snap.embedding,
      };

      const { error } = exists
        ? await supabase.from("memory_notes").update(fields).eq("id", mid).eq("user_id", userId)
        : await supabase.from("memory_notes").insert({ ...fields, id: mid, user_id: userId, created_at: snap.created_at });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, action: exists ? "reverted" : "restored", title: snap.title });
    }

    case "attach_file_to_memory": {
      try {
        const url = new URL(args.file_url);
        const pathParts = url.pathname.split('/memory-attachments/');
        const filePath = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : args.file_url;
        const { data, error } = await supabase
          .from("memory_attachments")
          .insert({
            memory_id: args.memory_id,
            user_id: userId,
            file_name: args.file_name,
            file_type: args.file_type,
            file_path: filePath,
            file_size: 0,
          })
          .select("id")
          .single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, attachment_id: data.id });
      } catch (e: any) {
        return JSON.stringify({ error: e.message || "Failed to attach file" });
      }
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId, timezone } = await req.json();
    const userTz = timezone || 'UTC';
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = getSupabase();

    const systemPrompt = `You are Memora, the user's personal AI memory assistant. You are their second brain — you remember everything they tell you and give it back instantly when asked.

## Your Core Behaviors:

1. **DIRECT ANSWERS**: When the user asks a question about something they stored, give the answer directly. Do NOT say "I found a memory that says..." — just answer. Example:
   - User: "What's my WiFi password?"
   - You: "Your WiFi password is starlight42."
   - NOT: "I found a memory titled 'WiFi Password' which contains the password starlight42."

2. **REMEMBER EVERYTHING**: When the user shares information (even casually), save it as a memory. You don't need them to say "remember this" — if they share a fact, preference, or detail, store it.

3. **FULL CONTROL**: You can do everything the user asks:
   - Search, create, edit, delete memories (single or bulk)
   - Analyze patterns and trends across their data
   - Provide statistics and insights
   - Search uploaded documents (warranties, receipts, etc.)
   - Set reminders and recurring tasks
   - Categorize and tag information

4. **BE PROACTIVE**: 
   - If you notice conflicting information, mention it
   - If a warranty or deadline is approaching, mention it
   - Suggest connections between memories when relevant

5. **CONCISE & NATURAL**: Talk like a knowledgeable friend, not a database interface. Keep responses short unless the user asks for detail.

6. **SMART DELETION**: When asked to delete, always search first to find the right memory. Confirm before deleting unless the user is very explicit (e.g., "delete all my work memories").

7. **ANALYSIS**: When asked to analyze, summarize, or find patterns, use the analyze_memories tool to get data, then provide genuine insights — not just a list.

8. **UNDO & HISTORY**: Every edit and delete is automatically versioned for 7 days. When the user says "undo", "revert", "restore", "what did I delete", or "I accidentally deleted...", use the 'history' tool with action='list' to see changes, action='undo' to revert the last change, or action='restore' with a history_id to restore a specific version. Always reassure them that nothing is permanently lost for 7 days.

Today's date: ${new Date().toISOString().split('T')[0]}
Format dates in a human-friendly way (e.g., "March 15, 2026" not ISO strings).
Use markdown only when it genuinely helps readability (lists, bold for key info). Don't over-format simple answers.

9. **FILE ATTACHMENTS**: When the user shares files in chat, the file URLs appear in their message as [Attached file: name (type) — URL: ...]. You can:
   - Create a memory and use attach_file_to_memory to link the file to it
   - Reference the file in your response
   - Always confirm what you've done with the file`;

    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let maxIterations = 8;
    while (maxIterations-- > 0) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools: TOOLS,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      const data = await response.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("No message in response");

      conversationMessages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const toolResults = await Promise.all(
          msg.tool_calls.map(async (tc: any) => {
            const args = JSON.parse(tc.function.arguments);
            const result = await executeTool(tc.function.name, args, supabase, userId, LOVABLE_API_KEY);
            return { role: "tool", tool_call_id: tc.id, content: result };
          })
        );
        conversationMessages.push(...toolResults);
        continue;
      }

      const toolResults = conversationMessages.filter((m: any) => m.role === "tool");
      let mutated = false;
      for (const tr of toolResults) {
        try {
          const parsed = JSON.parse(tr.content);
          if (parsed.success) { mutated = true; break; }
        } catch {}
      }

      return new Response(JSON.stringify({ reply: msg.content, mutated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Too many tool iterations" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("memory-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
