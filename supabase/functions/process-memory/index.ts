import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Run AI extraction and embedding generation in parallel
    const extractPromise = fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an AI assistant that processes memory notes. Extract structured data from the user's input. Today's date: ${new Date().toISOString()}.
            
For mood: analyze the emotional tone and assign one of: happy, sad, anxious, excited, neutral, grateful, frustrated, hopeful, nostalgic, motivated.

For extracted_actions: identify any actionable items, tasks, or key facts. Each action should have a "text" (description) and "type" (one of: task, reminder, fact, decision).`
          },
          { role: "user", content: input },
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
                mood: { type: "string", enum: ["happy", "sad", "anxious", "excited", "neutral", "grateful", "frustrated", "hopeful", "nostalgic", "motivated"], description: "Detected emotional tone of the memory" },
                extracted_actions: {
                  type: "array",
                  description: "Actionable items, tasks, or key facts extracted from input",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      type: { type: "string", enum: ["task", "reminder", "fact", "decision"] },
                    },
                    required: ["text", "type"],
                  },
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-7 relevant lowercase tags: people names, places, projects, topics, key entities. No hashtags.",
                },
              },
              required: ["title", "content", "is_recurring", "category", "mood", "tags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_memory" } },
      }),
    });

    const earlyEmbeddingPromise = fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: input,
        dimensions: 768,
      }),
    });

    const [extractResponse, earlyEmbResponse] = await Promise.all([extractPromise, earlyEmbeddingPromise]);

    if (!extractResponse.ok) {
      const status = extractResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
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

    let embedding = null;
    if (earlyEmbResponse.ok) {
      const embData = await earlyEmbResponse.json();
      embedding = embData.data?.[0]?.embedding || null;
    }

    return new Response(JSON.stringify({ ...parsed, embedding }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-memory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
