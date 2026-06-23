import { supabase } from "@/integrations/supabase/client";

/**
 * Remise code promo appliquee a un etudiant, reconstruite depuis la base
 * (promo_code_usage joint a promo_codes). La remise porte uniquement sur les
 * frais d'inscription. Logique partagee par StudentPaymentStatus et les trois
 * ecrans d'attestation pour eviter toute duplication.
 */

export interface PromoUsageRow {
  user_id: string;
  cohort_id: string | null;
  discount_type: string;
  discount_value: number;
}

/** Montant de remise d'UN code applique aux frais d'inscription. */
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
 * Charge les codes promo reellement appliques pour les utilisateurs donnes.
 * RLS : un etudiant lit ses propres usages ("Users can view own usage"),
 * un super_admin lit tout ("Admins can manage all usage"). Les embeds
 * promo_codes:promo_code_id et payments:payment_id reposent sur de vraies FK.
 */
export async function fetchPromoUsage(userIds: string[]): Promise<PromoUsageRow[]> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("promo_code_usage")
    .select("user_id, promo_codes:promo_code_id(discount_type, discount_value), payments:payment_id(cohort_id)")
    .in("user_id", ids);
  return ((data as any[]) || [])
    .filter((r) => r.promo_codes && r.payments)
    .map((r) => ({
      user_id: r.user_id,
      cohort_id: r.payments.cohort_id,
      discount_type: r.promo_codes.discount_type,
      discount_value: r.promo_codes.discount_value,
    }));
}

/**
 * Construit une Map "userId_cohortId" -> montant de remise, a partir des usages
 * et d'une fonction donnant les frais d'inscription par cohorte (les formations
 * pouvant avoir des frais differents). Plafonne au montant d'inscription.
 */
export function buildDiscountMap(
  rows: PromoUsageRow[],
  registrationFeeByCohort: (cohortId: string) => number,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.cohort_id) continue;
    const fee = registrationFeeByCohort(r.cohort_id);
    const key = `${r.user_id}_${r.cohort_id}`;
    const add = discountForCode(r.discount_type, r.discount_value, fee);
    map.set(key, Math.min(fee, (map.get(key) || 0) + add));
  }
  return map;
}

/** Remise totale d'UN etudiant pour UNE cohorte (frais d'inscription connus). */
export async function fetchStudentDiscount(
  userId: string,
  cohortId: string,
  registrationFee: number,
): Promise<number> {
  const rows = (await fetchPromoUsage([userId])).filter((r) => r.cohort_id === cohortId);
  const map = buildDiscountMap(rows, () => registrationFee);
  return map.get(`${userId}_${cohortId}`) || 0;
}
