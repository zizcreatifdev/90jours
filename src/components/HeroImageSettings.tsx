import { useState, useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHeroSlides, type HeroSlide } from "@/hooks/use-hero-slides";



const HeroImageSettings = () => {
  const { slides, loading, refetch } = useHeroSlides();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("hero-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("hero_slides")
        .insert({ image_url: urlData.publicUrl, sort_order: slides.length } as any);
      if (insertError) throw insertError;

      toast({ title: "Image ajoutée au carrousel" });
      refetch();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async (slide: HeroSlide) => {
    setUploading(true);
    try {
      const { error } = await supabase.from("hero_slides").delete().eq("id", slide.id);
      if (error) throw error;
      toast({ title: "Image supprimée" });
      refetch();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
        Carrousel Hero ({slides.length} image{slides.length !== 1 ? "s" : ""})
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {slides.map((slide, i) => (
              <div key={slide.id} className="relative overflow-hidden rounded-xl border border-border">
                <img src={slide.image_url} alt={`Slide ${i + 1}`} className="h-32 w-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7"
                  disabled={uploading}
                  onClick={() => handleRemove(slide)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="mt-4 gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Ajouter une image
            </Button>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default HeroImageSettings;
