import { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCohorts } from "@/hooks/use-cohorts";
import { fetchPromoUsage, buildDiscountMap } from "@/lib/student-discount";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, CheckCircle2, XCircle, Loader2, Send, Archive, Eye } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_TEMPLATE } from "@/components/attestation/types";
import type { AttestationTemplate, TemplateElement } from "@/components/attestation/types";
import { AttestationPreview } from "@/components/AttestationTemplateEditor";

interface StudentRow {
  user_id: string;
  first_name: string;
  last_name: string;
  portfolio_status: string | null;
  payments_total: number;
  required_total: number;
  has_attestation: boolean;
  attestation_number: string | null;
  issued_at: string | null;
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

function calcDuration(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return "";
  const days = Math.round(
    (new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime())
    / (1000 * 60 * 60 * 24)
  );
  return `${days} jours`;
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
      scale: 3,
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

async function loadCohortFullData(cohortId: string) {
  const { data } = await supabase
    .from("cohorts")
    .select("name, start_date, end_date, cohort_type, formation:formations(name, attestation_template, attestation_logo_url, attestation_signature_url, attestation_stamp_url, attestation_color, attestation_title, attestation_body)")
    .eq("id", cohortId)
    .maybeSingle();
  return data;
}

function buildTemplate(cohortFull: NonNullable<Awaited<ReturnType<typeof loadCohortFullData>>>): AttestationTemplate {
  const formation = cohortFull.formation as any;
  const rawTemplate = formation?.attestation_template as AttestationTemplate | null;
  if (rawTemplate) {
    const elements = rawTemplate.elements.map((el: TemplateElement) => {
      if (el.type === "image" && !el.src) {
        if (el.id === "logo" && formation.attestation_logo_url) return { ...el, src: formation.attestation_logo_url };
        if (el.id === "signature" && formation.attestation_signature_url) return { ...el, src: formation.attestation_signature_url };
        if (el.id === "stamp" && formation.attestation_stamp_url) return { ...el, src: formation.attestation_stamp_url };
      }
      return el;
    });
    return { ...rawTemplate, elements };
  }
  const template = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as AttestationTemplate;
  if (formation?.attestation_color) template.primaryColor = formation.attestation_color;
  template.elements = template.elements.map((el: TemplateElement) => {
    if (el.id === "logo" && formation?.attestation_logo_url) return { ...el, src: formation.attestation_logo_url };
    if (el.id === "signature" && formation?.attestation_signature_url) return { ...el, src: formation.attestation_signature_url };
    if (el.id === "stamp" && formation?.attestation_stamp_url) return { ...el, src: formation.attestation_stamp_url };
    return el;
  });
  return template;
}

async function storePdf(
  template: AttestationTemplate,
  vars: Record<string, string>,
  userId: string,
  cohortId: string
): Promise<string | null> {
  try {
    const dataUrl = await renderAttestationToDataUrl(template, vars);
    const pdfDoc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdfDoc.addImage(dataUrl, "PNG", 0, 0, 297, 210);
    const pdfBlob = pdfDoc.output("blob");

    const path = `${cohortId}/${userId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("attestations")
      .upload(path, pdfBlob, { upsert: true, contentType: "application/pdf" });

    if (uploadError) {
      console.error("PDF upload:", uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from("attestations").getPublicUrl(path);
    await supabase
      .from("attestations")
      .update({ pdf_url: urlData.publicUrl } as any)
      .eq("user_id", userId)
      .eq("cohort_id", cohortId);

    return urlData.publicUrl;
  } catch (err) {
    console.error("PDF generation:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

const AttestationIssuer = () => {
  const { user, isOwner } = useAuth();
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [deliverableLabel, setDeliverableLabel] = useState("Portfolio");
  const [previewStudent, setPreviewStudent] = useState<StudentRow | null>(null);
  const [cohortFullData, setCohortFullData] = useState<Awaited<ReturnType<typeof loadCohortFullData>> | null>(null);

  const availableCohorts = cohorts;

  useEffect(() => {
    if (!selectedCohort) { setStudents([]); setCohortFullData(null); return; }
    const fetch = async () => {
      setLoading(true);
      setCohortFullData(null);

      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("formation_id, total_price, formation:formations(total_price, deliverable_label)")
        .eq("id", selectedCohort)
        .maybeSingle();

      const formation = cohortData?.formation as any;
      const requiredTotal = (cohortData?.total_price ?? formation?.total_price) || 50000;
      setDeliverableLabel(formation?.deliverable_label || "Portfolio");

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("cohort_id", selectedCohort);

      if (!enrollments) { setLoading(false); return; }

      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["super_admin", "staff"]);
      const staffIds = new Set((staffRoles || []).map(r => r.user_id));
      const studentEnrollments = enrollments.filter(e => !staffIds.has(e.user_id));

      const studentIds = [...new Set(studentEnrollments.map(e => e.user_id).filter(Boolean))];
      let profileMap = new Map<string, { first_name: string; last_name: string }>();
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", studentIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, { first_name: p.first_name, last_name: p.last_name }]));
      }

      const { data: portfolios } = await supabase
        .from("portfolios")
        .select("user_id, status")
        .eq("cohort_id", selectedCohort);

      const { data: payments } = await supabase
        .from("payments")
        .select("user_id, amount, status")
        .eq("cohort_id", selectedCohort)
        .is("deleted_at", null);

      const { data: attestations } = await supabase
        .from("attestations")
        .select("user_id, certificate_number, issued_at")
        .eq("cohort_id", selectedCohort);

      const portfolioMap = new Map((portfolios || []).map(p => [p.user_id, p.status]));
      const attestationMap = new Map(
        (attestations || []).map(a => [
          a.user_id,
          { certificate_number: a.certificate_number, issued_at: a.issued_at },
        ])
      );

      const paymentMap = new Map<string, number>();
      (payments || []).forEach(p => {
        if (p.status === "paid") {
          paymentMap.set(p.user_id, (paymentMap.get(p.user_id) || 0) + p.amount);
        }
      });

      const usageRows = (await fetchPromoUsage(studentIds)).filter(r => r.cohort_id === selectedCohort);
      const discountMap = buildDiscountMap(usageRows);

      const rows: StudentRow[] = studentEnrollments.map(e => {
        const p = profileMap.get(e.user_id);
        const discount = discountMap.get(`${e.user_id}_${selectedCohort}`) || 0;
        const attInfo = attestationMap.get(e.user_id);
        return {
          user_id: e.user_id,
          first_name: p?.first_name || "",
          last_name: p?.last_name || "",
          portfolio_status: portfolioMap.get(e.user_id) || null,
          payments_total: paymentMap.get(e.user_id) || 0,
          required_total: requiredTotal - discount,
          has_attestation: attestationMap.has(e.user_id),
          attestation_number: attInfo?.certificate_number || null,
          issued_at: attInfo?.issued_at || null,
        };
      });

      setStudents(rows);

      const fullData = await loadCohortFullData(selectedCohort);
      setCohortFullData(fullData);

      setLoading(false);
    };
    fetch();
  }, [selectedCohort]);

  const handleIssue = async (studentId: string) => {
    if (!user || !selectedCohort) return;

    const { data: cohortData } = await supabase
      .from("cohorts")
      .select("formation_id")
      .eq("id", selectedCohort)
      .maybeSingle();

    if (!cohortData?.formation_id) {
      toast({ title: "Erreur", description: "Cette cohorte n'a pas de formation associee.", variant: "destructive" });
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
      setIssuing(null);
      return;
    }

    // Lire la ligne creee pour obtenir issued_at et certificate_number (generes par DB)
    const { data: newAtt } = await supabase
      .from("attestations")
      .select("certificate_number, issued_at")
      .eq("user_id", studentId)
      .eq("cohort_id", selectedCohort)
      .maybeSingle();

    const certNumber = newAtt?.certificate_number || null;
    const issuedAt = newAtt?.issued_at || new Date().toISOString();

    setStudents(prev =>
      prev.map(s =>
        s.user_id === studentId
          ? { ...s, has_attestation: true, attestation_number: certNumber, issued_at: issuedAt }
          : s
      )
    );

    await supabase.from("notifications").insert({
      user_id: studentId,
      cohort_id: selectedCohort,
      type: "attestation",
      title: "Votre attestation est disponible",
      message: "Votre attestation de formation est prete. Vous pouvez la telecharger depuis votre espace.",
      created_by: user.id,
    });
    await supabase.from("audit_logs").insert({
      performed_by: user.id,
      action: "attestation_issued",
      target_user_id: studentId,
      details: { cohort_id: selectedCohort },
    });

    toast({ title: "Attestation delivree. Generation du PDF..." });

    // Generer et stocker le PDF immutable avec la date d'emission
    const student = students.find(s => s.user_id === studentId);
    if (student) {
      const cohortFull = await loadCohortFullData(selectedCohort);
      if (cohortFull) {
        const template = buildTemplate(cohortFull);
        const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
        const issuedDate = new Date(issuedAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const cohortTypeLabel = (cohortFull as any)?.cohort_type === "initiation" ? "Initiation" : "Perfectionnement";
        await storePdf(
          template,
          {
            student_name: `${student.first_name} ${student.last_name}`,
            formation_name: (cohortFull.formation as any)?.name || "",
            cohort_type_label: cohortTypeLabel,
            duration: calcDuration(cohortFull.start_date, cohortFull.end_date),
            start_date: fmtDate(cohortFull.start_date),
            end_date: fmtDate(cohortFull.end_date),
            current_date: issuedDate,
            certificate_number: certNumber || "",
          },
          studentId,
          selectedCohort
        );
      }
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
      toast({ title: "Aucun etudiant eligible" });
      return;
    }

    const { data: cohortData } = await supabase
      .from("cohorts")
      .select("formation_id")
      .eq("id", selectedCohort)
      .maybeSingle();

    if (!cohortData?.formation_id) {
      toast({ title: "Erreur", description: "Pas de formation associee.", variant: "destructive" });
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
      setIssuing(null);
      return;
    }

    // Lire les attestations creees pour obtenir issued_at et certificate_number
    const { data: newAtts } = await supabase
      .from("attestations")
      .select("user_id, certificate_number, issued_at")
      .eq("cohort_id", selectedCohort)
      .in("user_id", eligible.map(s => s.user_id));

    const attMap = new Map((newAtts || []).map(a => [a.user_id, a]));

    setStudents(prev =>
      prev.map(s => {
        const att = attMap.get(s.user_id);
        return att
          ? { ...s, has_attestation: true, attestation_number: att.certificate_number, issued_at: att.issued_at }
          : s;
      })
    );

    toast({ title: `${eligible.length} attestation(s) delivree(s). Generation des PDFs...` });

    const notifRows = eligible.map(s => ({
      user_id: s.user_id,
      cohort_id: selectedCohort,
      type: "attestation",
      title: "Votre attestation est disponible",
      message: "Votre attestation de formation est prete. Vous pouvez la telecharger depuis votre espace.",
      created_by: user!.id,
    }));
    await supabase.from("notifications").insert(notifRows);
    await supabase.from("audit_logs").insert({
      performed_by: user!.id,
      action: "attestation_issued",
      details: { cohort_id: selectedCohort, count: eligible.length, student_ids: eligible.map(s => s.user_id) },
    });

    // Generer et stocker les PDFs avec progression
    const cohortFull = await loadCohortFullData(selectedCohort);
    if (cohortFull) {
      const template = buildTemplate(cohortFull);
      const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
      const cohortTypeLabel = (cohortFull as any)?.cohort_type === "initiation" ? "Initiation" : "Perfectionnement";
      const durationAll = calcDuration(cohortFull.start_date, cohortFull.end_date);
      setExportProgress({ current: 0, total: eligible.length });

      for (let i = 0; i < eligible.length; i++) {
        const s = eligible[i];
        setExportProgress({ current: i + 1, total: eligible.length });
        const att = attMap.get(s.user_id);
        if (att) {
          const issuedDate = new Date(att.issued_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          await storePdf(
            template,
            {
              student_name: `${s.first_name} ${s.last_name}`,
              formation_name: (cohortFull.formation as any)?.name || "",
              cohort_type_label: cohortTypeLabel,
              duration: durationAll,
              start_date: fmtDate(cohortFull.start_date),
              end_date: fmtDate(cohortFull.end_date),
              current_date: issuedDate,
              certificate_number: att.certificate_number || "",
            },
            s.user_id,
            selectedCohort
          );
        }
      }

      setExportProgress(null);
    }

    setIssuing(null);
  };

  const exportBatchPdf = async () => {
    const studentsToExport = students.filter(s => s.has_attestation);
    if (studentsToExport.length === 0) {
      toast({ title: "Aucune attestation a exporter" });
      return;
    }

    const cohortFull = await loadCohortFullData(selectedCohort);
    if (!cohortFull) {
      toast({ title: "Erreur", description: "Impossible de charger les donnees de la cohorte.", variant: "destructive" });
      return;
    }

    const template = buildTemplate(cohortFull);
    const formation = cohortFull.formation as any;
    const formationName = formation?.name || "";
    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
    const cohortTypeLabel = (cohortFull as any)?.cohort_type === "initiation" ? "Initiation" : "Perfectionnement";
    const durationExport = calcDuration(cohortFull.start_date, cohortFull.end_date);

    setExportProgress({ current: 0, total: studentsToExport.length });

    const zip = new JSZip();

    for (let i = 0; i < studentsToExport.length; i++) {
      const s = studentsToExport[i];
      setExportProgress({ current: i + 1, total: studentsToExport.length });

      try {
        // Utiliser issued_at stocke en base (date d'emission officielle, pas la date du jour)
        const issuedDate = s.issued_at
          ? new Date(s.issued_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : fmtDate(null);

        const vars: Record<string, string> = {
          student_name: `${s.first_name} ${s.last_name}`,
          formation_name: formationName,
          cohort_type_label: cohortTypeLabel,
          duration: durationExport,
          start_date: fmtDate(cohortFull.start_date),
          end_date: fmtDate(cohortFull.end_date),
          current_date: issuedDate,
          certificate_number: s.attestation_number || "",
        };

        const dataUrl = await renderAttestationToDataUrl(template, vars);
        const pdfDoc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        pdfDoc.addImage(dataUrl, "PNG", 0, 0, 297, 210);
        const safeName = `${s.first_name}_${s.last_name}`.replace(/[^a-zA-Z0-9]/g, "_");
        zip.file(`${safeName}_attestation.pdf`, pdfDoc.output("blob"));
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
    toast({ title: `${studentsToExport.length} attestation(s) exportee(s) dans le ZIP !` });
  };

  const handleRevoke = async (userId: string) => {
    if (!user || !selectedCohort) return;
    const { error } = await supabase
      .from("attestations")
      .delete()
      .eq("user_id", userId)
      .eq("cohort_id", selectedCohort);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from("attestations").remove([`${selectedCohort}/${userId}.pdf`]);
    await supabase.from("audit_logs").insert({
      performed_by: user.id,
      action: "attestation_revoked",
      target_user_id: userId,
      details: { cohort_id: selectedCohort },
    });
    setStudents(prev =>
      prev.map(s =>
        s.user_id === userId
          ? { ...s, has_attestation: false, attestation_number: null, issued_at: null }
          : s
      )
    );
    toast({ title: "Attestation revoquee." });
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
          <Send className="h-5 w-5" /> Delivrer les attestations
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
        <p className="text-muted-foreground text-center py-8">Selectionnez une cohorte pour gerer les attestations.</p>
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
                    Delivrer toutes les attestations eligibles ({eligibleCount})
                  </Button>
                }
                title="Delivrer les attestations ?"
                description={`${eligibleCount} etudiant(s) eligible(s) recevront leur attestation. Cette action est irreversible.`}
                confirmLabel="Delivrer"
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
                    Generation {exportProgress.current}/{exportProgress.total} attestations...
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
                Generation {exportProgress.current}/{exportProgress.total} attestations...
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
                  <th className="px-4 py-3 font-medium">Etudiant</th>
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
                            <CheckCircle2 className="h-3 w-3" /> Valide
                          </span>
                        ) : s.portfolio_status === "pending" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                            En attente
                          </span>
                        ) : s.portfolio_status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                            <XCircle className="h-3 w-3" /> Rejete
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
                            <CheckCircle2 className="h-3 w-3" /> {s.attestation_number || "Delivree"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Apercu : visible si eligible ou deja delivree */}
                          {(s.has_attestation || canIssue) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Apercu"
                              onClick={() => setPreviewStudent(s)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Delivrer ou statut */}
                          {s.has_attestation ? (
                            <span className="text-xs text-muted-foreground">Delivree</span>
                          ) : canIssue ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={issuing === s.user_id || exportProgress !== null}
                              onClick={() => handleIssue(s.user_id)}
                              className="gap-1 text-xs"
                            >
                              {issuing === s.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3" />}
                              Delivrer
                            </Button>
                          ) : (
                            <span className="text-xs text-red-500">
                              {!portfolioOk && !paymentOk
                                ? `${deliverableLabel} non valide, paiement incomplet`
                                : !portfolioOk
                                ? `${deliverableLabel} non valide`
                                : "Paiement incomplet"}
                            </span>
                          )}
                          {/* Revoquer : owner uniquement, attestation delivree */}
                          {isOwner && s.has_attestation && (
                            <ConfirmDialog
                              trigger={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  title="Revoquer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              }
                              title="Revoquer l'attestation ?"
                              description={`Revoquer l'attestation de ${s.first_name} ${s.last_name} ? Cette action est irreversible.`}
                              confirmLabel="Revoquer"
                              variant="destructive"
                              onConfirm={() => handleRevoke(s.user_id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun etudiant inscrit</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog apercu attestation */}
      <Dialog open={previewStudent !== null} onOpenChange={(open) => { if (!open) setPreviewStudent(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              Apercu de l'attestation
              {previewStudent && ` — ${previewStudent.first_name} ${previewStudent.last_name}`}
            </DialogTitle>
          </DialogHeader>
          {previewStudent && cohortFullData ? (
            <AttestationPreview
              title={(cohortFullData.formation as any)?.attestation_title || "Attestation de Formation"}
              body={(cohortFullData.formation as any)?.attestation_body || ""}
              color={(cohortFullData.formation as any)?.attestation_color || "#C5A05A"}
              logoUrl={(cohortFullData.formation as any)?.attestation_logo_url || ""}
              signatureUrl={(cohortFullData.formation as any)?.attestation_signature_url || ""}
              stampUrl={(cohortFullData.formation as any)?.attestation_stamp_url || ""}
              studentName={`${previewStudent.first_name} ${previewStudent.last_name}`}
              formationName={(cohortFullData.formation as any)?.name || ""}
              startDate={cohortFullData.start_date ? new Date(cohortFullData.start_date).toLocaleDateString("fr-FR") : ""}
              endDate={cohortFullData.end_date ? new Date(cohortFullData.end_date).toLocaleDateString("fr-FR") : ""}
              certificateNumber={previewStudent.attestation_number || "ATT-XXXXXXXX"}
              issuedAt={previewStudent.issued_at || undefined}
            />
          ) : (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          )}
          <div className="flex justify-end mt-2">
            <Button variant="outline" onClick={() => setPreviewStudent(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttestationIssuer;
