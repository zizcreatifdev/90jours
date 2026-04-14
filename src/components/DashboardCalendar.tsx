import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/use-calendar-events";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, BookOpen, Search as SearchIcon, Plus, Loader2, Clock } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardCalendarProps {
  role: "admin" | "staff" | "student";
  cohortIds?: string[];
}

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  brief: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", label: "Brief" },
  masterclass: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500", label: "Masterclass" },
  research: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", label: "Recherche" },
};

const DashboardCalendar = ({ role, cohortIds }: DashboardCalendarProps) => {
  const [formationFilter, setFormationFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { events, loading, formations, refetch } = useCalendarEvents({
    cohortIds,
    formationFilter: role === "admin" ? formationFilter : undefined,
    role,
  });

  // Events for selected date
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events
      .filter((e) => isSameDay(e.date, selectedDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, selectedDate]);

  // Dates that have events (for calendar dots)
  const eventDates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    events.forEach((e) => {
      const key = format(e.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(e.type);
    });
    return map;
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Calendrier
        </h2>
        <div className="flex items-center gap-2">
          {role === "admin" && formations.length > 0 && (
            <Select value={formationFilter} onValueChange={setFormationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Toutes les formations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les formations</SelectItem>
                {formations.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(role === "admin" || role === "staff") && (
            <CreateEventDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              cohortIds={cohortIds}
              role={role}
              onCreated={refetch}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={fr}
            modifiers={{
              hasEvent: (date) => eventDates.has(format(date, "yyyy-MM-dd")),
            }}
            modifiersClassNames={{
              hasEvent: "font-bold",
            }}
            components={{
              DayContent: ({ date }) => {
                const key = format(date, "yyyy-MM-dd");
                const types = eventDates.get(key);
                return (
                  <div className="relative flex flex-col items-center">
                    <span>{date.getDate()}</span>
                    {types && (
                      <div className="absolute -bottom-1 flex gap-0.5">
                        {Array.from(types).map((t) => (
                          <div key={t} className={`h-1 w-1 rounded-full ${EVENT_COLORS[t]?.dot || "bg-muted-foreground"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 px-2">
            {Object.entries(EVENT_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${val.dot}`} />
                {val.label}
              </div>
            ))}
          </div>
        </div>

        {/* Events list */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card min-h-[300px]">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">
            {selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr }) : "Sélectionnez un jour"}
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selectedEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun événement ce jour</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <EventCard key={event.id} event={event} role={role} onDeleted={refetch} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EventCard = ({ event, role, onDeleted }: { event: CalendarEvent; role: string; onDeleted: () => void }) => {
  const colors = EVENT_COLORS[event.type];
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const table = event.type === "masterclass" ? "masterclass_sessions" : "research_sessions";
    const { error } = await supabase.from(table).delete().eq("id", event.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Événement supprimé" }); onDeleted(); }
    setDeleting(false);
  };

  return (
    <div className={`rounded-xl p-3 ${colors.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.text} ${colors.bg}`}>
              {colors.label}
            </span>
            {event.cohort_name && (
              <span className="text-[10px] text-muted-foreground">Cohorte {event.cohort_name}</span>
            )}
            {event.formation_name && (
              <span className="text-[10px] text-muted-foreground">• {event.formation_name}</span>
            )}
          </div>
          <p className={`mt-1 text-sm font-medium ${colors.text}`}>{event.title}</p>
          {event.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(event.date, "HH:mm", { locale: fr })}
            {event.duration_minutes && <span>• {event.duration_minutes} min</span>}
          </div>
        </div>
        {(role === "admin" || role === "staff") && event.type !== "brief" && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "×"}
          </button>
        )}
      </div>
    </div>
  );
};

// Create event dialog for staff/admin
interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cohortIds?: string[];
  role: string;
  onCreated: () => void;
}

const CreateEventDialog = ({ open, onOpenChange, cohortIds, role, onCreated }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<"masterclass" | "research">("masterclass");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [cohortId, setCohortId] = useState("");
  const [saving, setSaving] = useState(false);
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);

  // Fetch cohorts for selector
  useState(() => {
    const fetch = async () => {
      let query = supabase.from("cohorts").select("id, name").eq("status", "active");
      if (cohortIds && cohortIds.length > 0) {
        query = query.in("id", cohortIds);
      }
      const { data } = await query;
      if (data) setCohorts(data);
    };
    fetch();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cohortId || !scheduledAt) return;
    setSaving(true);

    const table = type === "masterclass" ? "masterclass_sessions" : "research_sessions";
    const payload: any = {
      title,
      description: description || null,
      scheduled_at: scheduledAt,
      cohort_id: cohortId,
      created_by: user.id,
    };
    if (type === "masterclass") payload.duration_minutes = parseInt(duration) || 60;

    const { error } = await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Événement créé !" });
      setTitle("");
      setDescription("");
      setScheduledAt("");
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvel événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masterclass">Masterclass</SelectItem>
                <SelectItem value="research">Recherche</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cohorte</Label>
            <Select value={cohortId} onValueChange={setCohortId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une cohorte" /></SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>Cohorte {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Titre</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'événement" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" rows={2} />
          </div>
          <div>
            <Label>Date et heure</Label>
            <Input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          {type === "masterclass" && (
            <div>
              <Label>Durée (minutes)</Label>
              <Input type="number" min="15" max="480" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Créer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardCalendar;
