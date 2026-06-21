import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Loader2, BookOpen, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Formation {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  deliverable_label: string;
  deliverable_description: string | null;
  attestation_title: string | null;
  attestation_body: string | null;
  attestation_logo_url: string | null;
  attestation_color: string | null;
  is_active: boolean;
  level: string;
  created_at: string;
  registration_fee: number;
  total_price: number;
  duration_days: number;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  deliverable_label: "Portfolio",
  deliverable_description: "",
  attestation_title: "",
  attestation_body: "",
  attestation_color: "#1a1a2e",
  is_active: true,
  level: "debutant",
  registration_fee: 10000,
  total_price: 50000,
  duration_days: 60,
};

const FormationForm = ({ formation, onSaved }: { formation?: Formation; onSaved: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(
    formation
      ? {
          name: formation.name,
          slug: formation.slug,
          description: formation.description || "",
          deliverable_label: formation.deliverable_label,
          deliverable_description: formation.deliverable_description || "",
          attestation_title: formation.attestation_title || "",
          attestation_body: formation.attestation_body || "",
          attestation_color: formation.attestation_color || "#1a1a2e",
          is_active: formation.is_active,
          level: formation.level || "debutant",
          registration_fee: formation.registration_fee ?? 10000,
          total_price: formation.total_price ?? 50000,
          duration_days: formation.duration_days ?? 60,
        }
      : { ...emptyForm }
  );

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug || generateSlug(form.name) };
      if (formation) {
        const { error } = await supabase.from("formations").update(payload).eq("id", formation.id);
        if (error) throw error;
        toast({ title: "Formation modifiée" });
      } else {
        const { error } = await supabase.from("formations").insert(payload);
        if (error) throw error;
        toast({ title: "Formation créée" });
      }
      setOpen(false);
      onSaved();
      if (!formation) setForm({ ...emptyForm });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {formation ? (
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1.5 h-4 w-4" /> Nouvelle formation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{formation ? "Modifier la formation" : "Créer une formation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="fname">Nom de la formation</Label>
            <Input id="fname" required value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) }); }} placeholder="60 jours en motion" />
          </div>
          <div>
            <Label htmlFor="fslug">Slug (identifiant URL)</Label>
            <Input id="fslug" required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="motion" />
          </div>
          <div>
            <Label htmlFor="fdesc">Description</Label>
            <Textarea id="fdesc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez cette formation..." rows={2} />
          </div>
          <div>
            <Label>Niveau</Label>
            <Select value={form.level} onValueChange={v => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debutant">Débutant</SelectItem>
                <SelectItem value="avance">Avancé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fduration">Durée (en jours)</Label>
            <Input id="fduration" type="number" min={1} required value={form.duration_days} onChange={e => setForm({ ...form, duration_days: parseInt(e.target.value) || 60 })} placeholder="60" />
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-display text-sm font-semibold mb-3">Tarification</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="regfee">Frais d'inscription (FCFA)</Label>
                <Input id="regfee" type="number" min={0} required value={form.registration_fee} onChange={e => setForm({ ...form, registration_fee: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="tprice">Coût total (FCFA)</Label>
                <Input id="tprice" type="number" min={0} required value={form.total_price} onChange={e => setForm({ ...form, total_price: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-display text-sm font-semibold mb-3">Livrable de fin de formation</h4>
            <div>
              <Label htmlFor="dlabel">Nom du livrable</Label>
              <Input id="dlabel" required value={form.deliverable_label} onChange={e => setForm({ ...form, deliverable_label: e.target.value })} placeholder="Portfolio, Showreel, Projet..." />
            </div>
            <div className="mt-2">
              <Label htmlFor="ddesc">Instructions pour l'étudiant</Label>
              <Textarea id="ddesc" value={form.deliverable_description} onChange={e => setForm({ ...form, deliverable_description: e.target.value })} placeholder="Soumettez le lien de votre..." rows={2} />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-display text-sm font-semibold mb-3">Attestation</h4>
            <div>
              <Label htmlFor="atitle">Titre de l'attestation</Label>
              <Input id="atitle" value={form.attestation_title} onChange={e => setForm({ ...form, attestation_title: e.target.value })} placeholder="Attestation de formation en Motion Design" />
            </div>
            <div className="mt-2">
              <Label htmlFor="abody">Corps de l'attestation</Label>
              <Textarea id="abody" value={form.attestation_body} onChange={e => setForm({ ...form, attestation_body: e.target.value })} placeholder="Utilisez {student_name} pour le nom de l'étudiant" rows={3} />
            </div>
            <div className="mt-2">
              <Label htmlFor="acolor">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input type="color" id="acolor" value={form.attestation_color} onChange={e => setForm({ ...form, attestation_color: e.target.value })} className="h-9 w-12 rounded cursor-pointer border border-border" />
                <Input value={form.attestation_color} onChange={e => setForm({ ...form, attestation_color: e.target.value })} className="w-28" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <Label>Formation active</Label>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {formation ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const FormationManager = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFormations = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("formations").select("*").order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setFormations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFormations(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Formation supprimée" });
      fetchFormations();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Formations
        </h2>
        <FormationForm onSaved={fetchFormations} />
      </div>

      {formations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune formation créée pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {formations.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: f.attestation_color || "#1a1a2e" }}>
                    <span className="font-display text-xs font-bold text-white">{f.duration_days}</span>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{f.name}</h3>
                    <p className="text-xs text-muted-foreground">/{f.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <FormationForm formation={f} onSaved={fetchFormations} />
                  <ConfirmDialog
                    trigger={
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    }
                    title="Supprimer cette formation ?"
                    description={`La formation "${f.name}" sera supprimée. Les cohortes liées ne seront pas supprimées.`}
                    confirmLabel="Supprimer"
                    onConfirm={() => handleDelete(f.id)}
                  />
                </div>
              </div>
              {f.description && <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  {f.duration_days} jours
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  {f.total_price.toLocaleString("fr-FR")} FCFA (inscr. {f.registration_fee.toLocaleString("fr-FR")})
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  Livrable : {f.deliverable_label}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.level === "avance" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                  {f.level === "avance" ? "Avancé" : "Débutant"}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.is_active ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                  {f.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormationManager;
