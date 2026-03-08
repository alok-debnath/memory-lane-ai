import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, userId, mode = "hybrid" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Run keyword search and semantic search in parallel
    const keywordPromise = supabase
      .from("memory_notes")
      .select("id, title, content, category, reminder_date, is_recurring, recurrence_type, created_at, updated_at, user_id")
      .eq("user_id", userId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    const semanticPromise = (async () => {
      try {
        const embResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: query,
            dimensions: 768,
          }),
        });

        if (!embResponse.ok) return [];

        const embData = await embResponse.json();
        const queryEmbedding = embData.data?.[0]?.embedding;
        if (!queryEmbedding) return [];

        const { data: results } = await supabase.rpc("match_memories", {
          query_embedding: queryEmbedding,
          match_threshold: 0.25,
          match_count: 20,
          p_user_id: userId,
        });

        return (results || []).map((r: Record<string, unknown>) => ({ ...r, _similarity: r.similarity }));
      } catch {
        return [];
      }
    })();

    const [keywordResult, semanticResults] = await Promise.all([keywordPromise, semanticPromise]);
    const keywordResults = (keywordResult.data || []).map((r: Record<string, unknown>) => ({ ...r, _similarity: 0 }));

    // Merge and deduplicate: semantic results ranked higher
    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];

    // Semantic results first (already ranked by similarity)
    for (const item of semanticResults) {
      if (!seen.has(item.id as string)) {
        seen.add(item.id as string);
        merged.push(item);
      }
    }

    // Then keyword results that weren't in semantic
    for (const item of keywordResults) {
      if (!seen.has(item.id as string)) {
        seen.add(item.id as string);
        merged.push(item);
      }
    }

    return new Response(JSON.stringify({ results: merged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
