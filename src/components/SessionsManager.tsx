import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Video, FlaskConical, Calendar, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionsManagerProps {
  role: "admin" | "staff";
  cohortIds?: string[];
}

interface SessionRow {
  id: string;
  type: "masterclass" | "research";
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes?: number;
  cohort_id: string;
  cohort_name: string;
  formation_name: string | null;
}

interface CohortOption {
  id: string;
  name: string;
  formation_name: string | null;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  masterclass: "Masterclass",
  research: "Recherche",
};

const formatDateTimeFR = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const SessionsManager = ({ role, cohortIds }: SessionsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [cohortOptions, setCohortOptions] = useState<CohortOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCohort, setFilterCohort] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<SessionRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fType, setFType] = useState<"masterclass" | "research">("masterclass");
  const [fCohortId, setFCohortId] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fScheduledAt, setFScheduledAt] = useState("");
  const [fDuration, setFDuration] = useState("60");

  const { showError, handleBlur, isValid, validateAll, reset: resetValidation } = useFormValidation(
    { fCohortId, fTitle, fScheduledAt, fDuration },
    {
      fCohortId: { required: "La cohorte est requise." },
      fTitle: { required: "Le titre est requis." },
      fScheduledAt: { required: "La date et l'heure sont requises." },
      fDuration: {
        validate: (v) => {
          if (fType !== "masterclass") return null;
          const n = Number(v);
          if (!v || isNaN(n) || n < 1) return "Duree invalide (minimum 1 min).";
          return null;
        },
      },
    },
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cohorts } = await supabase
        .from("cohorts")
        .select("id, name, formation_id, formation:formations(id, name)");

      const cohortMap = new Map<string, CohortOption>();
      (cohorts || []).forEach((c: any) => {
        cohortMap.set(c.id, {
          id: c.id,
          name: c.name,
          formation_name: c.formation?.name ?? null,
        });
      });

      let accessibleCohortIds: string[] | null = null;
      if (cohortIds && cohortIds.length > 0) {
        accessibleCohortIds = cohortIds;
      }

      const options = accessibleCohortIds
        ? (cohorts || []).filter((c: any) => accessibleCohortIds!.includes(c.id)).map((c: any) => ({
            id: c.id,
            name: c.name,
            formation_name: c.formation?.name ?? null,
          }))
        : (cohorts || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            formation_name: c.formation?.name ?? null,
          }));
      setCohortOptions(options);

      const allSessions: SessionRow[] = [];

      // Fetch masterclass_sessions
      let mcQ = supabase
        .from("masterclass_sessions")
        .select("id, title, description, scheduled_at, duration_minutes, cohort_id");
      if (accessibleCohortIds && accessibleCohortIds.length > 0) {
        mcQ = mcQ.in("cohort_id", accessibleCohortIds);
      }
      const { data: masterclasses } = await mcQ;
      (masterclasses || []).forEach((m: any) => {
        const info = cohortMap.get(m.cohort_id);
        allSessions.push({
          id: m.id,
          type: "masterclass",
          title: m.title,
          description: m.description ?? null,
          scheduled_at: m.scheduled_at,
          duration_minutes: m.duration_minutes,
          cohort_id: m.cohort_id,
          cohort_name: info?.name ?? m.cohort_id,
          formation_name: info?.formation_name ?? null,
        });
      });

      // Fetch research_sessions
      let rsQ = supabase
        .from("research_sessions")
        .select("id, title, description, scheduled_at, cohort_id");
      if (accessibleCohortIds && accessibleCohortIds.length > 0) {
        rsQ = rsQ.in("cohort_id", accessibleCohortIds);
      }
      const { data: research } = await rsQ;
      (research || []).forEach((r: any) => {
        const info = cohortMap.get(r.cohort_id);
        allSessions.push({
          id: r.id,
          type: "research",
          title: r.title,
          description: r.description ?? null,
          scheduled_at: r.scheduled_at,
          cohort_id: r.cohort_id,
          cohort_name: info?.name ?? r.cohort_id,
          formation_name: info?.formation_name ?? null,
        });
      });

      setSessions(allSessions);
    } catch (err) {
      console.error("Erreur chargement sessions", err);
    } finally {
      setLoading(false);
    }
  }, [cohortIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditSession(null);
    setFType("masterclass");
    setFCohortId(cohortOptions.length === 1 ? cohortOptions[0].id : "");
    setFTitle("");
    setFDescription("");
    setFScheduledAt("");
    setFDuration("60");
    resetValidation();
    setDialogOpen(true);
  };

  const openEdit = (s: SessionRow) => {
    setEditSession(s);
    setFType(s.type);
    setFCohortId(s.cohort_id);
    setFTitle(s.title);
    setFDescription(s.description ?? "");
    setFScheduledAt(toDatetimeLocalValue(s.scheduled_at));
    setFDuration(s.duration_minutes != null ? String(s.duration_minutes) : "60");
    resetValidation();
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user) return;
    setSaving(true);
    try {
      const table = fType === "masterclass" ? "masterclass_sessions" : "research_sessions";
      const scheduled_at = new Date(fScheduledAt).toISOString();

      if (editSession) {
        const payload: Record<string, unknown> = {
          title: fTitle.trim(),
          description: fDescription.trim() || null,
          scheduled_at,
          cohort_id: fCohortId,
          updated_at: new Date().toISOString(),
        };
        if (fType === "masterclass") {
          payload.duration_minutes = parseInt(fDuration) || 60;
        }
        const { error } = await supabase.from(table).update(payload).eq("id", editSession.id);
        if (error) throw error;
        toast({ title: "Session mise a jour." });
      } else {
        const payload: Record<string, unknown> = {
          title: fTitle.trim(),
          description: fDescription.trim() || null,
          scheduled_at,
          cohort_id: fCohortId,
          created_by: user.id,
        };
        if (fType === "masterclass") {
          payload.duration_minutes = parseInt(fDuration) || 60;
        }
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
        toast({ title: "Session creee." });
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: SessionRow) => {
    try {
      const table = s.type === "masterclass" ? "masterclass_sessions" : "research_sessions";
      const { error } = await supabase.from(table).delete().eq("id", s.id);
      if (error) throw error;
      toast({ title: "Session supprimee." });
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  // Apply filters
  const now = new Date();
  const filtered = sessions.filter((s) => {
    if (filterCohort !== "all" && s.cohort_id !== filterCohort) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    return true;
  });

  const upcoming = filtered
    .filter((s) => new Date(s.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const past = filtered
    .filter((s) => new Date(s.scheduled_at) < now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const SessionCard = ({ s }: { s: SessionRow }) => (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Badge
            className={cn(
              "shrink-0 text-xs font-semibold",
              s.type === "masterclass"
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-primary/10 text-primary border-primary/20",
            )}
            variant="outline"
          >
            {s.type === "masterclass" ? (
              <Video className="h-3 w-3 mr-1" />
            ) : (
              <FlaskConical className="h-3 w-3 mr-1" />
            )}
            {SESSION_TYPE_LABELS[s.type]}
          </Badge>
          <span className="text-sm font-semibold text-foreground truncate">{s.title}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEdit(s)}
            aria-label="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Supprimer la session"
            description={`Supprimer "${s.title}" definitivement ?`}
            confirmLabel="Supprimer"
            onConfirm={() => handleDelete(s)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDateTimeFR(s.scheduled_at)}
        </span>
        {s.type === "masterclass" && s.duration_minutes != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {s.duration_minutes} min
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {s.formation_name ? `${s.cohort_name} (${s.formation_name})` : s.cohort_name}
        </span>
      </div>

      {s.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Gestion des sessions</h2>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nouvelle session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCohort} onValueChange={setFilterCohort}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="Toutes les cohortes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les cohortes</SelectItem>
            {cohortOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.formation_name ? ` (${c.formation_name})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="masterclass">Masterclass</SelectItem>
            <SelectItem value="research">Recherche</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
              A venir ({upcoming.length})
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session a venir.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((s) => (
                  <SessionCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Passees ({past.length})
            </h3>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session passee.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
                {past.map((s) => (
                  <SessionCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editSession ? "Modifier la session" : "Nouvelle session"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="sess-type">Type</Label>
              <Select
                value={fType}
                onValueChange={(v) => setFType(v as "masterclass" | "research")}
                disabled={!!editSession}
              >
                <SelectTrigger
                  id="sess-type"
                  className={cn("w-full", editSession && "opacity-60 cursor-not-allowed")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masterclass">Masterclass</SelectItem>
                  <SelectItem value="research">Recherche</SelectItem>
                </SelectContent>
              </Select>
              {editSession && (
                <p className="text-xs text-muted-foreground">
                  Le type ne peut pas etre modifie apres creation.
                </p>
              )}
            </div>

            {/* Cohorte */}
            <div className="space-y-1.5">
              <Label htmlFor="sess-cohort">
                Cohorte <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fCohortId}
                onValueChange={(v) => setFCohortId(v)}
              >
                <SelectTrigger
                  id="sess-cohort"
                  className={cn(showError("fCohortId") && "border-destructive")}
                  onBlur={() => handleBlur("fCohortId")}
                >
                  <SelectValue placeholder="Choisir une cohorte" />
                </SelectTrigger>
                <SelectContent>
                  {cohortOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.formation_name ? ` (${c.formation_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showError("fCohortId") && (
                <p className="text-xs text-destructive">{showError("fCohortId")}</p>
              )}
            </div>

            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="sess-title">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sess-title"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                onBlur={() => handleBlur("fTitle")}
                maxLength={200}
                className={cn(showError("fTitle") && "border-destructive")}
              />
              {showError("fTitle") && (
                <p className="text-xs text-destructive">{showError("fTitle")}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="sess-desc">Description (optionnelle)</Label>
              <Textarea
                id="sess-desc"
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>

            {/* Date et heure */}
            <div className="space-y-1.5">
              <Label htmlFor="sess-at">
                Date et heure <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sess-at"
                type="datetime-local"
                value={fScheduledAt}
                onChange={(e) => setFScheduledAt(e.target.value)}
                onBlur={() => handleBlur("fScheduledAt")}
                className={cn(showError("fScheduledAt") && "border-destructive")}
              />
              {showError("fScheduledAt") && (
                <p className="text-xs text-destructive">{showError("fScheduledAt")}</p>
              )}
            </div>

            {/* Duree (masterclass only) */}
            {fType === "masterclass" && (
              <div className="space-y-1.5">
                <Label htmlFor="sess-dur">
                  Duree (minutes) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sess-dur"
                  type="number"
                  min={1}
                  max={480}
                  value={fDuration}
                  onChange={(e) => setFDuration(e.target.value)}
                  onBlur={() => handleBlur("fDuration")}
                  className={cn(showError("fDuration") && "border-destructive")}
                />
                {showError("fDuration") && (
                  <p className="text-xs text-destructive">{showError("fDuration")}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !isValid}>
                {saving ? "Enregistrement..." : editSession ? "Mettre a jour" : "Creer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionsManager;
