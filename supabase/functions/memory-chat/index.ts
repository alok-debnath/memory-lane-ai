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
      description: "Search through the user's memories using natural language semantic search",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
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
      description: "Create a new memory note for the user",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          category: { type: "string", enum: ["personal", "work", "finance", "health", "other"] },
          reminder_date: { type: "string", description: "ISO 8601 date or null" },
          is_recurring: { type: "boolean" },
          recurrence_type: { type: "string", enum: ["yearly", "monthly", "weekly", "daily"] },
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
      description: "Update an existing memory note",
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
      description: "Delete a memory note",
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
      name: "list_memories",
      description: "List all or recent memories for the user",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results to return" },
          category: { type: "string", description: "Filter by category" },
        },
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
      // Run semantic + fuzzy in parallel for speed
      const [semanticResults, fuzzyResults] = await Promise.all([
        (async () => {
          const embedding = await generateEmbedding(args.query, apiKey);
          if (!embedding) return [];
          const { data } = await supabase.rpc("match_memories", {
            query_embedding: embedding, match_threshold: 0.2, match_count: 10, p_user_id: userId,
          });
          return data || [];
        })(),
        (async () => {
          const { data } = await supabase.rpc("fuzzy_search_memories", {
            search_query: args.query, p_user_id: userId, similarity_threshold: 0.12, max_results: 10,
          });
          return data || [];
        })(),
      ]);

      // Deduplicate
      const seen = new Set<string>();
      const merged = [];
      for (const item of [...semanticResults, ...fuzzyResults]) {
        if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
      }
      return JSON.stringify({ results: merged });
    }

    case "create_memory": {
      const embedding = await generateEmbedding(`${args.title}. ${args.content}`, apiKey);
      const { data, error } = await supabase
        .from("memory_notes")
        .insert({
          title: args.title, content: args.content, category: args.category || "other",
          reminder_date: args.reminder_date || null, is_recurring: args.is_recurring || false,
          recurrence_type: args.recurrence_type || null, user_id: userId, embedding,
        })
        .select("id, title, category, created_at")
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, memory: data });
    }

    case "update_memory": {
      const updates: Record<string, any> = {};
      for (const key of ["title", "content", "category", "reminder_date", "is_recurring", "recurrence_type"]) {
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

    case "list_memories": {
      let q = supabase.from("memory_notes")
        .select("id, title, content, category, reminder_date, is_recurring, recurrence_type, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (args.category) q = q.eq("category", args.category);
      q = q.limit(args.limit || 20);
      const { data } = await q;
      return JSON.stringify({ memories: data || [] });
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = getSupabase();

    const systemPrompt = `You are Memora AI, a warm and helpful assistant that helps users manage their memories and notes. You can:
- Search through memories using natural language
- Create new memories from conversation
- Edit/update existing memories
- Delete memories
- List and browse memories

When the user asks to find something, use search_memories. When they want to save something, use create_memory. When they want to change something, first search for it then use update_memory.

Be conversational, helpful, and proactive. If the user describes a memory vaguely, search for it and confirm before editing.

Today's date: ${new Date().toISOString()}
Format dates nicely in your responses. Use markdown for formatting.`;

    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Agentic loop with parallel tool execution
    let maxIterations = 5;
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
        // Execute all tool calls in parallel
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

      // No tool calls = final response
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
