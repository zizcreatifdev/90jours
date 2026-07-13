import { Users, GraduationCap, Search, Loader2, BookOpen, ClipboardList, Briefcase, Menu, Award } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import StatsCard from "@/components/StatsCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useCohorts } from "@/hooks/use-cohorts";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CohortForm from "@/components/CohortForm";
import BriefManager from "@/components/BriefManager";
import PortfolioManager from "@/components/PortfolioManager";
import CategoryManager from "@/components/CategoryManager";
import FormationManager from "@/components/FormationManager";
import TaskManager from "@/components/TaskManager";
import AttestationTracker from "@/components/attestation/AttestationTracker";
import DashboardCalendar from "@/components/DashboardCalendar";
import SessionsManager from "@/components/SessionsManager";
import AdminMessages from "@/components/AdminMessages";
import SignedContractsPanel from "@/components/SignedContractsPanel";
import TestimonialsManager from "@/components/TestimonialsManager";
import WaitlistManager from "@/components/WaitlistManager";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ALLOWED_TABS = new Set([
  "overview", "calendar", "sessions", "messages", "formations", "tasks",
  "cohorts", "briefs", "categories", "waitlist", "portfolios",
  "attestations", "contracts", "testimonials",
]);

const AssistantDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { cohorts, loading: cohortsLoading, refetch } = useCohorts();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formationFilter, setFormationFilter] = useState("all");
  const debouncedSearch = useDebounce(search);
  const [monthlyData, setMonthlyData] = useState<{ name: string; inscrits: number }[]>([]);
  const [pendingBriefs, setPendingBriefs] = useState(0);
  const [pendingPortfolios, setPendingPortfolios] = useState(0);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);

  // Garde URL : rediriger vers overview si l'onglet est interdit
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && !ALLOWED_TABS.has(tab)) {
      setSearchParams({ tab: "overview" });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [subRes, portRes, enrollRes] = await Promise.all([
          supabase.from("brief_submissions").select("id", { count: "exact" }).eq("status", "pending"),
          supabase.from("portfolios").select("id", { count: "exact" }).eq("status", "pending"),
          supabase.from("enrollments").select("enrolled_at").order("enrolled_at", { ascending: true }),
        ]);

        setPendingBriefs(subRes.count ?? 0);
        setPendingPortfolios(portRes.count ?? 0);

        if (enrollRes.data) {
          const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
          const currentYear = new Date().getFullYear();
          const counts = new Array(12).fill(0);
          enrollRes.data.forEach((e: any) => {
            const d = new Date(e.enrolled_at);
            if (d.getFullYear() === currentYear) counts[d.getMonth()]++;
          });
          setMonthlyData(months.map((name, i) => ({ name, inscrits: counts[i] })));
        }
      } catch (err) {
        console.error("fetchOverview:", err);
      }
    };
    fetchOverview();
  }, []);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("id, user_id, cohort_id, progress, enrolled_at")
        .order("enrolled_at", { ascending: false })
        .limit(8);
      if (!enrollData || enrollData.length === 0) return;

      const userIds = [...new Set(enrollData.map((e: any) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setRecentStudents(enrollData.map((e: any) => ({ ...e, profile: profileMap.get(e.user_id) })));
    };
    fetchRecent();
  }, []);

  const totalEnrolled = cohorts.reduce((acc, c) => acc + (c.enrollment_count ?? 0), 0);
  const totalCapacity = cohorts.reduce((acc, c) => acc + c.capacity, 0);
  const activeCohorts = cohorts.filter(c => c.status === "active").length;

  const uniqueFormations = Array.from(
    new Map(cohorts.filter(c => c.formation_id && c.formation).map(c => [c.formation_id, { id: c.formation_id!, name: (c.formation as any)?.name || "" }])).values()
  );

  const filteredCohorts = cohorts.filter(c => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchFormation = formationFilter === "all" || c.formation_id === formationFilter;
    const matchSearch = !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchStatus && matchFormation && matchSearch;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar
        role="assistant"
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display font-semibold text-foreground">Assistant</span>
        </div>

        <div className="p-6">
          {/* Stats */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard icon={Users} label="Total inscrits" value={totalEnrolled} subtitle={`sur ${totalCapacity} places`} />
            <StatsCard icon={GraduationCap} label="Cohortes actives" value={activeCohorts} subtitle="en cours" />
            <StatsCard icon={ClipboardList} label="Briefs a corriger" value={pendingBriefs} subtitle="soumissions en attente" />
            <StatsCard icon={Briefcase} label="Portfolios a valider" value={pendingPortfolios} subtitle="en attente de validation" variant="accent" />
          </div>

          <Tabs
            value={ALLOWED_TABS.has(searchParams.get("tab") || "") ? (searchParams.get("tab") || "overview") : "overview"}
            onValueChange={(v) => setSearchParams({ tab: v })}
            className="space-y-6"
          >
            {/* Vue d'ensemble */}
            <TabsContent value="overview">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-foreground">Inscriptions mensuelles</h2>
                    <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">{new Date().getFullYear()}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 10% 90%)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(220 15% 10%)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "13px" }} cursor={{ fill: "hsl(220 10% 94%)" }} />
                      <Bar dataKey="inscrits" fill="hsl(220 15% 10%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {recentStudents.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                    <div className="border-b border-border px-6 py-4">
                      <h2 className="font-display text-base font-semibold text-foreground">Etudiants recents</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="px-6 py-3 font-medium">Nom</th>
                            <th className="px-6 py-3 font-medium">Cohorte</th>
                            <th className="px-6 py-3 font-medium">Progression</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentStudents.map((s: any) => {
                            const coh = cohorts.find(c => c.id === s.cohort_id);
                            return (
                              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                                <td className="px-6 py-3 text-sm font-medium text-foreground">
                                  {s.profile ? `${s.profile.first_name} ${s.profile.last_name}` : "Inconnu"}
                                </td>
                                <td className="px-6 py-3 text-sm text-muted-foreground">{coh?.name || "-"}</td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${s.progress}%` }} />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{s.progress}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="calendar">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <DashboardCalendar role="admin" />
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <SessionsManager role="admin" />
              </div>
            </TabsContent>

            <TabsContent value="messages">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <AdminMessages />
              </div>
            </TabsContent>

            <TabsContent value="formations">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <FormationManager />
              </div>
            </TabsContent>

            <TabsContent value="tasks">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <TaskManager />
              </div>
            </TabsContent>

            <TabsContent value="cohorts">
              <div className="rounded-2xl border border-border bg-card shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Toutes les cohortes</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={formationFilter} onValueChange={setFormationFilter}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Formation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les formations</SelectItem>
                        {uniqueFormations.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="active">En cours</SelectItem>
                        <SelectItem value="upcoming">A venir</SelectItem>
                        <SelectItem value="archived">Terminees</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Rechercher..." className="w-48 pl-9 pr-8 bg-secondary border-0" value={search} onChange={e => setSearch(e.target.value)} />
                      {search !== debouncedSearch && (
                        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <CohortForm onSaved={refetch} />
                  </div>
                </div>
                {cohortsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="px-6 py-3 font-medium">Nom</th>
                          <th className="px-6 py-3 font-medium">Formation</th>
                          <th className="px-6 py-3 font-medium">Periode</th>
                          <th className="px-6 py-3 font-medium">Inscrits</th>
                          <th className="px-6 py-3 font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCohorts.map((cohort) => {
                          const enrolled = cohort.enrollment_count ?? 0;
                          return (
                            <tr key={cohort.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                              <td className="px-6 py-3.5 font-display font-semibold text-foreground">Cohorte {cohort.name}</td>
                              <td className="px-6 py-3.5 text-sm text-muted-foreground">{(cohort.formation as any)?.name || "-"}</td>
                              <td className="px-6 py-3.5 text-sm text-muted-foreground">
                                {new Date(cohort.start_date).toLocaleDateString("fr-FR")} - {new Date(cohort.end_date).toLocaleDateString("fr-FR")}
                              </td>
                              <td className="px-6 py-3.5 text-sm text-foreground">{enrolled} / {cohort.capacity}</td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  cohort.status === "active" ? "bg-green-100 text-green-700" :
                                  cohort.status === "upcoming" ? "bg-blue-100 text-blue-700" :
                                  "bg-secondary text-muted-foreground"
                                }`}>
                                  {cohort.status === "active" ? "En cours" : cohort.status === "upcoming" ? "A venir" : "Terminee"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredCohorts.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune cohorte</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="briefs">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <BriefManager role="admin" />
              </div>
            </TabsContent>

            <TabsContent value="categories">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <CategoryManager />
              </div>
            </TabsContent>

            <TabsContent value="waitlist">
              <WaitlistManager />
            </TabsContent>

            <TabsContent value="portfolios">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <PortfolioManager />
              </div>
            </TabsContent>

            {/* Attestations : lecture seule via le tracker, sans l'editeur ni l'emetteur */}
            <TabsContent value="attestations">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  <h2 className="font-display text-lg font-semibold text-foreground">Suivi des attestations</h2>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Lecture seule</span>
                </div>
                <AttestationTracker />
              </div>
            </TabsContent>

            {/* Contrats : lecture seule (contrats signes) */}
            <TabsContent value="contracts">
              <SignedContractsPanel />
            </TabsContent>

            <TabsContent value="testimonials">
              <TestimonialsManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AssistantDashboard;
