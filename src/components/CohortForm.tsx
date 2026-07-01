import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { Textarea } from "@/components/ui/textarea";
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
  registration_fee: number | null;
  total_price: number | null;
  tranche_1_amount: number | null;
}

// "standard" = Perfectionnement (60 j), "initiation" = Initiation (30 j)
const COHORT_TYPE_DAYS: Record<string, number> = { standard: 60, initiation: 30 };

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const CohortForm = ({ cohort, onSaved }: CohortFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);

  // tranche_2_amount is derived, not stored in form state
  const initialForm = () => ({
    formation_id: cohort?.formation_id || "",
    name: cohort?.name || "",
    description: cohort?.description || "",
    cohort_type: cohort?.cohort_type || "standard",
    start_date: cohort?.start_date || "",
    end_date: cohort?.end_date || "",
    capacity: cohort?.capacity || 25,
    status: cohort?.status || "upcoming",
    registration_fee: cohort?.registration_fee ?? null as number | null,
    total_price: cohort?.total_price ?? null as number | null,
    tranche_1_amount: cohort?.tranche_1_amount ?? null as number | null,
  });

  const [form, setForm] = useState(initialForm);

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    {
      formation_id: form.formation_id,
      name: form.name,
      cohort_type: form.cohort_type,
      start_date: form.start_date,
      capacity: form.capacity,
      status: form.status,
    },
    {
      formation_id: { required: "La formation est requise." },
      name: { required: "Le nom de la cohorte est requis." },
      cohort_type: { required: "Le type est requis." },
      start_date: { required: "La date de debut est requise." },
      capacity: { required: true, validate: (v) => Number(v) > 0 ? null : "La capacite doit etre superieure a 0." },
      status: { required: "Le statut est requis." },
    },
  );

  useEffect(() => {
    if (open) {
      setForm(initialForm());
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const fetchFormations = async () => {
      const { data } = await supabase
        .from("formations")
        .select("id, name, registration_fee, total_price, tranche_1_amount")
        .eq("is_active", true)
        .order("name");
      if (data) setFormations(data as Formation[]);
    };
    if (open) fetchFormations();
  }, [open]);

  // Auto-recalculate end_date when start_date or cohort_type changes
  useEffect(() => {
    if (!form.start_date) return;
    const days = COHORT_TYPE_DAYS[form.cohort_type] ?? 60;
    setForm(prev => ({ ...prev, end_date: addDays(prev.start_date, days) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_date, form.cohort_type]);

  const handleFormationChange = (v: string) => {
    const sel = formations.find(f => f.id === v);
    setForm(prev => ({
      ...prev,
      formation_id: v,
      ...(sel ? {
        registration_fee: sel.registration_fee,
        total_price: sel.total_price,
        ...(prev.cohort_type !== "initiation" ? {
          tranche_1_amount: sel.tranche_1_amount,
        } : {}),
      } : {}),
    }));
    handleBlur("formation_id");
  };

  const handleTypeChange = (newType: string) => {
    const sel = formations.find(f => f.id === form.formation_id) ?? null;
    if (newType === "initiation") {
      setForm(prev => ({ ...prev, cohort_type: newType, tranche_1_amount: null }));
    } else {
      setForm(prev => ({
        ...prev,
        cohort_type: newType,
        tranche_1_amount: sel?.tranche_1_amount ?? prev.tranche_1_amount,
      }));
    }
    handleBlur("cohort_type");
  };

  // --- Tarification derivee ---
  const isPerfectionnement = form.cohort_type === "standard";
  const totalPrice = form.total_price ?? 0;
  const regFee = form.registration_fee ?? 0;
  const tranche1 = form.tranche_1_amount ?? 0;
  const resteApresInscription = totalPrice - regFee;
  // Si tranche1 = 0 : le reste entier constitue la tranche 2 (solde unique)
  const tranche2Computed = tranche1 === 0 ? resteApresInscription : resteApresInscription - tranche1;

  const inscriptionError = totalPrice > 0 && regFee > totalPrice
    ? "Les frais d'inscription depassent le total"
    : null;
  const tranche1Error = isPerfectionnement && tranche1 > 0 && tranche2Computed < 0
    ? "La Tranche 1 depasse le reste a payer"
    : null;
  const hasPricingError = !!inscriptionError || !!tranche1Error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || hasPricingError) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        formation_id: form.formation_id || null,
        tranche_2_amount: isPerfectionnement ? Math.max(0, tranche2Computed) : null,
      };
      if (cohort) {
        const { error } = await supabase.from("cohorts").update(payload).eq("id", cohort.id);
        if (error) throw error;
        toast({ title: "Cohorte modifiee" });
      } else {
        const { data: inserted, error } = await supabase.from("cohorts").insert(payload).select("id").single();
        if (error) throw error;
        toast({ title: "Cohorte creee" });
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
    } catch (err: unknown) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {cohort ? "Modifier la cohorte" : "Creer une cohorte"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">

          {/* Section 1 — Informations generales */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Informations generales</h4>
            <div>
              <RequiredLabel required>Formation</RequiredLabel>
              <Select value={form.formation_id} onValueChange={handleFormationChange}>
                <SelectTrigger aria-invalid={!!showError("formation_id")}>
                  <SelectValue placeholder="Choisir une formation" />
                </SelectTrigger>
                <SelectContent>
                  {formations.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={showError("formation_id")} />
            </div>
            <div>
              <RequiredLabel htmlFor="c-name" required>Nom de la cohorte</RequiredLabel>
              <Input
                id="c-name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onBlur={() => handleBlur("name")}
                aria-invalid={!!showError("name")}
                placeholder="Ex : Genesis, Perfection"
              />
              <FieldError message={showError("name")} />
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description de la cohorte..."
                rows={2}
              />
            </div>
          </div>

          {/* Section 2 — Planning */}
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="font-display text-sm font-semibold text-foreground">Planning</h4>
            <div>
              <RequiredLabel required>Type de cohorte</RequiredLabel>
              <Select value={form.cohort_type} onValueChange={handleTypeChange}>
                <SelectTrigger aria-invalid={!!showError("cohort_type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initiation">Initiation (30 jours)</SelectItem>
                  <SelectItem value="standard">Perfectionnement (60 jours)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={showError("cohort_type")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <RequiredLabel htmlFor="c-start" required>Date de debut</RequiredLabel>
                <Input
                  id="c-start"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  onBlur={() => handleBlur("start_date")}
                  aria-invalid={!!showError("start_date")}
                />
                <FieldError message={showError("start_date")} />
              </div>
              <div>
                <Label htmlFor="c-end">Date de fin</Label>
                <Input
                  id="c-end"
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">Calculee automatiquement, modifiable si besoin.</p>
              </div>
            </div>
          </div>

          {/* Section 3 — Capacite et statut */}
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="font-display text-sm font-semibold text-foreground">Capacite et statut</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <RequiredLabel htmlFor="c-cap" required>Capacite max</RequiredLabel>
                <Input
                  id="c-cap"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 25 })}
                  onBlur={() => handleBlur("capacity")}
                  aria-invalid={!!showError("capacity")}
                />
                <FieldError message={showError("capacity")} />
              </div>
              <div>
                <RequiredLabel required>Statut</RequiredLabel>
                <Select value={form.status} onValueChange={v => { setForm({ ...form, status: v }); handleBlur("status"); }}>
                  <SelectTrigger aria-invalid={!!showError("status")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">A venir</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archivee</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={showError("status")} />
              </div>
            </div>
          </div>

          {/* Section 4 — Tarification */}
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <h4 className="font-display text-sm font-semibold text-foreground">Tarification</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Tarifs specifiques a cette cohorte.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-tprice">Total formation (FCFA)</Label>
                <Input
                  id="c-tprice"
                  type="number"
                  min={0}
                  value={form.total_price ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, total_price: e.target.value !== "" ? parseInt(e.target.value) : null }))}
                  placeholder="Ex : 50000"
                />
              </div>
              <div>
                <Label htmlFor="c-regfee">Frais d'inscription (FCFA)</Label>
                <Input
                  id="c-regfee"
                  type="number"
                  min={0}
                  value={form.registration_fee ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, registration_fee: e.target.value !== "" ? parseInt(e.target.value) : null }))}
                  placeholder="Ex : 10000"
                  aria-invalid={!!inscriptionError}
                />
                {inscriptionError && <p className="mt-1 text-xs text-destructive">{inscriptionError}</p>}
              </div>
            </div>
            {isPerfectionnement && (
              <>
                {form.total_price != null && form.registration_fee != null && !inscriptionError && (
                  <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground font-medium">
                    Reste apres inscription : {resteApresInscription.toLocaleString("fr-FR")} FCFA
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="c-t1">Tranche 1 (FCFA)</Label>
                    <Input
                      id="c-t1"
                      type="number"
                      min={0}
                      value={form.tranche_1_amount ?? ""}
                      onChange={e => setForm(prev => ({ ...prev, tranche_1_amount: e.target.value !== "" ? parseInt(e.target.value) : null }))}
                      placeholder="Ex : 25000"
                      aria-invalid={!!tranche1Error}
                    />
                    {tranche1Error && <p className="mt-1 text-xs text-destructive">{tranche1Error}</p>}
                  </div>
                  <div>
                    <Label htmlFor="c-t2">Tranche 2 (FCFA)</Label>
                    <Input
                      id="c-t2"
                      type="number"
                      readOnly
                      value={!inscriptionError && form.total_price != null && form.registration_fee != null ? Math.max(0, tranche2Computed) : ""}
                      className="bg-muted cursor-default"
                      placeholder="Calcule automatiquement"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Calcule automatiquement (Reste - Tranche 1).</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paiement en 2 tranches possible pour les formations Perfectionnement.
                </p>
              </>
            )}
            {!isPerfectionnement && (
              <p className="text-xs text-muted-foreground">
                Paiement en une fois pour les formations Initiation.
              </p>
            )}
          </div>

          <Button type="submit" disabled={saving || !isValid || hasPricingError} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {cohort ? "Enregistrer" : "Creer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CohortForm;
