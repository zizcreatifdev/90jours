import { supabase } from "@/integrations/supabase/client";

/**
 * Remise code promo appliquee a un etudiant. Le montant est FIGE dans
 * promo_code_usage.discount_amount au moment de l'application (calcule cote
 * serveur par apply_promo_code). On le lit directement : la remise survit donc
 * a une desactivation ulterieure du code (plus besoin de relire promo_codes).
 * Logique partagee par StudentPaymentStatus et les trois ecrans d'attestation.
 */

export interface PromoUsageRow {
  user_id: string;
  cohort_id: string | null;
  discount_amount: number;
}

/**
 * Montant de remise d'UN code applique aux frais d'inscription. Utilise cote
 * front pour l'apercu en session (avant que le paiement, donc la remise figee,
 * n'existe). Le serveur applique exactement le meme calcul.
 */
export function discountForCode(
  discountType: string,
  discountValue: number,
  registrationFee: number,
): number {
  if (registrationFee <= 0) return 0;
  if (discountType === "percentage") {
    return Math.max(0, Math.round(registrationFee * (discountValue / 100)));
  }
  // fixed : plafonne au montant d'inscription
  return Math.max(0, Math.min(discountValue, registrationFee));
}

/**
 * Charge les remises FIGEES (discount_amount) pour les utilisateurs donnes.
 * RLS : un etudiant lit ses propres usages ("Users can view own usage"),
 * un super_admin lit tout ("Admins can manage all usage"). L'embed
 * payments:payment_id (FK reelle) sert a rattacher l'usage a sa cohorte.
 */
export async function fetchPromoUsage(userIds: string[]): Promise<PromoUsageRow[]> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("promo_code_usage")
    .select("user_id, discount_amount, payments:payment_id(cohort_id)")
    .in("user_id", ids);
  return ((data as any[]) || [])
    .filter((r) => r.payments)
    .map((r) => ({
      user_id: r.user_id,
      cohort_id: r.payments.cohort_id,
      discount_amount: r.discount_amount ?? 0,
    }));
}

/**
 * Construit une Map "userId_cohortId" -> montant de remise figee, en sommant
 * les discount_amount par (etudiant, cohorte).
 */
export function buildDiscountMap(rows: PromoUsageRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.cohort_id) continue;
    const key = `${r.user_id}_${r.cohort_id}`;
    map.set(key, (map.get(key) || 0) + (r.discount_amount || 0));
  }
  return map;
}

/** Remise figee d'UN etudiant pour UNE cohorte. */
export async function fetchStudentDiscount(userId: string, cohortId: string): Promise<number> {
  const rows = (await fetchPromoUsage([userId])).filter((r) => r.cohort_id === cohortId);
  return buildDiscountMap(rows).get(`${userId}_${cohortId}`) || 0;
}
