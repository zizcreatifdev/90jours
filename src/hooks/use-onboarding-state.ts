import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnboardingState {
  loading: boolean;
  hasActiveTemplate: boolean;
  templateCheckError: boolean;
  contractSigned: boolean;
  hasAvatar: boolean;
  avatarUrl: string | null;
  cohortStartDate: string | null;
  registrationFee: number;
  formationName: string | null;
  refetch: () => void;
}

export const useOnboardingState = (cohortId: string): OnboardingState => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasActiveTemplate, setHasActiveTemplate] = useState(false);
  const [templateCheckError, setTemplateCheckError] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasAvatar, setHasAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      setTemplateCheckError(false);

      // 0. Profile avatar
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const fetchedAvatarUrl = profileData?.avatar_url ?? null;
      setHasAvatar(!!fetchedAvatarUrl);
      setAvatarUrl(fetchedAvatarUrl);

      // 1. Cohort start_date + formation_id + registration_fee
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("start_date, formation_id, registration_fee")
        .eq("id", cohortId)
        .maybeSingle();

      if (!cohortData) {
        setLoading(false);
        return;
      }

      setCohortStartDate(cohortData.start_date);
      const formationId = cohortData.formation_id;

      // 2. Formation name (registration_fee falls back to formation if not set on cohort)
      if (formationId) {
        const { data: formation } = await supabase
          .from("formations")
          .select("name, registration_fee")
          .eq("id", formationId)
          .maybeSingle();
        if (formation) {
          setFormationName(formation.name);
          setRegistrationFee(cohortData.registration_fee ?? formation.registration_fee ?? 0);
        }
      } else {
        setRegistrationFee(cohortData.registration_fee ?? 0);
      }

      // 3. Active template check (formation-specific first, then global)
      // Network error != "template found": treating error as true would set hasActiveTemplate=true
      // and send the student to /contract-sign, which would also fail and redirect back here (loop).
      let templateFound = false;
      let tplNetworkError = false;
      if (formationId) {
        const { data, error } = await supabase
          .from("contract_templates")
          .select("id")
          .eq("is_active", true)
          .eq("formation_id", formationId)
          .limit(1)
          .maybeSingle();
        if (error) {
          tplNetworkError = true;
        } else if (data) {
          templateFound = true;
        }
      }
      if (!templateFound && !tplNetworkError) {
        const { data, error } = await supabase
          .from("contract_templates")
          .select("id")
          .eq("is_active", true)
          .is("formation_id", null)
          .limit(1)
          .maybeSingle();
        if (error) {
          tplNetworkError = true;
        } else if (data) {
          templateFound = true;
        }
      }
      setHasActiveTemplate(templateFound);
      setTemplateCheckError(tplNetworkError);

      // 4. Student contract signed status
      const { data: contractData, error: contractError } = await supabase
        .from("student_contracts")
        .select("signed_at")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .maybeSingle();
      setContractSigned(!contractError && !!(contractData?.signed_at));

      setLoading(false);
    };

    check();
  }, [user?.id, cohortId, retryCount]);

  return { loading, hasActiveTemplate, templateCheckError, contractSigned, hasAvatar, avatarUrl, cohortStartDate, registrationFee, formationName, refetch: () => setRetryCount(c => c + 1) };
};
