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
    tranche_1_amount: number;
    tranche_2_amount: number;
    attestation_color: string | null;
    duration_days: number;
  } | null;
}

export const COHORTS_QUERY_KEY = ["cohorts"] as const;

/** Cache valide 5 minutes, une mutation (archivage, inscription) invalide manuellement */
const STALE_TIME = 5 * 60 * 1000;

/**
 * Récupère les cohortes avec leur nombre d'inscrits (étudiants uniquement).
 *
 * Le count passe par la fonction SQL get_all_cohort_enrollment_counts()
 * (SECURITY DEFINER) qui contourne le RLS sur enrollments. Sans cela,
 * les visiteurs non-authentifiés (page publique) obtiendraient 0 inscrits
 * pour toutes les cohortes, affichant la capacité brute au lieu des places
 * restantes.
 */
async function fetchCohortsData(): Promise<CohortRow[]> {
  const [cohortsResult, countsResult] = await Promise.all([
    supabase
      .from("cohorts")
      .select(
        "*, formation:formations(id, name, description, level, registration_fee, total_price, tranche_1_amount, tranche_2_amount, attestation_color, duration_days)"
      )
      .order("start_date"),
    supabase.rpc("get_all_cohort_enrollment_counts"),
  ]);

  if (cohortsResult.error) throw cohortsResult.error;

  const countMap = new Map<string, number>(
    ((countsResult.data ?? []) as Array<{ cohort_id: string; enrollment_count: number }>)
      .map((row) => [row.cohort_id, row.enrollment_count])
  );

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
  const { data = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: COHORTS_QUERY_KEY,
    queryFn: fetchCohortsData,
    staleTime: STALE_TIME,
  });

  // isError permet aux consommateurs de distinguer un vrai vide (data=[])
  // d'une panne backend, au lieu d'afficher "aucune cohorte" dans les deux cas.
  return { cohorts: data, loading, isError, error, refetch };
}
