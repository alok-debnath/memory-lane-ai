import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all memories without embeddings
    const { data: memories, error } = await supabase
      .from("memory_notes")
      .select("id, title, content")
      .is("embedding", null)
      .limit(50);

    if (error) throw error;
    if (!memories || memories.length === 0) {
      return new Response(JSON.stringify({ message: "No memories need embeddings", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    const errors: string[] = [];

    for (const memory of memories) {
      try {
        const embeddingText = `${memory.title}. ${memory.content}`;
        const embResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: embeddingText,
            dimensions: 768,
          }),
        });

        if (!embResponse.ok) {
          errors.push(`Failed embedding for ${memory.id}`);
          continue;
        }

        const embData = await embResponse.json();
        const embedding = embData.data?.[0]?.embedding;
        if (!embedding) continue;

        const { error: updateError } = await supabase
          .from("memory_notes")
          .update({ embedding })
          .eq("id", memory.id);

        if (updateError) {
          errors.push(`Failed update for ${memory.id}: ${updateError.message}`);
        } else {
          processed++;
        }
      } catch (e) {
        errors.push(`Error for ${memory.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return new Response(JSON.stringify({ processed, total: memories.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill-embeddings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
