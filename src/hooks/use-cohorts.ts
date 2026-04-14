import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CohortRow {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  capacity: number;
  status: string;
  created_at: string;
  formation_id: string | null;
  enrollment_count?: number;
  formation?: {
    id: string;
    name: string;
    description: string | null;
    level: string;
    registration_fee: number;
    total_price: number;
    attestation_color: string | null;
    duration_days: number;
  } | null;
}

export const COHORTS_QUERY_KEY = ["cohorts"] as const;

/** Cache valide 5 minutes — une mutation (archivage, inscription) invalide manuellement */
const STALE_TIME = 5 * 60 * 1000;

/**
 * Récupère les cohortes avec leur nombre d'inscrits (étudiants uniquement).
 *
 * Optimisation PERF-02 : deux requêtes parallèles au lieu de charger
 * 100 % des enrollments côté client.
 *   1. Cohortes + formation (inchangée)
 *   2. Staff/admin IDs (petit ensemble, ~quelques dizaines)
 *   3. COUNT groupé par cohort_id côté serveur (PostgREST 12 aggregate)
 *      → O(nb_cohortes) lignes transférées, pas O(nb_étudiants)
 */
async function fetchCohortsData(): Promise<CohortRow[]> {
  // ── Étape 1 : requêtes parallèles ────────────────────────────────────────
  const [cohortsResult, staffResult] = await Promise.all([
    supabase
      .from("cohorts")
      .select(
        "*, formation:formations(id, name, description, level, registration_fee, total_price, attestation_color, duration_days)"
      )
      .order("start_date"),
    supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "staff"]),
  ]);

  if (cohortsResult.error) throw cohortsResult.error;

  const staffIds = (staffResult.data ?? []).map((r) => r.user_id);

  // ── Étape 2 : COUNT groupé côté serveur ─────────────────────────────────
  // PostgREST 12 aggregate syntax : "alias:colonne.count()"
  // Retourne une ligne par cohort_id avec le count — O(cohortes) pas O(inscrits)
  const baseCountQuery = supabase
    .from("enrollments")
    .select("cohort_id, count:cohort_id.count()");

  const { data: rawCount } = await (staffIds.length > 0
    ? baseCountQuery.not("user_id", "in", `(${staffIds.join(",")})`)
    : baseCountQuery);

  // PostgREST renvoie les agrégats en string — on normalise en number
  const countData = (rawCount ?? []) as Array<{
    cohort_id: string;
    count: string;
  }>;

  const countMap = new Map<string, number>(
    countData.map((row) => [row.cohort_id, Number(row.count)])
  );

  // ── Étape 3 : merge ──────────────────────────────────────────────────────
  return (cohortsResult.data as CohortRow[]).map((cohort) => ({
    ...cohort,
    enrollment_count: countMap.get(cohort.id) ?? 0,
  }));
}

export function useCohorts() {
  const queryClient = useQueryClient();

  // Souscription temps-réel : invalide le cache dès qu'un enrollment change
  // React Query re-fetch immédiatement si la query est observée
  useEffect(() => {
    const channel = supabase
      .channel("cohorts-enrollment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        () => {
          queryClient.invalidateQueries({ queryKey: COHORTS_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // PERF-03 : staleTime évite les re-fetch inutiles au focus de fenêtre
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: COHORTS_QUERY_KEY,
    queryFn: fetchCohortsData,
    staleTime: STALE_TIME,
  });

  return { cohorts: data, loading, refetch };
}
