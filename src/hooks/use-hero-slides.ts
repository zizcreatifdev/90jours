import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HeroSlide {
  id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export function useHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order");
    if (!error && data) setSlides(data as HeroSlide[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  return { slides, loading, refetch: fetchSlides };
}
