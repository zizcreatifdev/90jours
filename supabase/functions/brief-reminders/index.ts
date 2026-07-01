/**
 * brief-reminders : Edge Function (cron)
 *
 * Runs every day at 08:00 UTC (configured in supabase/config.toml).
 * Finds all briefs whose deadline falls within the next 48 hours and
 * for which enrolled students have NOT yet submitted, then:
 *  1. Inserts an in-app notification for each student
 *  2. Sends a Web Push notification via the existing send-push-notification function
 *
 * Manual test (Supabase CLI):
 *   supabase functions invoke brief-reminders --no-verify-jwt
 *
 * Or via curl against your local dev stack:
 *   curl -i -X POST http://localhost:54321/functions/v1/brief-reminders \
 *     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface Brief {
  id: string;
  title: string;
  deadline: string;
  cohort_id: string;
}

interface Enrollment {
  user_id: string;
}

interface Submission {
  user_id: string;
}

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // ── 1. Briefs with deadline in the next 48 hours ──────────────────────────

    const { data: upcomingBriefs, error: briefsError } = await supabase
      .from("briefs")
      .select("id, title, deadline, cohort_id")
      .gt("deadline", now.toISOString())    // not yet expired
      .lte("deadline", in48h.toISOString()) // within 48 h
      .lte("publish_at", now.toISOString()); // already published (not scheduled)

    if (briefsError) {
      console.error("briefs query error:", briefsError.message);
      return new Response(JSON.stringify({ error: briefsError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!upcomingBriefs || upcomingBriefs.length === 0) {
      console.log("No upcoming deadlines in the next 48 h.");
      return new Response(
        JSON.stringify({ reminders_sent: 0, briefs_checked: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${upcomingBriefs.length} brief(s) with deadline in 48 h.`);

    const notificationsToInsert: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      created_by: null;
    }[] = [];

    const pushUserIds = new Set<string>();
    const details: { brief: string; pending: number }[] = [];

    // ── 2. For each brief, find students who haven't submitted ────────────────

    for (const brief of upcomingBriefs as Brief[]) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("cohort_id", brief.cohort_id);

      const enrolledIds: string[] = (enrollments as Enrollment[] ?? []).map(e => e.user_id);
      if (enrolledIds.length === 0) continue;

      const { data: submissions } = await supabase
        .from("brief_submissions")
        .select("user_id")
        .eq("brief_id", brief.id)
        .in("user_id", enrolledIds);

      const submittedIds = new Set<string>(
        (submissions as Submission[] ?? []).map(s => s.user_id)
      );

      const pendingIds = enrolledIds.filter(id => !submittedIds.has(id));
      if (pendingIds.length === 0) continue;

      const hoursLeft = Math.round(
        (new Date(brief.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      for (const userId of pendingIds) {
        notificationsToInsert.push({
          user_id: userId,
          title: `⏰ Deadline dans ${hoursLeft}h`,
          message: `Le brief "${brief.title}" doit être rendu dans moins de 48 heures. Ne traîne pas !`,
          type: "brief",
          created_by: null,
        });
        pushUserIds.add(userId);
      }

      details.push({ brief: brief.title, pending: pendingIds.length });
      console.log(`Brief "${brief.title}": ${pendingIds.length} student(s) pending.`);
    }

    // ── 3. Insert in-app notifications ────────────────────────────────────────

    if (notificationsToInsert.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);

      if (notifError) {
        console.error("Notification insert error:", notifError.message);
      } else {
        console.log(`Inserted ${notificationsToInsert.length} in-app notification(s).`);
      }
    }

    // ── 4. Send Web Push notifications via existing function ──────────────────

    const allPushUserIds = [...pushUserIds];
    if (allPushUserIds.length > 0) {
      try {
        const pushRes = await fetch(
          `${SUPABASE_URL}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              user_ids: allPushUserIds,
              title: "⏰ Rappel : brief à rendre bientôt",
              body: "Tu as des briefs à remettre dans moins de 48 heures !",
            }),
          }
        );

        const pushResult = await pushRes.json().catch(() => ({}));
        console.log("Push notification result:", JSON.stringify(pushResult));
      } catch (pushErr: unknown) {
        // Non-fatal: in-app notifications are the reliable path.
        console.error(
          "Push notification error (non-fatal):",
          pushErr instanceof Error ? pushErr.message : String(pushErr)
        );
      }
    }

    // ── 5. Return summary ─────────────────────────────────────────────────────

    const result = {
      reminders_sent: notificationsToInsert.length,
      briefs_checked: upcomingBriefs.length,
      details,
    };

    console.log("brief-reminders completed:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("brief-reminders fatal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
