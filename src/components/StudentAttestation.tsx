import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Lock, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttestationPreview } from "@/components/AttestationTemplateEditor";
import html2canvas from "html2canvas";

interface StudentAttestationProps {
  cohortId: string;
}

const StudentAttestation = ({ cohortId }: StudentAttestationProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [attestation, setAttestation] = useState<any>(null);
  const [formation, setFormation] = useState<any>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [portfolioValidated, setPortfolioValidated] = useState(false);
  const [paymentsComplete, setPaymentsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !cohortId) return;
    const fetchAll = async () => {
      // Fetch cohort with formation
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("*, formation:formations(*)")
        .eq("id", cohortId)
        .maybeSingle();
      
      if (cohortData) {
        setCohort(cohortData);
        setFormation(cohortData.formation);
      }

      // Fetch attestation
      const { data: attData } = await supabase
        .from("attestations")
        .select("*")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .maybeSingle();
      if (attData) setAttestation(attData);

      // Check portfolio
      const { data: portfolioData } = await supabase
        .from("portfolios")
        .select("status")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .maybeSingle();
      setPortfolioValidated(portfolioData?.status === "validated");

      // Check payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .is("deleted_at", null);

      if (paymentsData && cohortData?.formation) {
        const totalRequired = (cohortData.formation.registration_fee || 10000) + (cohortData.formation.total_price || 50000);
        const totalPaid = paymentsData
          .filter((p: any) => p.status === "paid")
          .reduce((sum: number, p: any) => sum + p.amount, 0);
        setPaymentsComplete(totalPaid >= totalRequired);
      }

      setLoading(false);
    };
    fetchAll();
  }, [user, cohortId]);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `attestation-${cohort?.name || "formation"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Attestation téléchargée ! 🎓" });
    } catch {
      toast({ title: "Erreur lors du téléchargement", variant: "destructive" });
    }
    setDownloading(false);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const isEligible = attestation !== null;
  const studentName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-accent" />
        <h3 className="font-display font-semibold text-foreground">Attestation de formation</h3>
      </div>

      {isEligible ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">🎓 Félicitations ! Votre attestation est disponible.</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">N° {attestation.certificate_number}</p>
          </div>

          {/* Preview */}
          <div ref={previewRef}>
            <AttestationPreview
              title={formation?.attestation_title || "Attestation de participation"}
              body={formation?.attestation_body || ""}
              color={formation?.attestation_color || "#1a1a2e"}
              logoUrl={formation?.attestation_logo_url || ""}
              signatureUrl={formation?.attestation_signature_url || ""}
              stampUrl={formation?.attestation_stamp_url || ""}
              studentName={studentName}
              formationName={formation?.name || "Formation"}
              startDate={cohort ? fmt(cohort.start_date) : ""}
              endDate={cohort ? fmt(cohort.end_date) : ""}
              certificateNumber={attestation.certificate_number}
            />
          </div>

          <Button onClick={handleDownload} disabled={downloading} className="w-full">
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Télécharger l'attestation
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0 text-amber-500" />
            <span>3 étapes pour débloquer votre attestation</span>
          </div>

          {/* Step 1: Portfolio */}
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
            portfolioValidated
              ? "border-green-200 bg-green-50/60 dark:border-green-800/40 dark:bg-green-950/20"
              : "border-border bg-secondary/40"
          }`}>
            {portfolioValidated
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              : <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/40" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${portfolioValidated ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
                Portfolio soumis et validé
              </p>
              {!portfolioValidated && (
                <p className="text-xs text-muted-foreground">Envoyez l'URL de votre portfolio au formateur</p>
              )}
            </div>
            {!portfolioValidated && (
              <a href="/student?tab=portfolio" className="shrink-0 text-xs font-medium text-accent hover:underline">
                Soumettre →
              </a>
            )}
          </div>

          {/* Step 2: Paiements */}
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
            paymentsComplete
              ? "border-green-200 bg-green-50/60 dark:border-green-800/40 dark:bg-green-950/20"
              : portfolioValidated
                ? "border-border bg-secondary/40"
                : "border-border/40 bg-secondary/20 opacity-50"
          }`}>
            {paymentsComplete
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              : <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/40" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${paymentsComplete ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
                Formation entièrement réglée
              </p>
              {!paymentsComplete && portfolioValidated && (
                <p className="text-xs text-muted-foreground">Solde de formation en attente de validation</p>
              )}
            </div>
            {!paymentsComplete && portfolioValidated && (
              <a href="/student?tab=payments" className="shrink-0 text-xs font-medium text-accent hover:underline">
                Paiements →
              </a>
            )}
          </div>

          {/* Step 3: Génération admin */}
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
            portfolioValidated && paymentsComplete
              ? "border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20"
              : "border-border/40 bg-secondary/20 opacity-50"
          }`}>
            {portfolioValidated && paymentsComplete
              ? <Clock className="h-5 w-5 shrink-0 text-amber-500 animate-pulse" />
              : <Clock className="h-5 w-5 shrink-0 text-muted-foreground/30" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${portfolioValidated && paymentsComplete ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
                Génération par l'équipe
              </p>
              <p className="text-xs text-muted-foreground">
                {portfolioValidated && paymentsComplete
                  ? "Votre dossier est complet — l'attestation sera générée prochainement"
                  : "Complétez les étapes précédentes"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttestation;
