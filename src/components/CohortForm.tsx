import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Loader2 } from "lucide-react";
import type { CohortRow } from "@/hooks/use-cohorts";

interface CohortFormProps {
  cohort?: CohortRow;
  onSaved: () => void;
}

interface Formation {
  id: string;
  name: string;
  duration_days: number;
}

const COHORT_TYPE_DAYS: Record<string, number> = { standard: 60, initiation: 30 };

const CohortForm = ({ cohort, onSaved }: CohortFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [form, setForm] = useState({
    name: cohort?.name || "",
    description: cohort?.description || "",
    start_date: cohort?.start_date || "",
    end_date: cohort?.end_date || "",
    capacity: cohort?.capacity || 25,
    status: cohort?.status || "upcoming",
    cohort_type: cohort?.cohort_type || "standard",
    formation_id: cohort?.formation_id || "",
  });

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    {
      formation_id: form.formation_id,
      name: form.name,
      start_date: form.start_date,
      capacity: form.capacity,
      status: form.status,
      cohort_type: form.cohort_type,
    },
    {
      formation_id: { required: "La formation est requise." },
      name: { required: "Le nom de la cohorte est requis." },
      start_date: { required: "La date de début est requise." },
      capacity: { required: true, validate: (v) => Number(v) > 0 ? null : "La capacité doit être supérieure à 0." },
      status: { required: "Le statut est requis." },
      cohort_type: { required: "Le type de cohorte est requis." },
    },
  );

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    const fetchFormations = async () => {
      const { data } = await supabase.from("formations").select("id, name, duration_days").eq("is_active", true).order("name");
      if (data) setFormations(data);
    };
    if (open) fetchFormations();
  }, [open]);

  // Auto-calculate end_date from cohort type (standard=60j, initiation=30j)
  useEffect(() => {
    if (!form.start_date) return;
    const days = COHORT_TYPE_DAYS[form.cohort_type] ?? 60;
    const start = new Date(form.start_date);
    start.setDate(start.getDate() + days);
    setForm(prev => ({ ...prev, end_date: start.toISOString().split("T")[0] }));
  }, [form.start_date, form.cohort_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        formation_id: form.formation_id || null,
      };
      if (cohort) {
        const { error } = await supabase.from("cohorts").update(payload).eq("id", cohort.id);
        if (error) throw error;
        toast({ title: "Cohorte modifiée" });
      } else {
        const { data: inserted, error } = await supabase.from("cohorts").insert(payload).select("id").single();
        if (error) throw error;
        toast({ title: "Cohorte créée" });
        if (user) {
          await supabase.from("audit_logs").insert({
            performed_by: user.id,
            action: "cohort_created",
            details: { cohort_name: form.name, start_date: form.start_date, cohort_type: form.cohort_type, cohort_id: inserted?.id },
          });
        }
      }
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {cohort ? (
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1.5 h-4 w-4" /> Nouvelle cohorte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{cohort ? "Modifier la cohorte" : "Créer une cohorte"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <RequiredLabel required>Formation</RequiredLabel>
            <Select value={form.formation_id} onValueChange={v => { setForm({ ...form, formation_id: v }); handleBlur("formation_id"); }}>
              <SelectTrigger aria-invalid={!!showError("formation_id")}><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
              <SelectContent>
                {formations.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={showError("formation_id")} />
          </div>
          <div>
            <RequiredLabel htmlFor="name" required>Nom de la cohorte</RequiredLabel>
            <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onBlur={() => handleBlur("name")} aria-invalid={!!showError("name")} placeholder="Ex: Janvier 2026" />
            <FieldError message={showError("name")} />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Formation intensive..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <RequiredLabel htmlFor="start" required>Date début</RequiredLabel>
              <Input id="start" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} onBlur={() => handleBlur("start_date")} aria-invalid={!!showError("start_date")} />
              <FieldError message={showError("start_date")} />
            </div>
            <div>
              <Label htmlFor="end">Date fin</Label>
              <Input id="end" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Calculee automatiquement, modifiable si besoin.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <RequiredLabel htmlFor="cap" required>Capacité max</RequiredLabel>
              <Input id="cap" type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 25 })} onBlur={() => handleBlur("capacity")} aria-invalid={!!showError("capacity")} />
              <FieldError message={showError("capacity")} />
            </div>
            <div>
              <RequiredLabel required>Statut</RequiredLabel>
              <Select value={form.status} onValueChange={v => { setForm({ ...form, status: v }); handleBlur("status"); }}>
                <SelectTrigger aria-invalid={!!showError("status")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="active">En cours</SelectItem>
                  <SelectItem value="archived">Terminée</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={showError("status")} />
            </div>
          </div>
          <div>
            <RequiredLabel required>Type de cohorte</RequiredLabel>
            <Select value={form.cohort_type} onValueChange={v => { setForm({ ...form, cohort_type: v }); handleBlur("cohort_type"); }}>
              <SelectTrigger aria-invalid={!!showError("cohort_type")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Perfectionnement (60 jours)</SelectItem>
                <SelectItem value="initiation">Initiation (30 jours)</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={showError("cohort_type")} />
          </div>
          <Button type="submit" disabled={saving || !isValid} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {cohort ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CohortForm;
