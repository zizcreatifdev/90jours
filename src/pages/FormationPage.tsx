import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ArrowLeft, ArrowRight, Banknote, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";

type FormationRow = Database["public"]["Tables"]["formations"]["Row"];

interface FormationCohort {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  capacity: number;
  cohort_type: string;
  total_price: number | null;
  enrollment_count: number;
}

const SITE_URL = "https://60jours.com";

const FormationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: formation, isLoading: formationLoading, isError: formationError } = useQuery<FormationRow | null>({
    queryKey: ["formation", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<FormationCohort[]>({
    queryKey: ["formation-cohorts", formation?.id],
    queryFn: async () => {
      const [cohortsResult, countsResult] = await Promise.all([
        supabase
          .from("cohorts")
          .select("id, name, status, start_date, end_date, capacity, cohort_type, total_price")
          .eq("formation_id", formation!.id)
          .neq("status", "archived")
          .order("start_date"),
        supabase.rpc("get_all_cohort_enrollment_counts"),
      ]);
      if (cohortsResult.error) throw cohortsResult.error;
      const countMap = new Map<string, number>(
        ((countsResult.data ?? []) as Array<{ cohort_id: string; enrollment_count: number }>)
          .map((row) => [row.cohort_id, row.enrollment_count])
      );
      return (cohortsResult.data as Omit<FormationCohort, "enrollment_count">[]).map((c) => ({
        ...c,
        enrollment_count: countMap.get(c.id) ?? 0,
      }));
    },
    enabled: !!formation?.id,
  });

  const openCohorts = cohorts.filter((c) => c.status !== "archived" && c.status !== "completed");

  const handleInscription = () => {
    if (openCohorts.length === 1) {
      navigate(`/register?cohort=${openCohorts[0].id}`);
    } else {
      document.getElementById("sessions")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (formationLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (formationError || !formation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-2xl font-bold text-foreground">Formation introuvable</p>
        <p className="text-muted-foreground">Cette formation n'existe pas ou n'est plus disponible.</p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l'accueil
        </Link>
      </div>
    );
  }

  const _formationUrl = `${SITE_URL}/formation/${formation.slug}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-deep py-20 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-deep to-navy-deep opacity-80" />
        <div className="relative container mx-auto px-6 sm:px-8 lg:px-12">
          <Link
            to="/"
            className="mb-10 inline-flex min-h-[44px] items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Toutes les formations
          </Link>

          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
              {formation.level}
            </span>
            <h1 className="mt-4 font-display text-4xl font-black leading-tight text-white md:text-5xl">
              {formation.name}
            </h1>
            {formation.description && (
              <p className="mt-5 text-base leading-relaxed text-white/75 md:text-lg">
                {formation.description}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={handleInscription}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-8 font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40"
              >
                S'inscrire
                <ArrowRight className="h-4 w-4" />
              </button>
              {openCohorts.length !== 1 && (
                <a
                  href="#sessions"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("sessions")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 font-semibold text-white transition-all hover:border-white/50 hover:bg-white/10"
                >
                  Voir les sessions
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="bg-background py-10">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl bg-white px-6 py-5 shadow-card">
              <Clock className="h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Duree</p>
                <p className="font-display text-xl font-bold text-foreground">{formation.duration_days} jours</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-white px-6 py-5 shadow-card">
              <CalendarDays className="h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sessions</p>
                <p className="font-display text-xl font-bold text-foreground">
                  {cohortsLoading ? "..." : `${openCohorts.length} session${openCohorts.length !== 1 ? "s" : ""} ouverte${openCohorts.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-white px-6 py-5 shadow-card">
              <Banknote className="h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tarif</p>
                <p className="font-display text-xl font-bold text-foreground">
                  {formation.total_price.toLocaleString("fr-FR")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">FCFA</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A propos */}
      <section className="bg-background pb-12">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">A propos de cette formation</h2>
            {formation.description && (
              <p className="text-base leading-relaxed text-muted-foreground">{formation.description}</p>
            )}
            {formation.deliverable_label && (
              <div className="mt-8 rounded-xl border border-accent/20 bg-white p-6 shadow-card">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Ce que vous obtenez</p>
                <p className="font-display text-lg font-bold text-foreground">{formation.deliverable_label}</p>
                {formation.deliverable_description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {formation.deliverable_description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sessions disponibles */}
      <section id="sessions" className="bg-background pb-24 pt-4">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="mb-8 font-display text-2xl font-bold text-foreground">Sessions disponibles</h2>
          {cohortsLoading ? (
            <p className="text-muted-foreground">Chargement des sessions...</p>
          ) : cohorts.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-8 text-center shadow-card">
              <p className="text-muted-foreground">Aucune session disponible pour le moment.</p>
              <Link
                to="/"
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
              >
                Voir toutes les formations
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cohorts.map((cohort) => {
                const enrolled = cohort.enrollment_count;
                const spotsLeft = cohort.capacity - enrolled;
                const isFull = spotsLeft === 0;
                const almostFull = spotsLeft > 0 && spotsLeft <= 3;
                const cohortPrice = cohort.total_price ?? formation.total_price;

                return (
                  <div
                    key={cohort.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between px-5 py-3",
                        cohort.cohort_type === "standard" ? "bg-navy-deep" : "bg-navy"
                      )}
                    >
                      {cohort.start_date && cohort.end_date ? (
                        <p className="text-[11px] font-medium text-white/70">
                          {Math.round(
                            (new Date(cohort.end_date + "T00:00:00").getTime() -
                              new Date(cohort.start_date + "T00:00:00").getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          jours
                        </p>
                      ) : (
                        <span />
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white",
                          cohort.cohort_type === "standard" ? "bg-accent" : "bg-white/20"
                        )}
                      >
                        {cohort.cohort_type === "standard" ? "Perfectionnement" : "Initiation"}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                        Promo {cohort.name}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {cohort.start_date && cohort.end_date
                          ? `${new Date(cohort.start_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} au ${new Date(cohort.end_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                          : "Demarrage des que le groupe est complet"}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isFull ? "text-destructive" : almostFull ? "text-accent" : "text-muted-foreground"
                          )}
                        >
                          {isFull
                            ? "Complet"
                            : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} disponible${spotsLeft > 1 ? "s" : ""}`}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {cohortPrice.toLocaleString("fr-FR")}{" "}
                          <span className="text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                            FCFA
                          </span>
                        </span>
                      </div>

                      <div className="mt-4">
                        {isFull ? (
                          <p className="text-center text-xs text-muted-foreground py-2">
                            Liste d'attente : contactez-nous
                          </p>
                        ) : (
                          <Link
                            to={`/register?cohort=${cohort.id}`}
                            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-foreground transition-all hover:bg-accent-hover"
                          >
                            S'inscrire a cette session
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FormationPage;
