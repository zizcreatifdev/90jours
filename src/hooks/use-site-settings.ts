import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Lien marchand Wave historique, utilisé comme repli si la colonne est vide.
export const WAVE_PAYMENT_URL_FALLBACK = "https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/";

interface SiteSettings {
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  logo_url: string | null;
  footer_email: string | null;
  footer_phone: string | null;
  footer_text: string | null;
  wave_payment_url: string | null;
}

const defaults: SiteSettings = {
  hero_image_url: null,
  hero_title: "Formez-vous en 60 jours",
  hero_subtitle: "Des formations intensives qui transforment votre créativité en 60 jours.",
  logo_url: null,
  footer_email: "info@60jours.com",
  footer_phone: "+221 77 000 00 00",
  footer_text: "Des formations intensives qui transforment votre créativité en 60 jours.",
  wave_payment_url: WAVE_PAYMENT_URL_FALLBACK,
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("hero_image_url, hero_title, hero_subtitle, logo_url, footer_email, footer_phone, footer_text, wave_payment_url")
        .eq("id", "default")
        .single();
      if (data) {
        const merged = { ...defaults, ...(data as any) } as SiteSettings;
        // Repli sur le lien historique si la colonne est vide ou absente.
        if (!merged.wave_payment_url) merged.wave_payment_url = WAVE_PAYMENT_URL_FALLBACK;
        setSettings(merged);
      }
      // En cas d'absence de données, les valeurs par défaut restent en place.
    } catch (err) {
      // En cas de panne, on conserve les valeurs par défaut déjà initialisées.
      console.error("Erreur de chargement des paramètres du site", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  return { settings, loading, refetch: fetchSettings };
};
