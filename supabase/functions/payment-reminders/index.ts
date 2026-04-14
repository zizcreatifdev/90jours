/**
 * payment-reminders — Edge Function (cron)
 *
 * Runs every day at 09:00 UTC (configured in supabase/config.toml).
 * Finds payments that have been in "pending" status for more than 30 days, then:
 *  1. Inserts an in-app notification for the student
 *  2. Inserts an in-app notification for each admin (super_admin)
 *  3. Sends a Web Push notification to students via send-push-notification
 *
 * Manual test (Supabase CLI):
 *   supabase functions invoke payment-reminders --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. Find payments pending for more than 30 days ────────────────────────

    const { data: overduePayments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, user_id, amount, currency, created_at, profiles:user_id(first_name, last_name)")
      .eq("status", "pending")
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (paymentsError) {
      console.error("payments query error:", paymentsError.message);
      return new Response(JSON.stringify({ error: paymentsError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!overduePayments || overduePayments.length === 0) {
      console.log("No overdue payments found.");
      return new Response(
        JSON.stringify({ reminders_sent: 0, payments_checked: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${overduePayments.length} overdue payment(s).`);

    // ── 2. Get all admins ─────────────────────────────────────────────────────

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const adminIds = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);

    const notificationsToInsert: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      created_by: null;
    }[] = [];

    const studentIds = new Set<string>();

    // ── 3. Build notifications ────────────────────────────────────────────────

    for (const payment of overduePayments as Payment[]) {
      const profile = payment.profiles as { first_name: string; last_name: string } | null;
      const studentName = profile
        ? `${profile.first_name} ${profile.last_name}`
        : payment.user_id;

      const daysOverdue = Math.floor(
        (now.getTime() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const amountStr = `${(payment.amount / 100).toFixed(2)} ${(payment.currency || "EUR").toUpperCase()}`;

      // Student notification
      notificationsToInsert.push({
        user_id: payment.user_id,
        title: "💳 Rappel de paiement",
        message: `Votre paiement de ${amountStr} est en attente depuis ${daysOverdue} jours. Veuillez régulariser votre situation.`,
        type: "payment",
        created_by: null,
      });
      studentIds.add(payment.user_id);

      // Admin notifications
      for (const adminId of adminIds) {
        notificationsToInsert.push({
          user_id: adminId,
          title: "⚠️ Paiement en retard",
          message: `${studentName} a un paiement de ${amountStr} en attente depuis ${daysOverdue} jours.`,
          type: "payment",
          created_by: null,
        });
      }
    }

    // ── 4. Insert in-app notifications ────────────────────────────────────────

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

    // ── 5. Send Web Push notifications to students ────────────────────────────

    const allStudentIds = [...studentIds];
    if (allStudentIds.length > 0) {
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
              user_ids: allStudentIds,
              title: "💳 Rappel de paiement",
              body: "Vous avez un paiement en attente depuis plus de 30 jours.",
            }),
          }
        );
        const pushResult = await pushRes.json().catch(() => ({}));
        console.log("Push result:", JSON.stringify(pushResult));
      } catch (pushErr: unknown) {
        // Non-fatal: in-app notifications are the reliable path.
        console.error(
          "Push notification error (non-fatal):",
          pushErr instanceof Error ? pushErr.message : String(pushErr)
        );
      }
    }

    // ── 6. Return summary ─────────────────────────────────────────────────────

    const result = {
      reminders_sent: notificationsToInsert.length,
      payments_checked: overduePayments.length,
    };

    console.log("payment-reminders completed:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("payment-reminders fatal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
