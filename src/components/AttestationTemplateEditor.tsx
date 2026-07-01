import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Award, Eye, X } from "lucide-react";

interface Formation {
  id: string;
  name: string;
  attestation_title: string | null;
  attestation_body: string | null;
  attestation_color: string | null;
  attestation_logo_url: string | null;
  attestation_signature_url: string | null;
  attestation_stamp_url: string | null;
}

const AttestationTemplateEditor = () => {
  const { toast } = useToast();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({
    attestation_title: "",
    attestation_body: "",
    attestation_color: "#1a1a2e",
    attestation_logo_url: "",
    attestation_signature_url: "",
    attestation_stamp_url: "",
  });

  useEffect(() => {
    const fetchFormations = async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, name, attestation_title, attestation_body, attestation_color, attestation_logo_url, attestation_signature_url, attestation_stamp_url")
        .order("name");
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
      if (data) {
        setFormations(data as Formation[]);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
          loadFormation(data[0] as Formation);
        }
      }
      setLoading(false);
    };
    fetchFormations();
  }, []);

  const loadFormation = (f: Formation) => {
    setForm({
      attestation_title: f.attestation_title || "",
      attestation_body: f.attestation_body || "",
      attestation_color: f.attestation_color || "#1a1a2e",
      attestation_logo_url: f.attestation_logo_url || "",
      attestation_signature_url: f.attestation_signature_url || "",
      attestation_stamp_url: f.attestation_stamp_url || "",
    });
  };

  const handleSelectFormation = (id: string) => {
    setSelectedId(id);
    const f = formations.find(f => f.id === id);
    if (f) loadFormation(f);
  };

  const handleUpload = async (field: "attestation_logo_url" | "attestation_signature_url" | "attestation_stamp_url", file: File) => {
    if (!selectedId) return;
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `attestation/${selectedId}/${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("hero-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(path);
      setForm(prev => ({ ...prev, [field]: urlData.publicUrl }));
      toast({ title: "Image uploadée !" });
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase.from("formations").update(form).eq("id", selectedId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template sauvegardé !" });
      setFormations(prev => prev.map(f => f.id === selectedId ? { ...f, ...form } : f));
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const selectedFormation = formations.find(f => f.id === selectedId);

  const imageFields = [
    { field: "attestation_logo_url" as const, label: "Logo (en-tête)" },
    { field: "attestation_signature_url" as const, label: "Signature" },
    { field: "attestation_stamp_url" as const, label: "Tampon / Cachet" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5" /> Template d'attestation
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
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label>Titre de l'attestation</Label>
              <Input value={form.attestation_title} onChange={e => setForm({ ...form, attestation_title: e.target.value })} placeholder="Attestation de participation" />
            </div>
            <div>
              <Label>Corps du texte</Label>
              <Textarea
                value={form.attestation_body}
                onChange={e => setForm({ ...form, attestation_body: e.target.value })}
                placeholder="Nous certifions que {student_name} a participé à la formation {formation_name} du {start_date} au {end_date}."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables : {"{student_name}"}, {"{formation_name}"}, {"{start_date}"}, {"{end_date}"}, {"{certificate_number}"}
              </p>
            </div>
            <div>
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.attestation_color} onChange={e => setForm({ ...form, attestation_color: e.target.value })} className="h-9 w-12 rounded cursor-pointer border border-border" />
                <Input value={form.attestation_color} onChange={e => setForm({ ...form, attestation_color: e.target.value })} className="w-28" />
              </div>
            </div>

            {imageFields.map(({ field, label }) => (
              <div key={field}>
                <Label>{label}</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form[field] && (
                    <img src={form[field]} alt={label} className="h-12 w-auto rounded border border-border object-contain bg-white p-1" />
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(field, file);
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors">
                      {uploading === field ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {form[field] ? "Changer" : "Uploader"}
                    </span>
                  </label>
                  {form[field] && (
                    <button
                      onClick={() => setForm({ ...form, [field]: "" })}
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sauvegarder le template
            </Button>
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Aperçu en direct</span>
            </div>
            <AttestationPreview
              title={form.attestation_title}
              body={form.attestation_body}
              color={form.attestation_color}
              logoUrl={form.attestation_logo_url}
              signatureUrl={form.attestation_signature_url}
              stampUrl={form.attestation_stamp_url}
              studentName="Prénom NOM"
              formationName={selectedFormation?.name || "Formation"}
              startDate="01 jan. 2026"
              endDate="01 avr. 2026"
              certificateNumber="ATT-12345678"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const AttestationPreview = ({
  title, body, color, logoUrl, signatureUrl, stampUrl,
  studentName, formationName, startDate, endDate, certificateNumber,
  issuedAt,
  className = "",
}: {
  title: string;
  body: string;
  color: string;
  logoUrl: string;
  signatureUrl: string;
  stampUrl: string;
  studentName: string;
  formationName: string;
  startDate: string;
  endDate: string;
  certificateNumber: string;
  issuedAt?: string;
  className?: string;
}) => {
  const processedBody = body
    .replace(/\{student_name\}/g, studentName)
    .replace(/\{formation_name\}/g, formationName)
    .replace(/\{start_date\}/g, startDate)
    .replace(/\{end_date\}/g, endDate)
    .replace(/\{certificate_number\}/g, certificateNumber);

  const lightenColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
    const b = Math.min(255, (num & 0x0000ff) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div
      className={`relative bg-white rounded-xl shadow-2xl overflow-hidden aspect-[1.414/1] ${className}`}
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {/* Decorative top band with gradient */}
      <div className="h-4 relative" style={{ background: `linear-gradient(135deg, ${color}, ${lightenColor(color, 60)})` }} />

      {/* Ornamental corner borders */}
      <div className="absolute top-8 left-6 right-6 bottom-6">
        {/* Double border frame */}
        <div className="absolute inset-0 border rounded-sm pointer-events-none" style={{ borderColor: color + "30" }} />
        <div className="absolute inset-2 border rounded-sm pointer-events-none" style={{ borderColor: color + "18" }} />

        {/* Corner ornaments */}
        {[
          "top-0 left-0 border-t-2 border-l-2 rounded-tl",
          "top-0 right-0 border-t-2 border-r-2 rounded-tr",
          "bottom-0 left-0 border-b-2 border-l-2 rounded-bl",
          "bottom-0 right-0 border-b-2 border-r-2 rounded-br",
        ].map((pos, i) => (
          <div key={i} className={`absolute w-8 h-8 ${pos} pointer-events-none`} style={{ borderColor: color + "60" }} />
        ))}
      </div>

      <div className="flex flex-col items-center h-[calc(100%-16px)] px-10 py-8 text-center relative">
        {/* Logo */}
        <div className="mb-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" crossOrigin="anonymous" />
          ) : (
            <>
              <img
                src="/logos/Logo60jours_noir.svg"
                alt="60jours"
                className="h-16 w-auto object-contain"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.currentTarget.classList.add("hidden");
                  const next = e.currentTarget.nextElementSibling as HTMLElement;
                  if (next) next.classList.remove("hidden");
                }}
              />
              <span className="hidden text-3xl font-bold tracking-tight" style={{ color }}>60 JOURS</span>
            </>
          )}
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 mb-4 w-full max-w-xs">
          <div className="flex-1 h-px" style={{ backgroundColor: color + "40" }} />
          <div className="w-2 h-2 rotate-45" style={{ backgroundColor: color }} />
          <div className="flex-1 h-px" style={{ backgroundColor: color + "40" }} />
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold uppercase tracking-[0.25em] mb-1" style={{ color }}>
          {title || "Attestation de participation"}
        </h2>

        {/* Subtitle line */}
        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-4">
          Formation professionnelle
        </p>

        {/* Decorative line */}
        <div className="w-20 h-0.5 mb-5 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        {/* "Décerné à" */}
        <p className="text-xs text-gray-500 italic mb-1">Décerné(e) à</p>

        {/* Student name */}
        <p className="text-2xl font-bold mb-1 tracking-wide" style={{ color: color }}>
          {studentName}
        </p>

        {/* Underline for name */}
        <div className="w-48 h-px mb-4" style={{ backgroundColor: color + "30" }} />

        {/* Body */}
        <p className="text-[11px] text-gray-600 leading-relaxed max-w-sm whitespace-pre-line">
          {processedBody || `Pour avoir participé avec succès à la formation « ${formationName} » du ${startDate} au ${endDate}.`}
        </p>

        {/* Formation badge */}
        <div className="mt-4 mb-auto">
          <span
            className="inline-block px-4 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: color }}
          >
            {formationName}
          </span>
        </div>

        {/* Bottom section: Signature + stamp */}
        <div className="w-full mt-auto pt-4">
          {/* Date line : utilise issued_at si fourni (date d'emission officielle), sinon la date courante */}
          <p className="text-[10px] text-gray-400 mb-4">
            Fait le {(issuedAt ? new Date(issuedAt) : new Date()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <div className="flex items-end justify-between w-full">
            {/* Signature */}
            <div className="text-left flex-1">
              {signatureUrl ? (
                <img src={signatureUrl} alt="Signature" className="h-10 w-auto object-contain mb-1" crossOrigin="anonymous" />
              ) : (
                <div className="h-10" />
              )}
              <div className="w-28 border-t mt-1" style={{ borderColor: color + "40" }} />
              <p className="text-[9px] text-gray-500 mt-1 font-medium">Le Directeur</p>
            </div>

            {/* Certificate number */}
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-1">
                <div className="w-3 h-px" style={{ backgroundColor: color + "30" }} />
                <p className="text-[8px] text-gray-400 font-mono tracking-wider">N° {certificateNumber}</p>
                <div className="w-3 h-px" style={{ backgroundColor: color + "30" }} />
              </div>
            </div>

            {/* Stamp */}
            <div className="text-right flex-1 flex justify-end">
              {stampUrl ? (
                <img src={stampUrl} alt="Tampon" className="h-14 w-auto object-contain opacity-85" crossOrigin="anonymous" />
              ) : (
                <div className="h-14 w-14 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: color + "30" }}>
                  <span className="text-[7px] text-gray-300 uppercase">Tampon</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(135deg, ${color}, ${lightenColor(color, 60)})` }} />
    </div>
  );
};

export default AttestationTemplateEditor;
