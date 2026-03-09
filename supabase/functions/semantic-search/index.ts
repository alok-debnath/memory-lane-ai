import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-timezone, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reuse client across requests (edge functions are warm)
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
    const body = await req.json();
    const { query, userId, searchDocs } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = getSupabase();

    // Run all search layers in parallel for maximum speed
    const [semanticResults, fuzzyResults, documentResults] = await Promise.all([
      // Layer 1: Vector semantic search
      (async () => {
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

          const { data } = await supabase.rpc("match_memories", {
            query_embedding: queryEmbedding,
            match_threshold: 0.2,
            match_count: 15,
            p_user_id: userId,
          });
          return (data || []).map((r: Record<string, unknown>) => ({
            ...r, _score: ((r.similarity as number) || 0), _source: "semantic",
          }));
        } catch { return []; }
      })(),

      // Layer 2: Fuzzy + keyword search (uses trigram indexes, very fast)
      (async () => {
        try {
          const { data } = await supabase.rpc("fuzzy_search_memories", {
            search_query: query,
            p_user_id: userId,
            similarity_threshold: 0.12,
            max_results: 15,
          });
          return (data || []).map((r: Record<string, unknown>) => ({
            ...r, _score: ((r.fuzzy_score as number) || 0) * 0.7, _source: "fuzzy",
          }));
        } catch { return []; }
      })(),

      // Layer 3: Document extraction search (vector search through uploaded docs)
      (async () => {
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

          const { data } = await supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_threshold: 0.25,
            match_count: 10,
            p_user_id: userId,
          });
          return data || [];
        } catch { return []; }
      })(),
    ]);

    // Merge, deduplicate, boost multi-source matches
    const scoreMap = new Map<string, { item: Record<string, unknown>; score: number; sources: string[] }>();

    for (const item of [...semanticResults, ...fuzzyResults]) {
      const id = item.id as string;
      const existing = scoreMap.get(id);
      if (existing) {
        existing.sources.push(item._source as string);
        existing.score = Math.max(existing.score, item._score as number) * 1.15;
      } else {
        scoreMap.set(id, { item, score: item._score as number, sources: [item._source as string] });
      }
    }

    const merged = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ item }) => {
        const { _score, _source, fuzzy_score, similarity, ...clean } = item as Record<string, unknown>;
        return clean;
      });

    return new Response(JSON.stringify({ results: merged, documentResults: documentResults || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=30" },
    });
  } catch (e) {
    console.error("semantic-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
