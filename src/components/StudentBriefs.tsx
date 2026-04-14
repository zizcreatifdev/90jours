import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Loader2, Tag, Send } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

interface Brief {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  created_at: string;
  category_name?: string;
  brief_frequency?: string | null;
}

interface Submission {
  id: string;
  brief_id: string;
  is_late: boolean;
  delay_days: number;
  completed_at: string;
  status: string;
}

interface StudentBriefsProps {
  cohortId: string;
  formationName?: string;
  formationColor?: string;
}

const StudentBriefs = ({ cohortId, formationName, formationColor }: StudentBriefsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const refreshSubmissions = async () => {
    if (!user) return;
    const { data } = await supabase.from("brief_submissions").select("*").eq("user_id", user.id);
    if (data) setSubmissions(data as Submission[]);
  };

  useEffect(() => {
    if (!user || !cohortId) return;
    const fetch = async () => {
      const [briefsRes, subsRes] = await Promise.all([
        supabase.from("briefs").select("*, brief_categories(name)").eq("cohort_id", cohortId).lte("publish_at", new Date().toISOString()).order("deadline", { ascending: true }),
        supabase.from("brief_submissions").select("*").eq("user_id", user.id),
      ]);
      if (briefsRes.data) setBriefs(briefsRes.data.map((b: any) => ({ ...b, category_name: b.brief_categories?.name, brief_frequency: b.brief_frequency })) as Brief[]);
      if (subsRes.data) setSubmissions(subsRes.data as Submission[]);
      setLoading(false);
    };
    fetch();
  }, [user, cohortId]);

  // Mark as "Réalisé" (completed but not delivered)
  const handleMarkCompleted = async (brief: Brief) => {
    if (!user) return;
    setSubmitting(brief.id);
    const now2 = new Date();
    const deadline = new Date(brief.deadline);
    const isLate = now2 > deadline;
    const delayDays = isLate ? Math.ceil((now2.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const { error } = await supabase.from("brief_submissions").insert({
      brief_id: brief.id,
      user_id: user.id,
      is_late: isLate,
      delay_days: delayDays,
      status: "completed",
    });
    setSubmitting(null);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Déjà marqué", description: "Vous avez déjà soumis ce brief.", variant: "destructive" });
      } else {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: isLate ? `Brief réalisé avec ${delayDays} jour(s) de retard` : "Brief marqué comme réalisé ✓" });
      await refreshSubmissions();
    }
  };

  // Mark as "Livré" (delivered to formateur)
  const handleDeliver = async (brief: Brief, submission: Submission) => {
    if (!user) return;
    setSubmitting(brief.id);

    const { error } = await supabase.from("brief_submissions").update({ status: "delivered" }).eq("id", submission.id);
    setSubmitting(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: submission.is_late ? `Brief livré avec ${submission.delay_days} jour(s) de retard` : "Brief livré avec succès ! 🎉" });

      // Notify admins if late
      if (submission.is_late) {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");
        if (admins && admins.length > 0) {
          const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).single();
          const studentName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;
          const notifications = admins.map((a: any) => ({
            user_id: a.user_id,
            title: "⚠️ Brief livré en retard",
            message: `${studentName} a livré le brief "${brief.title}" avec ${submission.delay_days} jour(s) de retard.`,
            type: "urgent",
            created_by: user.id,
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }

      await refreshSubmissions();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const deliveredCount = submissions.filter(s => s.status === "delivered").length;
  const completedCount = submissions.filter(s => s.status === "completed").length;
  const totalBriefs = briefs.length;
  const progressPercent = totalBriefs > 0 ? Math.round((deliveredCount / totalBriefs) * 100) : 0;
  const lateCount = submissions.filter(s => s.is_late).length;
  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Mes briefs
            {formationName && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: formationColor || 'hsl(var(--accent))' }}>
                {formationName}
              </span>
            )}
          </h2>
          <span className="text-sm font-medium text-muted-foreground">{deliveredCount}/{totalBriefs} livrés</span>
        </div>
        <Progress value={progressPercent} className="h-2.5 mb-2" />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Send className="h-3.5 w-3.5 text-green-600" /> {deliveredCount} livrés</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> {completedCount} réalisés</span>
          {lateCount > 0 && <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> {lateCount} en retard</span>}
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {totalBriefs - submissions.length} restants</span>
        </div>
      </div>

      {/* Briefs list */}
      {briefs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun brief pour l'instant"
          description="Vos briefs apparaîtront ici dès qu'ils seront publiés par votre formateur."
        />
      ) : (
        <div className="space-y-3">
          {briefs.map(brief => {
            const sub = submissions.find(s => s.brief_id === brief.id);
            const deadlineDate = new Date(brief.deadline);
            const isPastDeadline = deadlineDate < now;
            const isCompleted = sub?.status === "completed";
            const isDelivered = sub?.status === "delivered";

            return (
              <div key={brief.id} className={`rounded-xl border p-4 transition-all ${
                isDelivered
                  ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                  : isCompleted
                  ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                  : "border-border bg-card"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isDelivered ? (
                        <Send className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : isPastDeadline ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                      )}
                      <h3 className={`font-display font-semibold text-sm ${
                        isDelivered ? "text-green-700 dark:text-green-400"
                        : isCompleted ? "text-blue-700 dark:text-blue-400"
                        : "text-foreground"
                      }`}>
                        {brief.title}
                      </h3>
                      {brief.category_name && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Tag className="h-3 w-3" /> {brief.category_name}
                        </Badge>
                      )}
                      {brief.brief_frequency && (
                        <Badge variant="outline" className="text-xs">
                          {brief.brief_frequency === "daily" ? "📅 Journalier" : "📆 Hebdomadaire"}
                        </Badge>
                      )}
                    </div>
                    {brief.description && <p className="text-xs text-muted-foreground mb-1.5 ml-6">{brief.description}</p>}
                    <div className="ml-6 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Deadline : {deadlineDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {sub?.is_late && (
                        <span className="text-orange-500 font-medium">⚠ {sub.delay_days} jour(s) de retard</span>
                      )}
                      {isDelivered && !sub?.is_late && (
                        <span className="text-green-600 font-medium">✓ Livré à temps</span>
                      )}
                      {isCompleted && (
                        <span className="text-blue-500 font-medium">⏳ En attente de livraison</span>
                      )}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-shrink-0 gap-2">
                    {!sub && (
                      <Button
                        size="sm"
                        variant={isPastDeadline ? "outline" : "secondary"}
                        onClick={() => handleMarkCompleted(brief)}
                        disabled={submitting === brief.id}
                      >
                        {submitting === brief.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Réalisé</>}
                      </Button>
                    )}
                    {isCompleted && sub && (
                      <Button
                        size="sm"
                        onClick={() => handleDeliver(brief, sub)}
                        disabled={submitting === brief.id}
                      >
                        {submitting === brief.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-3.5 w-3.5" /> Livrer</>}
                      </Button>
                    )}
                    {isDelivered && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <Send className="mr-1 h-3 w-3" /> Livré
                      </Badge>
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

export default StudentBriefs;
