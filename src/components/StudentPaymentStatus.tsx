import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Clock, AlertCircle, CreditCard, ExternalLink, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

const WAVE_BASE_URL = "https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/";

const StudentPaymentStatus = ({ cohortId, formationName, formationColor }: { cohortId: string; formationName?: string; formationColor?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formation, setFormation] = useState<{ registration_fee: number; total_price: number } | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [declareType, setDeclareType] = useState("");
  const [declareAmount, setDeclareAmount] = useState("");
  const [declareRef, setDeclareRef] = useState("");
  const [declareNotes, setDeclareNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        .select("formation_id")
        .eq("id", cohortId)
        .single(),
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (cohortRes.data?.formation_id) {
      const { data: f } = await supabase
        .from("formations")
        .select("registration_fee, total_price")
        .eq("id", cohortRes.data.formation_id)
        .single();
      if (f) setFormation(f);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, cohortId]);

  const handleDeclarePayment = async () => {
    if (!user || !cohortId || !declareType) return;
    const amount = declareType === "inscription" ? (formation?.registration_fee ?? 10000) : (parseInt(declareAmount) || 0);
    if (amount <= 0) {
      toast({ title: "Erreur", description: "Le montant doit être supérieur à 0.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      cohort_id: cohortId,
      amount,
      payment_type: declareType,
      payment_method: "wave",
      status: "pending",
      reference: declareRef || null,
      notes: declareNotes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paiement déclaré", description: "Votre paiement sera vérifié par l'administration." });
      setDeclareOpen(false);
      setDeclareType("");
      setDeclareAmount("");
      setDeclareRef("");
      setDeclareNotes("");
      fetchData();
    }
  };

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

  const inscriptionAmount = formation?.registration_fee ?? 10000;
  const formationAmount = (formation?.total_price ?? 50000) - inscriptionAmount;

  const inscriptionPaid = payments
    .filter(p => p.payment_type === "inscription" && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  const formationPaid = payments
    .filter(p => p.payment_type === "formation" && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  const formationPending = payments
    .filter(p => p.payment_type === "formation" && p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);

  const totalPaid = inscriptionPaid + formationPaid;
  const totalDue = inscriptionAmount + formationAmount;
  const remaining = totalDue - totalPaid;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "paid") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "pending") return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  };

  const statusLabel = (s: string) =>
    s === "paid" ? "Payé" : s === "pending" ? "En attente" : "Échoué";

  const statusVariant = (s: string): "default" | "secondary" | "destructive" =>
    s === "paid" ? "default" : s === "pending" ? "secondary" : "destructive";

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const inscriptionFullyPaid = inscriptionPaid >= inscriptionAmount;
  const formationFullyPaid = formationPaid >= formationAmount;

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
        {remaining > 0 && (
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
                  <Select value={declareType} onValueChange={(v) => { setDeclareType(v); if (v === "inscription") setDeclareAmount(String(inscriptionAmount)); }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {!inscriptionFullyPaid && <SelectItem value="inscription">Inscription ({fmt(inscriptionAmount)})</SelectItem>}
                      {!formationFullyPaid && <SelectItem value="formation">Formation (montant libre)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                {declareType === "formation" && (
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
          <p className="text-sm font-bold text-yellow-600">{fmt(formationPending)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Restant</p>
          <p className={`text-sm font-bold ${remaining > 0 ? "text-destructive" : "text-green-600"}`}>{fmt(remaining)}</p>
        </div>
      </div>

      {/* Payment rows */}
      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {/* Inscription status */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <StatusIcon status={inscriptionFullyPaid ? "paid" : "pending"} />
            <div>
              <p className="text-sm font-medium text-foreground">Inscription</p>
              <p className="text-xs text-muted-foreground">{fmt(inscriptionAmount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!inscriptionFullyPaid && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                <a href={WAVE_BASE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" /> Payer
                </a>
              </Button>
            )}
            <Badge variant={statusVariant(inscriptionFullyPaid ? "paid" : "pending")}>
              {inscriptionFullyPaid ? "Payé" : "Non payé"}
            </Badge>
          </div>
        </div>

        {/* Formation status */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <StatusIcon status={formationFullyPaid ? "paid" : formationPaid > 0 ? "pending" : "failed"} />
            <div>
              <p className="text-sm font-medium text-foreground">Formation</p>
              <p className="text-xs text-muted-foreground">
                {fmt(formationPaid)} / {fmt(formationAmount)}
                {formationPaid > 0 && formationPaid < formationAmount && `, reste ${fmt(formationAmount - formationPaid)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!formationFullyPaid && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                <a href={WAVE_BASE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" /> Payer
                </a>
              </Button>
            )}
            <Badge variant={statusVariant(formationFullyPaid ? "paid" : formationPaid > 0 ? "pending" : "failed")}>
              {formationFullyPaid ? "Payé" : formationPaid > 0 ? "Partiel" : "Non payé"}
            </Badge>
          </div>
        </div>

        {/* Individual transactions */}
        {payments.length > 0 && (
          <>
            <div className="px-6 py-2 bg-secondary/50">
              <p className="text-xs font-medium text-muted-foreground">Détail des transactions</p>
            </div>
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-6 py-2.5">
                <div className="flex items-center gap-2">
                  <StatusIcon status={p.status} />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {p.payment_type === "inscription" ? "Inscription" : "Formation"} : {fmt(p.amount)}
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
            <a href={WAVE_BASE_URL} target="_blank" rel="noopener noreferrer">
              <CreditCard className="h-4 w-4" /> Effectuer un paiement via Wave
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentPaymentStatus;
