import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface StudentRow {
  user_id: string;
  first_name: string;
  last_name: string;
  portfolio_status: string | null;
  payments_total: number;
  required_total: number;
  has_attestation: boolean;
  attestation_number: string | null;
}

const AttestationIssuer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);

  const availableCohorts = cohorts;

  useEffect(() => {
    if (!selectedCohort) { setStudents([]); return; }
    const fetch = async () => {
      setLoading(true);

      // Get cohort formation for pricing
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("formation_id, formation:formations(registration_fee, total_price)")
        .eq("id", selectedCohort)
        .maybeSingle();

      const formation = cohortData?.formation as any;
      const requiredTotal = (formation?.registration_fee || 10000) + (formation?.total_price || 50000);

      // Get enrollments (students only)
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id, profiles:user_id(first_name, last_name)")
        .eq("cohort_id", selectedCohort);

      if (!enrollments) { setLoading(false); return; }

      // Filter out staff/admin
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["super_admin", "staff"]);
      const staffIds = new Set((staffRoles || []).map(r => r.user_id));
      const studentEnrollments = enrollments.filter(e => !staffIds.has(e.user_id));

      // Get portfolios
      const { data: portfolios } = await supabase
        .from("portfolios")
        .select("user_id, status")
        .eq("cohort_id", selectedCohort);

      // Get payments
      const { data: payments } = await supabase
        .from("payments")
        .select("user_id, amount, status")
        .eq("cohort_id", selectedCohort)
        .is("deleted_at", null);

      // Get existing attestations
      const { data: attestations } = await supabase
        .from("attestations")
        .select("user_id, certificate_number")
        .eq("cohort_id", selectedCohort);

      const portfolioMap = new Map((portfolios || []).map(p => [p.user_id, p.status]));
      const attestationMap = new Map((attestations || []).map(a => [a.user_id, a.certificate_number]));

      const paymentMap = new Map<string, number>();
      (payments || []).forEach(p => {
        if (p.status === "paid") {
          paymentMap.set(p.user_id, (paymentMap.get(p.user_id) || 0) + p.amount);
        }
      });

      const rows: StudentRow[] = studentEnrollments.map(e => {
        const p = e.profiles as any;
        return {
          user_id: e.user_id,
          first_name: p?.first_name || "",
          last_name: p?.last_name || "",
          portfolio_status: portfolioMap.get(e.user_id) || null,
          payments_total: paymentMap.get(e.user_id) || 0,
          required_total: requiredTotal,
          has_attestation: attestationMap.has(e.user_id),
          attestation_number: attestationMap.get(e.user_id) || null,
        };
      });

      setStudents(rows);
      setLoading(false);
    };
    fetch();
  }, [selectedCohort]);

  const handleIssue = async (studentId: string) => {
    if (!user || !selectedCohort) return;

    // Get formation_id from cohort
    const { data: cohortData } = await supabase
      .from("cohorts")
      .select("formation_id")
      .eq("id", selectedCohort)
      .maybeSingle();

    if (!cohortData?.formation_id) {
      toast({ title: "Erreur", description: "Cette cohorte n'a pas de formation associée.", variant: "destructive" });
      return;
    }

    setIssuing(studentId);
    const { error } = await supabase.from("attestations").insert({
      user_id: studentId,
      cohort_id: selectedCohort,
      formation_id: cohortData.formation_id,
      issued_by: user.id,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Attestation délivrée ! 🎓" });
      setStudents(prev => prev.map(s => s.user_id === studentId ? { ...s, has_attestation: true } : s));
    }
    setIssuing(null);
  };

  const handleIssueAll = async () => {
    const eligible = students.filter(s =>
      !s.has_attestation &&
      s.portfolio_status === "validated" &&
      s.payments_total >= s.required_total
    );

    if (eligible.length === 0) {
      toast({ title: "Aucun étudiant éligible" });
      return;
    }

    const { data: cohortData } = await supabase
      .from("cohorts")
      .select("formation_id")
      .eq("id", selectedCohort)
      .maybeSingle();

    if (!cohortData?.formation_id) {
      toast({ title: "Erreur", description: "Pas de formation associée.", variant: "destructive" });
      return;
    }

    setIssuing("all");
    const inserts = eligible.map(s => ({
      user_id: s.user_id,
      cohort_id: selectedCohort,
      formation_id: cohortData.formation_id!,
      issued_by: user!.id,
    }));

    const { error } = await supabase.from("attestations").insert(inserts);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${eligible.length} attestation(s) délivrée(s) ! 🎓` });
      setStudents(prev => prev.map(s =>
        eligible.find(e => e.user_id === s.user_id) ? { ...s, has_attestation: true } : s
      ));
    }
    setIssuing(null);
  };

  const eligibleCount = students.filter(s =>
    !s.has_attestation &&
    s.portfolio_status === "validated" &&
    s.payments_total >= s.required_total
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Send className="h-5 w-5" /> Délivrer les attestations
        </h2>
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Choisir une cohorte" /></SelectTrigger>
          <SelectContent>
            {availableCohorts.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.formation ? `— ${c.formation.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCohort ? (
        <p className="text-muted-foreground text-center py-8">Sélectionnez une cohorte pour gérer les attestations.</p>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <>
          {eligibleCount > 0 && (
            <div className="mb-4">
              <ConfirmDialog
                trigger={
                  <Button disabled={issuing === "all"} className="gap-2">
                    {issuing === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                    Délivrer toutes les attestations éligibles ({eligibleCount})
                  </Button>
                }
                title="Délivrer les attestations ?"
                description={`${eligibleCount} étudiant(s) éligible(s) recevront leur attestation. Cette action est irréversible.`}
                confirmLabel="Délivrer"
                onConfirm={handleIssueAll}
              />
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground bg-secondary/50">
                  <th className="px-4 py-3 font-medium">Étudiant</th>
                  <th className="px-4 py-3 font-medium">Portfolio</th>
                  <th className="px-4 py-3 font-medium">Paiements</th>
                  <th className="px-4 py-3 font-medium">Attestation</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const portfolioOk = s.portfolio_status === "validated";
                  const paymentOk = s.payments_total >= s.required_total;
                  const canIssue = portfolioOk && paymentOk && !s.has_attestation;

                  return (
                    <tr key={s.user_id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-3">
                        {portfolioOk ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Validé</span>
                        ) : s.portfolio_status === "pending" ? (
                          <span className="text-xs text-yellow-600">En attente</span>
                        ) : s.portfolio_status === "rejected" ? (
                          <span className="text-xs text-red-600">Rejeté</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non soumis</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${paymentOk ? "text-green-600" : "text-red-500"}`}>
                          {s.payments_total.toLocaleString("fr-FR")} / {s.required_total.toLocaleString("fr-FR")} FCFA
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.has_attestation ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> {s.attestation_number || "Délivrée"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.has_attestation ? (
                          <span className="text-xs text-muted-foreground">Déjà délivrée</span>
                        ) : canIssue ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={issuing === s.user_id}
                            onClick={() => handleIssue(s.user_id)}
                            className="gap-1 text-xs"
                          >
                            {issuing === s.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3" />}
                            Délivrer
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non éligible</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun étudiant inscrit</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AttestationIssuer;
