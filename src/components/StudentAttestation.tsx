import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Lock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
        <div className="rounded-lg bg-secondary p-3">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Lock className="h-4 w-4" /> Attestation non disponible
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              {portfolioValidated ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-500" />}
              Portfolio validé
            </li>
            <li className="flex items-center gap-1.5">
              {paymentsComplete ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-500" />}
              Paiements complets
            </li>
            <li className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-500" />
              Attestation délivrée par l'admin
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default StudentAttestation;
