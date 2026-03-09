import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _supabase;
}

function advanceDate(date: Date, type: string): Date {
  const next = new Date(date);
  switch (type) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

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
      (userReminders[r.user_id] ??= []).push(r);
    }

    // Fetch user timezones
    const userIds = Object.keys(userReminders);
    const { data: profiles } = await supabase.from("profiles").select("id, timezone").in("id", userIds);
    const tzMap: Record<string, string> = {};
    for (const p of profiles || []) tzMap[p.id] = p.timezone || 'UTC';

    let sentCount = 0;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Process all users in parallel
    await Promise.all(Object.entries(userReminders).map(async ([userId, reminders]) => {
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !user?.email) return;

      const userTz = tzMap[userId] || 'UTC';
      const fmtDate = (d: string) => {
        try { return new Date(d).toLocaleString('en-US', { timeZone: userTz, dateStyle: 'medium', timeStyle: 'short' }); }
        catch { return new Date(d).toLocaleString(); }
      };
      const reminderList = reminders
        .map((r) => `• ${r.title}: ${r.content}${r.reminder_date ? ` (Due: ${fmtDate(r.reminder_date)})` : ''}`)
        .join("\n");

      // Generate email body with AI (non-blocking if fails)
      let emailBody = `Hi ${user.user_metadata?.full_name || 'there'},\n\nYou have upcoming reminders:\n\n${reminderList}\n\n— Memora`;
      if (LOVABLE_API_KEY) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Generate a short, friendly reminder email body (plain text, no subject). Include the reminder details. Keep it under 150 words." },
                { role: "user", content: `User: ${user.user_metadata?.full_name || 'there'}. Reminders:\n${reminderList}` },
              ],
            }),
          });
          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const generated = aiData.choices?.[0]?.message?.content;
            if (generated) emailBody = generated;
          }
        } catch {}
      }

      console.log(`[REMINDER] To: ${user.email}\n${emailBody}`);

      // Update recurring reminders in parallel
      await Promise.all(reminders
        .filter(r => r.is_recurring && r.recurrence_type && r.reminder_date)
        .map(r => {
          const nextDate = advanceDate(new Date(r.reminder_date!), r.recurrence_type!);
          return supabase.from("memory_notes").update({ reminder_date: nextDate.toISOString() }).eq("id", r.id);
        })
      );

      sentCount += reminders.length;
    }));

    return new Response(JSON.stringify({ message: "Reminders processed", count: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-reminders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
