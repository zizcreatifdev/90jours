import { useState, useEffect } from "react";
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
import { Plus, Loader2, ListTodo, Trash2, MessageSquare, Clock, AlertTriangle, ArrowUp, ArrowRight, ArrowDown } from "lucide-react";

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
  cohort_name: string | null;
  comment_count: number;
}

interface StaffMember {
  user_id: string;
  first_name: string;
  last_name: string;
}

const priorityConfig = {
  high: { label: "Haute", icon: ArrowUp, className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Moyenne", icon: ArrowRight, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { label: "Basse", icon: ArrowDown, className: "bg-muted text-muted-foreground border-border" },
};

const statusConfig = {
  todo: { label: "À faire", className: "bg-secondary text-muted-foreground" },
  in_progress: { label: "En cours", className: "bg-primary/10 text-primary" },
  done: { label: "Terminé", className: "bg-green-500/10 text-green-600" },
};

const TaskManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string; name: string; formation?: { name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
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

  const fetchData = async () => {
    setLoading(true);

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

      // Get assignee names
      const assigneeIds = [...new Set((tasksData as any[]).map((t: any) => t.assigned_to))];
      let nameMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", assigneeIds);
        if (profiles) {
          for (const p of profiles) {
            nameMap[p.user_id] = `${p.first_name} ${p.last_name}`;
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
        cohort_name: t.cohort_id ? cohortMap[t.cohort_id] || null : null,
        comment_count: commentCounts[t.id] || 0,
      })));
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("staff_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_tasks" }, () => {
        fetchData();
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
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase.from("staff_tasks" as any).delete().eq("id", taskId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Tâche supprimée" }); fetchData(); setDetailTask(null); }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from("staff_tasks" as any).update({ status: newStatus }).eq("id", taskId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else fetchData();
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

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false;
    return true;
  });

  const isOverdue = (task: Task) => task.deadline && new Date(task.deadline) < new Date() && task.status !== "done";

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
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="todo">À faire</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="done">Terminé</SelectItem>
            </SelectContent>
          </Select>
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

      {filteredTasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucune tâche trouvée.</p>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
            const PriorityIcon = priority.icon;
            const overdue = isOverdue(task);

            return (
              <div
                key={task.id}
                className={`rounded-xl border bg-card p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${overdue ? "border-destructive/40" : "border-border"}`}
                onClick={() => openDetail(task)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-foreground text-sm truncate">{task.title}</h3>
                      {overdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${priority.className}`}>
                        <PriorityIcon className="h-3 w-3 mr-1" /> {priority.label}
                      </Badge>
                      <Badge variant="secondary" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">→ {task.assignee_name}</span>
                      {task.cohort_name && (
                        <span className="text-xs text-muted-foreground">• {task.cohort_name}</span>
                      )}
                      {task.deadline && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3" /> {new Date(task.deadline).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                      {task.comment_count > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {task.comment_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Select value={task.status} onValueChange={v => handleStatusChange(task.id, v)}>
                      <SelectTrigger className="h-7 w-24 text-xs border-0 bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">À faire</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="done">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                      title="Supprimer cette tâche ?"
                      description="Cette action est irréversible."
                      confirmLabel="Supprimer"
                      onConfirm={() => handleDelete(task.id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={(v) => { if (!v) setDetailTask(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{detailTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {detailTask.description && (
                  <p className="text-sm text-muted-foreground">{detailTask.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className={priorityConfig[detailTask.priority as keyof typeof priorityConfig]?.className}>
                    {priorityConfig[detailTask.priority as keyof typeof priorityConfig]?.label || detailTask.priority}
                  </Badge>
                  <Badge variant="secondary" className={statusConfig[detailTask.status as keyof typeof statusConfig]?.className}>
                    {statusConfig[detailTask.status as keyof typeof statusConfig]?.label || detailTask.status}
                  </Badge>
                  <span className="text-muted-foreground">Assigné à: {detailTask.assignee_name}</span>
                  {detailTask.cohort_name && <span className="text-muted-foreground">Cohorte: {detailTask.cohort_name}</span>}
                  {detailTask.deadline && (
                    <span className={isOverdue(detailTask) ? "text-destructive font-medium" : "text-muted-foreground"}>
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
