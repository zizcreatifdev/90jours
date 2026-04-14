import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, UserPlus, UserMinus, Trash2, Link2Off } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Pagination from "@/components/ui/Pagination";

interface AuditLog {
  id: string;
  performed_by: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, any>;
  created_at: string;
  performer_name?: string;
}

const PAGE_SIZE = 20;

const actionConfig: Record<string, { label: string; icon: typeof UserPlus; color: string }> = {
  staff_invited: { label: "Invitation staff", icon: UserPlus, color: "text-accent" },
  staff_assigned: { label: "Assignation staff", icon: UserPlus, color: "text-primary" },
  staff_role_removed: { label: "Rôle staff retiré", icon: UserMinus, color: "text-orange-500" },
  staff_formation_removed: { label: "Affectation retirée", icon: Link2Off, color: "text-muted-foreground" },
  user_deleted: { label: "Utilisateur supprimé", icon: Trash2, color: "text-destructive" },
};

const AuditLogPanel = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await supabase
        .from("audit_logs" as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (count !== null) setTotalCount(count);

      if (data) {
        // Fetch performer names only for this page's logs
        const performerIds = [...new Set((data as any[]).map((l) => l.performed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", performerIds);

        const profileMap = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
          profileMap.set(p.user_id, `${p.first_name} ${p.last_name}`);
        });

        setLogs(
          (data as any[]).map((l) => ({
            ...l,
            performer_name: profileMap.get(l.performed_by) || "Inconnu",
          }))
        );
      }
      setLoading(false);
    };
    fetchLogs();
  }, [page]);

  const getDescription = (log: AuditLog) => {
    const d = log.details || {};
    switch (log.action) {
      case "staff_invited":
        return `a invité ${d.first_name || ""} ${d.last_name || ""} (${d.email || ""}) comme staff pour "${d.formation_name || ""}"`;
      case "staff_assigned":
        return `a assigné ${d.first_name || ""} ${d.last_name || ""} à la formation "${d.formation_name || ""}"`;
      case "staff_role_removed":
        return `a retiré le rôle staff de ${d.formateur || "un utilisateur"}`;
      case "staff_formation_removed":
        return `a retiré ${d.formateur || "un formateur"} de la formation "${d.formation || ""}"`;
      case "user_deleted":
        return `a supprimé l'utilisateur ${d.first_name || ""} ${d.last_name || ""} (rôles: ${(d.roles || []).join(", ")})`;
      default:
        return log.action;
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-52" />
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
        <History className="h-5 w-5" /> Historique des actions
      </h2>

      {logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune action enregistrée pour le moment.</p>
      ) : (
        <>
          <div className="space-y-1">
            {logs.map((log) => {
              const config = actionConfig[log.action] || { label: log.action, icon: History, color: "text-muted-foreground" };
              const Icon = config.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{log.performer_name}</span>{" "}
                      {getDescription(log)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AuditLogPanel;
