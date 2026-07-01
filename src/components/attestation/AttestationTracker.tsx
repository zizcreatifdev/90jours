import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle2, XCircle, Clock, AlertTriangle, Search, Download, Loader2, FileText } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { fetchPromoUsage, buildDiscountMap } from "@/lib/student-discount";

interface TrackerRow {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  cohort_name: string;
  cohort_id: string;
  formation_name: string;
  portfolio_status: string | null;
  payment_ok: boolean;
  payments_total: number;
  required_total: number;
  attestation_status: "issued" | "eligible" | "blocked";
  blocking_reasons: string[];
  certificate_number: string | null;
  issued_at: string | null;
}

const AttestationTracker = () => {
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  useEffect(() => {
    fetchAll();
  }, [cohorts]);

  const fetchAll = async () => {
    if (cohorts.length === 0) return;
    setLoading(true);

    // Get all enrollments
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("user_id, cohort_id");

    if (!enrollments) { setLoading(false); return; }

    // Filter out staff/admin
    const { data: staffRoles } = await supabase.from("user_roles").select("user_id, role").in("role", ["super_admin", "staff"]);
    const staffIds = new Set((staffRoles || []).map(r => r.user_id));
    const studentEnrollments = enrollments.filter(e => !staffIds.has(e.user_id));

    // Get profiles
    const userIds = [...new Set(studentEnrollments.map(e => e.user_id))];
    if (userIds.length === 0) { setRows([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Remise code promo figee par (etudiant, cohorte), lue depuis promo_code_usage.
    const usageRows = await fetchPromoUsage(userIds);
    const discountMap = buildDiscountMap(usageRows);

    // Get emails
    let emailMap: Record<string, string> = {};
    try {
      const { data: emailData, error: emailError } = await supabase.functions.invoke("list-user-emails");
      if (emailError) throw emailError;
      emailMap = emailData?.emails || {};
    } catch {
      toast({ title: "Emails non disponibles", description: "Impossible de charger les adresses email.", variant: "destructive" });
    }

    // Get portfolios
    const { data: portfolios } = await supabase.from("portfolios").select("user_id, cohort_id, status");
    const portfolioMap = new Map((portfolios || []).map(p => [`${p.user_id}_${p.cohort_id}`, p.status]));

    // Get payments
    const { data: payments } = await supabase.from("payments").select("user_id, cohort_id, amount, status").is("deleted_at", null);
    const paymentMap = new Map<string, number>();
    (payments || []).forEach(p => {
      if (p.status === "paid") {
        const key = `${p.user_id}_${p.cohort_id}`;
        paymentMap.set(key, (paymentMap.get(key) || 0) + p.amount);
      }
    });

    // Get attestations
    const { data: attestations } = await supabase.from("attestations").select("user_id, cohort_id, certificate_number, issued_at, status");
    const attestationMap = new Map((attestations || []).map(a => [`${a.user_id}_${a.cohort_id}`, a]));

    // Build rows
    const result: TrackerRow[] = studentEnrollments.map(e => {
      const cohort = cohorts.find(c => c.id === e.cohort_id);
      const profile = profileMap.get(e.user_id);
      const key = `${e.user_id}_${e.cohort_id}`;
      const portfolioStatus = portfolioMap.get(key) || null;
      const formation = cohort?.formation;
      // Montant du total = total_price (grand total TTC, inscription incluse),
      // diminue de la remise code promo (sur l'inscription) de cet etudiant.
      const discount = discountMap.get(key) || 0;
      const requiredTotal = (formation?.total_price || 50000) - discount;
      const paymentsTotal = paymentMap.get(key) || 0;
      const paymentOk = paymentsTotal >= requiredTotal;
      const attestation = attestationMap.get(key);

      const blockingReasons: string[] = [];
      if (portfolioStatus !== "validated") blockingReasons.push(portfolioStatus === "pending" ? "Portfolio en attente" : portfolioStatus === "rejected" ? "Portfolio rejeté" : "Portfolio non soumis");
      if (!paymentOk) blockingReasons.push(`Paiement incomplet (${paymentsTotal.toLocaleString("fr-FR")}/${requiredTotal.toLocaleString("fr-FR")})`);

      const attestationStatus: "issued" | "eligible" | "blocked" = attestation
        ? "issued"
        : blockingReasons.length === 0 ? "eligible" : "blocked";

      return {
        user_id: e.user_id,
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        email: emailMap[e.user_id] || "",
        cohort_name: cohort?.name || "",
        cohort_id: e.cohort_id,
        formation_name: formation?.name || "",
        portfolio_status: portfolioStatus,
        payment_ok: paymentOk,
        payments_total: paymentsTotal,
        required_total: requiredTotal,
        attestation_status: attestationStatus,
        blocking_reasons: blockingReasons,
        certificate_number: attestation?.certificate_number || null,
        issued_at: attestation?.issued_at || null,
      };
    });

    setRows(result);
    setLoading(false);
  };

  const filtered = rows.filter(r => {
    const matchSearch = !search || `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.attestation_status === statusFilter;
    const matchCohort = cohortFilter === "all" || r.cohort_id === cohortFilter;
    return matchSearch && matchStatus && matchCohort;
  });

  const stats = {
    total: rows.length,
    issued: rows.filter(r => r.attestation_status === "issued").length,
    eligible: rows.filter(r => r.attestation_status === "eligible").length,
    blocked: rows.filter(r => r.attestation_status === "blocked").length,
  };

  const handleExport = () => {
    exportToCsv("attestations-suivi.csv", filtered, [
      { key: "first_name", label: "Prénom" },
      { key: "last_name", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "cohort_name", label: "Cohorte" },
      { key: "formation_name", label: "Formation" },
      { key: "attestation_status", label: "Statut" },
      { key: "blocking_reasons", label: "Raisons blocage" },
      { key: "certificate_number", label: "N° Attestation" },
      { key: "issued_at", label: "Date délivrance" },
    ]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5" /> Suivi des attestations
        </h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> Exporter CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-secondary p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total étudiants</p>
        </div>
        <div className="rounded-xl bg-green-50 dark:bg-green-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
          <p className="text-xs text-green-600/70">Délivrées</p>
        </div>
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.eligible}</p>
          <p className="text-xs text-blue-600/70">Éligibles</p>
        </div>
        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.blocked}</p>
          <p className="text-xs text-orange-600/70">Bloquées</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un étudiant..." className="pl-9 bg-secondary border-0" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="issued">Délivrées</SelectItem>
            <SelectItem value="eligible">Éligibles</SelectItem>
            <SelectItem value="blocked">Bloquées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cohortFilter} onValueChange={setCohortFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Toutes cohortes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les cohortes</SelectItem>
            {cohorts.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} {c.formation ? `(${c.formation.name})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground bg-secondary/50">
                <th className="px-4 py-3 font-medium">Étudiant</th>
                <th className="px-4 py-3 font-medium">Cohorte</th>
                <th className="px-4 py-3 font-medium">Portfolio</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Détails</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={`${r.user_id}_${r.cohort_id}`} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.first_name} {r.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-foreground">{r.cohort_name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.formation_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.portfolio_status === "validated" ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Validé
                      </Badge>
                    ) : r.portfolio_status === "pending" ? (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-[10px]">
                        <Clock className="h-3 w-3 mr-1" /> En attente
                      </Badge>
                    ) : r.portfolio_status === "rejected" ? (
                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" /> Rejeté
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Non soumis</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${r.payment_ok ? "text-green-600" : "text-orange-500"}`}>
                      {r.payments_total.toLocaleString("fr-FR")} / {r.required_total.toLocaleString("fr-FR")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.attestation_status === "issued" ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Délivrée
                      </Badge>
                    ) : r.attestation_status === "eligible" ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-[10px]">
                        <Award className="h-3 w-3 mr-1" /> Éligible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Bloquée
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.attestation_status === "issued" ? (
                      <div>
                        <p className="text-[10px] text-muted-foreground font-mono">{r.certificate_number}</p>
                        {r.issued_at && <p className="text-[9px] text-muted-foreground">{new Date(r.issued_at).toLocaleDateString("fr-FR")}</p>}
                      </div>
                    ) : r.blocking_reasons.length > 0 ? (
                      <div className="space-y-0.5">
                        {r.blocking_reasons.map((reason, j) => (
                          <p key={j} className="text-[10px] text-orange-600">{reason}</p>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun résultat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttestationTracker;
