import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import TaskBoard, { type BoardTask } from "@/components/tasks/TaskBoard";
import { STATUS_CONFIG, PRIORITY_CONFIG, isTaskOverdue, type TaskStatus } from "@/lib/task-config";
import { Plus, Loader2, ListTodo, Trash2, MessageSquare } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string;
  assigned_by: string;
  cohort_id: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  assignee_name: string;
  assignee_avatar_url: string | null;
  cohort_name: string | null;
  comment_count: number;
}

interface StaffMember {
  user_id: string;
  first_name: string;
  last_name: string;
}

const TaskManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string; name: string; formation?: { name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("all");
  // Pendant un drag, on suspend le refetch realtime pour eviter la "carte qui saute".
  const isDraggingRef = useRef(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    cohort_id: "",
    deadline: "",
  });

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { title: form.title, priority: form.priority, assigned_to: form.assigned_to },
    {
      title: { required: "Le titre est requis." },
      priority: { required: "La priorité est requise." },
      assigned_to: { required: "Veuillez choisir un membre du staff." },
    },
  );

  const fetchData = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);

    // Fetch staff members
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "staff" as any);
    const staffIds = staffRoles?.map((r: any) => r.user_id) || [];

    if (staffIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", staffIds);
      if (profiles) setStaffMembers(profiles);
    }

    // Fetch cohorts
    const { data: cohortsData } = await supabase.from("cohorts").select("id, name, formation:formations(name)").order("name");
    if (cohortsData) setCohorts(cohortsData as any);

    // Fetch tasks
    const { data: tasksData } = await supabase
      .from("staff_tasks" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (tasksData) {
      // Fetch comment counts
      const taskIds = (tasksData as any[]).map((t: any) => t.id);
      let commentCounts: Record<string, number> = {};
      if (taskIds.length > 0) {
        const { data: commentsData } = await supabase
          .from("staff_task_comments" as any)
          .select("task_id")
          .in("task_id", taskIds);
        if (commentsData) {
          for (const c of commentsData as any[]) {
            commentCounts[c.task_id] = (commentCounts[c.task_id] || 0) + 1;
          }
        }
      }

      // Get assignee names + avatars (jointure client-side profiles.user_id)
      const assigneeIds = [...new Set((tasksData as any[]).map((t: any) => t.assigned_to))];
      let nameMap: Record<string, string> = {};
      let avatarMap: Record<string, string | null> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, avatar_url")
          .in("user_id", assigneeIds);
        if (profiles) {
          for (const p of profiles) {
            nameMap[p.user_id] = `${p.first_name} ${p.last_name}`;
            avatarMap[p.user_id] = (p as { avatar_url: string | null }).avatar_url || null;
          }
        }
      }

      // Get cohort names
      const cohortIds = [...new Set((tasksData as any[]).filter((t: any) => t.cohort_id).map((t: any) => t.cohort_id))];
      let cohortMap: Record<string, string> = {};
      if (cohortIds.length > 0) {
        const { data: ch } = await supabase.from("cohorts").select("id, name").in("id", cohortIds);
        if (ch) {
          for (const c of ch) cohortMap[c.id] = c.name;
        }
      }

      setTasks((tasksData as any[]).map((t: any) => ({
        ...t,
        assignee_name: nameMap[t.assigned_to] || "Inconnu",
        assignee_avatar_url: avatarMap[t.assigned_to] || null,
        cohort_name: t.cohort_id ? cohortMap[t.cohort_id] || null : null,
        comment_count: commentCounts[t.id] || 0,
      })));
    }

    if (!opts?.silent) setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime subscription. Pendant un drag, on ignore l'evenement (le refetch
  // global rebatirait le tableau et ferait sauter la carte en cours). L'update
  // optimiste suffit a l'affichage ; l'evenement de notre propre update (emis
  // une fois le drag termine et le commit DB effectue) reconcilie en silence.
  useEffect(() => {
    const channel = supabase
      .channel("staff_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_tasks" }, () => {
        if (isDraggingRef.current) return;
        fetchData({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!user) return;
    setSaving(true);

    const body: any = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      assigned_to: form.assigned_to,
      assigned_by: user.id,
    };
    if (form.cohort_id) body.cohort_id = form.cohort_id;
    if (form.deadline) body.deadline = new Date(form.deadline).toISOString();

    const { error } = await supabase.from("staff_tasks" as any).insert(body);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      // Send notification
      const assignee = staffMembers.find(s => s.user_id === form.assigned_to);
      await supabase.from("notifications").insert({
        user_id: form.assigned_to,
        title: "Nouvelle tâche assignée",
        message: `"${form.title}" vous a été assignée.`,
        type: "info",
        created_by: user.id,
      });

      toast({ title: "Tâche créée !" });
      setOpen(false);
      setForm({ title: "", description: "", priority: "medium", assigned_to: "", cohort_id: "", deadline: "" });
      reset();
      fetchData({ silent: true });
    }
    setSaving(false);
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase.from("staff_tasks" as any).delete().eq("id", taskId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Tâche supprimée" }); fetchData({ silent: true }); setDetailTask(null); }
  };

  // Update optimiste : on deplace la carte localement immediatement, puis on
  // persiste. En cas d'erreur DB, on restaure l'etat precedent.
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const previous = tasks;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    const { error } = await supabase.from("staff_tasks" as any).update({ status: newStatus }).eq("id", taskId);
    if (error) {
      setTasks(previous);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleDragStateChange = (dragging: boolean) => {
    isDraggingRef.current = dragging;
  };

  const openDetail = async (task: Task) => {
    setDetailTask(task);
    setCommentLoading(true);
    const { data } = await supabase
      .from("staff_task_comments" as any)
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    if (data) {
      const authorIds = [...new Set((data as any[]).map((c: any) => c.author_id))];
      let nameMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", authorIds);
        if (profiles) {
          for (const p of profiles) nameMap[p.user_id] = `${p.first_name} ${p.last_name}`;
        }
      }
      setComments((data as any[]).map((c: any) => ({ ...c, author_name: nameMap[c.author_id] || "Inconnu" })));
    }
    setCommentLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !detailTask || !user) return;
    const { error } = await supabase.from("staff_task_comments" as any).insert({
      task_id: detailTask.id,
      author_id: user.id,
      content: newComment.trim(),
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      setNewComment("");
      openDetail(detailTask);
    }
  };

  // Le filtre par statut a disparu (les colonnes du Kanban jouent ce role) ;
  // on conserve le filtre par formateur, utile cote admin ou tout le staff est melange.
  const filteredTasks = tasks.filter(t => {
    if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false;
    return true;
  });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <ListTodo className="h-5 w-5" /> Tâches assignées
        </h2>
        <div className="flex items-center gap-2">
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout le staff</SelectItem>
              {staffMembers.map(s => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-1.5 h-4 w-4" /> Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Assigner une tâche</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div>
                  <RequiredLabel required>Titre</RequiredLabel>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} onBlur={() => handleBlur("title")} aria-invalid={!!showError("title")} placeholder="Ex: Corriger les briefs semaine 3" />
                  <FieldError message={showError("title")} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Détails de la tâche..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel required>Assigné à</RequiredLabel>
                    <Select value={form.assigned_to} onValueChange={v => { setForm({ ...form, assigned_to: v }); handleBlur("assigned_to"); }}>
                      <SelectTrigger aria-invalid={!!showError("assigned_to")}><SelectValue placeholder="Choisir un staff" /></SelectTrigger>
                      <SelectContent>
                        {staffMembers.map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={showError("assigned_to")} />
                  </div>
                  <div>
                    <RequiredLabel required>Priorité</RequiredLabel>
                    <Select value={form.priority} onValueChange={v => { setForm({ ...form, priority: v }); handleBlur("priority"); }}>
                      <SelectTrigger aria-invalid={!!showError("priority")}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="low">Basse</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError message={showError("priority")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cohorte <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                    <Select value={form.cohort_id} onValueChange={v => setForm({ ...form, cohort_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                      <SelectContent>
                        {cohorts.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}{c.formation ? ` (${c.formation.name})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Deadline <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                    <Input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" disabled={saving || !isValid} className="w-full">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Créer la tâche
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TaskBoard
        tasks={filteredTasks as BoardTask[]}
        editable
        onStatusChange={handleStatusChange}
        onCardClick={(bt) => { const full = tasks.find(t => t.id === bt.id); if (full) openDetail(full); }}
        onDragStateChange={handleDragStateChange}
      />

      {/* Task Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={(v) => { if (!v) setDetailTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center justify-between gap-3 pr-6">
                  <span>{detailTask.title}</span>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Supprimer cette tâche ?"
                    description="Cette action est irréversible."
                    confirmLabel="Supprimer"
                    onConfirm={() => handleDelete(detailTask.id)}
                  />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {detailTask.description && (
                  <p className="text-sm text-muted-foreground">{detailTask.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className={PRIORITY_CONFIG[detailTask.priority as keyof typeof PRIORITY_CONFIG]?.className}>
                    {PRIORITY_CONFIG[detailTask.priority as keyof typeof PRIORITY_CONFIG]?.label || detailTask.priority}
                  </Badge>
                  <Badge variant="secondary" className={STATUS_CONFIG[detailTask.status as keyof typeof STATUS_CONFIG]?.className}>
                    {STATUS_CONFIG[detailTask.status as keyof typeof STATUS_CONFIG]?.label || detailTask.status}
                  </Badge>
                  <span className="text-muted-foreground">Assigné à: {detailTask.assignee_name}</span>
                  {detailTask.cohort_name && <span className="text-muted-foreground">Cohorte: {detailTask.cohort_name}</span>}
                  {detailTask.deadline && (
                    <span className={isTaskOverdue(detailTask.deadline, detailTask.status) ? "text-destructive font-medium" : "text-muted-foreground"}>
                      Deadline: {new Date(detailTask.deadline).toLocaleString("fr-FR")}
                    </span>
                  )}
                </div>

                {/* Comments */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Commentaires
                  </h4>
                  {commentLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Aucun commentaire.</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {comments.map((c: any) => (
                        <div key={c.id} className="rounded-lg bg-secondary/50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
                            <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("fr-FR")}</span>
                          </div>
                          <p className="text-sm text-foreground">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Ajouter un commentaire..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                      Envoyer
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManager;
