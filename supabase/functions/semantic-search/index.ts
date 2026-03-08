import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Run all 3 search layers in parallel:
    // 1. Vector/semantic search (meaning-based)
    // 2. Fuzzy search via pg_trgm (typo-tolerant)
    // 3. Falls back inside fuzzy_search_memories which also does ILIKE

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
          match_threshold: 0.2,
          match_count: 20,
          p_user_id: userId,
        });

        return (results || []).map((r: Record<string, unknown>) => ({
          ...r,
          _score: ((r.similarity as number) || 0) * 1.0, // highest weight for semantic
          _source: "semantic",
        }));
      } catch {
        return [];
      }
    })();

    const fuzzyPromise = (async () => {
      try {
        const { data: results } = await supabase.rpc("fuzzy_search_memories", {
          search_query: query,
          p_user_id: userId,
          similarity_threshold: 0.12,
          max_results: 20,
        });

        return (results || []).map((r: Record<string, unknown>) => ({
          ...r,
          _score: ((r.fuzzy_score as number) || 0) * 0.7, // slightly lower weight
          _source: "fuzzy",
        }));
      } catch {
        return [];
      }
    })();

    const [semanticResults, fuzzyResults] = await Promise.all([semanticPromise, fuzzyPromise]);

    // Merge and deduplicate, keeping highest score per memory
    const scoreMap = new Map<string, { item: Record<string, unknown>; score: number; sources: string[] }>();

    for (const item of [...semanticResults, ...fuzzyResults]) {
      const id = item.id as string;
      const existing = scoreMap.get(id);
      if (existing) {
        existing.sources.push(item._source as string);
        // Boost score when found by multiple methods
        existing.score = Math.max(existing.score, item._score as number) * 1.1;
      } else {
        scoreMap.set(id, {
          item,
          score: item._score as number,
          sources: [item._source as string],
        });
      }
    }

    // Sort by combined score
    const merged = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .map(({ item, score, sources }) => {
        // Clean up internal fields
        const { _score, _source, fuzzy_score, similarity, ...clean } = item as Record<string, unknown>;
        return { ...clean, _relevance: score, _sources: sources };
      });

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
