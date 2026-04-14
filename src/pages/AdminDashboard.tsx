import { Users, GraduationCap, TrendingUp, Search, Loader2, Archive, Shield, UserCog, Download, Wallet, Settings, Tag, ClipboardList, Briefcase, MessageSquarePlus, Trash2, Award, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useSearchParams } from "react-router-dom";
import PaymentManager from "@/components/PaymentManager";
import DashboardSidebar from "@/components/DashboardSidebar";
import { AdminDashboardSkeleton } from "@/components/DashboardSkeletons";
import StatsCard from "@/components/StatsCard";
import CohortForm from "@/components/CohortForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCohorts } from "@/hooks/use-cohorts";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/export-csv";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import SiteSettingsPanel from "@/components/SiteSettingsPanel";
import PromoCodeManager from "@/components/PromoCodeManager";
import BriefManager from "@/components/BriefManager";
import PortfolioManager from "@/components/PortfolioManager";
import CategoryManager from "@/components/CategoryManager";
import { useSiteSettings } from "@/hooks/use-site-settings";
import NotificationPanel from "@/components/NotificationPanel";
import OfficialMessageSender from "@/components/OfficialMessageSender";
import FormateurMessageSender from "@/components/FormateurMessageSender";
import FormationManager from "@/components/FormationManager";
import FormateurManager from "@/components/FormateurManager";
import AuditLogPanel from "@/components/AuditLogPanel";
import TaskManager from "@/components/TaskManager";
import AttestationDragDropEditor from "@/components/attestation/AttestationDragDropEditor";
import AttestationIssuer from "@/components/AttestationIssuer";
import AttestationTracker from "@/components/attestation/AttestationTracker";
import DashboardCalendar from "@/components/DashboardCalendar";
import AdminMessages from "@/components/AdminMessages";
import AccountingPanel from "@/components/AccountingPanel";
import AdminAlertBanner from "@/components/AdminAlertBanner";
import ContractTemplateEditor from "@/components/ContractTemplateEditor";
import SignedContractsPanel from "@/components/SignedContractsPanel";
import TestimonialsManager from "@/components/TestimonialsManager";
interface UserRow {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  roles: string[];
}

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { cohorts, loading: cohortsLoading, refetch } = useCohorts();
  const { profile } = useAuth();
  const { settings: siteSettings, refetch: refetchSettings } = useSiteSettings();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const debouncedUserSearch = useDebounce(userSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formationFilter, setFormationFilter] = useState("all");
  const [archiving, setArchiving] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ name: string; inscrits: number }[]>([]);

  interface ActivityItem {
    id: string;
    type: "enrollment" | "payment" | "submission";
    description: string;
    timestamp: string;
  }
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      const studentIds = (studentRoles || []).map((r: any) => r.user_id);

      const { data } = await supabase
        .from("enrollments")
        .select("*, profiles:user_id(first_name, last_name)")
        .in("user_id", studentIds.length > 0 ? studentIds : ["none"])
        .order("enrolled_at", { ascending: false })
        .limit(10);
      if (data) setStudents(data.map((d: any) => ({ ...d, profile: d.profiles })));
    };
    fetchStudents();
  }, []);

  // Fetch real monthly enrollment data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("enrolled_at")
        .order("enrolled_at", { ascending: true });

      if (enrollments) {
        const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        const currentYear = new Date().getFullYear();
        const counts = new Array(12).fill(0);
        enrollments.forEach((e: any) => {
          const d = new Date(e.enrolled_at);
          if (d.getFullYear() === currentYear) {
            counts[d.getMonth()]++;
          }
        });
        setMonthlyData(months.map((name, i) => ({ name, inscrits: counts[i] })));
      }
    };
    fetchMonthlyData();
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      const [enrollRes, payRes, subRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, enrolled_at, profiles:user_id(first_name, last_name), cohorts:cohort_id(name)")
          .order("enrolled_at", { ascending: false })
          .limit(5),
        supabase
          .from("payments")
          .select("id, created_at, amount, status, profiles:user_id(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("brief_submissions")
          .select("id, completed_at, profiles:user_id(first_name, last_name), briefs:brief_id(title)")
          .order("completed_at", { ascending: false })
          .limit(5),
      ]);

      const fmt = (n: string) => {
        const p = n as unknown as { first_name?: string; last_name?: string };
        return `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || "Inconnu";
      };

      const items: ActivityItem[] = [
        ...(enrollRes.data || []).map((e: any) => ({
          id: `enroll-${e.id}`,
          type: "enrollment" as const,
          description: `${fmt(e.profiles)} s'est inscrit${e.cohorts?.name ? ` · ${e.cohorts.name}` : ""}`,
          timestamp: e.enrolled_at,
        })),
        ...(payRes.data || []).map((p: any) => ({
          id: `pay-${p.id}`,
          type: "payment" as const,
          description: `${fmt(p.profiles)} — ${(p.amount || 0).toLocaleString("fr-FR")} FCFA (${p.status === "paid" ? "confirmé" : "en attente"})`,
          timestamp: p.created_at,
        })),
        ...(subRes.data || []).map((s: any) => ({
          id: `sub-${s.id}`,
          type: "submission" as const,
          description: `${fmt(s.profiles)} a soumis "${(s.briefs as any)?.title || "un brief"}"`,
          timestamp: s.completed_at,
        })),
      ];

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(items.slice(0, 10));
    };
    fetchActivity();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const [profilesRes, rolesRes, emailsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, phone, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.functions.invoke("list-user-emails"),
      ]);

      if (!profilesRes.data) return;

      const roleMap = new Map<string, string[]>();
      (rolesRes.data || []).forEach((r: any) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const emailMap: Record<string, string> = emailsRes.data?.emails || {};

      setUsers(profilesRes.data.map((p: any) => ({
        ...p,
        email: emailMap[p.user_id] || "",
        roles: roleMap.get(p.user_id) || ["student"],
      })));
    };
    fetchUsers();
  }, []);

  const handleArchive = async (cohortId: string) => {
    setArchiving(cohortId);
    const { error } = await supabase.from("cohorts").update({ status: "archived" }).eq("id", cohortId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Cohorte archivée" }); refetch(); }
    setArchiving(null);
  };

  const [deleting, setDeleting] = useState<string | null>(null);
  const handleDeleteCohort = async (cohortId: string) => {
    setDeleting(cohortId);
    // Delete related data first
    await supabase.from("enrollments").delete().eq("cohort_id", cohortId);
    await supabase.from("announcements").delete().eq("cohort_id", cohortId);
    await supabase.from("resources").delete().eq("cohort_id", cohortId);
    await supabase.from("briefs").delete().eq("cohort_id", cohortId);
    await supabase.from("payments").delete().eq("cohort_id", cohortId);
    await supabase.from("portfolios").delete().eq("cohort_id", cohortId);
    await supabase.from("attestations").delete().eq("cohort_id", cohortId);
    await supabase.from("notifications").delete().eq("cohort_id", cohortId);
    const { error } = await supabase.from("cohorts").delete().eq("id", cohortId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Cohorte supprimée définitivement" }); refetch(); }
    setDeleting(null);
  };

  const handleExportUsers = () => {
    exportToCsv("utilisateurs.csv", filteredUsers.map(u => ({ ...u, rolesLabel: u.roles.join(", ") })), [
      { key: "first_name", label: "Prénom" },
      { key: "last_name", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "rolesLabel", label: "Rôles" },
      { key: "created_at", label: "Date d'inscription" },
    ]);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Utilisateur supprimé", description: `${userName} a été supprimé avec succès.` });
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      refetch();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string, newRole: "super_admin" | "staff" | "student") => {
    // Prevent demoting super_admin or staff to student
    if ((currentRole === "super_admin" || currentRole === "staff") && newRole === "student") {
      toast({ title: "Action impossible", description: "Un super admin ou staff ne peut pas devenir étudiant.", variant: "destructive" });
      return;
    }
    // Prevent promoting a student to super_admin directly
    if (currentRole === "student" && newRole === "super_admin") {
      toast({ title: "Action impossible", description: "Un étudiant ne peut pas devenir super admin directement.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rôle modifié" });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, roles: [newRole] } : u));
    }
  };

  const totalEnrolled = cohorts.reduce((acc, c) => acc + (c.enrollment_count ?? 0), 0);
  const totalCapacity = cohorts.reduce((acc, c) => acc + c.capacity, 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const uniqueFormations = Array.from(
    new Map(cohorts.filter(c => c.formation).map(c => [c.formation!.id, c.formation!])).values()
  );

  const filteredCohorts = cohorts.filter(c => {
    const matchesSearch = !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesFormation = formationFilter === "all" || c.formation_id === formationFilter;
    return matchesSearch && matchesStatus && matchesFormation;
  });

  const filteredUsers = users.filter(u =>
    !debouncedUserSearch ||
    u.first_name.toLowerCase().includes(debouncedUserSearch.toLowerCase()) ||
    u.last_name.toLowerCase().includes(debouncedUserSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(debouncedUserSearch.toLowerCase())
  );




  const pieData = [
    { name: "Actives", value: cohorts.filter(c => c.status === "active").length },
    { name: "À venir", value: cohorts.filter(c => c.status === "upcoming").length },
    { name: "Terminées", value: cohorts.filter(c => c.status === "archived").length },
  ];
  const PIE_COLORS = ["hsl(217 91% 60%)", "hsl(220 10% 45%)", "hsl(220 10% 80%)"];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  if (cohortsLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="admin" />
        <main className="flex-1 overflow-auto">
          <AdminDashboardSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="admin" mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4 md:px-8 md:py-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg md:text-xl font-bold text-foreground">{greeting()}, {profile?.first_name || "Admin"} !</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Super Admin — 90 jours de formation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <FormateurMessageSender />
            <OfficialMessageSender />
            <NotificationPanel />
            <Link to="/profile">
              <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profil" className="object-cover" />
                <AvatarFallback className="bg-accent text-accent-foreground font-display font-bold text-xs md:text-sm">
                  {(profile?.first_name?.[0] || "A").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AdminAlertBanner />

          {/* Stats */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard icon={Users} label="Total inscrits" value={totalEnrolled} subtitle={`sur ${totalCapacity} places`} />
            <StatsCard icon={GraduationCap} label="Cohortes actives" value={cohorts.filter(c => c.status === "active").length} subtitle="en cours" />
            <StatsCard icon={TrendingUp} label="Taux de remplissage" value={`${fillRate}%`} variant="accent" />
            <div className="rounded-xl bg-primary p-4 text-primary-foreground">
              <h3 className="font-display text-xs font-semibold opacity-80">Revenus estimés</h3>
              <p className="mt-0.5 font-display text-2xl font-bold">{(totalEnrolled * 150000 / 1000000).toFixed(1)}M</p>
              <p className="mt-0.5 text-[11px] opacity-60">FCFA ce trimestre</p>
            </div>
          </div>

          <Tabs value={searchParams.get("tab") || "overview"} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-foreground">Inscriptions mensuelles</h2>
                    <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">2026</span>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 10% 90%)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(220 15% 10%)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "13px" }} cursor={{ fill: "hsl(220 10% 94%)" }} />
                      <Bar dataKey="inscrits" fill="hsl(220 15% 10%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <h2 className="mb-4 font-display text-base font-semibold text-foreground">Répartition des cohortes</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent students */}
              {students.length > 0 && (
                <div className="mt-8 rounded-2xl border border-border bg-card shadow-card">
                  <div className="border-b border-border px-6 py-4">
                    <h2 className="font-display text-lg font-semibold text-foreground">Étudiants récents</h2>
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
                        {students.map((s: any) => {
                          const coh = cohorts.find(c => c.id === s.cohort_id);
                          return (
                            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                              <td className="px-6 py-3.5 text-sm font-medium text-foreground">{s.profile?.first_name} {s.profile?.last_name}</td>
                              <td className="px-6 py-3.5 text-sm text-muted-foreground">{coh?.name || "—"}</td>
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                  <Progress value={s.progress} className="h-1.5 w-20" />
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
              {/* Recent activity feed */}
              {recentActivity.length > 0 && (
                <div className="mt-8 rounded-2xl border border-border bg-card shadow-card">
                  <div className="border-b border-border px-6 py-4">
                    <h2 className="font-display text-lg font-semibold text-foreground">Activité récente</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {recentActivity.map(item => {
                      const typeConfig = {
                        enrollment: { label: "Inscription", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
                        payment: { label: "Paiement", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
                        submission: { label: "Brief soumis", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
                      }[item.type];
                      const relativeTime = (() => {
                        const diff = Date.now() - new Date(item.timestamp).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return "À l'instant";
                        if (mins < 60) return `Il y a ${mins}min`;
                        const hours = Math.floor(mins / 60);
                        if (hours < 24) return `Il y a ${hours}h`;
                        return new Date(item.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                      })();
                      return (
                        <div key={item.id} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/40 transition-colors">
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${typeConfig.color} ${typeConfig.bg}`}>
                            {typeConfig.label}
                          </span>
                          <p className="flex-1 min-w-0 text-sm text-foreground truncate">{item.description}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">{relativeTime}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <DashboardCalendar role="admin" />
              </div>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <AdminMessages />
              </div>
            </TabsContent>

            {/* Formations Tab */}
            <TabsContent value="formations">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <FormationManager />
              </div>
            </TabsContent>

            {/* Formateurs Tab */}
            <TabsContent value="formateurs">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <FormateurManager />
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <TaskManager />
              </div>
            </TabsContent>

            {/* Cohorts Tab */}
            <TabsContent value="cohorts">
              <div className="rounded-2xl border border-border bg-card shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Toutes les cohortes</h2>
                  <div className="flex items-center gap-3">
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
                        <SelectItem value="upcoming">À venir</SelectItem>
                        <SelectItem value="archived">Terminées</SelectItem>
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                         <th className="px-6 py-3 font-medium">Nom</th>
                         <th className="px-6 py-3 font-medium">Formation</th>
                         <th className="px-6 py-3 font-medium">Période</th>
                        <th className="px-6 py-3 font-medium">Inscrits</th>
                        <th className="px-6 py-3 font-medium">Remplissage</th>
                        <th className="px-6 py-3 font-medium">Statut</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCohorts.map((cohort) => {
                        const enrolled = cohort.enrollment_count ?? 0;
                        const fill = Math.round((enrolled / cohort.capacity) * 100);
                        return (
                          <tr key={cohort.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                            <td className="px-6 py-3.5 font-display font-semibold text-foreground">Cohorte {cohort.name}</td>
                            <td className="px-6 py-3.5">
                              {cohort.formation ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-foreground">{cohort.formation.name}</span>
                                  <span className={`text-xs ${cohort.formation.level === "avance" ? "text-primary" : "text-accent"}`}>
                                    {cohort.formation.level === "avance" ? "Avancé" : "Débutant"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-muted-foreground">
                              {new Date(cohort.start_date).toLocaleDateString("fr-FR", { month: "short" })} — {new Date(cohort.end_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                            </td>
                            <td className="px-6 py-3.5 text-sm">{enrolled}/{cohort.capacity}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <Progress value={fill} className="h-1.5 w-24" />
                                <span className="text-xs text-muted-foreground">{fill}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                cohort.status === "active" ? "bg-accent/10 text-accent" :
                                cohort.status === "upcoming" ? "bg-secondary text-muted-foreground" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {cohort.status === "active" ? "En cours" : cohort.status === "upcoming" ? "À venir" : "Terminée"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-1">
                                <CohortForm cohort={cohort} onSaved={refetch} />
                                {cohort.status !== "archived" && (
                                  <ConfirmDialog
                                    trigger={
                                      <button
                                        disabled={archiving === cohort.id}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                        title="Archiver"
                                      >
                                        {archiving === cohort.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                      </button>
                                    }
                                    title="Archiver cette cohorte ?"
                                    description={`La cohorte "${cohort.name}" sera marquée comme terminée. Cette action est irréversible.`}
                                    confirmLabel="Archiver"
                                    onConfirm={() => handleArchive(cohort.id)}
                                  />
                                )}
                                <ConfirmDialog
                                  trigger={
                                    <button
                                      disabled={deleting === cohort.id}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                      title="Supprimer définitivement"
                                    >
                                      {deleting === cohort.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                  }
                                  title="Supprimer définitivement cette cohorte ?"
                                  description={`La cohorte "${cohort.name}" et toutes ses données (inscriptions, paiements, briefs, portfolios, attestations) seront supprimées définitivement. Cette action est irréversible.`}
                                  confirmLabel="Supprimer"
                                  onConfirm={() => handleDeleteCohort(cohort.id)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <PaymentManager />
            </TabsContent>

            {/* Promo Codes Tab */}
            <TabsContent value="promos">
              <PromoCodeManager />
            </TabsContent>

            {/* Briefs Tab */}
            <TabsContent value="briefs">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <BriefManager role="admin" />
              </div>
            </TabsContent>

            {/* Portfolios Tab */}
            <TabsContent value="portfolios">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <PortfolioManager />
              </div>
            </TabsContent>

            {/* Attestations Tab */}
            <TabsContent value="attestations">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <AttestationDragDropEditor />
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <AttestationIssuer />
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <AttestationTracker />
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                    <UserCog className="h-5 w-5" /> Gestion des utilisateurs
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Rechercher un utilisateur..." className="w-64 pl-9 pr-8 bg-secondary border-0" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                      {userSearch !== debouncedUserSearch && (
                        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportUsers} className="gap-1">
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-6 py-3 font-medium">Nom</th>
                        <th className="px-6 py-3 font-medium">Email</th>
                        <th className="px-6 py-3 font-medium">Téléphone</th>
                        <th className="px-6 py-3 font-medium">Inscrit le</th>
                        <th className="px-6 py-3 font-medium">Rôle</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                                {u.first_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <span className="text-sm font-medium text-foreground">{u.first_name} {u.last_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-muted-foreground">{u.email || "—"}</td>
                          <td className="px-6 py-3.5 text-sm text-muted-foreground">{u.phone || "—"}</td>
                          <td className="px-6 py-3.5 text-sm text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((role) => (
                                <span key={role} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  role === "super_admin" ? "bg-destructive/10 text-destructive" :
                                  role === "staff" ? "bg-primary/10 text-primary" :
                                  "bg-secondary text-muted-foreground"
                                }`}>
                                  {role === "super_admin" ? "Super Admin" : role === "staff" ? "Staff" : "Étudiant"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            {!u.roles.includes("super_admin") && (
                              <ConfirmDialog
                                trigger={
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                                title="Supprimer cet utilisateur ?"
                                description={`${u.first_name} ${u.last_name} sera définitivement supprimé ainsi que toutes ses données associées. Cette action est irréversible.`}
                                confirmLabel="Supprimer"
                                onConfirm={() => handleDeleteUser(u.user_id, `${u.first_name} ${u.last_name}`)}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun utilisateur trouvé</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <CategoryManager />
              </div>
            </TabsContent>

            {/* Accounting Tab */}
            <TabsContent value="accounting">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <AccountingPanel />
              </div>
            </TabsContent>

            {/* Audit Tab */}
            <TabsContent value="audit">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <AuditLogPanel />
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <SiteSettingsPanel settings={siteSettings} onUpdated={refetchSettings} />
              </div>
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts">
              <Tabs defaultValue="templates">
                <TabsList className="mb-6">
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="signed">Contrats signés</TabsTrigger>
                </TabsList>
                <TabsContent value="templates">
                  <ContractTemplateEditor />
                </TabsContent>
                <TabsContent value="signed">
                  <SignedContractsPanel />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Testimonials Tab */}
            <TabsContent value="testimonials">
              <TestimonialsManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
