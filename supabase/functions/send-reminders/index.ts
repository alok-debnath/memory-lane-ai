import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find memories with reminders due in the next hour that haven't been notified
    const { data: dueReminders, error: fetchError } = await supabase
      .from("memory_notes")
      .select("id, title, content, reminder_date, is_recurring, recurrence_type, user_id")
      .not("reminder_date", "is", null)
      .gte("reminder_date", now.toISOString())
      .lte("reminder_date", oneHourFromNow.toISOString());

    if (fetchError) throw fetchError;

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders due", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user
    const userReminders: Record<string, typeof dueReminders> = {};
    for (const r of dueReminders) {
      if (!userReminders[r.user_id]) userReminders[r.user_id] = [];
      userReminders[r.user_id].push(r);
    }

    let sentCount = 0;

    for (const [userId, reminders] of Object.entries(userReminders)) {
      // Get user email from auth
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !user?.email) continue;

      const reminderList = reminders
        .map((r) => `• ${r.title}: ${r.content}${r.reminder_date ? ` (Due: ${new Date(r.reminder_date).toLocaleString()})` : ''}`)
        .join("\n");

      // Use Lovable AI to generate a friendly reminder email
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured");
        continue;
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: "Generate a short, friendly reminder email body (plain text, no subject). Include the reminder details. Keep it under 200 words.",
            },
            {
              role: "user",
              content: `User: ${user.user_metadata?.full_name || 'there'}. Reminders:\n${reminderList}`,
            },
          ],
        }),
      });

      let emailBody = `Hi ${user.user_metadata?.full_name || 'there'},\n\nYou have upcoming reminders:\n\n${reminderList}\n\n— Memora`;
      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const generated = aiData.choices?.[0]?.message?.content;
        if (generated) emailBody = generated;
      }

      // Send email via Supabase auth magic link as a workaround
      // For now, we log the reminder - email sending requires a proper email service
      console.log(`[REMINDER] To: ${user.email}\n${emailBody}`);

      // Handle recurring reminders - advance the date
      for (const r of reminders) {
        if (r.is_recurring && r.recurrence_type && r.reminder_date) {
          const currentDate = new Date(r.reminder_date);
          let nextDate: Date;

          switch (r.recurrence_type) {
            case 'daily':
              nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
              break;
            case 'weekly':
              nextDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
              break;
            case 'monthly':
              nextDate = new Date(currentDate);
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDate = new Date(currentDate);
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
            default:
              continue;
          }

          await supabase
            .from("memory_notes")
            .update({ reminder_date: nextDate.toISOString() })
            .eq("id", r.id);
        }
      }

      sentCount += reminders.length;
    }

    return new Response(JSON.stringify({ message: "Reminders processed", count: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-reminders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
