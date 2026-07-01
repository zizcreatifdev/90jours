import { TemplateElement } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Upload, Trash2 } from "lucide-react";

interface ElementPropertiesProps {
  element: TemplateElement;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete: () => void;
}

const ElementProperties = ({ element, onUpdate, onDelete }: ElementPropertiesProps) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ src: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
          {element.type === "text" ? "Texte" : element.type === "image" ? "Image" : element.type === "rect" ? "Rectangle" : element.type === "line" ? "Ligne" : "Decoration"}
        </h4>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">X (%)</Label>
          <Input type="number" value={Math.round(element.x)} onChange={e => onUpdate({ x: Number(e.target.value) })} className="h-7 text-xs" min={0} max={100} />
        </div>
        <div>
          <Label className="text-[10px]">Y (%)</Label>
          <Input type="number" value={Math.round(element.y)} onChange={e => onUpdate({ y: Number(e.target.value) })} className="h-7 text-xs" min={0} max={100} />
        </div>
        <div>
          <Label className="text-[10px]">Largeur (%)</Label>
          <Input type="number" value={Math.round(element.width)} onChange={e => onUpdate({ width: Number(e.target.value) })} className="h-7 text-xs" min={5} max={100} />
        </div>
        <div>
          <Label className="text-[10px]">Hauteur (%)</Label>
          <Input type="number" value={Math.round(element.height)} onChange={e => onUpdate({ height: Number(e.target.value) })} className="h-7 text-xs" min={3} max={100} />
        </div>
      </div>

      {element.type === "text" && (
        <>
          <div>
            <Label className="text-[10px]">Contenu</Label>
            <Textarea
              value={element.content || ""}
              onChange={e => onUpdate({ content: e.target.value })}
              rows={2}
              className="text-xs"
            />
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Variables : {"{student_name}"}, {"{formation_name}"}, {"{start_date}"}, {"{end_date}"}, {"{certificate_number}"}, {"{current_date}"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Taille police</Label>
              <Input type="number" value={element.fontSize || 12} onChange={e => onUpdate({ fontSize: Number(e.target.value) })} className="h-7 text-xs" min={6} max={48} />
            </div>
            <div>
              <Label className="text-[10px]">Couleur</Label>
              <div className="flex gap-1">
                <input type="color" value={element.color || "#000000"} onChange={e => onUpdate({ color: e.target.value })} className="h-7 w-8 rounded cursor-pointer border border-border" />
                <Input value={element.color || "#000000"} onChange={e => onUpdate({ color: e.target.value })} className="h-7 text-xs flex-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Poids</Label>
              <Select value={element.fontWeight || "normal"} onValueChange={v => onUpdate({ fontWeight: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Gras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Alignement</Label>
              <Select value={element.textAlign || "left"} onValueChange={v => onUpdate({ textAlign: v as any })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {element.type === "image" && (
        <div className="space-y-3">
          <div>
            <Label className="text-[10px]">Image</Label>
            {element.src ? (
              <div className="flex items-center gap-2 mt-1">
                <img src={element.src} alt="" className="h-10 w-auto rounded border border-border object-contain bg-white p-0.5" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <span className="text-xs text-accent hover:underline">Changer</span>
                </label>
                <button onClick={() => onUpdate({ src: "" })} className="text-xs text-destructive hover:underline">Supprimer</button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 cursor-pointer rounded-lg bg-secondary px-3 py-2 text-xs hover:bg-secondary/80 transition-colors w-fit">
                <Upload className="h-3 w-3" />
                Uploader
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
          <div>
            <Label className="text-[10px]">Opacité ({element.opacity ?? 100}%)</Label>
            <Slider
              value={[element.opacity ?? 100]}
              onValueChange={([v]) => onUpdate({ opacity: v })}
              min={5}
              max={100}
              step={5}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={element.isBackground ?? false}
              onCheckedChange={v => onUpdate({ isBackground: v })}
              className="scale-75"
            />
            <Label className="text-[10px]">Arrière-plan (derrière tout)</Label>
          </div>
        </div>
      )}

      {element.type === "pattern" && (
        <div>
          <Label className="text-[10px]">Couleur du motif</Label>
          <div className="flex gap-1 mt-1">
            <input type="color" value={element.patternColor || "#1a1a2e"} onChange={e => onUpdate({ patternColor: e.target.value })} className="h-7 w-8 rounded cursor-pointer border border-border" />
            <Input value={element.patternColor || "#1a1a2e"} onChange={e => onUpdate({ patternColor: e.target.value })} className="h-7 text-xs flex-1" />
          </div>
        </div>
      )}

      {element.type === "rect" && (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Couleur</Label>
            <div className="flex gap-1 mt-1">
              <input type="color" value={element.color || "#000000"} onChange={e => onUpdate({ color: e.target.value })} className="h-7 w-8 rounded cursor-pointer border border-border" />
              <Input value={element.color || "#000000"} onChange={e => onUpdate({ color: e.target.value })} className="h-7 text-xs flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Arrondi (px)</Label>
            <Input type="number" value={element.borderRadius || 0} onChange={e => onUpdate({ borderRadius: Number(e.target.value) })} className="h-7 text-xs" min={0} max={50} />
          </div>
        </div>
      )}

      {element.type === "line" && (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Couleur</Label>
            <div className="flex gap-1 mt-1">
              <input type="color" value={element.color || "#cccccc"} onChange={e => onUpdate({ color: e.target.value })} className="h-7 w-8 rounded cursor-pointer border border-border" />
              <Input value={element.color || "#cccccc"} onChange={e => onUpdate({ color: e.target.value })} className="h-7 text-xs flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Orientation</Label>
            <Select value={element.orientation || "horizontal"} onValueChange={v => onUpdate({ orientation: v as "horizontal" | "vertical" })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontale</SelectItem>
                <SelectItem value="vertical">Verticale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementProperties;
