import { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { fetchPromoUsage, buildDiscountMap } from "@/lib/student-discount";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, CheckCircle2, XCircle, Loader2, Send, Archive } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DEFAULT_TEMPLATE } from "@/components/attestation/types";
import type { AttestationTemplate, TemplateElement } from "@/components/attestation/types";

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function lightenColor(hex: string, amount: number): string {
  const cleaned = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return hex;
  const num = parseInt(cleaned, 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function replaceVars(
  text: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    text
  );
}

async function renderAttestationToDataUrl(
  template: AttestationTemplate,
  vars: Record<string, string>
): Promise<string> {
  const W = template.width || 842;
  const H = template.height || 595;
  const primaryColor = template.primaryColor || "#1a1a2e";

  // Off-screen container
  const container = document.createElement("div");
  container.style.cssText = [
    `position:absolute`,
    `left:-20000px`,
    `top:-20000px`,
    `width:${W}px`,
    `height:${H}px`,
    `background-color:${template.backgroundColor || "#ffffff"}`,
    `font-family:Georgia,'Times New Roman',serif`,
    `overflow:hidden`,
  ].join(";");

  const imagePromises: Promise<void>[] = [];

  // Sort: background images first, then patterns, then text
  const sorted = [...template.elements].sort((a: TemplateElement, b: TemplateElement) => {
    const rankA = a.type === "image" && a.isBackground ? 0 : a.type === "pattern" ? 1 : 2;
    const rankB = b.type === "image" && b.isBackground ? 0 : b.type === "pattern" ? 1 : 2;
    return rankA - rankB;
  });

  for (const el of sorted) {
    const div = document.createElement("div");
    div.style.cssText = [
      `position:absolute`,
      `left:${el.x}%`,
      `top:${el.y}%`,
      `width:${el.width}%`,
      `height:${el.height}%`,
    ].join(";");

    if (el.type === "pattern") {
      const color = el.patternColor || primaryColor;
      if (el.patternType === "topBand" || el.patternType === "bottomBand") {
        div.style.background = `linear-gradient(135deg,${color},${lightenColor(color, 60)})`;
      }
    } else if (el.type === "image") {
      div.style.opacity = String((el.opacity ?? 100) / 100);
      if (el.src) {
        const img = document.createElement("img");
        img.src = el.src;
        img.crossOrigin = "anonymous";
        img.style.cssText = `width:100%;height:100%;object-fit:${el.isBackground ? "cover" : "contain"}`;
        div.appendChild(img);
        imagePromises.push(
          new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        );
      }
    } else if (el.type === "text") {
      const isBadge = el.id === "formationBadge";
      if (isBadge) {
        Object.assign(div.style, {
          backgroundColor: primaryColor,
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
      }
      const p = document.createElement("p");
      const justifyMap: Record<string, string> = {
        center: "center",
        right: "flex-end",
        left: "flex-start",
      };
      p.style.cssText = [
        `font-size:${el.fontSize || 12}px`,
        `font-weight:${el.fontWeight || "normal"}`,
        `font-style:${el.fontStyle || "normal"}`,
        `text-align:${el.textAlign || "left"}`,
        `color:${isBadge ? "#fff" : (el.color || "#000")}`,
        `line-height:1.4`,
        `margin:0`,
        `overflow:hidden`,
        `width:100%`,
        `height:100%`,
        `display:flex`,
        `align-items:center`,
        `justify-content:${justifyMap[el.textAlign || "left"] || "flex-start"}`,
        `font-family:Georgia,'Times New Roman',serif`,
      ].join(";");
      p.textContent = replaceVars(el.content || "", vars);
      div.appendChild(p);
    }

    container.appendChild(div);
  }

  document.body.appendChild(container);

  try {
    await Promise.all(imagePromises);

    const canvas = await html2canvas(container, {
      width: W,
      height: H,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: template.backgroundColor || "#ffffff",
      logging: false,
    });

    return canvas.toDataURL("image/png");
  } finally {
    document.body.removeChild(container);
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

const AttestationIssuer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [deliverableLabel, setDeliverableLabel] = useState("Portfolio");

  const availableCohorts = cohorts;

  useEffect(() => {
    if (!selectedCohort) { setStudents([]); return; }
    const fetch = async () => {
      setLoading(true);

      // Get cohort formation for pricing
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("formation_id, formation:formations(total_price, deliverable_label)")
        .eq("id", selectedCohort)
        .maybeSingle();

      const formation = cohortData?.formation as any;
      // Montant du total = total_price (grand total TTC, inscription incluse).
      const requiredTotal = formation?.total_price || 50000;
      setDeliverableLabel(formation?.deliverable_label || "Portfolio");

      // Get enrollments (students only)
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("cohort_id", selectedCohort);

      if (!enrollments) { setLoading(false); return; }

      // Filter out staff/admin
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["super_admin", "staff"]);
      const staffIds = new Set((staffRoles || []).map(r => r.user_id));
      const studentEnrollments = enrollments.filter(e => !staffIds.has(e.user_id));

      // Pas de FK enrollments -> profiles : jointure cote client via Map sur user_id
      const studentIds = [...new Set(studentEnrollments.map(e => e.user_id).filter(Boolean))];
      let profileMap = new Map<string, { first_name: string; last_name: string }>();
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", studentIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, { first_name: p.first_name, last_name: p.last_name }]));
      }

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

      // Remise code promo figee par etudiant (sur l'inscription) : le seuil de
      // paiement complet est diminue d'autant, sinon un remise n'atteint jamais 100%.
      const usageRows = (await fetchPromoUsage(studentIds)).filter(r => r.cohort_id === selectedCohort);
      const discountMap = buildDiscountMap(usageRows);

      const rows: StudentRow[] = studentEnrollments.map(e => {
        const p = profileMap.get(e.user_id);
        const discount = discountMap.get(`${e.user_id}_${selectedCohort}`) || 0;
        return {
          user_id: e.user_id,
          first_name: p?.first_name || "",
          last_name: p?.last_name || "",
          portfolio_status: portfolioMap.get(e.user_id) || null,
          payments_total: paymentMap.get(e.user_id) || 0,
          required_total: requiredTotal - discount,
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
      toast({ title: "Attestation délivrée." });
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
      toast({ title: `${eligible.length} attestation(s) délivrée(s).` });
      setStudents(prev => prev.map(s =>
        eligible.find(e => e.user_id === s.user_id) ? { ...s, has_attestation: true } : s
      ));
    }
    setIssuing(null);
  };

  const exportBatchPdf = async () => {
    const studentsToExport = students.filter(s => s.has_attestation);
    if (studentsToExport.length === 0) {
      toast({ title: "Aucune attestation à exporter" });
      return;
    }

    // Fetch full cohort + formation template data
    const { data: cohortFull } = await supabase
      .from("cohorts")
      .select("name, start_date, end_date, formation:formations(name, attestation_template, attestation_logo_url, attestation_signature_url, attestation_stamp_url, attestation_color)")
      .eq("id", selectedCohort)
      .maybeSingle();

    if (!cohortFull) {
      toast({ title: "Erreur", description: "Impossible de charger les données de la cohorte.", variant: "destructive" });
      return;
    }

    const formation = cohortFull.formation as any;

    // Build resolved template (mirrors AttestationDragDropEditor.loadTemplate)
    let template: AttestationTemplate;
    const rawTemplate = formation?.attestation_template as AttestationTemplate | null;
    if (rawTemplate) {
      const elements = rawTemplate.elements.map(el => {
        if (el.type === "image" && !el.src) {
          if (el.id === "logo" && formation.attestation_logo_url) return { ...el, src: formation.attestation_logo_url };
          if (el.id === "signature" && formation.attestation_signature_url) return { ...el, src: formation.attestation_signature_url };
          if (el.id === "stamp" && formation.attestation_stamp_url) return { ...el, src: formation.attestation_stamp_url };
        }
        return el;
      });
      template = { ...rawTemplate, elements };
    } else {
      template = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as AttestationTemplate;
      if (formation?.attestation_color) template.primaryColor = formation.attestation_color;
      template.elements = template.elements.map(el => {
        if (el.id === "logo" && formation?.attestation_logo_url) return { ...el, src: formation.attestation_logo_url };
        if (el.id === "signature" && formation?.attestation_signature_url) return { ...el, src: formation.attestation_signature_url };
        if (el.id === "stamp" && formation?.attestation_stamp_url) return { ...el, src: formation.attestation_stamp_url };
        return el;
      });
    }

    const formationName = formation?.name || "";
    const fmtDate = (d: string | null) =>
      d ? new Date(d).toLocaleDateString("fr-FR") : "";
    const today = new Date().toLocaleDateString("fr-FR");

    setExportProgress({ current: 0, total: studentsToExport.length });

    const zip = new JSZip();

    for (let i = 0; i < studentsToExport.length; i++) {
      const s = studentsToExport[i];
      setExportProgress({ current: i + 1, total: studentsToExport.length });

      try {
        const vars: Record<string, string> = {
          student_name: `${s.first_name} ${s.last_name}`,
          formation_name: formationName,
          start_date: fmtDate(cohortFull.start_date),
          end_date: fmtDate(cohortFull.end_date),
          current_date: today,
          certificate_number: s.attestation_number || "",
        };

        const dataUrl = await renderAttestationToDataUrl(template, vars);
        const base64 = dataUrl.split(",")[1];
        const safeName = `${s.first_name}_${s.last_name}`.replace(/[^a-zA-Z0-9]/g, "_");
        zip.file(`${safeName}_attestation.png`, base64, { base64: true });
      } catch (err: unknown) {
        console.error(
          `Erreur attestation ${s.first_name} ${s.last_name}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const cohortName = availableCohorts.find(c => c.id === selectedCohort)?.name || "cohorte";
    const safeCohort = cohortName.replace(/[^a-zA-Z0-9]/g, "_");
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attestations_${safeCohort}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    setExportProgress(null);
    toast({ title: `${studentsToExport.length} attestation(s) exportée(s) dans le ZIP !` });
  };

  const eligibleCount = students.filter(s =>
    !s.has_attestation &&
    s.portfolio_status === "validated" &&
    s.payments_total >= s.required_total
  ).length;

  const attestationCount = students.filter(s => s.has_attestation).length;

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
                {c.name} {c.formation ? `(${c.formation.name})` : ""}
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
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {eligibleCount > 0 && (
              <ConfirmDialog
                trigger={
                  <Button disabled={issuing === "all" || exportProgress !== null} className="gap-2">
                    {issuing === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                    Délivrer toutes les attestations éligibles ({eligibleCount})
                  </Button>
                }
                title="Délivrer les attestations ?"
                description={`${eligibleCount} étudiant(s) éligible(s) recevront leur attestation. Cette action est irréversible.`}
                confirmLabel="Délivrer"
                onConfirm={handleIssueAll}
              />
            )}

            {attestationCount > 0 && (
              <Button
                variant="outline"
                disabled={exportProgress !== null || issuing !== null}
                onClick={exportBatchPdf}
                className="gap-2"
              >
                {exportProgress !== null ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération {exportProgress.current}/{exportProgress.total} attestations…
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Exporter toute la cohorte (ZIP)
                  </>
                )}
              </Button>
            )}
          </div>

          {exportProgress !== null && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Génération {exportProgress.current}/{exportProgress.total} attestations…
              </p>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-2 rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground bg-secondary/50">
                  <th className="px-4 py-3 font-medium">Étudiant</th>
                  <th className="px-4 py-3 font-medium">{deliverableLabel}</th>
                  <th className="px-4 py-3 font-medium">Paiement</th>
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Validé
                          </span>
                        ) : s.portfolio_status === "pending" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                            En attente
                          </span>
                        ) : s.portfolio_status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                            <XCircle className="h-3 w-3" /> Rejeté
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-xs font-medium">
                            Non soumis
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          paymentOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {paymentOk ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {s.payments_total.toLocaleString("fr-FR")} / {s.required_total.toLocaleString("fr-FR")} FCFA
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.has_attestation ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> {s.attestation_number || "Délivrée"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
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
                          <span className="text-xs text-red-500">
                            {!portfolioOk && !paymentOk
                              ? `${deliverableLabel} non validé, paiement incomplet`
                              : !portfolioOk
                              ? `${deliverableLabel} non validé`
                              : "Paiement incomplet"}
                          </span>
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
