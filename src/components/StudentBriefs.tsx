import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Loader2, Tag, Send, Link, Paperclip } from "lucide-react";
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
  feedback?: string | null;
  submission_url?: string | null;
  submission_file_url?: string | null;
}

interface StudentBriefsProps {
  cohortId: string;
  formationName?: string;
  formationColor?: string;
}

// ── Skeleton de chargement ────────────────────────────────────────────────────

const BriefsSkeleton = () => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-2.5 w-full mb-2 rounded-full" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full ml-6" />
              <Skeleton className="h-3 w-32 ml-6" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Composant ─────────────────────────────────────────────────────────────────

const StudentBriefs = ({ cohortId, formationName, formationColor }: StudentBriefsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<{ brief: Brief; submission: Submission } | null>(null);
  const [deliverUrl, setDeliverUrl] = useState("");
  const [deliverFile, setDeliverFile] = useState<File | null>(null);
  const [delivering, setDelivering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // QW-07 : descriptions expandables
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const toggleDescription = (id: string) =>
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  // Mark as "Réalisé"
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
      toast({ title: isLate ? `Brief réalisé avec ${delayDays} jour(s) de retard` : "Brief marqué comme réalisé." });
      await refreshSubmissions();
    }
  };

  const handleOpenDeliver = (brief: Brief, submission: Submission) => {
    setDeliverTarget({ brief, submission });
    setDeliverUrl("");
    setDeliverFile(null);
    setDeliverOpen(true);
  };

  const handleDeliverSubmit = async () => {
    if (!user || !deliverTarget) return;
    const { brief, submission } = deliverTarget;
    setDelivering(true);

    let fileUrl: string | null = null;
    if (deliverFile) {
      if (deliverFile.size > 10 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: "Maximum 10 Mo.", variant: "destructive" });
        setDelivering(false);
        return;
      }
      const filePath = `${user.id}/${submission.id}/${deliverFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("brief-submissions")
        .upload(filePath, deliverFile, { upsert: true });
      if (uploadErr) {
        toast({ title: "Erreur lors de l'upload", description: uploadErr.message, variant: "destructive" });
        setDelivering(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("brief-submissions").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }

    const updatePayload: Record<string, unknown> = { status: "delivered" };
    if (deliverUrl.trim()) updatePayload.submission_url = deliverUrl.trim();
    if (fileUrl) updatePayload.submission_file_url = fileUrl;

    const { error } = await supabase.from("brief_submissions").update(updatePayload as any).eq("id", submission.id);
    setDelivering(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: submission.is_late ? `Brief livré avec ${submission.delay_days} jour(s) de retard` : "Brief livré avec succès." });
      setDeliverOpen(false);
      setDeliverTarget(null);

      if (submission.is_late) {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");
        if (admins && admins.length > 0) {
          const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).single();
          const studentName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;
          const notifications = admins.map((a: any) => ({
            user_id: a.user_id,
            title: "Brief livré en retard",
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

  // QW-09 : skeleton pendant le chargement
  if (loading) return <BriefsSkeleton />;

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

            // QW-01 : calcul urgence deadline
            const hoursUntilDeadline = !isPastDeadline
              ? (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)
              : -1;
            const isCritical = !sub && !isPastDeadline && hoursUntilDeadline <= 4;
            const isUrgent = !sub && !isPastDeadline && hoursUntilDeadline <= 18 && !isCritical;

            // QW-07 : description expandable
            const isExpanded = expandedDescriptions.has(brief.id);
            const hasLongDescription = (brief.description?.length ?? 0) > 120;

            return (
              <div key={brief.id} className={cn("rounded-xl border p-4 transition-all",
                isDelivered
                  ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                  : isCompleted
                  ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                  : "border-border bg-card"
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Icône statut */}
                      {isDelivered ? (
                        <Send className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : isPastDeadline ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                      )}

                      {/* Titre */}
                      <h3 className={cn("font-display font-semibold text-sm",
                        isDelivered ? "text-green-700 dark:text-green-400"
                        : isCompleted ? "text-blue-700 dark:text-blue-400"
                        : "text-foreground"
                      )}>
                        {brief.title}
                      </h3>

                      {/* QW-01 : Badge urgence deadline */}
                      {(isCritical || isUrgent) && (
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold animate-pulse",
                          isCritical
                            ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400"
                        )}>
                          {Math.round(hoursUntilDeadline)}h
                        </span>
                      )}

                      {/* Catégorie */}
                      {brief.category_name && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Tag className="h-3 w-3" /> {brief.category_name}
                        </Badge>
                      )}

                      {/* Fréquence */}
                      {brief.brief_frequency && (
                        <Badge variant="outline" className="text-xs">
                          {brief.brief_frequency === "daily" ? "Journalier" : "Hebdomadaire"}
                        </Badge>
                      )}
                    </div>

                    {/* QW-07 : Description expandable */}
                    {brief.description && (
                      <div className="ml-6">
                        <p className={cn(
                          "text-xs text-muted-foreground mb-0.5",
                          hasLongDescription && !isExpanded ? "line-clamp-2" : ""
                        )}>
                          {brief.description}
                        </p>
                        {hasLongDescription && (
                          <button
                            onClick={() => toggleDescription(brief.id)}
                            className="text-xs text-accent hover:underline mb-1.5"
                          >
                            {isExpanded ? "Réduire" : "Lire plus"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Deadline + statut */}
                    <div className="ml-6 flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>Deadline : {deadlineDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {sub?.is_late && (
                        <span className="text-orange-500 font-medium">{sub.delay_days} jour(s) de retard</span>
                      )}
                      {isDelivered && !sub?.is_late && (
                        <span className="text-green-600 font-medium">Livré à temps</span>
                      )}
                      {isCompleted && (
                        <span className="text-blue-500 font-medium">En attente de livraison</span>
                      )}
                    </div>

                    {/* Liens de livraison */}
                    {isDelivered && (sub?.submission_url || sub?.submission_file_url) && (
                      <div className="ml-6 mt-1 flex items-center gap-3">
                        {sub.submission_url && (
                          <a href={sub.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                            <Link className="h-3 w-3" /> Livrable
                          </a>
                        )}
                        {sub.submission_file_url && (
                          <a href={sub.submission_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                            <Paperclip className="h-3 w-3" /> Fichier joint
                          </a>
                        )}
                      </div>
                    )}

                    {/* Feedback formateur */}
                    {sub?.feedback && (
                      <div className="ml-6 mt-2 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-0.5">Feedback formateur</p>
                        <p className="text-xs text-foreground/80">{sub.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action */}
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
                        onClick={() => handleOpenDeliver(brief, sub)}
                        disabled={submitting === brief.id}
                      >
                        <Send className="mr-1 h-3.5 w-3.5" /> Livrer
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

      {/* Delivery dialog */}
      <Dialog open={deliverOpen} onOpenChange={open => { setDeliverOpen(open); if (!open) { setDeliverUrl(""); setDeliverFile(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Livrer le brief</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="deliver-url">Lien vers le livrable (Figma, GitHub, Notion...)</Label>
              <Input
                id="deliver-url"
                value={deliverUrl}
                onChange={e => setDeliverUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div>
              <Label htmlFor="deliver-file">Ou joindre un fichier (PDF, image, ZIP - max 10 Mo)</Label>
              <Input
                id="deliver-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.zip,.sketch,.xd,.ai"
                onChange={e => setDeliverFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {deliverFile && (
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {deliverFile.name}
                </p>
              )}
            </div>
            <Button onClick={handleDeliverSubmit} disabled={delivering} className="w-full">
              {delivering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Livrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentBriefs;
