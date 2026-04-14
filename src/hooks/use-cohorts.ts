import { useEffect, useState } from "react";
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
  formation?: { id: string; name: string; level: string; registration_fee: number; total_price: number; attestation_color: string | null; duration_days: number } | null;
}

export function useCohorts() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCohorts = async () => {
    const { data, error } = await supabase.from("cohorts").select("*, formation:formations(id, name, level, registration_fee, total_price, attestation_color, duration_days)").order("start_date");
    if (error) { console.error(error); setLoading(false); return; }

    // Get all enrollments in one query, then count client-side (excludes staff/admin)
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("cohort_id, user_id");

    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "staff"]);

    const staffIds = new Set((staffRoles || []).map(r => r.user_id));

    const countMap = new Map<string, number>();
    (enrollments || []).forEach(e => {
      if (!staffIds.has(e.user_id)) {
        countMap.set(e.cohort_id, (countMap.get(e.cohort_id) || 0) + 1);
      }
    });

    const cohortsWithCounts = (data as CohortRow[]).map(cohort => ({
      ...cohort,
      enrollment_count: countMap.get(cohort.id) || 0,
    }));
    setCohorts(cohortsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchCohorts();

    // Realtime subscription for enrollment changes
    const channel = supabase
      .channel("enrollment-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments" }, () => {
        fetchCohorts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { cohorts, loading, refetch: fetchCohorts };
}
