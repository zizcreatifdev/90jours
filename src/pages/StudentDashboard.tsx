import { BookOpen, Calendar, FileText, Megaphone, Send, Loader2, Search, Download, Users, CreditCard, ClipboardList, Award, ChevronDown, Menu, Play, ExternalLink, FileSignature, AlertCircle, RefreshCw, User, Archive } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { StudentDashboardSkeleton } from "@/components/DashboardSkeletons";
import StatsCard from "@/components/StatsCard";
import StudentProfile from "@/components/StudentProfile";
import StudentPaymentStatus from "@/components/StudentPaymentStatus";
import StudentBriefs from "@/components/StudentBriefs";
import StudentPortfolio from "@/components/StudentPortfolio";
import NotificationPanel from "@/components/NotificationPanel";
import StudentAttestation from "@/components/StudentAttestation";
import StudentMessages from "@/components/StudentMessages";
import StudentFormations from "@/components/StudentFormations";
import DashboardCalendar from "@/components/DashboardCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import BadgeShowcase from "@/components/BadgeShowcase";
import PaymentSummaryCard from "@/components/PaymentSummaryCard";
import { useStudentBadges } from "@/hooks/use-student-badges";
import { useProfileCompleteness } from "@/hooks/use-profile-completeness";
import { sanitizeContractHtml } from "@/lib/sanitize-html";
import { CONTRACT_CSS } from "@/lib/contract-style";

interface EnrollmentWithCohort {
  id: string;
  cohort_id: string;
  user_id: string;
  progress: number;
  enrolled_at: string;
  motivation: string | null;
  cohorts: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    capacity: number;
    formation_id: string | null;
    description: string | null;
  };
  formation_name?: string;
  formation_color?: string;
  formation_duration_days?: number;
}

const COHORT_STATUS_PRIORITY: Record<string, number> = { active: 0, upcoming: 1, completed: 2, archived: 3 };

const RESOURCE_TYPE_CONFIG: Record<string, { Icon: React.ElementType; className: string; label: string }> = {
  pdf: { Icon: FileText, className: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400", label: "PDF" },
  video: { Icon: Play, className: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400", label: "Vidéo" },
  link: { Icon: ExternalLink, className: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400", label: "Lien" },
};

const StudentDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeTab = searchParams.get("tab") || "dashboard";
  const { user, profile } = useAuth();
  const { percent: profilePercent, loading: profileLoading } = useProfileCompleteness();
  const [allEnrollments, setAllEnrollments] = useState<EnrollmentWithCohort[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [resources, setResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { toast } = useToast();
  const [searchRes, setSearchRes] = useState("");
  const [briefSubmissions, setBriefSubmissions] = useState<any[]>([]);
  const [publishedBriefCount, setPublishedBriefCount] = useState(0);
  const [seenAnnouncements, setSeenAnnouncements] = useState<Set<string>>(new Set());

  // Fetch all enrollments
  useEffect(() => {
    if (!user) return;
    const fetchEnrollments = async () => {
      try {
        setLoadError(false);
        const { data: enrollments, error } = await supabase
          .from("enrollments")
          .select("*, cohorts:cohort_id(*)")
          .eq("user_id", user.id);
        if (error) throw error;

        if (!enrollments || enrollments.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch formation names for each cohort
        const formationIds = [...new Set(enrollments.map((e: any) => e.cohorts?.formation_id).filter(Boolean))];
        let formationMap = new Map<string, { name: string; color: string | null; duration_days: number }>();
        if (formationIds.length > 0) {
          const { data: formations } = await supabase.from("formations").select("id, name, attestation_color, duration_days").in("id", formationIds);
          if (formations) formationMap = new Map(formations.map(f => [f.id, { name: f.name, color: f.attestation_color, duration_days: f.duration_days }]));
        }

        const enriched = enrollments.map((e: any) => ({
          ...e,
          formation_name: e.cohorts?.formation_id ? formationMap.get(e.cohorts.formation_id)?.name : undefined,
          formation_color: e.cohorts?.formation_id ? formationMap.get(e.cohorts.formation_id)?.color : undefined,
          formation_duration_days: e.cohorts?.formation_id ? formationMap.get(e.cohorts.formation_id)?.duration_days : undefined,
        })) as EnrollmentWithCohort[];

        // Sort: active first, then upcoming, then completed
        enriched.sort((a, b) => {
          const pa = COHORT_STATUS_PRIORITY[a.cohorts.status] ?? 99;
          const pb = COHORT_STATUS_PRIORITY[b.cohorts.status] ?? 99;
          if (pa !== pb) return pa - pb;
          return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime();
        });

        setAllEnrollments(enriched);

        // Auto-select: restore from storage or pick the first active
        const stored = localStorage.getItem("60jours-active-enrollment");
        const valid = enriched.find(e => e.id === stored);
        setSelectedEnrollmentId(valid ? valid.id : enriched[0].id);
      } catch (err) {
        console.error("Erreur de chargement des inscriptions", err);
        setLoadError(true);
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, [user, reloadKey]);

  // Derived: current enrollment & cohort
  const enrollment = allEnrollments.find(e => e.id === selectedEnrollmentId);
  const cohort = enrollment?.cohorts;
  const isArchiveMode = cohort
    ? cohort.status === "archived" || cohort.status === "completed" || new Date(cohort.end_date) < new Date()
    : false;

  // Persist selection
  useEffect(() => {
    if (selectedEnrollmentId) localStorage.setItem("60jours-active-enrollment", selectedEnrollmentId);
  }, [selectedEnrollmentId]);

  // Fetch cohort-specific data when selection changes
  useEffect(() => {
    if (!cohort || !user) { setLoading(false); return; }
    const fetchCohortData = async () => {
      try {
        // Onboarding gate: redirect if an active contract template exists and is not yet signed.
        // Skip for terminated/archived cohorts (contract was already signed at enrollment time).
        const isTerminated = cohort.status === "archived" || cohort.status === "completed" || new Date(cohort.end_date) < new Date();
        if (!isTerminated) {
          const formationId = cohort.formation_id;
          let templateFound = false;
          if (formationId) {
            const { data } = await supabase
              .from("contract_templates")
              .select("id")
              .eq("is_active", true)
              .eq("formation_id", formationId)
              .maybeSingle();
            if (data) templateFound = true;
          }
          if (!templateFound) {
            const { data } = await supabase
              .from("contract_templates")
              .select("id")
              .eq("is_active", true)
              .is("formation_id", null)
              .limit(1)
              .maybeSingle();
            if (data) templateFound = true;
          }
          if (templateFound) {
            const { data: sc } = await supabase
              .from("student_contracts")
              .select("signed_at")
              .eq("user_id", user.id)
              .eq("cohort_id", cohort.id)
              .maybeSingle();
            if (!sc?.signed_at) {
              navigate(`/onboarding?cohort_id=${cohort.id}`);
              return;
            }
          }
        }

        const [resRes, annRes, countRes, seenRes] = await Promise.all([
          supabase.from("resources").select("*").eq("cohort_id", cohort.id).order("created_at", { ascending: false }),
          supabase.from("announcements").select("*").eq("cohort_id", cohort.id).order("created_at", { ascending: false }),
          supabase.rpc("get_cohort_enrollment_count", { cohort_uuid: cohort.id }),
          supabase.from("seen_announcements").select("announcement_id").eq("user_id", user.id),
        ]);
        if (resRes.data) setResources(resRes.data);
        if (annRes.data) setAnnouncements(annRes.data);
        if (seenRes.data) setSeenAnnouncements(new Set(seenRes.data.map(s => s.announcement_id)));
        if (countRes.data !== null) setEnrollmentCount(countRes.data);
      } catch (err) {
        console.error("Erreur de chargement des données de la cohorte", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCohortData();
  }, [cohort?.id, user?.id]);

  const fetchSubs = async () => {
    if (!user || !cohort) return;
    // Only published briefs count toward progression (publish_at <= now)
    const { data: cohortBriefs } = await supabase
      .from("briefs")
      .select("id")
      .eq("cohort_id", cohort.id)
      .lte("publish_at", new Date().toISOString());
    if (!cohortBriefs || cohortBriefs.length === 0) {
      setBriefSubmissions([]);
      setPublishedBriefCount(0);
      return;
    }
    setPublishedBriefCount(cohortBriefs.length);
    const briefIds = cohortBriefs.map(b => b.id);
    const { data } = await supabase
      .from("brief_submissions")
      .select("completed_at, status")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .in("brief_id", briefIds);
    if (data) setBriefSubmissions(data);
  };

  useEffect(() => {
    if (!user || !cohort) return;
    fetchSubs();

    const channel = supabase
      .channel("brief-submissions-graph")
      .on("postgres_changes", { event: "*", schema: "public", table: "brief_submissions", filter: `user_id=eq.${user.id}` }, () => {
        fetchSubs();
        if (cohort) {
          checkBadgesRef.current({
            cohortId: cohort.id,
            cohortStartDate: cohort.start_date,
            cohortStatus: cohort.status,
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, cohort?.id]);

  const markAnnouncementsSeen = async () => {
    if (!user) return;
    const unseenIds = announcements.filter(a => !seenAnnouncements.has(a.id)).map(a => a.id);
    if (unseenIds.length === 0) return;
    const rows = unseenIds.map(id => ({ user_id: user.id, announcement_id: id }));
    await supabase.from("seen_announcements").upsert(rows, { onConflict: "user_id,announcement_id" });
    setSeenAnnouncements(prev => new Set([...prev, ...unseenIds]));
  };

  const unseenCount = announcements.filter(a => !seenAnnouncements.has(a.id)).length;

  // ── Contrat ─────────────────────────────────────────────────────────────────
  const [contract, setContract] = useState<{ signed_at: string | null; contract_snapshot: string | null } | null | undefined>(undefined);
  const [contractModalOpen, setContractModalOpen] = useState(false);

  useEffect(() => {
    if (!user || !cohort) return;
    supabase
      .from("student_contracts")
      .select("signed_at, contract_snapshot")
      .eq("user_id", user.id)
      .eq("cohort_id", cohort.id)
      .maybeSingle()
      .then(({ data }) => setContract(data as { signed_at: string | null; contract_snapshot: string | null } | null));
  }, [user?.id, cohort?.id]);

  // ── Badges ──────────────────────────────────────────────────────────────────
  const { badges: studentBadges, newBadge, isLoading: badgesLoading, checkAndAwardBadges } = useStudentBadges();

  // Keep a stable ref so the realtime callback always uses the latest version
  const checkBadgesRef = useRef(checkAndAwardBadges);
  useEffect(() => { checkBadgesRef.current = checkAndAwardBadges; }, [checkAndAwardBadges]);

  // Run badge check on initial cohort load
  useEffect(() => {
    if (!cohort) return;
    checkBadgesRef.current({
      cohortId: cohort.id,
      cohortStartDate: cohort.start_date,
      cohortStatus: cohort.status,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort?.id]);

  if (loadError) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="student" />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-bold text-foreground">Impossible de charger vos données.</h2>
            <p className="mt-2 text-muted-foreground">Veuillez réessayer dans quelques instants.</p>
            <Button
              variant="outline"
              onClick={() => { setLoadError(false); setLoading(true); setReloadKey(k => k + 1); }}
              className="mt-6 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="student" />
        <main className="flex-1 overflow-auto">
          <StudentDashboardSkeleton />
        </main>
      </div>
    );
  }

  if (allEnrollments.length === 0 || !enrollment || !cohort) {
    // Formations tab is accessible even without a current enrollment
    if (activeTab === "formations") {
      return (
        <div className="flex min-h-screen bg-background">
          <DashboardSidebar role="student" mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
          <main className="flex-1 overflow-auto">
            <header className="flex items-center justify-between bg-card px-4 py-4 md:px-8 md:py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground md:hidden">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="font-display text-lg md:text-xl font-bold text-foreground">
                    {greeting()}, {profile?.first_name || "Etudiant"} !
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">Espace etudiant</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <StudentProfile />
                <Link to="/profile">
                  <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="Profil" className="object-cover" />
                    <AvatarFallback className="bg-accent text-accent-foreground font-display font-bold text-xs md:text-sm">
                      {(profile?.first_name?.[0] || "E").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <NotificationPanel />
              </div>
            </header>
            <div className="p-4 md:p-8">
              <StudentFormations />
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="student" mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Pas encore inscrit</h2>
            <p className="text-muted-foreground mb-6">Vous n'etes inscrit a aucune cohorte pour le moment.</p>
            <Button onClick={() => navigate("/student?tab=formations")}>
              Voir les formations disponibles
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const deliveredCount = briefSubmissions.length;
  const progress = publishedBriefCount > 0 ? Math.round((deliveredCount / publishedBriefCount) * 100) : 0;
  const startDate = new Date(cohort.start_date);
  const endDate = new Date(cohort.end_date);
  const daysTotal = enrollment.formation_duration_days || Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const now = new Date();
  const daysPassed = Math.max(0, Math.min(daysTotal, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const daysLeft = Math.max(0, daysTotal - daysPassed);


  const filteredResources = resources.filter(r =>
    !searchRes || r.title.toLowerCase().includes(searchRes.toLowerCase())
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="student" mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex flex-col gap-3 bg-card px-4 py-4 md:px-8 md:py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground md:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div>
              <h1 className="font-display text-lg md:text-xl font-bold text-foreground">
                {greeting()}, {profile?.first_name || "Étudiant"} !
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {enrollment.formation_name && <span className="font-medium">{enrollment.formation_name}, </span>}
                Cohorte {cohort.name}
              </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <StudentProfile />
              {!profileLoading && profilePercent < 100 && (
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors whitespace-nowrap"
                >
                  <User className="h-3 w-3" />
                  Profil {profilePercent}%
                </Link>
              )}
              <Link to="/profile">
                <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profil" className="object-cover" />
                  <AvatarFallback className="bg-accent text-accent-foreground font-display font-bold text-xs md:text-sm">
                    {(profile?.first_name?.[0] || "E").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <NotificationPanel />
            </div>
          </div>
          {/* Cohort switcher - only if multiple enrollments */}
          {allEnrollments.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {allEnrollments.map(e => {
                const isActive = e.id === selectedEnrollmentId;
                const statusLabel = e.cohorts.status === "active" ? "En cours" : e.cohorts.status === "upcoming" ? "À venir" : "Terminée";
                const statusColor = e.cohorts.status === "active" ? "default" : e.cohorts.status === "upcoming" ? "secondary" : "outline";
                return (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedEnrollmentId(e.id); setLoading(true); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                      isActive
                        ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                        : "border-border bg-card hover:bg-secondary/50"
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${isActive ? "text-accent" : "text-foreground"}`}>
                        {e.formation_name || "Formation"}, {e.cohorts.name}
                      </p>
                    </div>
                    <Badge variant={statusColor as any} className="text-[10px] h-5">
                      {statusLabel}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <div className="p-4 md:p-8">
          {/* Archive banner - shown on all tabs for terminated formations */}
          {isArchiveMode && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <Archive className="h-4 w-4 shrink-0" />
              <p>Cette formation est terminee. Vous consultez votre historique en mode lecture seule : les livraisons de briefs et l'envoi de messages sont desactives.</p>
            </div>
          )}

          {activeTab === "dashboard" && (
            <>
              {/* Stats row */}
              <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard icon={BookOpen} label="Progression globale" value={`${progress}%`} variant="accent" />
                <StatsCard icon={FileText} label="Ressources disponibles" value={resources.length} />
                <StatsCard icon={Calendar} label="Jours restants" value={daysLeft} subtitle={`sur ${daysTotal} jours`} />
                <StatsCard icon={Users} label="Participants" value={enrollmentCount} subtitle={`sur ${cohort.capacity} places`} />
              </div>

              {/* Payment summary card */}
              <PaymentSummaryCard
                cohortId={cohort.id}
                cohortStartDate={cohort.start_date}
                formationId={cohort.formation_id}
              />

              {/* Cohort info card */}
              <div className="mb-8 rounded-2xl bg-primary p-6 text-primary-foreground">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold">{enrollment.formation_name && `${enrollment.formation_name}, `}Cohorte {cohort.name}</h3>
                    <p className="mt-1 text-sm opacity-80">
                      Du {fmt(cohort.start_date)} au {fmt(cohort.end_date)}
                    </p>
                    <p className="mt-0.5 text-xs opacity-60">{enrollmentCount}/{cohort.capacity} participants • Statut: {cohort.status === "active" ? "En cours" : cohort.status === "upcoming" ? "À venir" : "Terminée"}</p>
                  </div>
                  <div className="w-48">
                    <p className="mb-1 text-xs opacity-80 font-medium">Progression</p>
                    <Progress value={progress} className="h-2.5 bg-primary-foreground/20" />
                    <p className="mt-1 text-right text-xs opacity-60">{progress}%</p>
                  </div>
                </div>
              </div>

              {/* Badge showcase */}
              <div className="mb-8">
                <BadgeShowcase
                  badges={studentBadges}
                  newBadge={newBadge}
                  isLoading={badgesLoading}
                />
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                {/* Left: Chart + Resources */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Activity Heatmap */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                    <ActivityHeatmap
                      submissions={briefSubmissions}
                      cohortStartDate={cohort.start_date}
                      cohortEndDate={cohort.end_date}
                    />
                  </div>

                  {/* Resources table with search + download */}
                  <div className="rounded-2xl border border-border bg-card shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                      <h2 className="font-display text-lg font-semibold text-foreground">Bibliothèque de ressources</h2>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher..."
                          className="w-48 pl-9 bg-secondary border-0"
                          value={searchRes}
                          onChange={e => setSearchRes(e.target.value)}
                        />
                      </div>
                    </div>
                    {filteredResources.length === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune ressource pour le moment</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground">
                              <th className="px-6 py-3 font-medium">Titre</th>
                              <th className="px-6 py-3 font-medium">Type</th>
                              <th className="px-6 py-3 font-medium">Date</th>
                              <th className="px-6 py-3 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredResources.map((r: any) => (
                              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                                <td className="px-6 py-3.5 text-sm font-medium text-foreground">{r.title}</td>
                                <td className="px-6 py-3.5">
                                  {(() => {
                                    const cfg = RESOURCE_TYPE_CONFIG[r.type] ?? { Icon: FileText, className: "bg-accent/10 text-accent", label: r.type };
                                    const { Icon, className, label } = cfg;
                                    return (
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
                                        <Icon className="h-3 w-3" />
                                        {label}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-6 py-3.5 text-sm text-muted-foreground">
                                  {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                </td>
                                <td className="px-6 py-3.5">
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                                  >
                                    <Download className="h-3 w-3" /> Télécharger
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right sidebar: Announcements only on dashboard */}
                <div className="space-y-6">
                  {/* Announcements feed */}
                  <div className="rounded-2xl border border-border bg-card shadow-card">
                    <div className="flex items-center justify-between border-b border-border px-6 py-4">
                      <h2 className="font-display text-base font-semibold text-foreground">Annonces</h2>
                      {unseenCount > 0 && (
                        <button
                          onClick={markAnnouncementsSeen}
                          title="Marquer toutes les annonces comme lues"
                          className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground hover:bg-accent/80 transition-colors"
                        >
                          {unseenCount}
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-border max-h-80 overflow-y-auto">
                      {announcements.length === 0 ? (
                        <p className="px-6 py-6 text-center text-sm text-muted-foreground">Aucune annonce</p>
                      ) : (
                        announcements.map((a: any) => (
                          <div key={a.id} className={`px-6 py-3.5 ${!seenAnnouncements.has(a.id) ? "bg-accent/5" : ""}`}>
                            <div className="flex items-start gap-2">
                              <Megaphone className={`mt-0.5 h-4 w-4 flex-shrink-0 ${!seenAnnouncements.has(a.id) ? "text-accent" : "text-muted-foreground"}`} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{a.title}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("fr-FR")}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Attestation on dashboard */}
                  <StudentAttestation cohortId={cohort.id} />

                  {/* Mon contrat */}
                  {contract !== undefined && (
                    <div className="rounded-2xl border border-border bg-card shadow-card p-5">
                      <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                        <FileSignature className="h-4 w-4" /> Mon contrat
                      </h2>
                      {contract?.signed_at ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/20 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
                            <Award className="h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-semibold">Contrat signé</p>
                              <p className="text-xs opacity-80">
                                Le {new Date(contract.signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          {contract.contract_snapshot && (
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setContractModalOpen(true)}>
                              <FileSignature className="mr-1.5 h-4 w-4" /> Voir mon contrat
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                            <FileSignature className="h-4 w-4 shrink-0" />
                            <p className="font-medium">Contrat non signé</p>
                          </div>
                          <Link to={`/contract-sign?cohort_id=${cohort.id}`}>
                            <Button size="sm" className="w-full">Signer mon contrat</Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contract viewer modal */}
              <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display">Mon contrat de formation</DialogTitle>
                  </DialogHeader>
                  <div className="rounded-xl border border-border bg-white text-[13px]">
                    <style dangerouslySetInnerHTML={{ __html: CONTRACT_CSS }} />
                    <div
                      dangerouslySetInnerHTML={{ __html: sanitizeContractHtml((contract?.contract_snapshot || "").replace(/<style[\s\S]*?<\/style>/gi, "")) }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {activeTab === "calendar" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <DashboardCalendar role="student" cohortIds={[cohort.id]} />
            </div>
          )}

          {activeTab === "messages" && (
            <StudentMessages cohortId={cohort.id} formationId={cohort.formation_id} isArchived={isArchiveMode} />
          )}

          {activeTab === "briefs" && (
            <StudentBriefs cohortId={cohort.id} formationName={enrollment.formation_name} formationColor={enrollment.formation_color || undefined} isArchived={isArchiveMode} />
          )}

          {activeTab === "portfolio" && (
            <StudentPortfolio cohortId={cohort.id} formationName={enrollment.formation_name} formationColor={enrollment.formation_color || undefined} />
          )}

          {activeTab === "payments" && (
            <StudentPaymentStatus cohortId={cohort.id} formationName={enrollment.formation_name} formationColor={enrollment.formation_color || undefined} />
          )}

          {activeTab === "formations" && (
            <StudentFormations />
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
