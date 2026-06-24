/**
 * payment-reminders : Edge Function (cron)
 *
 * Tourne tous les jours a 09:00 UTC (configure dans supabase/config.toml).
 *
 * Logique : pour chaque etudiant inscrit dans une cohorte ayant une start_date,
 * on calcule les 3 echeances reelles depuis cohort.start_date (memes regles que
 * StudentPaymentStatus) :
 *   - inscription due a J+15
 *   - tranche 1   due a J+30
 *   - tranche 2   due a J+60
 * Un rappel n'est emis que pour une echeance DEPASSEE et NON couverte par les
 * paiements "paid" (on ne se base plus sur l'age d'un paiement "pending" : un
 * paiement declare en attente de validation n'est pas un retard de l'etudiant).
 *
 * Pour chaque etudiant concerne :
 *   1. Notification in-app pour l'etudiant (echeances + montant du)
 *   2. Notification in-app pour chaque admin (super_admin)
 *   3. Web Push via send-push-notification
 * Deduplication : pas de second rappel "payment" dans les 7 jours (table notifications).
 *
 * Test manuel (Supabase CLI) :
 *   supabase functions invoke payment-reminders --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DAY = 24 * 60 * 60 * 1000;

// Types de paiement couvrant le cout de formation (hors inscription), comme dans
// StudentPaymentStatus. "formation" et "formation_complete" sont conserves.
const FORMATION_TYPES = ["tranche_1", "tranche_2", "formation_complete", "formation"];

interface OverdueItem {
  cohortName: string;
  label: string;
  amount: number;
}

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY);
    const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

    // ── 1. Inscriptions + cohorte (start_date, nom) + tarifs de la formation ──
    const { data: enrollments, error: enrErr } = await supabase
      .from("enrollments")
      .select(
        "user_id, cohort_id, cohorts:cohort_id(name, start_date, formation:formations(registration_fee, total_price, tranche_1_amount, tranche_2_amount))"
      );

    if (enrErr) {
      console.error("enrollments query error:", enrErr.message);
      return new Response(JSON.stringify({ error: enrErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ reminders_sent: 0, students_checked: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Restreindre aux etudiants (un staff/admin "inscrit" ne doit pas etre relance)
    const { data: studentRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    const studentSet = new Set((studentRoles ?? []).map((r: { user_id: string }) => r.user_id));

    // ── 2. Paiements payes, sommes par (etudiant, cohorte) et par categorie ──
    const { data: paidPayments } = await supabase
      .from("payments")
      .select("user_id, cohort_id, amount, payment_type")
      .eq("status", "paid")
      .is("deleted_at", null);

    const paidMap = new Map<string, { inscription: number; formation: number }>();
    for (const p of (paidPayments ?? []) as Array<{ user_id: string; cohort_id: string; amount: number; payment_type: string }>) {
      const key = `${p.user_id}_${p.cohort_id}`;
      const acc = paidMap.get(key) ?? { inscription: 0, formation: 0 };
      if (p.payment_type === "inscription") acc.inscription += p.amount;
      else if (FORMATION_TYPES.includes(p.payment_type)) acc.formation += p.amount;
      paidMap.set(key, acc);
    }

    // ── 3. Remise code promo figee par (etudiant, cohorte) sur l'inscription ──
    // Defensif : si la colonne discount_amount n'est pas encore presente en base
    // (migration promo non jouee), on ignore la remise sans casser les rappels.
    const discountMap = new Map<string, number>();
    const { data: usage, error: usageErr } = await supabase
      .from("promo_code_usage")
      .select("user_id, discount_amount, payments:payment_id(cohort_id)");
    if (usageErr) {
      console.warn("promo_code_usage indisponible (remise ignoree) :", usageErr.message);
    } else {
      for (const u of (usage ?? []) as Array<{ user_id: string; discount_amount: number | null; payments: { cohort_id: string } | null }>) {
        const cohortId = u.payments?.cohort_id;
        if (!cohortId) continue;
        const key = `${u.user_id}_${cohortId}`;
        discountMap.set(key, (discountMap.get(key) ?? 0) + (u.discount_amount ?? 0));
      }
    }

    // ── 4. Calcul des echeances depassees et non couvertes, par etudiant ──
    const perUser = new Map<string, OverdueItem[]>();

    for (const enr of enrollments as Array<{ user_id: string; cohort_id: string; cohorts: any }>) {
      if (!studentSet.has(enr.user_id)) continue;
      const cohort = enr.cohorts;
      if (!cohort?.start_date || !cohort.formation) continue;

      const f = cohort.formation;
      const start = new Date(cohort.start_date);
      const dueInscription = new Date(start.getTime() + 15 * DAY);
      const dueTranche1 = new Date(start.getTime() + 30 * DAY);
      const dueTranche2 = new Date(start.getTime() + 60 * DAY);

      const inscriptionAmount = f.registration_fee ?? 0;
      const totalDue = f.total_price ?? 0;
      const formationCost = totalDue - inscriptionAmount;
      const tranche1 = f.tranche_1_amount ?? Math.floor(formationCost / 2);

      const key = `${enr.user_id}_${enr.cohort_id}`;
      const paid = paidMap.get(key) ?? { inscription: 0, formation: 0 };
      const discount = discountMap.get(key) ?? 0;
      const effectiveInscription = Math.max(0, inscriptionAmount - discount);

      const items: OverdueItem[] = [];

      // Inscription : portion [0, effectiveInscription]
      if (now > dueInscription) {
        const shortfall = Math.max(0, effectiveInscription - paid.inscription);
        if (shortfall > 0) items.push({ cohortName: cohort.name, label: "Inscription", amount: shortfall });
      }
      // Tranche 1 : portion [0, tranche1] du cout de formation
      if (now > dueTranche1) {
        const shortfall = Math.max(0, tranche1 - paid.formation);
        if (shortfall > 0) items.push({ cohortName: cohort.name, label: "Tranche 1", amount: shortfall });
      }
      // Tranche 2 : portion [tranche1, formationCost] du cout de formation
      if (now > dueTranche2) {
        const shortfall = Math.max(0, formationCost - Math.max(paid.formation, tranche1));
        if (shortfall > 0) items.push({ cohortName: cohort.name, label: "Tranche 2", amount: shortfall });
      }

      if (items.length > 0) {
        perUser.set(enr.user_id, [...(perUser.get(enr.user_id) ?? []), ...items]);
      }
    }

    if (perUser.size === 0) {
      console.log("Aucune echeance depassee non payee.");
      return new Response(
        JSON.stringify({ reminders_sent: 0, students_checked: enrollments.length }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 5. Deduplication : sauter les etudiants deja relances dans les 7 jours ──
    const userIds = [...perUser.keys()];
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", userIds)
      .eq("type", "payment")
      .gte("created_at", sevenDaysAgo.toISOString());
    const recentlyReminded = new Set((recentNotifs ?? []).map((n: { user_id: string }) => n.user_id));

    // ── 6. Profils (noms) + admins ──
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .in("user_id", userIds);
    const nameMap = new Map(
      (profiles ?? []).map((p: { user_id: string; first_name: string; last_name: string }) => [
        p.user_id,
        `${p.first_name} ${p.last_name}`.trim(),
      ])
    );

    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const adminIds = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);

    // ── 7. Construction des notifications ──
    const notificationsToInsert: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      created_by: null;
    }[] = [];
    const studentIds = new Set<string>();

    for (const [uid, items] of perUser) {
      if (recentlyReminded.has(uid)) continue;

      const lines = items.map((i) => `${i.label} (${i.cohortName}) : ${fmt(i.amount)}`).join(" ; ");
      const total = items.reduce((s, i) => s + i.amount, 0);

      notificationsToInsert.push({
        user_id: uid,
        title: "Rappel de paiement",
        message: `Echeance(s) depassee(s) : ${lines}. Merci de regulariser via Wave (total du : ${fmt(total)}).`,
        type: "payment",
        created_by: null,
      });
      studentIds.add(uid);

      const studentName = nameMap.get(uid) ?? uid;
      for (const adminId of adminIds) {
        notificationsToInsert.push({
          user_id: adminId,
          title: "Paiement en retard",
          message: `${studentName} a une ou des echeances depassees : ${lines}.`,
          type: "payment",
          created_by: null,
        });
      }
    }

    // ── 8. Insertion des notifications in-app ──
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

    // ── 9. Web Push aux etudiants concernes ──
    const allStudentIds = [...studentIds];
    if (allStudentIds.length > 0) {
      try {
        const pushRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            user_ids: allStudentIds,
            title: "Rappel de paiement",
            body: "Une ou plusieurs echeances de paiement sont depassees. Merci de regulariser.",
          }),
        });
        const pushResult = await pushRes.json().catch(() => ({}));
        console.log("Push result:", JSON.stringify(pushResult));
      } catch (pushErr: unknown) {
        // Non bloquant : la notification in-app reste le canal fiable.
        console.error(
          "Push notification error (non-fatal):",
          pushErr instanceof Error ? pushErr.message : String(pushErr)
        );
      }
    }

    const result = {
      reminders_sent: notificationsToInsert.length,
      students_reminded: allStudentIds.length,
      students_checked: enrollments.length,
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
