import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCohorts, type CohortRow } from "@/hooks/use-cohorts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Users, Calendar, Loader2, CheckCircle, AlertCircle, Bell } from "lucide-react";

interface UserEnrollment {
  cohort_id: string;
  cohorts: { status: string; end_date: string } | null;
}

const StudentFormations = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { cohorts, loading: cohortsLoading } = useCohorts();

  const [enrolledCohortIds, setEnrolledCohortIds] = useState<Set<string>>(new Set());
  const [activeEnrollmentCount, setActiveEnrollmentCount] = useState(0);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [waitlistCohort, setWaitlistCohort] = useState<CohortRow | null>(null);
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccessIds, setWaitlistSuccessIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const fetchEnrollments = async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("cohort_id, cohorts:cohort_id(status, end_date)")
        .eq("user_id", user.id);

      if (data) {
        const rows = data as unknown as UserEnrollment[];
        const ids = new Set(rows.map(e => e.cohort_id));
        setEnrolledCohortIds(ids);
        const today = new Date();
        const activeCount = rows.filter(e => {
          const c = e.cohorts;
          return (
            c !== null &&
            c.status !== "archived" &&
            c.status !== "completed" &&
            new Date(c.end_date) >= today
          );
        }).length;
        setActiveEnrollmentCount(activeCount);
      }
      setEnrollmentsLoading(false);
    };
    fetchEnrollments();
  }, [user]);

  // Non-archived cohorts the user is not already enrolled in
  const availableCohorts = cohorts.filter(
    c => c.status !== "archived" && !enrolledCohortIds.has(c.id)
  );

  const atLimit = activeEnrollmentCount >= 2;

  const handleEnroll = async (cohort: CohortRow) => {
    if (!user || atLimit) return;
    setEnrollingId(cohort.id);
    try {
      // Server-side capacity check (mirrors Register.tsx)
      const [{ data: serverCount }, { data: cohortData }] = await Promise.all([
        supabase.rpc("get_cohort_enrollment_count", { cohort_uuid: cohort.id }),
        supabase.from("cohorts").select("capacity").eq("id", cohort.id).single(),
      ]);

      if (cohortData && serverCount != null && serverCount >= cohortData.capacity) {
        toast({ title: "Cohorte complete", description: "Il n'y a plus de places disponibles.", variant: "destructive" });
        setEnrollingId(null);
        return;
      }

      const { error: enrollError } = await supabase.from("enrollments").insert({
        user_id: user.id,
        cohort_id: cohort.id,
      });
      if (enrollError) throw enrollError;

      // Add student role if not already assigned (non-blocking, ignore duplicate)
      void supabase.from("user_roles")
        .insert({ user_id: user.id, role: "student" as const })
        .then(() => {});

      // Welcome email (non-blocking)
      const formationLabel = cohort.formation?.name
        ? `${cohort.formation.name}, cohorte ${cohort.name}`
        : `cohorte ${cohort.name}`;
      const recipientName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
      void supabase.functions
        .invoke("send-email", {
          body: {
            to: { email: user.email ?? "", name: recipientName || undefined },
            template: "welcome",
            variables: { prenom: profile?.first_name || "", formation: formationLabel },
          },
        })
        .catch(() => {});

      // Redirect to contract signing or dashboard
      const { data: template } = await supabase
        .from("contract_templates")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (template) {
        toast({ title: "Inscription enregistree !", description: "Veuillez lire et signer votre contrat de formation." });
        setTimeout(() => navigate(`/contract-sign?cohort_id=${cohort.id}`), 1200);
      } else {
        setSuccessId(cohort.id);
        toast({ title: "Inscription reussie !", description: "Bienvenue dans votre espace etudiant." });
        setTimeout(() => navigate("/student"), 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      setEnrollingId(null);
    }
  };

  const openWaitlist = async (cohort: CohortRow) => {
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", user.id)
        .maybeSingle();
      setWaitlistPhone((data as { phone: string | null } | null)?.phone ?? "");
    }
    setWaitlistCohort(cohort);
  };

  const handleWaitlistSubmit = async () => {
    if (!user || !waitlistCohort) return;
    if (!waitlistPhone.trim()) {
      toast({ title: "Telephone requis", description: "Veuillez saisir votre numero de telephone.", variant: "destructive" });
      return;
    }
    setWaitlistSubmitting(true);
    try {
      const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
      const { error } = await supabase.from("waitlist").insert({
        full_name: fullName || user.email || "Etudiant",
        email: user.email ?? "",
        phone: waitlistPhone.trim(),
        formation_id: waitlistCohort.formation_id ?? null,
        consent_marketing: true,
      });
      if (error) throw error;
      setWaitlistSuccessIds(prev => new Set([...prev, waitlistCohort.id]));
      setWaitlistCohort(null);
      toast({ title: "Demande enregistree", description: "Nous vous contacterons si une place se libere." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  const loading = cohortsLoading || enrollmentsLoading;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const fmtPrice = (p: number) =>
    new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-48 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shrink-0">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Formations disponibles</h2>
          <p className="text-sm text-muted-foreground">Inscrivez-vous a une nouvelle formation depuis votre espace</p>
        </div>
      </div>

      {/* Limit warning */}
      {atLimit && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Vous suivez deja 2 formations en cours. Terminez-en une avant de vous inscrire a une nouvelle.
          </p>
        </div>
      )}

      {/* Empty state */}
      {availableCohorts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display text-base font-semibold text-foreground">Aucune formation disponible</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Vous etes inscrit a toutes les formations ouvertes, ou aucune nouvelle session n'est programmee pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {availableCohorts.map(cohort => {
            const enrolled = cohort.enrollment_count ?? 0;
            const spotsLeft = cohort.capacity - enrolled;
            const isFull = spotsLeft <= 0;
            const isEnrolling = enrollingId === cohort.id;
            const isSuccess = successId === cohort.id;
            const isWaitlisted = waitlistSuccessIds.has(cohort.id);

            return (
              <div
                key={cohort.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-accent/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title + status badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {cohort.formation?.name
                          ? `${cohort.formation.name} - Cohorte ${cohort.name}`
                          : `Cohorte ${cohort.name}`}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          cohort.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : cohort.status === "upcoming"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cohort.status === "active"
                          ? "En cours"
                          : cohort.status === "upcoming"
                          ? "A venir"
                          : cohort.status}
                      </span>
                    </div>

                    {/* Formation description */}
                    {cohort.formation?.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {cohort.formation.description}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {fmt(cohort.start_date)} au {fmt(cohort.end_date)}
                      </span>
                      <span
                        className={`flex items-center gap-1.5 ${
                          isFull ? "text-destructive" : "text-accent"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {isFull
                          ? "Complet"
                          : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`}
                      </span>
                      {cohort.formation?.total_price != null && (
                        <span className="font-semibold text-foreground">
                          {fmtPrice(cohort.formation.total_price)}
                        </span>
                      )}
                      {cohort.formation?.duration_days != null && (
                        <span>{cohort.formation.duration_days} jours de formation</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0 flex items-center">
                    {isSuccess ? (
                      <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Inscrit !
                      </div>
                    ) : isWaitlisted ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                        <CheckCircle className="h-4 w-4 text-accent" />
                        Sur la liste d'attente
                      </div>
                    ) : isFull ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWaitlist(cohort)}
                        className="gap-1.5"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Liste d'attente
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleEnroll(cohort)}
                        disabled={atLimit || isEnrolling}
                        title={atLimit ? "Limite de 2 formations actives atteinte" : undefined}
                        className="gap-1.5"
                      >
                        {isEnrolling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        S'inscrire
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Waitlist dialog */}
      <Dialog
        open={waitlistCohort !== null}
        onOpenChange={open => { if (!open) setWaitlistCohort(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Liste d'attente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Cette cohorte est complete. Laissez votre numero et nous vous contacterons en priorite si une place se libere.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="wl-phone">Numero de telephone</Label>
              <Input
                id="wl-phone"
                type="tel"
                placeholder="+221 77 000 00 00"
                value={waitlistPhone}
                onChange={e => setWaitlistPhone(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setWaitlistCohort(null)}
                disabled={waitlistSubmitting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleWaitlistSubmit}
                disabled={waitlistSubmitting || !waitlistPhone.trim()}
              >
                {waitlistSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentFormations;
