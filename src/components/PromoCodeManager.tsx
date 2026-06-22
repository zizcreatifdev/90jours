import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Plus, Pencil, Trash2, Tag, Percent, Clock, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  cohort_id: string | null;
  is_early_bird: boolean;
  early_bird_deadline: string | null;
  is_active: boolean;
  created_at: string;
}

const defaultForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  max_uses: null as number | null,
  cohort_id: null as string | null,
  is_early_bird: false,
  early_bird_deadline: "",
  is_active: true,
};

const PromoCodeManager = () => {
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { code: form.code, discount_type: form.discount_type, discount_value: form.discount_value },
    {
      code: { required: "Le code est requis." },
      discount_type: { required: "Le type de réduction est requis." },
      discount_value: { required: true, validate: (v) => Number(v) > 0 ? null : "La valeur doit être supérieure à 0." },
    },
  );

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setCodes((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "PROMO-";
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm(f => ({ ...f, code: result }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    generateCode();
    reset();
    setOpen(true);
  };

  const openEdit = (c: PromoCode) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      max_uses: c.max_uses,
      cohort_id: c.cohort_id,
      is_early_bird: c.is_early_bird,
      early_bird_deadline: c.early_bird_deadline ? c.early_bird_deadline.slice(0, 16) : "",
      is_active: c.is_active,
    });
    reset();
    setOpen(true);
  };

  const handleSave = async () => {
    if (!validateAll()) return;
    if (!form.code.trim()) {
      toast({ title: "Code requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      max_uses: form.max_uses,
      cohort_id: form.cohort_id || null,
      is_early_bird: form.is_early_bird,
      early_bird_deadline: form.is_early_bird && form.early_bird_deadline ? new Date(form.early_bird_deadline).toISOString() : null,
      is_active: form.is_active,
    };

    const { error } = editingId
      ? await supabase.from("promo_codes").update(payload).eq("id", editingId)
      : await supabase.from("promo_codes").insert(payload);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Code modifié" : "Code créé" });
      setOpen(false);
      fetchCodes();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Code supprimé" }); fetchCodes(); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("promo_codes").update({ is_active: active }).eq("id", id);
    fetchCodes();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCohortName = (cohortId: string | null) => {
    if (!cohortId) return "Toutes";
    return cohorts.find(c => c.id === cohortId)?.name || "-";
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Tag className="h-5 w-5" /> Codes promo & Early Bird
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate} className="gap-1">
              <Plus className="h-4 w-4" /> Nouveau code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le code" : "Nouveau code promo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <RequiredLabel required>Code</RequiredLabel>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} onBlur={() => handleBlur("code")} aria-invalid={!!showError("code")} placeholder="PROMO-XXXX" />
                  <Button variant="outline" size="sm" onClick={generateCode} type="button">Générer</Button>
                </div>
                <FieldError message={showError("code")} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Réduction de lancement" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <RequiredLabel required>Type de réduction</RequiredLabel>
                  <Select value={form.discount_type} onValueChange={v => { setForm(f => ({ ...f, discount_type: v })); handleBlur("discount_type"); }}>
                    <SelectTrigger aria-invalid={!!showError("discount_type")}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={showError("discount_type")} />
                </div>
                <div>
                  <RequiredLabel required>Valeur</RequiredLabel>
                  <Input type="number" min={1} value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseInt(e.target.value) || 0 }))} onBlur={() => handleBlur("discount_value")} aria-invalid={!!showError("discount_value")} />
                  <FieldError message={showError("discount_value")} />
                </div>
              </div>
              <div>
                <Label>Nombre d'utilisations max (vide = illimité)</Label>
                <Input type="number" min={1} value={form.max_uses ?? ""} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Illimité" />
              </div>
              <div>
                <Label>Cohorte spécifique (optionnel)</Label>
                <Select value={form.cohort_id || "all"} onValueChange={v => setForm(f => ({ ...f, cohort_id: v === "all" ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les cohortes</SelectItem>
                    {cohorts.map(c => <SelectItem key={c.id} value={c.id}>Cohorte {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Tarif Early Bird</p>
                  <p className="text-xs text-muted-foreground">Expire automatiquement à la date limite</p>
                </div>
                <Switch checked={form.is_early_bird} onCheckedChange={v => setForm(f => ({ ...f, is_early_bird: v }))} />
              </div>
              {form.is_early_bird && (
                <div>
                  <Label>Date limite Early Bird</Label>
                  <Input type="datetime-local" value={form.early_bird_deadline} onChange={e => setForm(f => ({ ...f, early_bird_deadline: e.target.value }))} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Actif</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              </div>
              <Button onClick={handleSave} disabled={saving || !isValid} className="w-full">
                {saving ? "Enregistrement..." : editingId ? "Modifier" : "Créer le code"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">Code</th>
              <th className="px-6 py-3 font-medium">Réduction</th>
              <th className="px-6 py-3 font-medium">Cohorte</th>
              <th className="px-6 py-3 font-medium">Utilisations</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Statut</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map(c => {
              const isExpired = c.is_early_bird && c.early_bird_deadline && new Date(c.early_bird_deadline) < new Date();
              const isMaxed = c.max_uses !== null && c.current_uses >= c.max_uses;
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono font-semibold text-foreground">{c.code}</code>
                      <button onClick={() => copyCode(c.code, c.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {c.description && <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-foreground">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()} FCFA`}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{getCohortName(c.cohort_id)}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">
                    {c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""}
                  </td>
                  <td className="px-6 py-3.5">
                    {c.is_early_bird ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" /> Early Bird
                        {c.early_bird_deadline && (
                          <span className="text-muted-foreground ml-1">
                            → {new Date(c.early_bird_deadline).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Percent className="h-3 w-3" /> Standard
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {isExpired ? (
                      <Badge variant="destructive" className="text-xs">Expiré</Badge>
                    ) : isMaxed ? (
                      <Badge variant="secondary" className="text-xs">Épuisé</Badge>
                    ) : (
                      <Switch checked={c.is_active} onCheckedChange={v => handleToggle(c.id, v)} />
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <ConfirmDialog
                        trigger={
                          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        }
                        title="Supprimer ce code promo ?"
                        description={`Le code "${c.code}" sera supprimé définitivement.`}
                        confirmLabel="Supprimer"
                        onConfirm={() => handleDelete(c.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {codes.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  Aucun code promo. Cliquez sur "Nouveau code" pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PromoCodeManager;
