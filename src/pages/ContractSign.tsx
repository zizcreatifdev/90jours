import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowDown, CheckCircle2, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Variable replacement ──────────────────────────────────────────────────────

const fillTemplate = (html: string, vars: Record<string, string>): string =>
  Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || "-"),
    html
  );

// ── Types ─────────────────────────────────────────────────────────────────────

interface CohortRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  formation_id: string | null;
  formations: { name: string; price: number | null } | null;
}

interface TemplateRow {
  id: string;
  content: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ContractSign = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const cohortId = searchParams.get("cohort_id") ?? "";

  const [loading, setLoading] = useState(true);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [contractHtml, setContractHtml] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [sigName, setSigName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !cohortId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      // 1. Check for existing signed contract
      const { data: existing } = await supabase
        .from("student_contracts")
        .select("id, signed_at")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .maybeSingle();

      if (existing && existing.signed_at) {
        setAlreadySigned(true);
        setLoading(false);
        return;
      }

      // 2. Fetch cohort + formation
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("id, name, start_date, end_date, formation_id, formations:formation_id(name, price)")
        .eq("id", cohortId)
        .maybeSingle();

      if (!cohort) {
        navigate("/student");
        return;
      }

      const c = cohort as unknown as CohortRow;
      const formation = c.formations;

      // 3. Fetch active template (formation-specific first, then generic)
      let template: TemplateRow | null = null;
      if (c.formation_id) {
        const { data } = await supabase
          .from("contract_templates")
          .select("id, content")
          .eq("is_active", true)
          .eq("formation_id", c.formation_id)
          .maybeSingle();
        template = data as TemplateRow | null;
      }
      if (!template) {
        const { data } = await supabase
          .from("contract_templates")
          .select("id, content")
          .eq("is_active", true)
          .is("formation_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        template = data as TemplateRow | null;
      }

      if (!template) {
        // No template available : skip contract step
        navigate("/student");
        return;
      }

      // 4. Fetch formateur for this formation
      let formateurName = "L'équipe pédagogique";
      if (c.formation_id) {
        const { data: sf } = await supabase
          .from("staff_formations" as "staff_formations")
          .select("staff_id, profiles:staff_id(first_name, last_name)")
          .eq("formation_id", c.formation_id)
          .limit(1)
          .maybeSingle();
        if (sf) {
          const p = (sf as any).profiles as { first_name?: string; last_name?: string } | null;
          if (p) {
            formateurName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || formateurName;
          }
        }
      }

      // 5. Build variable map
      const now = new Date();
      const vars: Record<string, string> = {
        prenom: profile?.first_name || "",
        nom: profile?.last_name || "",
        email: user.email || "",
        formation: formation?.name || "60 Jours",
        cohorte: c.name,
        formateur: formateurName,
        date_debut: new Date(c.start_date).toLocaleDateString("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        }),
        date_fin: new Date(c.end_date).toLocaleDateString("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        }),
        montant: formation?.price != null
          ? `${formation.price.toLocaleString("fr-FR")} FCFA`
          : "À définir",
        date_signature: now.toLocaleDateString("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        }),
        heure_signature: now.toLocaleTimeString("fr-FR", {
          hour: "2-digit", minute: "2-digit",
        }),
        signature_name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
      };

      setTemplateId(template.id);
      setContractHtml(fillTemplate(template.content, vars));
      setLoading(false);
    };

    load();
  }, [user, cohortId, profile]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrolledToBottom) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      setScrolledToBottom(true);
    }
  };

  const handleSign = async () => {
    if (!user || !cohortId || !contractHtml) return;

    const expectedName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
    if (sigName.trim().toLowerCase() !== expectedName.toLowerCase()) {
      toast({
        title: "Nom incorrect",
        description: `Veuillez saisir exactement : ${expectedName}`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    // Freeze the snapshot with the actual signature name filled in
    const finalHtml = contractHtml
      .replace(/{{signature_name}}/g, sigName.trim())
      .replace(/{{date_signature}}/g, new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }))
      .replace(/{{heure_signature}}/g, new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));

    const { error } = await supabase
      .from("student_contracts")
      .upsert({
        user_id: user.id,
        cohort_id: cohortId,
        template_id: templateId,
        signed_at: new Date().toISOString(),
        signature_name: sigName.trim(),
        ip_address: null,
        contract_snapshot: finalHtml,
      }, { onConflict: "user_id,cohort_id" });

    setSubmitting(false);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contrat signé ✅", description: "Votre inscription est confirmée. Bienvenue !" });
      navigate("/student");
    }
  };

  // ── Redirect if no cohortId ───────────────────────────────────────────────

  if (!cohortId) {
    navigate("/student");
    return null;
  }

  // ── Already signed ────────────────────────────────────────────────────────

  if (!loading && alreadySigned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-10 shadow-card">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Contrat déjà signé</h2>
          <p className="text-muted-foreground mb-6">Vous avez déjà signé votre contrat pour cette cohorte.</p>
          <Button onClick={() => navigate("/student")}>Accéder à mon espace</Button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  const canSign = scrolledToBottom && accepted && sigName.trim() !== "";

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="font-display text-xs font-bold text-primary-foreground">60</span>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">Contrat de Formation</p>
              <p className="text-xs text-muted-foreground">Veuillez lire l'intégralité avant de signer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-muted-foreground" />
            {!scrolledToBottom && (
              <span className="animate-bounce text-xs text-muted-foreground hidden sm:inline">
                Scroll jusqu'en bas ↓
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-4 pb-12 md:p-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contract document */}
          <div className="lg:col-span-2">
            {/* Scroll indicator */}
            {!scrolledToBottom && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
                <ArrowDown className="h-4 w-4 shrink-0 animate-bounce" />
                Faites défiler jusqu'en bas pour activer la signature
              </div>
            )}

            {/* Contract iframe-like container */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-[65vh] overflow-y-auto rounded-2xl border border-border bg-white shadow-card"
            >
              <div
                className="text-[13px]"
                dangerouslySetInnerHTML={{ __html: contractHtml }}
              />
            </div>
          </div>

          {/* Signature panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
              <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <FileSignature className="h-4 w-4" /> Signer le contrat
              </h2>

              {/* Step 1 : Scroll */}
              <div className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                scrolledToBottom
                  ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {scrolledToBottom
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <ArrowDown className="h-4 w-4 shrink-0 animate-bounce" />}
                Lire l'intégralité du contrat
              </div>

              {/* Step 2 : Checkbox */}
              <div className={cn(
                "rounded-xl border p-4 transition-colors",
                accepted ? "border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-950/20" : "border-border"
              )}>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={e => setAccepted(e.target.checked)}
                    disabled={!scrolledToBottom}
                    className="mt-0.5 h-4 w-4 rounded accent-accent disabled:opacity-40"
                  />
                  <span className={cn(!scrolledToBottom && "opacity-40")}>
                    J'ai lu et j'accepte l'intégralité de ce contrat de formation.
                  </span>
                </label>
              </div>

              {/* Step 3 : Name */}
              <div className="space-y-2">
                <Label htmlFor="sig-name" className={cn(!accepted && "opacity-40")}>
                  Votre nom complet (signature numérique)
                </Label>
                <Input
                  id="sig-name"
                  value={sigName}
                  onChange={e => setSigName(e.target.value)}
                  disabled={!accepted}
                  placeholder={fullName || "Prénom Nom"}
                  className={cn(!accepted && "opacity-40")}
                />
                {accepted && sigName.trim() !== "" && sigName.trim().toLowerCase() !== fullName.toLowerCase() && (
                  <p className="text-xs text-destructive">
                    Doit correspondre à : <strong>{fullName}</strong>
                  </p>
                )}
                {accepted && sigName.trim().toLowerCase() === fullName.toLowerCase() && sigName.trim() !== "" && (
                  <p className="text-xs text-green-600 dark:text-green-400">✓ Signature valide</p>
                )}
              </div>

              {/* Sign button */}
              <Button
                className="w-full"
                disabled={!canSign || submitting}
                onClick={handleSign}
              >
                {submitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
                  : <><CheckCircle2 className="mr-2 h-4 w-4" /> Signer et finaliser mon inscription</>
                }
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                Signature numérique légalement équivalente à une signature manuscrite. Horodatée et archivée.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractSign;
