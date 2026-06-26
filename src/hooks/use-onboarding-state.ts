import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnboardingState {
  loading: boolean;
  hasActiveTemplate: boolean;
  contractSigned: boolean;
  cohortStartDate: string | null;
  registrationFee: number;
  formationName: string | null;
}

export const useOnboardingState = (cohortId: string): OnboardingState => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasActiveTemplate, setHasActiveTemplate] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [cohortStartDate, setCohortStartDate] = useState<string | null>(null);
  const [registrationFee, setRegistrationFee] = useState(0);
  const [formationName, setFormationName] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !cohortId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      setLoading(true);

      // 1. Cohort start_date + formation_id
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("start_date, formation_id")
        .eq("id", cohortId)
        .maybeSingle();

      if (!cohortData) {
        setLoading(false);
        return;
      }

      setCohortStartDate(cohortData.start_date);
      const formationId = cohortData.formation_id;

      // 2. Formation name + registration_fee
      if (formationId) {
        const { data: formation } = await supabase
          .from("formations")
          .select("name, registration_fee")
          .eq("id", formationId)
          .maybeSingle();
        if (formation) {
          setFormationName(formation.name);
          setRegistrationFee(formation.registration_fee ?? 0);
        }
      }

      // 3. Active template check (formation-specific first, then global)
      let templateFound = false;
      if (formationId) {
        const { data } = await supabase
          .from("contract_templates")
          .select("id")
          .eq("is_active", true)
          .eq("formation_id", formationId)
          .maybeSingle();
        if (data) templateFound = true;
      }
      if (!templateFound) {
        const { data } = await supabase
          .from("contract_templates")
          .select("id")
          .eq("is_active", true)
          .is("formation_id", null)
          .limit(1)
          .maybeSingle();
        if (data) templateFound = true;
      }
      setHasActiveTemplate(templateFound);

      // 4. Student contract signed status
      const { data: contractData } = await supabase
        .from("student_contracts")
        .select("signed_at")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .maybeSingle();
      setContractSigned(!!(contractData?.signed_at));

      setLoading(false);
    };

    check();
  }, [user?.id, cohortId]);

  return { loading, hasActiveTemplate, contractSigned, cohortStartDate, registrationFee, formationName };
};
