import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, isAudio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userText = input;

    // If audio, we'll ask Gemini to process based on text description
    // For now, since we can't directly transcribe audio via chat completions,
    // we'll handle text input and let the client do speech-to-text via browser API
    if (isAudio) {
      // The input is base64 audio - we'll use a simpler approach:
      // Ask the user to use browser's SpeechRecognition API for transcription
      // and send the text directly
      userText = input; // This will be transcribed text from browser
    }

    const prompt = `You are an AI assistant that processes memory notes. Given the user's input, extract:
1. A short title (max 8 words)
2. The full content/description
3. A reminder date if mentioned (ISO 8601 format, e.g. "2025-03-15T00:00:00Z"). If relative like "next Friday", calculate from today: ${new Date().toISOString()}
4. Whether it's recurring (true/false)
5. The recurrence type if recurring (yearly, monthly, weekly, daily)
6. A category (personal, work, finance, health, other)

Respond ONLY with valid JSON in this exact format:
{"title": "...", "content": "...", "reminder_date": "..." or null, "is_recurring": false, "recurrence_type": null or "yearly"/"monthly"/"weekly"/"daily", "category": "..."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userText },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from the AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");
    
    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
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
