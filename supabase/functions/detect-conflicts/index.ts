import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-timezone, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _supabase;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { memoryId, content, title, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = getSupabase();

    // Step 1: Get embedding for the new memory content
    const embResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: `${title}. ${content}`,
        dimensions: 768,
      }),
    });

    if (!embResponse.ok) {
      return new Response(JSON.stringify({ conflicts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embData = await embResponse.json();
    const queryEmbedding = embData.data?.[0]?.embedding;
    if (!queryEmbedding) {
      return new Response(JSON.stringify({ conflicts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Find similar memories (excluding the new one)
    const { data: similar } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding,
      match_threshold: 0.45,
      match_count: 8,
      p_user_id: userId,
    });

    const candidates = (similar || []).filter((m: any) => m.id !== memoryId);
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ conflicts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Ask AI to detect contradictions
    const memorySummaries = candidates
      .map((m: any, i: number) => `[Memory ${i + 1} - ID: ${m.id}] Title: ${m.title}\nContent: ${m.content}\nDate: ${m.created_at}`)
      .join("\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a memory conflict detector. Compare a NEW memory against EXISTING memories and identify contradictions or outdated information.

Look for:
- Factual contradictions (e.g., different passwords, addresses, phone numbers for the same thing)
- Updated decisions that override old ones
- Schedule conflicts (overlapping times/dates)
- Changed preferences or opinions on the same topic

Only report REAL conflicts where information genuinely contradicts. Do NOT flag memories that are simply related or similar.`,
          },
          {
            role: "user",
            content: `NEW MEMORY:\nTitle: ${title}\nContent: ${content}\n\nEXISTING MEMORIES:\n${memorySummaries}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_conflicts",
              description: "Report detected conflicts between the new memory and existing ones",
              parameters: {
                type: "object",
                properties: {
                  conflicts: {
                    type: "array",
                    description: "List of detected conflicts. Empty array if no conflicts found.",
                    items: {
                      type: "object",
                      properties: {
                        existing_memory_id: { type: "string", description: "ID of the conflicting existing memory" },
                        existing_memory_title: { type: "string" },
                        conflict_type: { type: "string", enum: ["factual", "decision", "schedule", "preference"] },
                        description: { type: "string", description: "Brief explanation of the contradiction" },
                        suggestion: { type: "string", enum: ["keep_new", "keep_old", "merge", "review"], description: "Recommended resolution" },
                      },
                      required: ["existing_memory_id", "existing_memory_title", "conflict_type", "description", "suggestion"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["conflicts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_conflicts" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ conflicts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ conflicts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-conflicts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
