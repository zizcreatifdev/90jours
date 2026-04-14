import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isValidUrl } from "@/lib/validate-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !cohortId) return;
    const fetch = async () => {
      const { data: portfolioRes } = await supabase
        .from("portfolios")
        .select("*")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .maybeSingle();
      if (portfolioRes) { setPortfolio(portfolioRes); setUrl(portfolioRes.url); }
      setLoading(false);
    };
    fetch();
  }, [user, cohortId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cohortId) return;

    if (!isValidUrl(url)) {
      toast({ title: "URL invalide", description: "Veuillez entrer une URL valide commençant par http:// ou https://", variant: "destructive" });
      return;
    }

    setSaving(true);

    if (portfolio) {
      const { error } = await supabase.from("portfolios").update({ url }).eq("id", portfolio.id);
      setSaving(false);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else { toast({ title: "Portfolio mis à jour !" }); setPortfolio({ ...portfolio, url }); }
    } else {
      const { data, error } = await supabase.from("portfolios").insert({
        user_id: user.id,
        cohort_id: cohortId,
        url,
      }).select().single();
      setSaving(false);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else { toast({ title: "Portfolio soumis ! 🎉" }); setPortfolio(data); }
    }
  };

  if (loading) return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-accent" />
        <h3 className="font-display font-semibold text-foreground">Mon Portfolio</h3>
        {formationName && (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: formationColor || 'hsl(var(--accent))' }}>
            {formationName}
          </span>
        )}
      </div>

      {portfolio ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Statut :</span>
            {portfolio.status === "validated" ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Validé</span>
            ) : portfolio.status === "rejected" ? (
              <span className="inline-flex items-center gap-1 text-sm text-red-600 font-medium"><XCircle className="h-4 w-4" /> Rejeté</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-yellow-600 font-medium"><Clock className="h-4 w-4" /> En attente de validation</span>
            )}
          </div>
          {portfolio.admin_notes && (
            <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-xs mb-1">Commentaire de l'admin :</p>
              {portfolio.admin_notes}
            </div>
          )}
          <a href={portfolio.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Voir mon portfolio
          </a>

          {portfolio.status === "pending" && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required className="flex-1" />
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Modifier"}
              </Button>
            </form>
          )}
          {portfolio.status === "rejected" && (
            <form onSubmit={handleSubmit} className="space-y-2">
              <p className="text-xs text-muted-foreground">Vous pouvez soumettre une nouvelle version :</p>
              <div className="flex gap-2">
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required className="flex-1" />
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resoumettre"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <EmptyState
            icon={Briefcase}
            title="Aucun projet dans ton portfolio"
            description="Soumettez le lien de votre portfolio pour valider votre formation."
            className="border-0 bg-transparent py-4 shadow-none"
          />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>URL du portfolio</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://monportfolio.com" required type="url" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Briefcase className="mr-2 h-4 w-4" />}
              Soumettre mon portfolio
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentPortfolio;
