import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/export-csv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Phone, Mail, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitlistRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  formation_id: string | null;
  formation_other: string | null;
  message: string | null;
  status: "pending" | "contacted" | "converted";
  consent_marketing: boolean;
  created_at: string;
  formation?: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  contacted: "Contacte",
  converted: "Converti",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  converted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

async function fetchWaitlist(): Promise<WaitlistRow[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("*, formation:formations(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as WaitlistRow[];
}

const WaitlistManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFormation, setFilterFormation] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery<WaitlistRow[]>({
    queryKey: ["waitlist"],
    queryFn: fetchWaitlist,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("waitlist").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  // Derive unique formation names for filter
  const formationNames = Array.from(
    new Map(
      rows
        .filter((r) => r.formation)
        .map((r) => [r.formation_id, r.formation!.name] as [string, string])
    ).entries()
  );

  const filtered = rows.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchFormation =
      filterFormation === "all" ||
      (filterFormation === "other" ? !r.formation_id : r.formation_id === filterFormation);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.includes(q);
    return matchStatus && matchFormation && matchSearch;
  });

  const statCounts = {
    pending: rows.filter((r) => r.status === "pending").length,
    contacted: rows.filter((r) => r.status === "contacted").length,
    converted: rows.filter((r) => r.status === "converted").length,
  };

  const handleExport = () => {
    exportToCsv("liste-attente.csv", filtered, [
      { key: "full_name", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Telephone" },
      { key: "formation.name", label: "Formation" },
      { key: "formation_other", label: "Autre formation" },
      { key: "status", label: "Statut" },
      { key: "message", label: "Message" },
      { key: "consent_marketing", label: "Consentement" },
      { key: "created_at", label: "Date" },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">En attente</p>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">{statCounts.pending}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contactes</p>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">{statCounts.contacted}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Convertis</p>
          <p className="mt-1 font-display text-3xl font-bold text-accent">{statCounts.converted}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="contacted">Contactes</SelectItem>
            <SelectItem value="converted">Convertis</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFormation} onValueChange={setFilterFormation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Formation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes formations</SelectItem>
            {formationNames.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
            <SelectItem value="other">Autre / Non precise</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Aucun prospect pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Formation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Consentement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{row.full_name}</p>
                      {row.message && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{row.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          {row.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          {row.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.formation?.name ?? row.formation_other ?? (
                        <span className="italic opacity-60">Non precise</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        row.consent_marketing
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {row.consent_marketing ? "Oui" : "Non"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        {new Date(row.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={row.status}
                        onValueChange={(val) => updateStatus.mutate({ id: row.id, status: val })}
                      >
                        <SelectTrigger className={cn("h-7 w-[130px] text-xs font-semibold border-0 shadow-none", STATUS_COLORS[row.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistManager;
