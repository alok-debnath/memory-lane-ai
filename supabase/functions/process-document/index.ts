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
    const { attachmentId, memoryId, userId, fileUrl, fileType, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = getSupabase();

    // Build messages based on file type
    let messages: any[];
    const systemPrompt = `You are a document analysis AI. Extract ALL text and information from this document. Identify the document type (warranty, receipt, invoice, certificate, contract, manual, insurance, or other). Extract key details like brand, model, serial number, purchase date, expiry/end date, coverage, amounts, provider, etc. Be thorough and precise with dates.`;

    if (fileType.startsWith("image/") || fileType === "application/pdf") {
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this document "${fileName}" and extract all information. Pay special attention to dates, warranty periods, and expiry information.` },
            { type: "image_url", image_url: { url: fileUrl } },
          ],
        },
      ];
    } else {
      // Text-based files: fetch and analyze content
      try {
        const fileResp = await fetch(fileUrl);
        const fileText = await fileResp.text();
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this document "${fileName}":\n\n${fileText.slice(0, 15000)}` },
        ];
      } catch {
        return new Response(JSON.stringify({ error: "Could not read file content" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Run AI extraction and embedding in parallel
    const [aiResponse, embResponse] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools: [{
            type: "function",
            function: {
              name: "extract_document",
              description: "Extract structured information from a document",
              parameters: {
                type: "object",
                properties: {
                  extracted_text: { type: "string", description: "Full extracted text content from the document" },
                  document_type: {
                    type: "string",
                    enum: ["warranty", "receipt", "invoice", "certificate", "contract", "manual", "insurance", "other"],
                  },
                  expiry_date: { type: "string", description: "ISO 8601 date if the document has an expiry/end date, null otherwise" },
                  key_details: {
                    type: "object",
                    properties: {
                      brand: { type: "string" },
                      model: { type: "string" },
                      serial_number: { type: "string" },
                      purchase_date: { type: "string" },
                      coverage: { type: "string" },
                      amount: { type: "string" },
                      provider: { type: "string" },
                      notes: { type: "string" },
                    },
                  },
                  summary: { type: "string", description: "Brief one-line summary of the document" },
                },
                required: ["extracted_text", "document_type", "summary"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_document" } },
        }),
      }),
      // Pre-generate embedding placeholder (will be updated with actual text after AI response)
      Promise.resolve(null),
    ]);

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI processing failed: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No extraction result from AI");

    const parsed = JSON.parse(toolCall.function.arguments);

    // Now generate embedding for extracted content
    let embedding = null;
    try {
      const embResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: `${parsed.summary || ""}. ${parsed.extracted_text || ""}`.slice(0, 8000),
          dimensions: 768,
        }),
      });
      if (embResp.ok) {
        const embData = await embResp.json();
        embedding = embData.data?.[0]?.embedding || null;
      }
    } catch {}

    // Store extraction in database
    const { data: inserted, error: insertError } = await supabase
      .from("document_extractions")
      .insert({
        attachment_id: attachmentId,
        memory_id: memoryId,
        user_id: userId,
        extracted_text: parsed.extracted_text || "",
        document_type: parsed.document_type || "other",
        expiry_date: parsed.expiry_date || null,
        key_details: parsed.key_details || {},
        embedding,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If warranty/insurance/certificate with expiry, auto-set reminder 30 days before
    if (parsed.expiry_date && ["warranty", "insurance", "certificate"].includes(parsed.document_type)) {
      const expiryDate = new Date(parsed.expiry_date);
      const reminderDate = new Date(expiryDate);
      reminderDate.setDate(reminderDate.getDate() - 30);

      if (reminderDate > new Date()) {
        await supabase
          .from("memory_notes")
          .update({ reminder_date: reminderDate.toISOString() })
          .eq("id", memoryId)
          .eq("user_id", userId);
      }
    }

    return new Response(JSON.stringify({
      extraction: {
        id: inserted.id,
        document_type: parsed.document_type,
        summary: parsed.summary,
        expiry_date: parsed.expiry_date,
        key_details: parsed.key_details,
        extracted_text: parsed.extracted_text,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
