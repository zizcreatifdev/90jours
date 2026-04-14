import { useState, useRef, useEffect } from "react";
import { ImagePlus, Loader2, Trash2, Save } from "lucide-react";
import HeroImageSettings from "@/components/HeroImageSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SiteSettingsPanelProps {
  settings: {
    hero_image_url: string | null;
    hero_title: string | null;
    hero_subtitle: string | null;
    logo_url: string | null;
    footer_email: string | null;
    footer_phone: string | null;
    footer_text: string | null;
  };
  onUpdated: () => void;
}

const SiteSettingsPanel = ({ settings, onUpdated }: SiteSettingsPanelProps) => {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [heroTitle, setHeroTitle] = useState(settings.hero_title || "");
  const [heroSubtitle, setHeroSubtitle] = useState(settings.hero_subtitle || "");
  const [footerEmail, setFooterEmail] = useState(settings.footer_email || "");
  const [footerPhone, setFooterPhone] = useState(settings.footer_phone || "");
  const [footerText, setFooterText] = useState(settings.footer_text || "");

  useEffect(() => {
    setHeroTitle(settings.hero_title || "");
    setHeroSubtitle(settings.hero_subtitle || "");
    setFooterEmail(settings.footer_email || "");
    setFooterPhone(settings.footer_phone || "");
    setFooterText(settings.footer_text || "");
  }, [settings]);

  const updateField = async (fields: Record<string, any>) => {
    const { error } = await supabase
      .from("site_settings" as any)
      .update({ ...fields, updated_at: new Date().toISOString() } as any)
      .eq("id", "default");
    if (error) throw error;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "hero" | "logo") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("hero-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(path);
      const field = type === "hero" ? "hero_image_url" : "logo_url";
      await updateField({ [field]: urlData.publicUrl });
      toast({ title: type === "hero" ? "Image hero mise à jour" : "Logo mis à jour" });
      onUpdated();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (heroFileRef.current) heroFileRef.current.value = "";
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const handleRemoveImage = async (type: "hero" | "logo") => {
    setUploading(true);
    try {
      const field = type === "hero" ? "hero_image_url" : "logo_url";
      await updateField({ [field]: null });
      toast({ title: type === "hero" ? "Image par défaut restaurée" : "Logo supprimé" });
      onUpdated();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveText = async () => {
    setSaving(true);
    try {
      await updateField({
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        footer_email: footerEmail,
        footer_phone: footerPhone,
        footer_text: footerText,
      });
      toast({ title: "Paramètres sauvegardés" });
      onUpdated();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Logo du site</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {settings.logo_url && (
            <div className="relative h-16 w-40 overflow-hidden rounded-xl border border-border bg-secondary flex items-center justify-center p-2">
              <img src={settings.logo_url} alt="Logo actuel" className="max-h-full max-w-full object-contain" />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => logoFileRef.current?.click()} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {settings.logo_url ? "Changer le logo" : "Ajouter un logo"}
            </Button>
            {settings.logo_url && (
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => handleRemoveImage("logo")} className="gap-2">
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            )}
          </div>
        </div>
        <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "logo")} />
      </div>

      {/* Hero carousel */}
      <HeroImageSettings />

      {/* Hero title */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Textes de la page d'accueil</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="hero-title">Titre d'accroche (Hero)</Label>
            <Input
              id="hero-title"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Formez-vous en 90 jours"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="hero-subtitle">Message secondaire</Label>
            <Textarea
              id="hero-subtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Des formations intensives qui transforment votre créativité..."
              className="mt-1.5"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Footer settings */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Paramètres du Footer</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="footer-text">Texte de description</Label>
            <Textarea
              id="footer-text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Description du site..."
              className="mt-1.5"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="footer-email">Email de contact</Label>
              <Input
                id="footer-email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                placeholder="info@90jours.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="footer-phone">Téléphone</Label>
              <Input
                id="footer-phone"
                value={footerPhone}
                onChange={(e) => setFooterPhone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <Button onClick={handleSaveText} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Sauvegarder les textes
      </Button>
    </div>
  );
};

export default SiteSettingsPanel;
