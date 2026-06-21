import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
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

const CohortForm = ({ cohort, onSaved }: CohortFormProps) => {
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
    cohort_type: (cohort as any)?.cohort_type || "standard",
    formation_id: (cohort as any)?.formation_id || "",
  });

  useEffect(() => {
    const fetchFormations = async () => {
      const { data } = await supabase.from("formations").select("id, name, duration_days").eq("is_active", true).order("name");
      if (data) setFormations(data);
    };
    if (open) fetchFormations();
  }, [open]);

  // Auto-calculate end_date when start_date or formation changes
  useEffect(() => {
    if (!form.start_date || !form.formation_id) return;
    const selected = formations.find(f => f.id === form.formation_id);
    if (!selected) return;
    const start = new Date(form.start_date);
    start.setDate(start.getDate() + selected.duration_days);
    const endStr = start.toISOString().split("T")[0];
    setForm(prev => ({ ...prev, end_date: endStr }));
  }, [form.start_date, form.formation_id, formations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const { error } = await supabase.from("cohorts").insert(payload);
        if (error) throw error;
        toast({ title: "Cohorte créée" });
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
            <Label>Formation</Label>
            <Select value={form.formation_id} onValueChange={v => setForm({ ...form, formation_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
              <SelectContent>
                {formations.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Nom de la cohorte</Label>
            <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Janvier 2026" />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Formation intensive..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Date début</Label>
              <Input id="start" type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="end">Date fin (auto)</Label>
              <Input id="end" type="date" value={form.end_date} readOnly className="bg-muted cursor-not-allowed" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cap">Capacité max</Label>
              <Input id="cap" type="number" min={1} required value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 25 })} />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="active">En cours</SelectItem>
                  <SelectItem value="archived">Terminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Type de cohorte</Label>
            <Select value={form.cohort_type} onValueChange={v => setForm({ ...form, cohort_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (60 jours)</SelectItem>
                <SelectItem value="initiation">Initiation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {cohort ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CohortForm;
