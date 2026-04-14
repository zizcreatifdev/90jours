import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCohorts } from "@/hooks/use-cohorts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Briefcase, CheckCircle2, XCircle, Clock, Loader2, ExternalLink } from "lucide-react";

interface Portfolio {
  id: string;
  user_id: string;
  cohort_id: string;
  url: string;
  submitted_at: string;
  status: string;
  admin_notes: string | null;
  validated_at: string | null;
}

interface PortfolioManagerProps {
  filterCohortIds?: string[];
}

const PortfolioManager = ({ filterCohortIds }: PortfolioManagerProps = {}) => {
  const { cohorts: allCohorts } = useCohorts();
  const cohorts = filterCohortIds ? allCohorts.filter(c => filterCohortIds.includes(c.id)) : allCohorts;
  const { toast } = useToast();
  const [selectedCohort, setSelectedCohort] = useState("");
  const [portfolios, setPortfolios] = useState<(Portfolio & { profile?: any })[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedCohort) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("portfolios")
        .select("*")
        .eq("cohort_id", selectedCohort)
        .order("submitted_at", { ascending: false });

      if (data && data.length > 0) {
        const userIds = data.map((p: any) => p.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setPortfolios(data.map((p: any) => ({ ...p, profile: profileMap.get(p.user_id) })));
      } else {
        setPortfolios([]);
      }
      setLoading(false);
    };
    fetch();
  }, [selectedCohort]);

  const handleValidate = async (status: "validated" | "rejected") => {
    if (!currentPortfolio) return;
    setSaving(true);
    const { error } = await supabase.from("portfolios").update({
      status,
      admin_notes: adminNotes || null,
      validated_at: status === "validated" ? new Date().toISOString() : null,
    }).eq("id", currentPortfolio.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "validated" ? "Portfolio validé ✓" : "Portfolio rejeté" });
      setReviewOpen(false);
      setPortfolios(prev => prev.map(p => p.id === currentPortfolio.id ? { ...p, status, admin_notes: adminNotes, validated_at: status === "validated" ? new Date().toISOString() : null } : p));
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "validated": return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Validé</span>;
      case "rejected": return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3" /> Rejeté</span>;
      default: return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3" /> En attente</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner une cohorte" />
          </SelectTrigger>
          <SelectContent>
            {cohorts.map(c => (
              <SelectItem key={c.id} value={c.id}>Cohorte {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCohort ? (
        <p className="text-center text-sm text-muted-foreground py-12">Sélectionnez une cohorte pour voir les portfolios.</p>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : portfolios.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucun portfolio soumis pour cette cohorte.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Portfolios ({portfolios.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Étudiant</th>
                  <th className="px-6 py-3 font-medium">Portfolio</th>
                  <th className="px-6 py-3 font-medium">Soumis le</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-foreground">
                      {p.profile?.first_name} {p.profile?.last_name}
                    </td>
                    <td className="px-6 py-3.5">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> Voir
                      </a>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">
                      {new Date(p.submitted_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-3.5">{statusBadge(p.status)}</td>
                    <td className="px-6 py-3.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setCurrentPortfolio(p); setAdminNotes(p.admin_notes || ""); setReviewOpen(true); }}
                      >
                        Évaluer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Évaluer le portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {currentPortfolio && (
              <a href={currentPortfolio.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                <ExternalLink className="h-4 w-4" /> Ouvrir le portfolio
              </a>
            )}
            <div>
              <Label>Notes / Commentaires</Label>
              <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Commentaires pour l'étudiant..." rows={3} />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleValidate("validated")} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Valider
              </Button>
              <Button onClick={() => handleValidate("rejected")} disabled={saving} variant="destructive" className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Rejeter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioManager;
