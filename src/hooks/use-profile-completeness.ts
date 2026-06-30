import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CompletenessField {
  key: string;
  label: string;
  suggestion: string;
}

export const COMPLETENESS_FIELDS: CompletenessField[] = [
  { key: "first_name",  label: "Prénom",                   suggestion: "Renseignez votre prénom" },
  { key: "last_name",   label: "Nom",                      suggestion: "Renseignez votre nom" },
  { key: "phone",       label: "Téléphone",                suggestion: "Renseignez votre numéro de téléphone" },
  { key: "avatar_url",  label: "Photo de profil",          suggestion: "Ajoutez une photo de profil" },
];

interface ProfileCompletenessResult {
  percent: number;
  missing: CompletenessField[];
  loading: boolean;
}

export function useProfileCompleteness(): ProfileCompletenessResult {
  const { user, profile } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setPhone(data?.phone ?? null);
        setLoaded(true);
      });
  }, [user?.id]);

  const filled = [
    !!profile?.first_name?.trim(),
    !!profile?.last_name?.trim(),
    !!phone?.trim(),
    !!profile?.avatar_url,
  ];

  const missing = COMPLETENESS_FIELDS.filter((_, i) => !filled[i]);
  const percent = Math.round((filled.filter(Boolean).length / filled.length) * 100);

  return { percent, missing, loading: !loaded };
}
