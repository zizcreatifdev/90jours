import { cn } from "@/lib/utils";

interface Submission {
  completed_at: string;
}

interface ActivityHeatmapProps {
  submissions: Submission[];
  cohortStartDate: string;
  cohortEndDate: string;
}

const DAY_LABELS = ["L", "", "M", "", "J", "", "S"];
const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const ActivityHeatmap = ({ submissions, cohortStartDate, cohortEndDate }: ActivityHeatmapProps) => {
  // Build date → count map
  const activityMap = new Map<string, number>();
  submissions.forEach(s => {
    const day = s.completed_at.slice(0, 10);
    activityMap.set(day, (activityMap.get(day) || 0) + 1);
  });

  const cohortStart = new Date(cohortStartDate);
  const cohortEnd = new Date(cohortEndDate);
  const displayEnd = new Date(Math.min(cohortEnd.getTime(), Date.now()));

  // Align grid start to Monday of the week containing cohortStart
  const gridStart = new Date(cohortStart);
  const dow = (gridStart.getDay() + 6) % 7; // 0 = Monday
  gridStart.setDate(gridStart.getDate() - dow);

  // Build columns (one per week)
  type Cell = { date: string; count: number; inRange: boolean; isMonthStart: boolean };
  const columns: Cell[][] = [];
  const cursor = new Date(gridStart);

  while (cursor <= displayEnd) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const inRange = cursor >= cohortStart && cursor <= displayEnd;
      col.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0,
        inRange,
        isMonthStart: cursor.getDate() === 1,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  const totalSubmissions = submissions.length;
  const activeDays = activityMap.size;

  const cellColor = (cell: Cell) => {
    if (!cell.inRange) return "bg-transparent cursor-default";
    if (cell.count === 0) return "bg-secondary hover:bg-secondary/70";
    if (cell.count === 1) return "bg-accent/50 hover:bg-accent/60";
    return "bg-accent hover:bg-accent/90";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Activité de soumission</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totalSubmissions} soumission{totalSubmissions !== 1 ? "s" : ""}</span>
          <span className="opacity-40">•</span>
          <span>{activeDays} jour{activeDays !== 1 ? "s" : ""} actif{activeDays !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pt-5 shrink-0 select-none">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="h-3 flex items-center text-[9px] text-muted-foreground/70 leading-none w-3">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto flex-1 min-w-0">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 h-4">
            {columns.map((col, ci) => {
              const firstInRange = col.find(c => c.inRange);
              const showMonth = firstInRange?.isMonthStart;
              const monthIdx = showMonth
                ? parseInt(firstInRange!.date.slice(5, 7)) - 1
                : -1;
              return (
                <div key={ci} className="w-3 shrink-0 text-[9px] text-muted-foreground/70 leading-none overflow-visible whitespace-nowrap">
                  {showMonth ? MONTH_LABELS[monthIdx] : ""}
                </div>
              );
            })}
          </div>

          {/* Cells */}
          <div className="flex gap-[3px]">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px] shrink-0">
                {col.map((cell, di) => (
                  <div
                    key={di}
                    title={
                      cell.inRange
                        ? `${cell.date} : ${cell.count} soumission${cell.count !== 1 ? "s" : ""}`
                        : undefined
                    }
                    className={cn(
                      "h-3 w-3 rounded-sm transition-colors",
                      cellColor(cell)
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none">
        <span>Moins</span>
        <div className="h-3 w-3 rounded-sm bg-secondary" />
        <div className="h-3 w-3 rounded-sm bg-accent/50" />
        <div className="h-3 w-3 rounded-sm bg-accent" />
        <span>Plus</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
