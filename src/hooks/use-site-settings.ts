import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  logo_url: string | null;
  footer_email: string | null;
  footer_phone: string | null;
  footer_text: string | null;
}

const defaults: SiteSettings = {
  hero_image_url: null,
  hero_title: "Formez-vous en 60 jours",
  hero_subtitle: "Des formations intensives qui transforment votre créativité en 60 jours.",
  logo_url: null,
  footer_email: "info@60jours.com",
  footer_phone: "+221 77 000 00 00",
  footer_text: "Des formations intensives qui transforment votre créativité en 60 jours.",
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("site_settings" as any)
      .select("hero_image_url, hero_title, hero_subtitle, logo_url, footer_email, footer_phone, footer_text")
      .eq("id", "default")
      .single();
    if (data) setSettings({ ...defaults, ...(data as any) });
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  return { settings, loading, refetch: fetchSettings };
};
