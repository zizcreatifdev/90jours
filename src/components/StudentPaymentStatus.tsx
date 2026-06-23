import { useEffect, useState } from "react";
import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings, WAVE_PAYMENT_URL_FALLBACK } from "@/hooks/use-site-settings";
import { CheckCircle, Clock, AlertCircle, CreditCard, ExternalLink, Plus, Loader2, CalendarClock, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  reference: string | null;
}

interface FormationPricing {
  registration_fee: number;
  total_price: number;
  tranche_1_amount: number;
  tranche_2_amount: number;
}

// Types de paiement couvrant le cout de formation (hors inscription).
// "formation" et "formation_complete" sont conserves pour l'historique.
const FORMATION_TYPES = ["tranche_1", "tranche_2", "formation_complete", "formation"];

type PayMode = "once" | "split";

const StudentPaymentStatus = ({ cohortId, formationName, formationColor }: { cohortId: string; formationName?: string; formationColor?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const waveBaseUrl = settings.wave_payment_url || WAVE_PAYMENT_URL_FALLBACK;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formation, setFormation] = useState<FormationPricing | null>(null);
  const [cohortStart, setCohortStart] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<PayMode>("split");

  const [declareOpen, setDeclareOpen] = useState(false);
  const [declareType, setDeclareType] = useState("");
  const [declareAmount, setDeclareAmount] = useState("");
  const [declareRef, setDeclareRef] = useState("");
  const [declareNotes, setDeclareNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Code promo (applique uniquement aux frais d'inscription) ──────────────
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{
    code: string;
    promoCodeId: string;
    discountType: string;
    discountValue: number;
    newAmount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user || !cohortId) return;
    const [paymentsRes, cohortRes] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .order("created_at", { ascending: true }),
      supabase
        .from("cohorts")
        .select("formation_id, start_date")
        .eq("id", cohortId)
        .single(),
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (cohortRes.data?.start_date) setCohortStart(cohortRes.data.start_date);
    if (cohortRes.data?.formation_id) {
      const { data: f } = await supabase
        .from("formations")
        .select("registration_fee, total_price, tranche_1_amount, tranche_2_amount")
        .eq("id", cohortRes.data.formation_id)
        .single();
      if (f) setFormation(f);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, cohortId]);

  if (loading) return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
      <div className="space-y-3 mt-4">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Montants de reference ─────────────────────────────────────────────────
  const inscriptionAmount = formation?.registration_fee ?? 10000;
  // La reduction d'un code promo ne porte QUE sur les frais d'inscription.
  const effectiveInscriptionAmount = promoApplied ? promoApplied.newAmount : inscriptionAmount;
  const totalDue = formation?.total_price ?? 50000;
  const formationCost = totalDue - inscriptionAmount;
  const tranche1 = formation?.tranche_1_amount ?? Math.floor(formationCost / 2);
  const tranche2 = formation?.tranche_2_amount ?? (formationCost - Math.floor(formationCost / 2));

  // ── Comptabilisation (tous les types) ─────────────────────────────────────
  const sumByStatus = (types: string[], status: string) =>
    payments
      .filter(p => types.includes(p.payment_type) && p.status === status)
      .reduce((s, p) => s + p.amount, 0);

  const inscriptionPaid = sumByStatus(["inscription"], "paid");
  const formationPaid = sumByStatus(FORMATION_TYPES, "paid");
  const totalPaid = inscriptionPaid + formationPaid;
  const totalPending = sumByStatus(["inscription", ...FORMATION_TYPES], "pending");
  const remaining = Math.max(totalDue - totalPaid, 0);

  // Avancement cumulatif : robuste meme si un paiement "formation_complete" ou
  // "formation" (heritage) couvre plusieurs tranches a la fois.
  const inscriptionFullyPaid = inscriptionPaid >= inscriptionAmount;
  const formationFullyPaid = formationPaid >= formationCost;
  const tranche1Done = formationPaid >= tranche1;
  const tranche2Done = formationPaid >= formationCost;

  // ── Echeances (depuis la date de debut de cohorte) ────────────────────────
  const dueDate = (days: number): string | null =>
    cohortStart ? format(addDays(parseISO(cohortStart), days), "d MMMM yyyy", { locale: fr }) : null;

  // Retourne le nombre de jours de retard (positif) ou null si a jour / non applicable.
  const overdueCount = (deadlineDays: number, isPaid: boolean): number | null => {
    if (!cohortStart || isPaid) return null;
    const deadline = addDays(parseISO(cohortStart), deadlineDays);
    const days = differenceInDays(new Date(), deadline);
    return days > 0 ? days : null;
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
  const waveHref = (amount: number) => `${waveBaseUrl}?amount=${amount}`;

  const lineAmount = (type: string): number => {
    switch (type) {
      case "inscription": return effectiveInscriptionAmount;
      case "tranche_1": return tranche1;
      case "tranche_2": return tranche2;
      case "formation_complete": return formationCost;
      default: return 0;
    }
  };

  const statusLabel = (s: string) =>
    s === "paid" ? "Payé" : s === "pending" ? "En attente" : "Échoué";

  const statusVariant = (s: string): "default" | "secondary" | "destructive" =>
    s === "paid" ? "default" : s === "pending" ? "secondary" : "destructive";

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "paid") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "pending") return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  };

  const transactionLabel = (type: string) => {
    switch (type) {
      case "inscription": return "Inscription";
      case "tranche_1": return "Tranche 1";
      case "tranche_2": return "Tranche 2";
      case "formation_complete": return "Formation (en une fois)";
      default: return "Formation";
    }
  };

  // Options de declaration selon le mode d'affichage et ce qui reste a payer.
  const declareOptions: { value: string; label: string }[] = [];
  if (!inscriptionFullyPaid) declareOptions.push({ value: "inscription", label: `Inscription (${fmt(effectiveInscriptionAmount)})` });
  if (payMode === "once") {
    if (!formationFullyPaid) declareOptions.push({ value: "formation_complete", label: `Formation en une fois (${fmt(formationCost)})` });
  } else {
    if (!tranche1Done) declareOptions.push({ value: "tranche_1", label: `Tranche 1 (${fmt(tranche1)})` });
    if (!tranche2Done) declareOptions.push({ value: "tranche_2", label: `Tranche 2 (${fmt(tranche2)})` });
  }

  const handleSelectType = (v: string) => {
    setDeclareType(v);
    setDeclareAmount(String(lineAmount(v)));
  };

  // Valide un code promo (lecture seule) et affiche la reduction sur l'inscription.
  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !cohortId) return;
    setPromoLoading(true);
    setPromoError(null);
    // RPC non typée dans types.ts (migration récente) : cast pour éviter l'erreur TS.
    const { data, error } = await (supabase.rpc as any)("validate_promo_code", {
      p_code: code,
      p_cohort_id: cohortId,
    });
    setPromoLoading(false);
    if (error) {
      setPromoError("Impossible de valider le code pour le moment.");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.valid) {
      setPromoError(row?.message || "Code invalide.");
      return;
    }
    const newAmount = row.discount_type === "percentage"
      ? Math.max(0, Math.round(inscriptionAmount * (1 - row.discount_value / 100)))
      : Math.max(0, inscriptionAmount - row.discount_value);
    setPromoApplied({
      code,
      promoCodeId: row.promo_code_id,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      newAmount,
    });
    setPromoInput("");
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoError(null);
  };

  const handleDeclarePayment = async () => {
    if (!user || !cohortId || !declareType) return;
    const amount = parseInt(declareAmount) || 0;
    if (amount <= 0) {
      toast({ title: "Erreur", description: "Le montant doit être supérieur à 0.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("payments").insert({
      user_id: user.id,
      cohort_id: cohortId,
      amount,
      payment_type: declareType,
      payment_method: "wave",
      status: "pending",
      reference: declareRef || null,
      notes: declareNotes || null,
    }).select("id").single();

    if (error) {
      setSubmitting(false);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    // Si un code promo a ete applique a l'inscription, on l'enregistre maintenant
    // que le paiement existe (apply_promo_code a besoin du payment_id).
    if (declareType === "inscription" && promoApplied && inserted?.id) {
      const { data: applyData, error: applyErr } = await (supabase.rpc as any)("apply_promo_code", {
        p_code: promoApplied.code,
        p_user_id: user.id,
        p_payment_id: inserted.id,
        p_cohort_id: cohortId,
      });
      const applyRow = Array.isArray(applyData) ? applyData[0] : applyData;
      if (applyErr || !applyRow?.success) {
        // Le paiement reste enregistre (au montant reduit) ; on signale juste
        // que le code n'a pas pu etre comptabilise (epuise, deja utilise...).
        toast({
          title: "Code promo non appliqué",
          description: applyRow?.message || "La réduction n'a pas pu être enregistrée, mais votre paiement est bien déclaré.",
          variant: "destructive",
        });
      }
      setPromoApplied(null);
    }

    setSubmitting(false);
    toast({ title: "Paiement déclaré", description: "Votre paiement sera vérifié par l'administration." });
    setDeclareOpen(false);
    setDeclareType("");
    setDeclareAmount("");
    setDeclareRef("");
    setDeclareNotes("");
    fetchData();
  };

  // ── Ligne de paiement reutilisable ────────────────────────────────────────
  const PaymentLine = ({
    title, amount, done, partialPaid, deadline, waveAmount, badgeWhenDone, badgeWhenTodo, overdueDays,
  }: {
    title: string;
    amount: number;
    done: boolean;
    partialPaid?: number;
    deadline: string | null;
    waveAmount: number;
    badgeWhenDone: string;
    badgeWhenTodo: string;
    overdueDays?: number | null;
  }) => {
    const isPartial = !done && (partialPaid ?? 0) > 0;
    return (
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <StatusIcon status={done ? "paid" : isPartial ? "pending" : "failed"} />
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {partialPaid !== undefined && !done
                ? `${fmt(partialPaid)} / ${fmt(amount)}`
                : fmt(amount)}
            </p>
            {deadline && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Echeance : {deadline}
              </p>
            )}
            {!done && overdueDays != null && overdueDays > 0 && (
              <p className="mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-yellow-700 bg-yellow-500/10 w-fit">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                En retard depuis {overdueDays} jour{overdueDays > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!done && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
              <a href={waveHref(waveAmount)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" /> Payer {fmt(waveAmount)}
              </a>
            </Button>
          )}
          <Badge variant={statusVariant(done ? "paid" : isPartial ? "pending" : "failed")}>
            {done ? badgeWhenDone : badgeWhenTodo}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-accent" />
          <h2 className="font-display text-base font-semibold text-foreground">Mes paiements</h2>
          {formationName && (
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: formationColor || 'hsl(var(--accent))' }}>
              {formationName}
            </span>
          )}
        </div>
        {remaining > 0 && declareOptions.length > 0 && (
          <Dialog open={declareOpen} onOpenChange={setDeclareOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Déclarer un paiement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Déclarer un paiement</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">Déclarez votre paiement Wave. L'administration vérifiera et validera votre paiement.</p>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Type de paiement *</Label>
                  <Select value={declareType} onValueChange={handleSelectType}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {declareOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {declareType && (
                  <div>
                    <Label>Montant (FCFA) *</Label>
                    <Input type="number" value={declareAmount} onChange={e => setDeclareAmount(e.target.value)} placeholder="Ex: 25000" min={1} />
                  </div>
                )}
                <div>
                  <Label>Référence Wave (optionnel)</Label>
                  <Input value={declareRef} onChange={e => setDeclareRef(e.target.value)} placeholder="Numéro de transaction Wave" />
                </div>
                <div>
                  <Label>Note (optionnel)</Label>
                  <Textarea value={declareNotes} onChange={e => setDeclareNotes(e.target.value)} placeholder="Informations complémentaires..." rows={2} />
                </div>
                <Button className="w-full" onClick={handleDeclarePayment} disabled={submitting || !declareType}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Soumettre la déclaration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total payé</p>
          <p className="text-sm font-bold text-foreground">{fmt(totalPaid)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-sm font-bold text-yellow-600">{fmt(totalPending)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Restant</p>
          <p className={`text-sm font-bold ${remaining > 0 ? "text-destructive" : "text-green-600"}`}>{fmt(remaining)}</p>
        </div>
      </div>

      {/* Payment rows */}
      <div className="divide-y divide-border">
        {/* Inscription */}
        <PaymentLine
          title="Inscription"
          amount={effectiveInscriptionAmount}
          done={inscriptionFullyPaid}
          deadline={dueDate(15)}
          waveAmount={effectiveInscriptionAmount}
          badgeWhenDone="Payé"
          badgeWhenTodo="Non payé"
          overdueDays={overdueCount(15, inscriptionFullyPaid)}
        />

        {/* Code promo : applique uniquement aux frais d'inscription, si non payee */}
        {!inscriptionFullyPaid && (
          <div className="bg-secondary/30 px-6 py-3">
            {promoApplied ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Tag className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="font-medium text-foreground">Code {promoApplied.code} appliqué</span>
                  <span className="text-muted-foreground line-through">{fmt(inscriptionAmount)}</span>
                  <span className="font-semibold text-accent">{fmt(promoApplied.newAmount)}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleRemovePromo}>
                  Retirer
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <Input
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Code promo"
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 gap-1 text-xs"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                  >
                    {promoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                    Appliquer
                  </Button>
                </div>
                {promoError && <p className="mt-1.5 text-[11px] text-destructive">{promoError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Toggle 1 fois / 2 tranches */}
        <div className="flex items-center justify-between gap-3 px-6 py-3">
          <p className="text-xs font-medium text-muted-foreground">Coût de formation : {fmt(formationCost)}</p>
          <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
            <button
              type="button"
              onClick={() => setPayMode("once")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                payMode === "once" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Payer en 1 fois
            </button>
            <button
              type="button"
              onClick={() => setPayMode("split")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                payMode === "split" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Payer en 2 tranches
            </button>
          </div>
        </div>

        {payMode === "once" ? (
          <PaymentLine
            title="Formation (en une fois)"
            amount={formationCost}
            done={formationFullyPaid}
            partialPaid={Math.min(formationPaid, formationCost)}
            deadline={dueDate(30)}
            waveAmount={formationCost}
            badgeWhenDone="Payé"
            badgeWhenTodo={formationPaid > 0 ? "Partiel" : "Non payé"}
            overdueDays={overdueCount(30, formationFullyPaid)}
          />
        ) : (
          <>
            <PaymentLine
              title="Tranche 1"
              amount={tranche1}
              done={tranche1Done}
              deadline={dueDate(30)}
              waveAmount={tranche1}
              badgeWhenDone="Payé"
              badgeWhenTodo="Non payé"
              overdueDays={overdueCount(30, tranche1Done)}
            />
            <PaymentLine
              title="Tranche 2"
              amount={tranche2}
              done={tranche2Done}
              deadline={dueDate(60)}
              waveAmount={tranche2}
              badgeWhenDone="Payé"
              badgeWhenTodo="Non payé"
              overdueDays={overdueCount(60, tranche2Done)}
            />
          </>
        )}

        {/* Individual transactions */}
        {payments.length > 0 && (
          <>
            <div className="px-6 py-2 bg-secondary/50">
              <p className="text-xs font-medium text-muted-foreground">Détail des transactions</p>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-border">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-6 py-2.5">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={p.status} />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {transactionLabel(p.payment_type)} : {fmt(p.amount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                          : new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        {p.reference && ` • Réf: ${p.reference}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(p.status)} className="text-[10px]">
                    {statusLabel(p.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}

        {payments.length === 0 && (
          <p className="px-6 py-4 text-center text-xs text-muted-foreground">Aucun paiement enregistré</p>
        )}
      </div>

      {/* Global pay button if remaining */}
      {remaining > 0 && (
        <div className="border-t border-border px-6 py-4">
          <Button className="w-full gap-2" asChild>
            <a href={waveHref(remaining)} target="_blank" rel="noopener noreferrer">
              <CreditCard className="h-4 w-4" /> Payer le solde via Wave ({fmt(remaining)})
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentPaymentStatus;
