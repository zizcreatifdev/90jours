import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Type, Image, Layers, Save, RotateCcw, Award, Square, Minus } from "lucide-react";
import { TemplateElement, AttestationTemplate, DEFAULT_TEMPLATE } from "./types";
import DraggableElement from "./DraggableElement";
import ElementProperties from "./ElementProperties";
import { Json } from "@/integrations/supabase/types";

interface Formation {
  id: string;
  name: string;
  attestation_template: AttestationTemplate | null;
  attestation_logo_url: string | null;
  attestation_signature_url: string | null;
  attestation_stamp_url: string | null;
  attestation_color: string | null;
}

const AttestationDragDropEditor = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<AttestationTemplate>(DEFAULT_TEMPLATE);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormations = async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, name, attestation_template, attestation_logo_url, attestation_signature_url, attestation_stamp_url, attestation_color")
        .order("name");
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      if (data) {
        setFormations(data as any);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
          loadTemplate(data[0] as any);
        }
      }
      setLoading(false);
    };
    fetchFormations();
  }, []);

  const loadTemplate = (f: Formation) => {
    if (f.attestation_template) {
      const tmpl = f.attestation_template as AttestationTemplate;
      // Merge old image URLs into template if elements have no src
      const elements = tmpl.elements.map(el => {
        if (el.type === "image" && !el.src) {
          if (el.id === "logo" && f.attestation_logo_url) return { ...el, src: f.attestation_logo_url };
          if (el.id === "signature" && f.attestation_signature_url) return { ...el, src: f.attestation_signature_url };
          if (el.id === "stamp" && f.attestation_stamp_url) return { ...el, src: f.attestation_stamp_url };
        }
        return el;
      });
      setTemplate({ ...tmpl, elements });
    } else {
      // Create default template with existing images
      const def = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as AttestationTemplate;
      if (f.attestation_color) def.primaryColor = f.attestation_color;
      def.elements = def.elements.map(el => {
        if (el.id === "logo" && f.attestation_logo_url) return { ...el, src: f.attestation_logo_url };
        if (el.id === "signature" && f.attestation_signature_url) return { ...el, src: f.attestation_signature_url };
        if (el.id === "stamp" && f.attestation_stamp_url) return { ...el, src: f.attestation_stamp_url };
        if (el.type === "pattern") return { ...el, patternColor: f.attestation_color || el.patternColor };
        if (el.color === "#1a1a2e" && f.attestation_color) return { ...el, color: f.attestation_color };
        return el;
      });
      setTemplate(def);
    }
    setSelectedElement(null);
  };

  const handleSelectFormation = (id: string) => {
    setSelectedId(id);
    const f = formations.find(f => f.id === id);
    if (f) loadTemplate(f);
  };

  const updateElement = useCallback((id: string, updates: Partial<TemplateElement>) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el),
    }));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
    }));
    setSelectedElement(null);
  }, []);

  const addElement = (type: "text" | "image" | "pattern") => {
    const id = `${type}_${Date.now()}`;
    const newEl: TemplateElement = type === "text" ? {
      id, type: "text",
      x: 20, y: 50, width: 40, height: 8,
      content: "Nouveau texte",
      fontSize: 14, fontWeight: "normal", textAlign: "center",
      color: template.primaryColor,
    } : type === "image" ? {
      id, type: "image",
      x: 40, y: 50, width: 20, height: 15,
      src: "", label: "Nouvelle image",
    } : {
      id, type: "pattern",
      x: 0, y: 50, width: 100, height: 3,
      patternType: "topBand", patternColor: template.primaryColor,
    };
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElement(id);
  };

  const addRect = () => {
    const id = `rect_${Date.now()}`;
    const newEl: TemplateElement = {
      id, type: "rect",
      x: 30, y: 40, width: 40, height: 20,
      color: template.primaryColor,
    };
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElement(id);
  };

  const addLine = () => {
    const id = `line_${Date.now()}`;
    const newEl: TemplateElement = {
      id, type: "line",
      x: 10, y: 50, width: 80, height: 0.4,
      color: template.primaryColor,
      orientation: "horizontal",
    };
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElement(id);
  };

  const addLogo60jours = () => {
    const id = `image_${Date.now()}`;
    const newEl: TemplateElement = {
      id, type: "image",
      x: 4, y: 2.5, width: 22, height: 9,
      src: "/logos/Logo60jours_noir.svg",
      label: "Logo 60jours",
    };
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElement(id);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);

    // Upload images that are data URLs to storage
    const uploadedTemplate = JSON.parse(JSON.stringify(template)) as AttestationTemplate;
    for (const el of uploadedTemplate.elements) {
      if (el.type === "image" && el.src && el.src.startsWith("data:")) {
        try {
          const response = await fetch(el.src);
          const blob = await response.blob();
          const ext = blob.type.split("/")[1] || "png";
          const path = `attestation/${selectedId}/${el.id}-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from("hero-images").upload(path, blob, { upsert: true });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(path);
          el.src = urlData.publicUrl;
        } catch (err: any) {
          toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
        }
      }
    }

    // Extract logo/signature/stamp URLs for backward compat
    const logoEl = uploadedTemplate.elements.find(e => e.id === "logo");
    const sigEl = uploadedTemplate.elements.find(e => e.id === "signature");
    const stampEl = uploadedTemplate.elements.find(e => e.id === "stamp");

    const { error } = await supabase.from("formations").update({
      attestation_template: uploadedTemplate as unknown as Json,
      attestation_logo_url: logoEl?.src || null,
      attestation_signature_url: sigEl?.src || null,
      attestation_stamp_url: stampEl?.src || null,
      attestation_color: uploadedTemplate.primaryColor,
    }).eq("id", selectedId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template sauvegardé !" });
      setFormations(prev => prev.map(f => f.id === selectedId ? { ...f, attestation_template: uploadedTemplate as any } : f));
    }
    setSaving(false);
  };

  const handleReset = () => {
    const f = formations.find(f => f.id === selectedId);
    if (f) {
      const def = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as AttestationTemplate;
      if (f.attestation_color) def.primaryColor = f.attestation_color;
      setTemplate(def);
      setSelectedElement(null);
      toast({ title: "Template réinitialisé" });
    }
  };

  const selectedEl = template.elements.find(e => e.id === selectedElement);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5" /> Éditeur d'attestation (Drag & Drop)
        </h2>
        <Select value={selectedId} onValueChange={handleSelectFormation}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
          <SelectContent>
            {formations.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedId ? (
        <p className="text-muted-foreground text-center py-8">Sélectionnez une formation pour personnaliser son attestation.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          {/* Canvas */}
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => addElement("text")} className="gap-1.5 text-xs">
                <Type className="h-3.5 w-3.5" /> Bloc texte
              </Button>
              <Button variant="outline" size="sm" onClick={() => addElement("image")} className="gap-1.5 text-xs">
                <Image className="h-3.5 w-3.5" /> Image
              </Button>
              <Button variant="outline" size="sm" onClick={addLogo60jours} className="gap-1.5 text-xs">
                <Award className="h-3.5 w-3.5" /> Logo 60jours
              </Button>
              <Button variant="outline" size="sm" onClick={addRect} className="gap-1.5 text-xs">
                <Square className="h-3.5 w-3.5" /> Rectangle
              </Button>
              <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5 text-xs">
                <Minus className="h-3.5 w-3.5" /> Ligne
              </Button>
              <Button variant="outline" size="sm" onClick={() => addElement("pattern")} className="gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" /> Bande degrade
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Sauvegarder
              </Button>
            </div>

            {/* Attestation canvas */}
            <div className="border border-border rounded-xl overflow-hidden bg-muted/30 p-4">
              <div
                ref={canvasRef as any}
                className="relative mx-auto shadow-2xl rounded-lg overflow-hidden"
                style={{
                  aspectRatio: "1.414 / 1",
                  maxWidth: "842px",
                  backgroundColor: template.backgroundColor,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                }}
                onClick={() => setSelectedElement(null)}
              >
                {template.elements.map(el => (
                  <DraggableElement
                    key={el.id}
                    element={el}
                    selected={selectedElement === el.id}
                    onSelect={() => setSelectedElement(el.id)}
                    onUpdate={(updates) => updateElement(el.id, updates)}
                    onDelete={() => deleteElement(el.id)}
                    containerRef={canvasRef as React.RefObject<HTMLDivElement>}
                    primaryColor={template.primaryColor}
                  />
                ))}
              </div>
            </div>

            {/* Global settings */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Couleur principale</Label>
                <input
                  type="color"
                  value={template.primaryColor}
                  onChange={e => setTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="h-8 w-10 rounded cursor-pointer border border-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Fond</Label>
                <input
                  type="color"
                  value={template.backgroundColor}
                  onChange={e => setTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="h-8 w-10 rounded cursor-pointer border border-border"
                />
              </div>
            </div>
          </div>

          {/* Properties panel */}
          <div className="rounded-xl border border-border bg-card p-4 h-fit sticky top-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Propriétés</h3>
            {selectedEl ? (
              <ElementProperties
                element={selectedEl}
                onUpdate={(updates) => updateElement(selectedEl.id, updates)}
                onDelete={() => deleteElement(selectedEl.id)}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">Cliquez sur un élément pour modifier ses propriétés</p>
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Éléments ({template.elements.length})</p>
                  {template.elements.map(el => (
                    <button
                      key={el.id}
                      onClick={() => setSelectedElement(el.id)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-secondary transition-colors flex items-center gap-2"
                    >
                      {el.type === "text" ? <Type className="h-3 w-3" /> : el.type === "image" ? <Image className="h-3 w-3" /> : el.type === "rect" ? <Square className="h-3 w-3" /> : el.type === "line" ? <Minus className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                      <span className="truncate">{el.type === "text" ? (el.content || "Texte").slice(0, 30) : el.label || el.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttestationDragDropEditor;
