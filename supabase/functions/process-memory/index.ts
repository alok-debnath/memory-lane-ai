import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-timezone, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input } = await req.json();
    const userTz = req.headers.get('x-user-timezone') || 'UTC';
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            content: `You are an AI assistant that processes memory notes. Extract ALL structured data from the user's input. Today's date: ${new Date().toISOString()}. The user's timezone is ${userTz}. When the user mentions relative dates/times (e.g. "tomorrow at 3pm", "next Monday"), interpret them in the user's timezone and output the reminder_date as a full ISO 8601 string in UTC.

For mood: analyze the emotional tone and assign one of: happy, sad, anxious, excited, neutral, grateful, frustrated, hopeful, nostalgic, motivated.

For people: extract ALL people names mentioned (first names, full names, nicknames).

For locations: extract ALL locations, places, venues, cities, countries mentioned.

For importance: rate as "critical", "high", "normal", or "low" based on urgency, consequence, or emotional weight.

For life_area: categorize into one of: career, family, health, finance, social, hobbies, education, travel, self-care, relationships, or null if unclear.

For context_tags: extract structured context — who was involved, what happened, where it was, why it matters.

For sentiment_score: rate from -1.0 (very negative) to 1.0 (very positive), 0 being neutral.

For linked_urls: extract any URLs mentioned in the text.

For extracted_actions: identify actionable items, tasks, or key facts. Each action should have a "text" (description) and "type" (one of: task, reminder, fact, decision).`
          },
          { role: "user", content: input },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_memory",
            description: "Create a structured memory note from user input with rich metadata",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short title, max 8 words" },
                content: { type: "string", description: "Full content/description" },
                reminder_date: { type: "string", description: "ISO 8601 date if mentioned, or null" },
                is_recurring: { type: "boolean" },
                recurrence_type: { type: "string", enum: ["yearly", "monthly", "weekly", "daily"], description: "null if not recurring" },
                category: { type: "string", enum: ["personal", "work", "finance", "health", "other"] },
                mood: { type: "string", enum: ["happy", "sad", "anxious", "excited", "neutral", "grateful", "frustrated", "hopeful", "nostalgic", "motivated"] },
                people: {
                  type: "array",
                  items: { type: "string" },
                  description: "Names of people mentioned"
                },
                locations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Locations, places, venues mentioned"
                },
                importance: {
                  type: "string",
                  enum: ["critical", "high", "normal", "low"],
                  description: "How important/urgent this memory is"
                },
                life_area: {
                  type: "string",
                  enum: ["career", "family", "health", "finance", "social", "hobbies", "education", "travel", "self-care", "relationships"],
                  description: "Life area this memory belongs to, or null"
                },
                context_tags: {
                  type: "object",
                  properties: {
                    who: { type: "array", items: { type: "string" }, description: "Who was involved" },
                    what: { type: "string", description: "What happened" },
                    where: { type: "string", description: "Where it happened" },
                    why: { type: "string", description: "Why it matters" }
                  },
                  description: "Structured context about the memory"
                },
                sentiment_score: {
                  type: "number",
                  description: "Sentiment from -1.0 (negative) to 1.0 (positive)"
                },
                linked_urls: {
                  type: "array",
                  items: { type: "string" },
                  description: "URLs mentioned in the text"
                },
                extracted_actions: {
                  type: "array",
                  description: "Actionable items, tasks, or key facts",
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
              required: ["title", "content", "is_recurring", "category", "mood", "tags", "people", "locations", "importance", "sentiment_score"],
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
