import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { text } = await req.json();
    if (!text?.trim()) throw new Error("No text provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Step 1: Process diary entry with AI
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
            content: `You are a personal diary AI analyst. Analyze the user's diary entry and extract structured insights.
You must call the extract_diary_insights function with your analysis. IMPORTANT: Always provide a corrected_text field with the user's text rewritten with proper grammar, punctuation, spelling, and sentence structure while preserving their original meaning and voice.`
          },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_diary_insights",
              description: "Extract structured insights from a diary entry",
              parameters: {
                type: "object",
                properties: {
                  corrected_text: { type: "string", description: "The user's original text rewritten with correct grammar, punctuation, spelling, and sentence structure. Preserve the original meaning and voice." },
                  summary: { type: "string", description: "2-3 sentence summary of the entry" },
                  key_points: {
                    type: "array",
                    items: { type: "object", properties: { point: { type: "string" }, category: { type: "string", enum: ["thought", "event", "feeling", "decision", "goal", "concern"] } }, required: ["point", "category"] },
                    description: "Key points extracted from the entry"
                  },
                  mood: { type: "string", enum: ["joyful", "content", "neutral", "anxious", "stressed", "sad", "angry", "excited", "reflective", "grateful"] },
                  energy_level: { type: "string", enum: ["high", "medium", "low"] },
                  topics: { type: "array", items: { type: "string" }, description: "Main topics discussed (e.g. work, health, relationships)" },
                  habits_detected: {
                    type: "array",
                    items: { type: "object", properties: { habit: { type: "string" }, sentiment: { type: "string", enum: ["positive", "negative", "neutral"] }, frequency_hint: { type: "string" } }, required: ["habit", "sentiment"] },
                    description: "Any habits or patterns mentioned"
                  },
                  personality_traits: {
                    type: "array",
                    items: { type: "object", properties: { trait: { type: "string" }, evidence: { type: "string" } }, required: ["trait", "evidence"] },
                    description: "Personality traits evidenced by this entry"
                  },
                  likes: { type: "array", items: { type: "string" }, description: "Things the user expressed liking" },
                  dislikes: { type: "array", items: { type: "string" }, description: "Things the user expressed disliking" },
                  action_items: { type: "array", items: { type: "string" }, description: "Any action items or tasks mentioned" }
                },
                required: ["summary", "key_points", "mood", "energy_level", "topics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_diary_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const insights = JSON.parse(toolCall.function.arguments);

    // Step 2: Save diary entry
    const { data: entry, error: insertError } = await supabase
      .from("diary_entries")
      .insert({
        user_id: user.id,
        raw_text: text,
        structured_insights: insights,
        mood: insights.mood,
        energy_level: insights.energy_level,
        topics: insights.topics || [],
        habits_detected: insights.habits_detected || [],
        personality_traits: insights.personality_traits || [],
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Step 3: Generate nudges based on recent diary patterns
    const { data: recentEntries } = await supabase
      .from("diary_entries")
      .select("structured_insights, mood, habits_detected, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentEntries && recentEntries.length >= 3) {
      const recentSummary = recentEntries.map((e: any) => {
        const si = e.structured_insights || {};
        return `Date: ${e.created_at} | Mood: ${e.mood} | Summary: ${si.summary || ''} | Habits: ${JSON.stringify(e.habits_detected || [])}`;
      }).join("\n");

      const nudgeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a gentle behavioral coach. Based on recent diary entries, generate 1-2 actionable nudges to help the user improve their well-being. Focus on patterns you notice - both positive (to reinforce) and negative (to gently redirect). Be warm, specific, and non-judgmental. Call the generate_nudges function.`
            },
            { role: "user", content: `Recent diary entries:\n${recentSummary}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_nudges",
                description: "Generate behavioral nudges based on diary patterns",
                parameters: {
                  type: "object",
                  properties: {
                    nudges: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Short nudge title (max 6 words)" },
                          message: { type: "string", description: "Encouraging nudge message (1-2 sentences)" },
                          nudge_type: { type: "string", enum: ["habit_reinforce", "habit_redirect", "mood_boost", "self_care", "social", "growth"] },
                          priority: { type: "string", enum: ["low", "medium", "high"] }
                        },
                        required: ["title", "message", "nudge_type", "priority"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["nudges"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_nudges" } },
        }),
      });

      if (nudgeResponse.ok) {
        const nudgeData = await nudgeResponse.json();
        const nudgeCall = nudgeData.choices?.[0]?.message?.tool_calls?.[0];
        if (nudgeCall) {
          const { nudges } = JSON.parse(nudgeCall.function.arguments);
          // Dismiss old nudges, insert new
          await supabase.from("ai_nudges").update({ is_dismissed: true }).eq("user_id", user.id).eq("is_dismissed", false);
          for (const n of nudges) {
            await supabase.from("ai_nudges").insert({
              user_id: user.id,
              title: n.title,
              message: n.message,
              nudge_type: n.nudge_type,
              priority: n.priority,
              based_on: [entry.id],
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ entry, insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-diary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
