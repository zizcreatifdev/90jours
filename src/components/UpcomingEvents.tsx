import { useMemo } from "react";
import { type CalendarEvent } from "@/hooks/use-calendar-events";
import { EVENT_TYPE_STYLES } from "@/lib/calendar-event-styles";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface UpcomingEventsProps {
  events: CalendarEvent[];
  loading?: boolean;
}

const UpcomingEvents = ({ events, loading = false }: UpcomingEventsProps) => {
  const today = startOfDay(new Date());

  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-base font-semibold text-foreground">Prochains evenements</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : upcoming.length === 0 ? (
        <p className="px-6 py-6 text-center text-sm text-muted-foreground">Aucun evenement a venir</p>
      ) : (
        <div className="divide-y divide-border">
          {upcoming.map((event) => {
            const style = EVENT_TYPE_STYLES[event.type] ?? EVENT_TYPE_STYLES["brief"];
            const TypeIcon = style.Icon;
            return (
              <div key={event.id} className="flex items-center gap-3 px-6 py-3.5">
                <div className="w-9 shrink-0 text-center">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {format(event.date, "MMM", { locale: fr })}
                  </p>
                  <p className="text-base font-bold leading-none text-foreground">
                    {format(event.date, "d")}
                  </p>
                </div>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", style.bg)}>
                  <TypeIcon className={cn("h-4 w-4", style.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {event.cohort_name && <span>Cohorte {event.cohort_name}</span>}
                    {event.hasExplicitTime && (
                      <>
                        {event.cohort_name && <span>·</span>}
                        <Clock className="h-3 w-3" />
                        <span>{format(event.date, "HH:mm", { locale: fr })}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingEvents;
