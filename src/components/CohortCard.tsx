import { Calendar, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { CohortRow } from "@/hooks/use-cohorts";

interface CohortCardProps {
  cohort: CohortRow;
}

const CohortCard = ({ cohort }: CohortCardProps) => {
  const enrolled = cohort.enrollment_count ?? 0;
  const spotsLeft = cohort.capacity - enrolled;
  const fillPercent = (enrolled / cohort.capacity) * 100;
  const isFull = spotsLeft <= 0;
  const formationColor = cohort.formation?.attestation_color || undefined;

  const statusLabel: Record<string, string> = {
    active: "En cours",
    upcoming: "À venir",
    archived: "Terminée",
  };

  const statusClass: Record<string, string> = {
    active: "bg-accent/10 text-accent",
    upcoming: "bg-secondary text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover overflow-hidden relative"
      style={formationColor ? { borderTopWidth: '4px', borderTopColor: formationColor } : undefined}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass[cohort.status] || statusClass.upcoming}`}>
              {statusLabel[cohort.status] || cohort.status}
            </span>
            {cohort.formation && (
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: formationColor || 'hsl(var(--primary))' }}
              >
                {cohort.formation.name}
              </span>
            )}
          </div>
          <h3 className="mt-3 font-display text-xl font-bold text-foreground">
            Cohorte {cohort.name}
          </h3>
          {cohort.formation && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {cohort.formation.level === "avance" ? "Avancé" : "Débutant"}
            </p>
          )}
        </div>
      </div>

      {cohort.formation && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-lg font-bold text-foreground">
            {cohort.formation.total_price.toLocaleString("fr-FR")} FCFA
          </span>
          <span className="text-xs text-muted-foreground">
            (inscription : {cohort.formation.registration_fee.toLocaleString("fr-FR")} FCFA)
          </span>
        </div>
      )}

      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{cohort.description}</p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatDate(cohort.start_date)} au {formatDate(cohort.end_date)}</span>
        </span>
      </div>

      {!isFull && spotsLeft <= 3 && (
        <p className="mb-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 animate-pulse">
          Plus que {spotsLeft} place{spotsLeft > 1 ? "s" : ""} disponible{spotsLeft > 1 ? "s" : ""} !
        </p>
      )}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4" />
          {enrolled}/{cohort.capacity} inscrits
        </span>
        <span className={`font-semibold ${isFull ? "text-destructive" : "text-accent"}`}>
          {isFull ? "Complète" : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`}
        </span>
      </div>
      <Progress value={fillPercent} className="mb-4 h-2" />

      {cohort.status !== "archived" && (
        <Link to={isFull ? "#" : `/register?cohort=${cohort.id}`}>
          <Button className="w-full" variant={isFull ? "outline" : "default"} disabled={isFull}>
            {isFull ? "Cohorte complète" : "S'inscrire maintenant"}
          </Button>
        </Link>
      )}
    </div>
  );
};

export default CohortCard;
