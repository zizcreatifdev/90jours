import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import TaskBoard, { type BoardTask } from "@/components/tasks/TaskBoard";
import { STATUS_CONFIG, PRIORITY_CONFIG, isTaskOverdue, type TaskStatus } from "@/lib/task-config";
import { Loader2, ListTodo, MessageSquare } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string;
  cohort_id: string | null;
  deadline: string | null;
  created_at: string;
  assignee_name: string;
  assignee_avatar_url: string | null;
  cohort_name: string | null;
  comment_count: number;
}

const StaffTasks = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  // Pendant un drag, on suspend le refetch realtime pour eviter la "carte qui saute".
  const isDraggingRef = useRef(false);

  const fetchTasks = async (opts?: { silent?: boolean }) => {
    if (!user) return;
    if (!opts?.silent) setLoading(true);

    const { data: tasksData } = await supabase
      .from("staff_tasks" as any)
      .select("*")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false });

    if (tasksData) {
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

      // Nom + avatar de l'assigne (jointure client-side profiles.user_id).
      // Ici l'assigne est le formateur lui-meme (filtre assigned_to=user.id).
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

      const cohortIds = [...new Set((tasksData as any[]).filter((t: any) => t.cohort_id).map((t: any) => t.cohort_id))];
      let cohortMap: Record<string, string> = {};
      if (cohortIds.length > 0) {
        const { data: ch } = await supabase.from("cohorts").select("id, name").in("id", cohortIds);
        if (ch) { for (const c of ch) cohortMap[c.id] = c.name; }
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

  useEffect(() => { fetchTasks(); }, [user]);

  // Realtime filtre sur SES taches. Pendant un drag, on ignore l'evenement (le
  // refetch global ferait sauter la carte) ; l'update optimiste suffit a
  // l'affichage et l'evenement post-commit reconcilie en silence. Quand l'admin
  // deplace une carte assignee a ce formateur, cet evenement met sa vue a jour.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my_staff_tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_tasks", filter: `assigned_to=eq.${user.id}` }, () => {
        if (isDraggingRef.current) return;
        fetchTasks({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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

  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <ListTodo className="h-5 w-5" /> Mes tâches
          {todoCount > 0 && <Badge variant="secondary" className="ml-1">{todoCount} à faire</Badge>}
          {inProgressCount > 0 && <Badge variant="outline" className="ml-1 bg-primary/10 text-primary">{inProgressCount} en cours</Badge>}
        </h2>
      </div>

      <div className="p-4">
        {/* Le filtre par statut a disparu (les colonnes du Kanban jouent ce role).
            Toutes les taches affichees appartiennent au formateur (filtre
            assigned_to), donc il peut toutes les deplacer : editable=true. */}
        <TaskBoard
          tasks={tasks as BoardTask[]}
          editable
          onStatusChange={handleStatusChange}
          onCardClick={(bt) => { const full = tasks.find(t => t.id === bt.id); if (full) openDetail(full); }}
          onDragStateChange={handleDragStateChange}
        />
      </div>

      {/* Detail Dialog */}
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
                  <Badge variant="outline" className={PRIORITY_CONFIG[detailTask.priority as keyof typeof PRIORITY_CONFIG]?.className}>
                    {PRIORITY_CONFIG[detailTask.priority as keyof typeof PRIORITY_CONFIG]?.label || detailTask.priority}
                  </Badge>
                  <Badge variant="secondary" className={STATUS_CONFIG[detailTask.status as keyof typeof STATUS_CONFIG]?.className}>
                    {STATUS_CONFIG[detailTask.status as keyof typeof STATUS_CONFIG]?.label || detailTask.status}
                  </Badge>
                  {detailTask.cohort_name && <span className="text-muted-foreground">Cohorte: {detailTask.cohort_name}</span>}
                  {detailTask.deadline && (
                    <span className={isTaskOverdue(detailTask.deadline, detailTask.status) ? "text-destructive font-medium" : "text-muted-foreground"}>
                      Deadline: {new Date(detailTask.deadline).toLocaleString("fr-FR")}
                    </span>
                  )}
                </div>

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

export default StaffTasks;
