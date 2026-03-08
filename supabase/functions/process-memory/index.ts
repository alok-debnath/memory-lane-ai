import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input, isAudio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userText = input;

    // Step 1: Extract structured data using tool calling
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an AI assistant that processes memory notes. Extract structured data from the user's input. Today's date: ${new Date().toISOString()}`
          },
          { role: "user", content: userText },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_memory",
            description: "Create a structured memory note from user input",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short title, max 8 words" },
                content: { type: "string", description: "Full content/description" },
                reminder_date: { type: "string", description: "ISO 8601 date if mentioned, or null" },
                is_recurring: { type: "boolean" },
                recurrence_type: { type: "string", enum: ["yearly", "monthly", "weekly", "daily"], description: "null if not recurring" },
                category: { type: "string", enum: ["personal", "work", "finance", "health", "other"] },
              },
              required: ["title", "content", "is_recurring", "category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_memory" } },
      }),
    });

    if (!extractResponse.ok) {
      if (extractResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (extractResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI processing failed");
    }

    const aiData = await extractResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    
    const parsed = JSON.parse(toolCall.function.arguments);

    // Step 2: Generate embedding for semantic search
    const embeddingText = `${parsed.title}. ${parsed.content}`;
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
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

    let embedding = null;
    if (embeddingResponse.ok) {
      const embData = await embeddingResponse.json();
      embedding = embData.data?.[0]?.embedding || null;
    } else {
      console.error("Embedding generation failed, continuing without it");
    }

    return new Response(JSON.stringify({ ...parsed, embedding }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-memory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
