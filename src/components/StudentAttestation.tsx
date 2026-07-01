import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttestationPreview } from "@/components/AttestationTemplateEditor";
import { fetchStudentDiscount } from "@/lib/student-discount";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
        // Montant du total = total_price (grand total TTC, inscription incluse),
        // diminue de la remise code promo figee (eventuellement appliquee a l'inscription).
        const discount = await fetchStudentDiscount(user.id, cohortId);
        const totalRequired = (cohortData.formation.total_price || 50000) - discount;
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
      const imgData = canvas.toDataURL("image/png");

      // A4 paysage (297 x 210 mm) - ratio 1.414 identique au preview attestation
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // Centrage avec conservation du ratio au cas ou le preview deborderait
      const canvasRatio = canvas.width / canvas.height;
      const pageRatio = pdfW / pdfH;
      let imgX = 0, imgY = 0, imgW = pdfW, imgH = pdfH;
      if (canvasRatio > pageRatio) {
        imgH = pdfW / canvasRatio;
        imgY = (pdfH - imgH) / 2;
      } else {
        imgW = pdfH * canvasRatio;
        imgX = (pdfW - imgW) / 2;
      }

      pdf.addImage(imgData, "PNG", imgX, imgY, imgW, imgH);

      const firstName = (profile?.first_name || "").replace(/[^a-zA-Z0-9]/g, "_");
      const lastName = (profile?.last_name || "").replace(/[^a-zA-Z0-9]/g, "_");
      const formName = (formation?.name || "Formation").replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`Attestation_${firstName}_${lastName}_${formName}.pdf`);

      toast({ title: "Attestation telechargee." });
    } catch {
      toast({ title: "Erreur lors du telechargement", variant: "destructive" });
    }
    setDownloading(false);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const isEligible = attestation !== null;
  const studentName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-accent" />
        <h3 className="font-display font-semibold text-foreground">Attestation de formation</h3>
      </div>

      {isEligible ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Félicitations ! Votre attestation est disponible.</p>
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
        <div className="rounded-lg bg-secondary p-4 space-y-3">
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-4 w-4 shrink-0" /> Complétez les étapes pour débloquer votre attestation.
          </p>
          <div className="flex items-start gap-0">
            {/* Step 1: Portfolio */}
            <div className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${portfolioValidated ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-950/40 dark:border-green-600 dark:text-green-400" : "bg-card border-border text-muted-foreground"}`}>
                {portfolioValidated ? <CheckCircle2 className="h-4 w-4" /> : "1"}
              </div>
              <p className={`mt-1 text-center text-[10px] font-semibold ${portfolioValidated ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>Portfolio</p>
              {!portfolioValidated && (
                <a href="/student?tab=portfolio" className="mt-0.5 text-[10px] text-accent hover:underline">Soumettre →</a>
              )}
            </div>
            {/* Connector 1-2 */}
            <div className={`flex-1 max-w-[28px] h-0.5 mt-4 ${portfolioValidated ? "bg-green-400 dark:bg-green-600" : "bg-border"}`} />
            {/* Step 2: Paiement */}
            <div className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${paymentsComplete ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-950/40 dark:border-green-600 dark:text-green-400" : portfolioValidated ? "bg-card border-border text-muted-foreground" : "bg-card border-border/40 text-muted-foreground/40"}`}>
                {paymentsComplete ? <CheckCircle2 className="h-4 w-4" /> : "2"}
              </div>
              <p className={`mt-1 text-center text-[10px] font-semibold ${paymentsComplete ? "text-green-600 dark:text-green-400" : portfolioValidated ? "text-muted-foreground" : "text-muted-foreground/40"}`}>Paiement</p>
              {!paymentsComplete && portfolioValidated && (
                <a href="/student?tab=payments" className="mt-0.5 text-[10px] text-accent hover:underline">Payer →</a>
              )}
            </div>
            {/* Connector 2-3 */}
            <div className={`flex-1 max-w-[28px] h-0.5 mt-4 ${paymentsComplete && portfolioValidated ? "bg-green-400 dark:bg-green-600" : "bg-border"}`} />
            {/* Step 3: Admin */}
            <div className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${portfolioValidated && paymentsComplete ? "bg-card border-border text-muted-foreground" : "bg-card border-border/40 text-muted-foreground/40"}`}>
                3
              </div>
              <p className={`mt-1 text-center text-[10px] font-semibold ${portfolioValidated && paymentsComplete ? "text-muted-foreground" : "text-muted-foreground/40"}`}>Admin</p>
              {portfolioValidated && paymentsComplete && (
                <p className="mt-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">En attente…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttestation;
