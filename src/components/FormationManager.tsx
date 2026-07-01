import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  created_at: string;
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
        }
      : { ...emptyForm }
  );

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    {
      name: form.name,
      slug: form.slug,
      deliverable_label: form.deliverable_label,
    },
    {
      name: { required: "Le nom de la formation est requis." },
      slug: { required: "Le slug est requis." },
      deliverable_label: { required: "Le nom du livrable est requis." },
    },
  );

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || generateSlug(form.name),
      };
      if (formation) {
        const { error } = await supabase.from("formations").update(payload).eq("id", formation.id);
        if (error) throw error;
        toast({ title: "Formation modifiee" });
      } else {
        const { error } = await supabase.from("formations").insert(payload);
        if (error) throw error;
        toast({ title: "Formation creee" });
      }
      setOpen(false);
      onSaved();
      if (!formation) setForm({ ...emptyForm });
    } catch (err: unknown) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
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
          <DialogTitle className="font-display">{formation ? "Modifier la formation" : "Creer une formation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <RequiredLabel htmlFor="fname" required>Nom de la formation</RequiredLabel>
            <Input id="fname" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) }); }} onBlur={() => handleBlur("name")} aria-invalid={!!showError("name")} placeholder="60 jours en motion" />
            <FieldError message={showError("name")} />
          </div>
          <div>
            <RequiredLabel htmlFor="fslug" required>Slug (identifiant URL)</RequiredLabel>
            <Input id="fslug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} onBlur={() => handleBlur("slug")} aria-invalid={!!showError("slug")} placeholder="motion" />
            <FieldError message={showError("slug")} />
          </div>
          <div>
            <Label htmlFor="fdesc">Description</Label>
            <Textarea id="fdesc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Decrivez cette formation..." rows={2} />
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-display text-sm font-semibold mb-3">Livrable de fin de formation</h4>
            <div>
              <RequiredLabel htmlFor="dlabel" required>Nom du livrable</RequiredLabel>
              <Input id="dlabel" value={form.deliverable_label} onChange={e => setForm({ ...form, deliverable_label: e.target.value })} onBlur={() => handleBlur("deliverable_label")} aria-invalid={!!showError("deliverable_label")} placeholder="Portfolio, Showreel, Projet..." />
              <FieldError message={showError("deliverable_label")} />
            </div>
            <div className="mt-2">
              <Label htmlFor="ddesc">Instructions pour l'etudiant</Label>
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
              <Textarea id="abody" value={form.attestation_body} onChange={e => setForm({ ...form, attestation_body: e.target.value })} placeholder="Utilisez {student_name} pour le nom de l'etudiant" rows={3} />
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

          <Button type="submit" disabled={saving || !isValid} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {formation ? "Enregistrer" : "Creer"}
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
    const { data, error } = await supabase
      .from("formations")
      .select("id, name, slug, description, deliverable_label, deliverable_description, attestation_title, attestation_body, attestation_logo_url, attestation_color, is_active, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setFormations((data || []) as Formation[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFormations(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Formation supprimee" });
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
                    <BookOpen className="h-5 w-5 text-white" />
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
                    description={`La formation "${f.name}" sera supprimee. Les cohortes liées ne seront pas supprimees.`}
                    confirmLabel="Supprimer"
                    onConfirm={() => handleDelete(f.id)}
                  />
                </div>
              </div>
              {f.description && <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  Livrable : {f.deliverable_label}
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
