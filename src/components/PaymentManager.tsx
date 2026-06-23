import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { sendPushToUsers } from "@/hooks/use-push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { useSiteSettings, WAVE_PAYMENT_URL_FALLBACK } from "@/hooks/use-site-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, Loader2, CheckCircle, Clock, XCircle, Wallet, ExternalLink, Copy, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { exportToCsv } from "@/lib/export-csv";

interface Payment {
  id: string;
  user_id: string;
  cohort_id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  profile?: { first_name: string; last_name: string };
  cohort?: { name: string };
}

const PAYMENT_TYPES = [
  { value: "inscription", label: "Inscription" },
  { value: "tranche_1", label: "Tranche 1" },
  { value: "tranche_2", label: "Tranche 2" },
  { value: "formation_complete", label: "Formation complète (en une fois)" },
  { value: "formation", label: "Formation" },
];

const TYPE_LABELS: Record<string, string> = {
  inscription: "Inscription",
  tranche_1: "Tranche 1",
  tranche_2: "Tranche 2",
  formation_complete: "Formation",
  formation: "Formation",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  paid: { label: "Payé", icon: CheckCircle, className: "bg-accent/10 text-accent" },
  pending: { label: "En attente", icon: Clock, className: "bg-yellow-500/10 text-yellow-600" },
  failed: { label: "Échoué", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const PaymentManager = () => {
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const { settings } = useSiteSettings();
  const waveBaseUrl = settings.wave_payment_url || WAVE_PAYMENT_URL_FALLBACK;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [trashedPayments, setTrashedPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  // Form state
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Users for dropdown
  const [allUsers, setAllUsers] = useState<{ user_id: string; first_name: string; last_name: string }[]>([]);

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    {
      selectedUser,
      selectedCohort,
      paymentType,
      paymentStatus,
      customAmount,
    },
    {
      selectedUser: { required: "L'étudiant est requis." },
      selectedCohort: { required: "La cohorte est requise." },
      paymentType: { required: "Le type de paiement est requis." },
      paymentStatus: { required: "Le statut est requis." },
      customAmount: {
        validate: (v) => (Number(v) > 0 ? null : "Le montant doit être supérieur à 0."),
      },
    },
  );

  // Formation tarifaire de la cohorte selectionnee (pour pre-remplir les montants)
  const selectedFormation = cohorts.find(c => c.id === selectedCohort)?.formation ?? null;

  const expectedAmount = (type: string, formation: typeof selectedFormation): number => {
    if (!formation) return 0;
    switch (type) {
      case "inscription": return formation.registration_fee;
      case "tranche_1": return formation.tranche_1_amount;
      case "tranche_2": return formation.tranche_2_amount;
      case "formation_complete": return formation.tranche_1_amount + formation.tranche_2_amount;
      default: return 0;
    }
  };

  useEffect(() => {
    if (dialogOpen) reset();
  }, [dialogOpen, reset]);

  // Pre-remplit le montant attendu selon le type et la formation (reste modifiable)
  useEffect(() => {
    if (!paymentType || !selectedFormation) return;
    setCustomAmount(String(expectedAmount(paymentType, selectedFormation)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, selectedCohort]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
    const cohortIds = [...new Set((data || []).map((p: any) => p.cohort_id))];

    const [profilesRes, cohortsRes] = await Promise.all([
      userIds.length > 0 ? supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds) : { data: [] },
      cohortIds.length > 0 ? supabase.from("cohorts").select("id, name").in("id", cohortIds) : { data: [] },
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const cohortMap = new Map((cohortsRes.data || []).map((c: any) => [c.id, c]));

    const enriched = (data || []).map((p: any) => ({
      ...p,
      profile: profileMap.get(p.user_id),
      cohort: cohortMap.get(p.cohort_id),
    }));

    setPayments(enriched.filter((p: any) => !p.deleted_at));
    setTrashedPayments(enriched.filter((p: any) => p.deleted_at));
    setLoading(false);
  };

  const fetchUsers = async () => {
    // Only fetch users who are enrolled in at least one cohort (students)
    const { data: enrollments } = await supabase.from("enrollments").select("user_id");
    if (!enrollments || enrollments.length === 0) { setAllUsers([]); return; }
    const studentIds = [...new Set(enrollments.map(e => e.user_id))];
    const { data } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", studentIds).order("first_name");
    if (data) setAllUsers(data);
  };

  useEffect(() => {
    fetchPayments();
    fetchUsers();
  }, []);

  const handleAddPayment = async () => {
    if (!validateAll()) return;
    if (!selectedUser || !selectedCohort || !paymentType) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }

    const amount = parseInt(customAmount) || 0;
    if (amount <= 0) {
      toast({ title: "Erreur", description: "Le montant doit être supérieur à 0.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("payments").insert({
      user_id: selectedUser,
      cohort_id: selectedCohort,
      amount,
      payment_type: paymentType,
      payment_method: "wave",
      status: paymentStatus,
      reference: reference || null,
      notes: notes || null,
      paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paiement enregistré !" });
      setDialogOpen(false);
      resetForm();
      fetchPayments();
    }
  };

  const handleToggleStatus = async (paymentId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    const payment = payments.find(p => p.id === paymentId);
    const { error } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        paid_at: newStatus === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", paymentId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "paid" ? "Marqué comme payé" : "Marqué en attente" });

      // Send push notification when payment is validated
      if (newStatus === "paid" && payment) {
        sendPushToUsers(
          [payment.user_id],
          "Paiement validé",
          `Votre paiement de ${payment.amount.toLocaleString("fr-FR")} FCFA a été validé.`
        );
      }

      fetchPayments();
    }
  };

  const handleSoftDelete = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", paymentId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Paiement mis à la corbeille" }); fetchPayments(); }
  };

  const handleRestore = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ deleted_at: null } as any)
      .eq("id", paymentId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Paiement restauré" }); fetchPayments(); }
  };

  const handlePermanentDelete = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Paiement supprimé définitivement" }); fetchPayments(); }
  };

  const resetForm = () => {
    setSelectedUser("");
    setSelectedCohort("");
    setPaymentType("");
    setCustomAmount("");
    setPaymentStatus("paid");
    setReference("");
    setNotes("");
  };

  const copyWaveLink = (amount: number) => {
    navigator.clipboard.writeText(`${waveBaseUrl}?amount=${amount}`);
    toast({ title: "Lien Wave copié !" });
  };

  const handleExport = () => {
    exportToCsv("paiements.csv", filteredPayments, [
      { key: "profile.first_name", label: "Prénom" },
      { key: "profile.last_name", label: "Nom" },
      { key: "cohort.name", label: "Cohorte" },
      { key: "payment_type", label: "Type" },
      { key: "amount", label: "Montant (FCFA)" },
      { key: "status", label: "Statut" },
      { key: "reference", label: "Référence" },
      { key: "paid_at", label: "Date de paiement" },
    ]);
  };

  const filteredPayments = payments.filter(p => {
    const name = `${p.profile?.first_name || ""} ${p.profile?.last_name || ""}`.toLowerCase();
    const matchesSearch = !debouncedSearch || name.includes(debouncedSearch.toLowerCase()) || (p.reference || "").toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.payment_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const totalPaid = payments.filter(p => p.status === "paid").reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((acc, p) => acc + p.amount, 0);
  const paidCount = payments.filter(p => p.status === "paid").length;
  const pendingCount = payments.filter(p => p.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wave Payment Links */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Liens Wave Business
        </h3>
      <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => copyWaveLink(10000)}>
            <Copy className="h-3 w-3" /> Inscription (10 000 F)
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => copyWaveLink(25000)}>
            <Copy className="h-3 w-3" /> Tranche (25 000 F)
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => copyWaveLink(50000)}>
            <Copy className="h-3 w-3" /> Formation (50 000 F)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Cliquez pour copier le lien de paiement Wave. Les étudiants peuvent payer la formation en plusieurs tranches (montant libre).
        </p>
      </div>

      {/* Payment Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Total encaissé</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{totalPaid.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
          <p className="mt-1 text-xs text-accent">{paidCount} paiements</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">En attente</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{totalPending.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
          <p className="mt-1 text-xs text-muted-foreground">{pendingCount} en attente</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Inscriptions (10K)</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{payments.filter(p => p.payment_type === "inscription" && p.status === "paid").length}</p>
          <p className="mt-1 text-xs text-muted-foreground">payées</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Formations</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{payments.filter(p => ["tranche_1", "tranche_2", "formation_complete", "formation"].includes(p.payment_type) && p.status === "paid").length}</p>
          <p className="mt-1 text-xs text-muted-foreground">payées</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Tous les paiements
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="paid">Payés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoués</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="inscription">Inscription</SelectItem>
                <SelectItem value="tranche_1">Tranche 1</SelectItem>
                <SelectItem value="tranche_2">Tranche 2</SelectItem>
                <SelectItem value="formation_complete">Formation complète</SelectItem>
                <SelectItem value="formation">Formation</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="w-48 pl-9 pr-8 bg-secondary border-0" value={search} onChange={e => setSearch(e.target.value)} />
              {search !== debouncedSearch && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Ajouter un paiement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Enregistrer un paiement Wave</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <RequiredLabel required>Étudiant</RequiredLabel>
                    <Select value={selectedUser} onValueChange={(v) => { setSelectedUser(v); handleBlur("selectedUser"); }}>
                      <SelectTrigger aria-invalid={!!showError("selectedUser")}><SelectValue placeholder="Sélectionner un étudiant" /></SelectTrigger>
                      <SelectContent>
                        {allUsers.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.first_name} {u.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={showError("selectedUser")} />
                  </div>
                  <div>
                    <RequiredLabel required>Cohorte</RequiredLabel>
                    <Select value={selectedCohort} onValueChange={(v) => { setSelectedCohort(v); handleBlur("selectedCohort"); }}>
                      <SelectTrigger aria-invalid={!!showError("selectedCohort")}><SelectValue placeholder="Sélectionner une cohorte" /></SelectTrigger>
                      <SelectContent>
                        {cohorts.filter(c => c.status !== "archived").map(c => (
                          <SelectItem key={c.id} value={c.id}>Cohorte {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={showError("selectedCohort")} />
                  </div>
                  <div>
                    <RequiredLabel required>Type de paiement</RequiredLabel>
                    <Select value={paymentType} onValueChange={(v) => { setPaymentType(v); handleBlur("paymentType"); }}>
                      <SelectTrigger aria-invalid={!!showError("paymentType")}><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={showError("paymentType")} />
                  </div>
                  <div>
                    <RequiredLabel required>Montant (FCFA)</RequiredLabel>
                    <Input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      onBlur={() => handleBlur("customAmount")}
                      aria-invalid={!!showError("customAmount")}
                      placeholder="Ex: 20000"
                      min={1}
                    />
                    {selectedFormation && paymentType && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Montant attendu pour ce type : {expectedAmount(paymentType, selectedFormation).toLocaleString("fr-FR")} FCFA (modifiable).
                      </p>
                    )}
                    <FieldError message={showError("customAmount")} />
                  </div>
                  <div>
                    <RequiredLabel required>Statut</RequiredLabel>
                    <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); handleBlur("paymentStatus"); }}>
                      <SelectTrigger aria-invalid={!!showError("paymentStatus")}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Payé</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError message={showError("paymentStatus")} />
                  </div>
                  <div>
                    <Label>Référence transaction Wave</Label>
                    <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: WAV-2026-001" />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes optionnelles..." rows={2} />
                  </div>
                  <Button onClick={handleAddPayment} disabled={submitting || !isValid} className="w-full">
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</> : "Enregistrer le paiement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-6 py-3 font-medium">Étudiant</th>
                <th className="px-6 py-3 font-medium">Cohorte</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Montant</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Référence</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => {
                const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConf.icon;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                          {p.profile?.first_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-foreground">{p.profile?.first_name} {p.profile?.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{p.cohort?.name || "-"}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[p.payment_type] || p.payment_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-foreground">{p.amount.toLocaleString("fr-FR")} F</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConf.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{p.reference || "-"}</td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("fr-FR") : new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleToggleStatus(p.id, p.status)}
                        >
                          {p.status === "paid" ? "→ En attente" : "→ Payé"}
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                          title="Supprimer ce paiement ?"
                          description="Le paiement sera déplacé dans la corbeille. Vous pourrez le restaurer ou le supprimer définitivement."
                          confirmLabel="Mettre à la corbeille"
                          onConfirm={() => handleSoftDelete(p.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Aucun paiement enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trash toggle */}
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <button
          onClick={() => setShowTrash(!showTrash)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-secondary/50 transition-colors rounded-2xl"
        >
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Corbeille
            {trashedPayments.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">{trashedPayments.length}</Badge>
            )}
          </h2>
          <span className="text-sm text-muted-foreground">{showTrash ? "Masquer" : "Afficher"}</span>
        </button>

        {showTrash && (
          <div className="border-t border-border overflow-x-auto">
            {trashedPayments.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">La corbeille est vide</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Étudiant</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Montant</th>
                    <th className="px-6 py-3 font-medium">Supprimé le</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trashedPayments.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors opacity-70">
                      <td className="px-6 py-3.5 text-sm text-foreground">{p.profile?.first_name} {p.profile?.last_name}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[p.payment_type] || p.payment_type}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-foreground">{p.amount.toLocaleString("fr-FR")} F</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">
                        {(p as any).deleted_at ? new Date((p as any).deleted_at).toLocaleDateString("fr-FR") : "-"}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => handleRestore(p.id)}>
                            <RotateCcw className="h-3 w-3" /> Restaurer
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive">
                                <AlertTriangle className="h-3 w-3" /> Supprimer
                              </Button>
                            }
                            title="Supprimer définitivement ?"
                            description="Cette action est irréversible. Le paiement sera supprimé de la base de données."
                            confirmLabel="Supprimer définitivement"
                            onConfirm={() => handlePermanentDelete(p.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManager;
