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
import { CalendarDays, BookOpen, Search as SearchIcon, Plus, Loader2, Clock, Bookmark } from "lucide-react";
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
  personal: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", label: "Personnel" },
};

const DashboardCalendar = ({ role, cohortIds }: DashboardCalendarProps) => {
  const [formationFilter, setFormationFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createPersonalOpen, setCreatePersonalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(
    () => new Set(Object.keys(EVENT_COLORS))
  );
  const { user } = useAuth();

  const toggleType = (type: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };
  const { toast } = useToast();

  const { events, loading, formations, refetch } = useCalendarEvents({
    cohortIds,
    formationFilter: role === "admin" ? formationFilter : undefined,
    role,
  });

  const filteredEvents = useMemo(
    () => (role === "student" ? events.filter((e) => typeFilter.has(e.type)) : events),
    [events, typeFilter, role]
  );

  // Events for selected date
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents
      .filter((e) => isSameDay(e.date, selectedDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredEvents, selectedDate]);

  // Dates that have events (for calendar dots)
  const eventDates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredEvents.forEach((e) => {
      const key = format(e.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(e.type);
    });
    return map;
  }, [filteredEvents]);

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
          {role === "student" && (
            <CreatePersonalEventDialog
              open={createPersonalOpen}
              onOpenChange={setCreatePersonalOpen}
              onCreated={refetch}
            />
          )}
        </div>
      </div>

      {role === "student" && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_COLORS).map(([type, colors]) => {
            const active = typeFilter.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  active
                    ? `${colors.bg} ${colors.text} border-transparent`
                    : "bg-card text-muted-foreground border-border opacity-40"
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${active ? colors.dot : "bg-muted-foreground"}`} />
                {colors.label}
              </button>
            );
          })}
        </div>
      )}

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
          {/* Legend (hidden for student : chips above serve as legend) */}
          {role !== "student" && (
            <div className="mt-3 flex flex-wrap gap-3 px-2">
              {Object.entries(EVENT_COLORS)
                .filter(([key]) => key !== "personal")
                .map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`h-2 w-2 rounded-full ${val.dot}`} />
                    {val.label}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Events list */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card min-h-[300px]">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">
            {selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr }) : "Selectionnez un jour"}
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selectedEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun evenement ce jour</p>
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
  const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS["brief"];
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const isPersonal = event.type === "personal";
  const canDelete =
    ((role === "admin" || role === "staff") && event.type !== "brief") || isPersonal;

  const handleDelete = async () => {
    setDeleting(true);
    let error: { message: string } | null = null;

    if (isPersonal) {
      const res = await supabase.from("personal_events").delete().eq("id", event.id);
      error = res.error;
    } else {
      const table = event.type === "masterclass" ? "masterclass_sessions" : "research_sessions";
      const res = await supabase.from(table).delete().eq("id", event.id);
      error = res.error;
    }

    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Evenement supprime" }); onDeleted(); }
    setDeleting(false);
  };

  return (
    <div
      className={`rounded-xl p-3 ${colors.bg}${isPersonal ? " border border-dashed border-emerald-300 dark:border-emerald-700" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isPersonal && <Bookmark className={`h-3 w-3 shrink-0 ${colors.text}`} />}
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
          {(!isPersonal || event.hasExplicitTime) && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(event.date, "HH:mm", { locale: fr })}
              {event.duration_minutes && <span>• {event.duration_minutes} min</span>}
            </div>
          )}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Supprimer l'evenement"
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "×"}
          </button>
        )}
      </div>
    </div>
  );
};

// Dialog de creation d'evenement personnel pour les etudiants
interface CreatePersonalEventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

const CreatePersonalEventDialog = ({ open, onOpenChange, onCreated }: CreatePersonalEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setDate("");
    setTime("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !date) return;
    setSaving(true);

    const { error } = await supabase.from("personal_events").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      event_time: time || null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evenement cree" });
      reset();
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvel evenement personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Titre *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revision brief 3, Seance travail..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Heure (optionnel)</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Note (optionnel)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail, lien, rappel..."
              rows={2}
            />
          </div>
          <Button
            type="submit"
            disabled={saving || !title.trim() || !date}
            className="w-full"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Creer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
  const [cohorts, setCohorts] = useState<{ id: string; name: string; formation?: { name: string } | null }[]>([]);

  // Fetch cohorts for selector
  useState(() => {
    const fetch = async () => {
      let query = supabase.from("cohorts").select("id, name, formation:formations(name)").eq("status", "active");
      if (cohortIds && cohortIds.length > 0) {
        query = query.in("id", cohortIds);
      }
      const { data } = await query;
      if (data) setCohorts(data as any);
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
      toast({ title: "Evenement cree !" });
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
          <DialogTitle className="font-display">Nouvel evenement</DialogTitle>
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
              <SelectTrigger><SelectValue placeholder="Selectionner une cohorte" /></SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>Cohorte {c.name}{c.formation ? ` (${c.formation.name})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Titre</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'evenement" />
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
              <Label>Duree (minutes)</Label>
              <Input type="number" min="15" max="480" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Creer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardCalendar;
