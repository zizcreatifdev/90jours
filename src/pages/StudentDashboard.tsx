import { BookOpen, Calendar, FileText, Megaphone, Send, Loader2, Search, Download, Users, CreditCard, ClipboardList, Award, ChevronDown, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useSearchParams } from "react-router-dom";
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
import DashboardCalendar from "@/components/DashboardCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

const StudentDashboard = () => {
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeTab = searchParams.get("tab") || "dashboard";
  const { user, profile } = useAuth();
  const [allEnrollments, setAllEnrollments] = useState<EnrollmentWithCohort[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [resources, setResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchRes, setSearchRes] = useState("");
  const [briefSubmissions, setBriefSubmissions] = useState<any[]>([]);
  const [seenAnnouncements, setSeenAnnouncements] = useState<Set<string>>(new Set());

  // Fetch all enrollments
  useEffect(() => {
    if (!user) return;
    const fetchEnrollments = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*, cohorts:cohort_id(*)")
        .eq("user_id", user.id);

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
      const stored = localStorage.getItem("90jours-active-enrollment");
      const valid = enriched.find(e => e.id === stored);
      setSelectedEnrollmentId(valid ? valid.id : enriched[0].id);
    };
    fetchEnrollments();
  }, [user]);

  // Derived: current enrollment & cohort
  const enrollment = allEnrollments.find(e => e.id === selectedEnrollmentId);
  const cohort = enrollment?.cohorts;

  // Persist selection
  useEffect(() => {
    if (selectedEnrollmentId) localStorage.setItem("90jours-active-enrollment", selectedEnrollmentId);
  }, [selectedEnrollmentId]);

  // Fetch cohort-specific data when selection changes
  useEffect(() => {
    if (!cohort || !user) { setLoading(false); return; }
    const fetchCohortData = async () => {
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
      setLoading(false);
    };
    fetchCohortData();
  }, [cohort?.id, user?.id]);

  const fetchSubs = async () => {
    if (!user || !cohort) return;
    // Only fetch delivered submissions for briefs belonging to the current cohort
    const { data: cohortBriefs } = await supabase
      .from("briefs")
      .select("id")
      .eq("cohort_id", cohort.id);
    if (!cohortBriefs || cohortBriefs.length === 0) { setBriefSubmissions([]); return; }
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
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="student" />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Pas encore inscrit</h2>
            <p className="text-muted-foreground">Vous n'êtes inscrit à aucune cohorte pour le moment.</p>
          </div>
        </main>
      </div>
    );
  }

  const progress = enrollment.progress ?? 0;
  const startDate = new Date(cohort.start_date);
  const endDate = new Date(cohort.end_date);
  const daysTotal = enrollment.formation_duration_days || Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const now = new Date();
  const daysPassed = Math.max(0, Math.min(daysTotal, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const daysLeft = Math.max(0, daysTotal - daysPassed);
  const totalWeeks = Math.ceil(daysTotal / 7);

  const weeklyData = (() => {
    const start = new Date(cohort.start_date);
    const weeks: { name: string; briefs: number }[] = [];
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = new Date(start.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const count = briefSubmissions.filter(s => {
        const d = new Date(s.completed_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ name: `S${w + 1}`, briefs: count });
    }
    return weeks;
  })();

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
                {enrollment.formation_name && <span className="font-medium">{enrollment.formation_name} — </span>}
                Cohorte {cohort.name}
              </p>
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
                        {e.formation_name || "Formation"} — {e.cohorts.name}
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
          {activeTab === "dashboard" && (
            <>
              {/* Stats row */}
              <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard icon={BookOpen} label="Progression globale" value={`${progress}%`} variant="accent" />
                <StatsCard icon={FileText} label="Ressources disponibles" value={resources.length} />
                <StatsCard icon={Calendar} label="Jours restants" value={daysLeft} subtitle={`sur ${daysTotal} jours`} />
                <StatsCard icon={Users} label="Participants" value={enrollmentCount} subtitle={`sur ${cohort.capacity} places`} />
              </div>

              {/* Cohort info card */}
              <div className="mb-8 rounded-2xl bg-primary p-6 text-primary-foreground">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold">{enrollment.formation_name && `${enrollment.formation_name} — `}Cohorte {cohort.name}</h3>
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

              <div className="grid gap-8 lg:grid-cols-3">
                {/* Left: Chart + Resources */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Activity Chart */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold text-foreground">Briefs livrés par semaine</h2>
                      <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">Activité</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={weeklyData} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 10% 90%)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "hsl(220 15% 10%)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "13px" }}
                          cursor={{ fill: "hsl(220 10% 94%)" }}
                        />
                        <Bar dataKey="briefs" fill="hsl(220 15% 10%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
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
                                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">{r.type}</span>
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
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                          {unseenCount}
                        </span>
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
                </div>
              </div>
            </>
          )}

          {activeTab === "calendar" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <DashboardCalendar role="student" cohortIds={[cohort.id]} />
            </div>
          )}

          {activeTab === "messages" && (
            <StudentMessages cohortId={cohort.id} />
          )}

          {activeTab === "briefs" && (
            <StudentBriefs cohortId={cohort.id} formationName={enrollment.formation_name} formationColor={enrollment.formation_color || undefined} />
          )}

          {activeTab === "portfolio" && (
            <StudentPortfolio cohortId={cohort.id} formationName={enrollment.formation_name} formationColor={enrollment.formation_color || undefined} />
          )}

          {activeTab === "payments" && (
            <StudentPaymentStatus cohortId={cohort.id} formationName={enrollment.formation_name} formationColor={enrollment.formation_color || undefined} />
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
