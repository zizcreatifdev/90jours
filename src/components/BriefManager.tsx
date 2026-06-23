import { useState, useEffect } from "react";
import { sendPushToUsers } from "@/hooks/use-push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCohorts } from "@/hooks/use-cohorts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, ClipboardList, CheckCircle2, Clock, AlertTriangle, Tag, MessageSquare, ChevronDown, ChevronUp, Save } from "lucide-react";

interface BriefCategory {
  id: string;
  name: string;
}

interface Brief {
  id: string;
  cohort_id: string;
  title: string;
  description: string | null;
  deadline: string;
  publish_at: string;
  created_at: string;
  category_id: string | null;
  brief_frequency: string | null;
  category?: BriefCategory;
}

interface BriefSubmission {
  id: string;
  brief_id: string;
  user_id: string;
  completed_at: string;
  is_late: boolean;
  delay_days: number;
  status?: string;
  feedback?: string | null;
}

interface BriefManagerProps {
  cohortId?: string;
  role: "admin" | "staff";
}

const BriefManager = ({ cohortId, role }: BriefManagerProps) => {
  const { cohorts } = useCohorts();
  const { user } = useAuth();
  const { toast } = useToast();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [submissions, setSubmissions] = useState<BriefSubmission[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState(cohortId || "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [briefFrequency, setBriefFrequency] = useState("");
  const [categories, setCategories] = useState<BriefCategory[]>([]);
  const [expandedBriefs, setExpandedBriefs] = useState<Set<string>>(new Set());
  const [feedbackEdits, setFeedbackEdits] = useState<Record<string, string>>({});
  const [savingFeedback, setSavingFeedback] = useState<Set<string>>(new Set());

  const { showError, handleBlur, isValid, validateAll, reset } = useFormValidation(
    { title, deadline },
    {
      title: { required: "Le titre est requis." },
      deadline: { required: "La date limite est requise." },
    },
  );

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    supabase.from("brief_categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data as BriefCategory[]);
    });
  }, []);

  useEffect(() => {
    if (cohortId && !selectedCohort) setSelectedCohort(cohortId);
  }, [cohortId]);

  useEffect(() => {
    if (!selectedCohort) { setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      const [briefsRes, studentsRes] = await Promise.all([
        supabase.from("briefs").select("*, brief_categories(id, name)").eq("cohort_id", selectedCohort).order("deadline", { ascending: true }),
        supabase.from("enrollments").select("user_id").eq("cohort_id", selectedCohort),
      ]);
      const briefsData = (briefsRes.data || []).map((b: any) => ({ ...b, category: b.brief_categories })) as Brief[];
      setBriefs(briefsData);
      if (studentsRes.data) {
        // Filter to students only
        const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
        const studentIds = new Set((studentRoles || []).map((r: any) => r.user_id));
        const enrolledStudents = studentsRes.data.filter((s: any) => studentIds.has(s.user_id));
        // Pas de FK enrollments -> profiles : jointure cote client via Map sur user_id
        const userIds = [...new Set(enrolledStudents.map((s: any) => s.user_id).filter(Boolean))];
        let profileMap = new Map<string, { first_name: string; last_name: string }>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, first_name, last_name")
            .in("user_id", userIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, { first_name: p.first_name, last_name: p.last_name }]));
        }
        setStudents(enrolledStudents.map((s: any) => ({ ...s, profiles: profileMap.get(s.user_id) ?? null })));
      }

      if (briefsData.length > 0) {
        const briefIds = briefsData.map(b => b.id);
        const { data: subs } = await supabase.from("brief_submissions").select("*").in("brief_id", briefIds);
        setSubmissions((subs || []) as BriefSubmission[]);
      }
      setLoading(false);
    };
    fetch();
  }, [selectedCohort]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!selectedCohort || !user) return;
    setSaving(true);
    const { data: newBrief, error } = await supabase.from("briefs").insert({
      cohort_id: selectedCohort,
      title,
      description: description || null,
      deadline: new Date(deadline).toISOString(),
      publish_at: publishAt ? new Date(publishAt).toISOString() : new Date().toISOString(),
      created_by: user.id,
      category_id: categoryId || null,
      brief_frequency: briefFrequency || null,
    } as any).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: publishAt && new Date(publishAt) > new Date() ? "Brief programmé !" : "Brief publié !" });

      // Send push to enrolled students if published now
      if (!publishAt || new Date(publishAt) <= new Date()) {
        const studentIds = students.map((s: any) => s.user_id);
        sendPushToUsers(studentIds, `Nouveau brief : ${title}`, description?.substring(0, 200) || "Un nouveau brief a été ajouté.");
      }

      setTitle(""); setDescription(""); setDeadline(""); setPublishAt(""); setCategoryId(""); setBriefFrequency(""); setOpen(false);
      const { data } = await supabase.from("briefs").select("*").eq("cohort_id", selectedCohort).order("deadline", { ascending: true });
      if (data) setBriefs(data as Brief[]);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("briefs").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setBriefs(prev => prev.filter(b => b.id !== id));
  };

  const toggleBriefExpanded = (briefId: string) => {
    setExpandedBriefs(prev => {
      const next = new Set(prev);
      if (next.has(briefId)) next.delete(briefId);
      else next.add(briefId);
      return next;
    });
  };

  const handleSaveFeedback = async (submissionId: string, userId: string, briefTitle: string, feedback: string) => {
    setSavingFeedback(prev => new Set(prev).add(submissionId));
    const { error } = await supabase.from("brief_submissions").update({ feedback }).eq("id", submissionId);
    setSavingFeedback(prev => { const next = new Set(prev); next.delete(submissionId); return next; });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, feedback } : s));
      if (feedback.trim()) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Feedback formateur",
          message: `Votre formateur a laissé un commentaire sur le brief "${briefTitle}".`,
          type: "feedback",
          created_by: user?.id,
        });
      }
      toast({ title: "Feedback sauvegardé", description: feedback.trim() ? "L'étudiant a été notifié." : undefined });
    }
  };

  const getSubmissionStats = (briefId: string) => {
    const briefSubs = submissions.filter(s => s.brief_id === briefId);
    const total = students.length;
    const completed = briefSubs.length;
    const late = briefSubs.filter(s => s.is_late).length;
    return { total, completed, late, onTime: completed - late };
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Cohort selector for admin */}
      {role === "admin" && (
        <div className="flex items-center gap-4">
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner une cohorte" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  Cohorte {c.name}{c.formation ? ` (${c.formation.name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!selectedCohort ? (
        <p className="text-center text-sm text-muted-foreground py-12">Sélectionnez une cohorte pour gérer les briefs.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Briefs ({briefs.length})
            </h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nouveau brief</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Publier un brief</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                  <div>
                    <RequiredLabel required>Titre</RequiredLabel>
                    <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => handleBlur("title")} aria-invalid={!!showError("title")} placeholder="Ex: Création d'un logo" />
                    <FieldError message={showError("title")} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails du brief..." rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Catégorie</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fréquence</Label>
                      <Select value={briefFrequency} onValueChange={setBriefFrequency}>
                        <SelectTrigger><SelectValue placeholder="Standard" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Journalier</SelectItem>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Date de publication</Label>
                    <Input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Laisser vide pour publier immédiatement</p>
                  </div>
                  <div>
                    <RequiredLabel required>Date limite</RequiredLabel>
                    <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} onBlur={() => handleBlur("deadline")} aria-invalid={!!showError("deadline")} />
                    <FieldError message={showError("deadline")} />
                  </div>
                  <Button type="submit" disabled={saving || !isValid} className="w-full">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Publier
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : briefs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Aucun brief publié pour cette cohorte.</p>
          ) : (
            <div className="space-y-3">
              {briefs.map(brief => {
                const stats = getSubmissionStats(brief.id);
                const deadlineDate = new Date(brief.deadline);
                const isPast = deadlineDate < now;
                const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                return (
                  <div key={brief.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-card transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-display font-semibold text-foreground">{brief.title}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isPast ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"}`}>
                            <Clock className="h-3 w-3" />
                            {isPast ? "Terminé" : "En cours"}
                          </span>
                          {brief.category && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Tag className="h-3 w-3" /> {brief.category.name}
                            </Badge>
                          )}
                          {brief.brief_frequency && (
                            <Badge variant="outline" className="text-xs">
                              {brief.brief_frequency === "daily" ? "Journalier" : "Hebdomadaire"}
                            </Badge>
                          )}
                        </div>
                        {brief.description && <p className="text-sm text-muted-foreground mb-2">{brief.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {new Date(brief.publish_at) > now && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 font-medium">
                              Programmé : {new Date(brief.publish_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          <span>Deadline : {deadlineDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <ConfirmDialog
                        trigger={<button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>}
                        title="Supprimer ce brief ?"
                        description="Toutes les soumissions associées seront également supprimées."
                        confirmLabel="Supprimer"
                        onConfirm={() => handleDelete(brief.id)}
                      />
                    </div>
                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Progress value={completionRate} className="h-1.5 w-24" />
                        <span className="text-xs text-muted-foreground">{stats.completed}/{stats.total}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {stats.onTime} à temps
                      </div>
                      {stats.late > 0 && (
                        <div className="flex items-center gap-1 text-xs text-orange-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> {stats.late} en retard
                        </div>
                      )}
                    </div>

                    {/* Feedback inline per submission */}
                    {students.length > 0 && (() => {
                      const briefSubs = submissions.filter(s => s.brief_id === brief.id);
                      const isExpanded = expandedBriefs.has(brief.id);
                      return (
                        <div className="mt-3 border-t border-border/50 pt-3">
                          <button
                            onClick={() => toggleBriefExpanded(brief.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Feedback ({briefSubs.length}/{students.length} soumissions)</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 space-y-2">
                              {students.map((student: any) => {
                                const sub = briefSubs.find(s => s.user_id === student.user_id);
                                const profile = student.profiles as { first_name: string; last_name: string } | null;
                                const profileName = profile ? `${profile.first_name} ${profile.last_name}` : student.user_id;
                                const currentFeedback = sub ? (feedbackEdits[sub.id] ?? sub.feedback ?? "") : "";
                                return (
                                  <div key={student.user_id} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-foreground">{profileName}</span>
                                      {sub ? (
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                          sub.status === "delivered"
                                            ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                        }`}>
                                          {sub.status === "delivered" ? "Livré" : "Réalisé"}
                                        </span>
                                      ) : (
                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                                          Non soumis
                                        </span>
                                      )}
                                    </div>
                                    {sub && (
                                      <div className="flex gap-2">
                                        <Textarea
                                          value={currentFeedback}
                                          onChange={e => setFeedbackEdits(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                          placeholder="Laisser un commentaire..."
                                          className="flex-1 text-xs min-h-0 py-1.5 resize-none"
                                          rows={2}
                                        />
                                        <button
                                          onClick={() => handleSaveFeedback(sub.id, sub.user_id, brief.title, currentFeedback)}
                                          disabled={savingFeedback.has(sub.id)}
                                          className="self-end flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                          {savingFeedback.has(sub.id)
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Save className="h-3.5 w-3.5" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BriefManager;
