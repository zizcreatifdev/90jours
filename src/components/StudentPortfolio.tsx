import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Briefcase, CheckCircle2, XCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface StudentPortfolioProps {
  cohortId: string;
  formationName?: string;
  formationColor?: string;
}

const StudentPortfolio = ({ cohortId, formationName, formationColor }: StudentPortfolioProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [deliverableLabel, setDeliverableLabel] = useState("Portfolio");
  const [deliverableHint, setDeliverableHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showError, handleBlur, isValid, validateAll } = useFormValidation(
    { url },
    {
      url: {
        required: "L'URL du portfolio est requise.",
        validate: (v) => {
          const str = String(v);
          if (!str.startsWith("https://")) return "L'URL doit commencer par https://";
          try {
            const parsed = new URL(str);
            if (!parsed.hostname.includes(".")) return "L'URL doit contenir un domaine valide (ex: monportfolio.com)";
            return null;
          } catch {
            return "Veuillez entrer une URL valide (ex: https://monportfolio.com)";
          }
        },
      },
    }
  );

  useEffect(() => {
    if (!user || !cohortId) return;
    const fetch = async () => {
      const [portfolioRes, cohortRes] = await Promise.all([
        supabase
          .from("portfolios")
          .select("*")
          .eq("user_id", user.id)
          .eq("cohort_id", cohortId)
          .maybeSingle(),
        supabase
          .from("cohorts")
          .select("formation:formations(deliverable_label, deliverable_description)")
          .eq("id", cohortId)
          .maybeSingle(),
      ]);

      if (portfolioRes.data) {
        setPortfolio(portfolioRes.data);
        setUrl(portfolioRes.data.url);
        setDescription((portfolioRes.data as any).description || "");
      }

      const formation = (cohortRes.data as any)?.formation;
      if (formation) {
        setDeliverableLabel(formation.deliverable_label || "Portfolio");
        setDeliverableHint(formation.deliverable_description || null);
      }

      setLoading(false);
    };
    fetch();
  }, [user, cohortId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user || !cohortId) return;

    setSaving(true);

    if (portfolio) {
      const { error } = await supabase
        .from("portfolios")
        .update({ url, description: description.trim() || null } as any)
        .eq("id", portfolio.id);
      setSaving(false);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Portfolio mis a jour !" });
        setPortfolio({ ...portfolio, url, description: description.trim() || null });
      }
    } else {
      const { data, error } = await supabase
        .from("portfolios")
        .insert({
          user_id: user.id,
          cohort_id: cohortId,
          url,
          description: description.trim() || null,
        } as any)
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Portfolio soumis." });
        setPortfolio(data);
      }
    }
  };

  const descriptionField = (
    <div className="space-y-1.5">
      <Label htmlFor="portfolio-desc" className="text-sm font-medium text-foreground">
        Description <span className="text-muted-foreground font-normal">(optionnelle)</span>
      </Label>
      <Textarea
        id="portfolio-desc"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Decrivez votre travail : outils utilises, projets inclus, approche..."
        rows={3}
        className="text-sm"
      />
    </div>
  );

  if (loading) return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );

  const titleLabel = deliverableLabel !== "Portfolio" ? `Mon ${deliverableLabel}` : "Mon Portfolio";

  const defaultHint = deliverableLabel !== "Portfolio"
    ? `Soumettez le lien vers votre ${deliverableLabel.toLowerCase()} pour valider votre formation.`
    : "Soumettez le lien de votre portfolio pour valider votre formation.";

  const hintText = deliverableHint || defaultHint;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-accent" />
        <h3 className="font-display font-semibold text-foreground">{titleLabel}</h3>
        {formationName && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: formationColor || "hsl(var(--accent))" }}
          >
            {formationName}
          </span>
        )}
      </div>

      {portfolio ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Statut :</span>
            {portfolio.status === "validated" ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Valide
              </span>
            ) : portfolio.status === "rejected" ? (
              <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium">
                <XCircle className="h-4 w-4" /> Rejete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-yellow-600 font-medium">
                <Clock className="h-4 w-4" /> En attente de validation
              </span>
            )}
          </div>

          {portfolio.admin_notes && (
            <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-xs mb-1">Commentaire du formateur :</p>
              {portfolio.admin_notes}
            </div>
          )}

          <a
            href={portfolio.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Voir mon {deliverableLabel.toLowerCase()}
          </a>

          {portfolio.description && (
            <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-xs mb-1">Description :</p>
              <p className="whitespace-pre-wrap">{portfolio.description}</p>
            </div>
          )}

          {portfolio.status === "pending" && (
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onBlur={() => handleBlur("url")}
                  aria-invalid={!!showError("url")}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={saving || !isValid}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Modifier"}
                </Button>
              </div>
              <FieldError message={showError("url")} />
              {descriptionField}
            </form>
          )}

          {portfolio.status === "rejected" && (
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground">Vous pouvez soumettre une nouvelle version :</p>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onBlur={() => handleBlur("url")}
                  aria-invalid={!!showError("url")}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={saving || !isValid}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resoumettre"}
                </Button>
              </div>
              <FieldError message={showError("url")} />
              {descriptionField}
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <EmptyState
            icon={Briefcase}
            title={`Aucun ${deliverableLabel.toLowerCase()} soumis`}
            description={hintText}
            className="border-0 bg-transparent py-4 shadow-none"
          />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <RequiredLabel htmlFor="portfolio-url" required>URL du {deliverableLabel.toLowerCase()}</RequiredLabel>
              <Input
                id="portfolio-url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onBlur={() => handleBlur("url")}
                aria-invalid={!!showError("url")}
                placeholder="https://monportfolio.com"
                type="url"
              />
              <FieldError message={showError("url")} />
            </div>
            {descriptionField}
            <Button type="submit" disabled={saving || !isValid} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Briefcase className="mr-2 h-4 w-4" />}
              Soumettre mon {deliverableLabel.toLowerCase()}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentPortfolio;
