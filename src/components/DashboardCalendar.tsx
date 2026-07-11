import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/use-calendar-events";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { EVENT_TYPE_STYLES } from "@/lib/calendar-event-styles";
import { cn } from "@/lib/utils";
import { CalendarDays, Plus, Loader2, Clock, X, AlertCircle, LayoutGrid, List, Pencil } from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardCalendarProps {
  role: "admin" | "staff" | "student";
  cohortIds?: string[];
}

const DashboardCalendar = ({ role, cohortIds }: DashboardCalendarProps) => {
  const [formationFilter, setFormationFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPersonalOpen, setCreatePersonalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | undefined>();
  const [typeFilter, setTypeFilter] = useState<Set<string>>(
    () => new Set(Object.keys(EVENT_TYPE_STYLES).filter((k) => k !== "cohort_date"))
  );

  const { toast } = useToast();

  const { events, loading, hasError, formations, refetch } = useCalendarEvents({
    cohortIds,
    formationFilter: role === "admin" ? formationFilter : undefined,
    role,
  });

  const toggleType = (type: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCalMonth(today);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEventToEdit(event);
    if (event.type === "personal") {
      setEditPersonalOpen(true);
    } else {
      setEditOpen(true);
    }
  };

  const filteredEvents = useMemo(
    () =>
      role === "student"
        ? events.filter((e) => e.type === "cohort_date" || typeFilter.has(e.type))
        : events,
    [events, typeFilter, role]
  );

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents
      .filter((e) => isSameDay(e.date, selectedDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredEvents, selectedDate]);

  const eventDates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredEvents.forEach((e) => {
      const key = format(e.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(e.type);
    });
    return map;
  }, [filteredEvents]);

  const upcomingListEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return filteredEvents
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredEvents]);

  const handleCloseEdit = (v: boolean) => {
    setEditOpen(v);
    if (!v) setEventToEdit(undefined);
  };

  const handleCloseEditPersonal = (v: boolean) => {
    setEditPersonalOpen(v);
    if (!v) setEventToEdit(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Calendrier
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="gap-1.5 min-h-[44px] text-xs"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}
            aria-label={viewMode === "grid" ? "Passer en vue liste" : "Passer en vue grille"}
            className="min-h-[44px]"
          >
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          {(role === "admin" || role === "staff") && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1 min-h-[44px]">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          )}
          {role === "student" && (
            <Button size="sm" variant="outline" onClick={() => setCreatePersonalOpen(true)} className="gap-1 min-h-[44px]">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Impossible de charger certains evenements du calendrier.
        </div>
      )}

      {role === "student" && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_TYPE_STYLES)
            .filter(([type]) => type !== "cohort_date")
            .map(([type, style]) => {
              const active = typeFilter.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold border transition-all min-h-[44px]",
                    active
                      ? cn(style.bg, style.text, "border-transparent")
                      : "bg-card text-muted-foreground border-border opacity-40"
                  )}
                >
                  <div className={cn("h-2 w-2 rounded-full", active ? style.dot : "bg-muted-foreground")} />
                  {style.label}
                </button>
              );
            })}
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          {/* Calendar */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={calMonth}
              onMonthChange={setCalMonth}
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
                            <div key={t} className={cn("h-1 w-1 rounded-full", EVENT_TYPE_STYLES[t]?.dot ?? "bg-muted-foreground")} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
            {role !== "student" && (
              <div className="mt-3 flex flex-wrap gap-3 px-2">
                {Object.entries(EVENT_TYPE_STYLES)
                  .filter(([key]) => key !== "personal")
                  .map(([key, style]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className={cn("h-2 w-2 rounded-full", style.dot)} />
                      {style.label}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Events for selected day */}
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
                  <EventCard key={event.id} event={event} role={role} onDeleted={refetch} onEdit={handleEdit} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">
            Evenements a venir
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : upcomingListEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun evenement a venir</p>
          ) : (
            <div className="space-y-2">
              {upcomingListEvents.map((event, idx) => {
                const prevEvent = idx > 0 ? upcomingListEvents[idx - 1] : null;
                const showDateHeader = !prevEvent || !isSameDay(event.date, prevEvent.date);
                return (
                  <div key={event.id}>
                    {showDateHeader && (
                      <p className="mb-1 mt-3 first:mt-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {format(event.date, "EEEE d MMMM", { locale: fr })}
                      </p>
                    )}
                    <EventCard event={event} role={role} onDeleted={refetch} onEdit={handleEdit} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create event dialog (admin/staff) */}
      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        cohortIds={cohortIds}
        role={role}
        onSaved={refetch}
      />
      {/* Edit event dialog (admin/staff) */}
      <CreateEventDialog
        open={editOpen}
        onOpenChange={handleCloseEdit}
        cohortIds={cohortIds}
        role={role}
        onSaved={refetch}
        editEvent={eventToEdit}
      />
      {/* Create personal event dialog (student) */}
      <CreatePersonalEventDialog
        open={createPersonalOpen}
        onOpenChange={setCreatePersonalOpen}
        onSaved={refetch}
      />
      {/* Edit personal event dialog (student) */}
      <CreatePersonalEventDialog
        open={editPersonalOpen}
        onOpenChange={handleCloseEditPersonal}
        onSaved={refetch}
        editEvent={eventToEdit}
      />
    </div>
  );
};

interface EventCardProps {
  event: CalendarEvent;
  role: string;
  onDeleted: () => void;
  onEdit: (event: CalendarEvent) => void;
}

const EventCard = ({ event, role, onDeleted, onEdit }: EventCardProps) => {
  const style = EVENT_TYPE_STYLES[event.type] ?? EVENT_TYPE_STYLES["brief"];
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const isPersonal = event.type === "personal";
  const isCohortDate = event.type === "cohort_date";

  const canDelete =
    !isCohortDate && (
      ((role === "admin" || role === "staff") && event.type !== "brief") || isPersonal
    );

  const canEdit =
    !isCohortDate && (
      ((role === "admin" || role === "staff") && (event.type === "masterclass" || event.type === "research")) ||
      (role === "student" && isPersonal)
    );

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

  const TypeIcon = style.Icon;

  return (
    <div
      className={cn(
        "rounded-xl p-3",
        style.bg,
        isPersonal && cn("border border-dashed", style.border),
        isCohortDate && cn("border border-dashed", style.border),
        event.isScheduled && "opacity-60 border border-dashed border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeIcon className={cn("h-3 w-3 shrink-0", style.text)} />
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", style.text, style.bg)}>
              {style.label}
            </span>
            {event.isScheduled && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Programme
              </span>
            )}
            {event.cohort_name && (
              <span className="text-[10px] text-muted-foreground">Cohorte {event.cohort_name}</span>
            )}
            {event.formation_name && (
              <span className="text-[10px] text-muted-foreground">• {event.formation_name}</span>
            )}
          </div>
          <p className={cn("mt-1 text-sm font-medium", style.text)}>{event.title}</p>
          {event.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
          )}
          {event.hasExplicitTime && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(event.date, "HH:mm", { locale: fr })}
              {event.duration_minutes && <span>• {event.duration_minutes} min</span>}
            </div>
          )}
        </div>
        {(canEdit || canDelete) && (
          <div className="flex shrink-0 items-center">
            {canEdit && (
              <button
                onClick={() => onEdit(event)}
                aria-label="Modifier l'evenement"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Supprimer l'evenement"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface CreatePersonalEventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  editEvent?: CalendarEvent;
}

const CreatePersonalEventDialog = ({ open, onOpenChange, onSaved, editEvent }: CreatePersonalEventDialogProps) => {
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

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setDescription(editEvent.description ?? "");
        setDate(format(editEvent.date, "yyyy-MM-dd"));
        setTime(editEvent.hasExplicitTime ? format(editEvent.date, "HH:mm") : "");
      } else {
        reset();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !date) return;
    setSaving(true);

    if (editEvent) {
      const { error } = await supabase
        .from("personal_events")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          event_date: date,
          event_time: time || null,
        })
        .eq("id", editEvent.id);

      setSaving(false);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Evenement modifie" });
        onOpenChange(false);
        onSaved();
      }
    } else {
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
        onOpenChange(false);
        onSaved();
      }
    }
  };

  const isEdit = !!editEvent;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Modifier l'evenement" : "Nouvel evenement personnel"}
          </DialogTitle>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEdit ? "Enregistrer" : "Creer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cohortIds?: string[];
  role: string;
  onSaved: () => void;
  editEvent?: CalendarEvent;
}

const CreateEventDialog = ({ open, onOpenChange, cohortIds, role, onSaved, editEvent }: CreateEventDialogProps) => {
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
  const [cohortsError, setCohortsError] = useState(false);

  const { showError, handleBlur, isValid, validateAll, reset: resetValidation } = useFormValidation(
    { cohortId, title, scheduledAt },
    {
      cohortId: { required: "La cohorte est requise." },
      title: { required: "Le titre est requis." },
      scheduledAt: { required: "La date et l'heure sont requises." },
    }
  );

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setType(editEvent.type as "masterclass" | "research");
        setTitle(editEvent.title);
        setDescription(editEvent.description ?? "");
        setScheduledAt(format(editEvent.date, "yyyy-MM-dd'T'HH:mm"));
        setDuration(editEvent.duration_minutes ? String(editEvent.duration_minutes) : "60");
        setCohortId(editEvent.cohort_id ?? "");
      } else {
        setType("masterclass");
        setTitle("");
        setDescription("");
        setScheduledAt("");
        setDuration("60");
        setCohortId("");
      }
      setCohortsError(false);
      resetValidation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const fetchCohorts = async () => {
      setCohortsError(false);
      let query = supabase.from("cohorts").select("id, name, formation:formations(name)").neq("status", "archived");
      if (cohortIds && cohortIds.length > 0) {
        query = query.in("id", cohortIds);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Erreur chargement cohortes du dialog evenement", error);
        setCohortsError(true);
      }
      if (data) setCohorts(data as { id: string; name: string; formation?: { name: string } | null }[]);
    };
    fetchCohorts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortIds?.join(",")]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user) return;
    setSaving(true);

    const table = type === "masterclass" ? "masterclass_sessions" : "research_sessions";

    if (editEvent) {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: scheduledAt,
      };
      if (type === "masterclass") payload.duration_minutes = parseInt(duration) || 60;

      const { error } = await supabase.from(table).update(payload).eq("id", editEvent.id);
      setSaving(false);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Evenement modifie !" });
        onOpenChange(false);
        onSaved();
      }
    } else {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
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
        onOpenChange(false);
        onSaved();
      }
    }
  };

  const isEdit = !!editEvent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Modifier l'evenement" : "Nouvel evenement"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "masterclass" | "research")}
              disabled={isEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masterclass">Masterclass</SelectItem>
                <SelectItem value="research">Recherche</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cohorte <span className="text-destructive">*</span></Label>
            {cohortsError && (
              <p className="text-xs text-destructive">Impossible de charger les cohortes.</p>
            )}
            <Select value={cohortId} onValueChange={setCohortId} disabled={isEdit}>
              <SelectTrigger
                className={cn(showError("cohortId") && "border-destructive")}
                onBlur={() => handleBlur("cohortId")}
              >
                <SelectValue placeholder="Selectionner une cohorte" />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Cohorte {c.name}{c.formation ? ` (${c.formation.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError("cohortId") && (
              <p className="text-xs text-destructive">{showError("cohortId")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Titre <span className="text-destructive">*</span></Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur("title")}
              placeholder="Titre de l'evenement"
              className={cn(showError("title") && "border-destructive")}
            />
            {showError("title") && (
              <p className="text-xs text-destructive">{showError("title")}</p>
            )}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Date et heure <span className="text-destructive">*</span></Label>
            <Input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              onBlur={() => handleBlur("scheduledAt")}
              className={cn(showError("scheduledAt") && "border-destructive")}
            />
            {showError("scheduledAt") && (
              <p className="text-xs text-destructive">{showError("scheduledAt")}</p>
            )}
          </div>
          {type === "masterclass" && (
            <div>
              <Label>Duree (minutes)</Label>
              <Input type="number" min="15" max="480" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          )}
          <Button type="submit" disabled={saving || !isValid} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEdit ? "Enregistrer" : "Creer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardCalendar;
