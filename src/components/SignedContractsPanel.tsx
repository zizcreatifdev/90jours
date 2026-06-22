import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCsv } from "@/lib/export-csv";
import { Eye, Download, FileSignature } from "lucide-react";
import { useCohorts } from "@/hooks/use-cohorts";

interface SignedContract {
  id: string;
  user_id: string;
  cohort_id: string;
  signed_at: string | null;
  signature_name: string | null;
  ip_address: string | null;
  contract_snapshot: string | null;
  created_at: string;
  profile: { first_name: string; last_name: string; email?: string } | null;
  cohort_name: string;
}

const SignedContractsPanel = () => {
  const { toast } = useToast();
  const { cohorts } = useCohorts();
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [cohortFilter, setCohortFilter] = useState("all");
  const [viewContract, setViewContract] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("student_contracts")
        .select("*, profiles:user_id(first_name, last_name), cohorts:cohort_id(name)")
        .not("signed_at", "is", null)
        .order("signed_at", { ascending: false });

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        cohort_id: c.cohort_id,
        signed_at: c.signed_at,
        signature_name: c.signature_name,
        ip_address: c.ip_address,
        contract_snapshot: c.contract_snapshot,
        created_at: c.created_at,
        profile: c.profiles as { first_name: string; last_name: string } | null,
        cohort_name: (c.cohorts as { name: string } | null)?.name ?? "-",
      })) as SignedContract[];

      setContracts(mapped);
      setLoading(false);
    };
    fetchContracts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = cohortFilter === "all"
    ? contracts
    : contracts.filter(c => c.cohort_id === cohortFilter);

  const handleExportCsv = () => {
    const rows = filtered.map(c => ({
      "Nom": c.profile ? `${c.profile.first_name} ${c.profile.last_name}` : "-",
      "Cohorte": c.cohort_name,
      "Date de signature": c.signed_at
        ? new Date(c.signed_at).toLocaleString("fr-FR")
        : "-",
      "Nom signé": c.signature_name ?? "-",
      "IP": c.ip_address ?? "-",
    }));
    exportToCsv(rows, `contrats-signes-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: "Export CSV généré" });
  };

  const viewSnap = contracts.find(c => c.id === viewContract)?.contract_snapshot;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Toutes les cohortes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les cohortes</SelectItem>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>Cohorte {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} contrat{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-muted-foreground" />
          <span className="font-display text-base font-semibold text-foreground">Contrats signés</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Aucun contrat signé trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Étudiant</th>
                  <th className="px-6 py-3 font-medium">Cohorte</th>
                  <th className="px-6 py-3 font-medium">Date de signature</th>
                  <th className="px-6 py-3 font-medium">Nom signé</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-foreground">
                        {c.profile ? `${c.profile.first_name} ${c.profile.last_name}` : "-"}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">
                      Cohorte {c.cohort_name}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">
                      {c.signed_at
                        ? new Date(c.signed_at).toLocaleString("fr-FR", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground italic">
                      {c.signature_name ?? "-"}
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => setViewContract(c.id)}
                        disabled={!c.contract_snapshot}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-40"
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract viewer modal */}
      <Dialog open={viewContract !== null} onOpenChange={() => setViewContract(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Contrat signé</DialogTitle>
          </DialogHeader>
          <div
            className="rounded-xl border border-border bg-white text-[13px]"
            dangerouslySetInnerHTML={{ __html: viewSnap || "<p>Snapshot non disponible.</p>" }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignedContractsPanel;
