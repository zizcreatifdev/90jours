import { Users, FileText, Megaphone, BookOpen, Loader2, Search, Plus, Upload, Trash2, Mail, Download, ListTodo, ClipboardList, Briefcase, Menu, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import NotificationPanel from "@/components/NotificationPanel";
import OfficialMessageSender from "@/components/OfficialMessageSender";
import FormateurMessageSender from "@/components/FormateurMessageSender";
import ConfirmDialog from "@/components/ConfirmDialog";
import DashboardSidebar from "@/components/DashboardSidebar";
import { StaffDashboardSkeleton } from "@/components/DashboardSkeletons";
import StatsCard from "@/components/StatsCard";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCohorts } from "@/hooks/use-cohorts";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/export-csv";
import StaffTasks from "@/components/StaffTasks";
import StaffMessages from "@/components/StaffMessages";
import BriefManager from "@/components/BriefManager";
import PortfolioManager from "@/components/PortfolioManager";
import DashboardCalendar from "@/components/DashboardCalendar";

const StaffDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { cohorts: allCohorts, loading, isError: cohortsError } = useCohorts();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [assignedFormationIds, setAssignedFormationIds] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [seenAnnouncements, setSeenAnnouncements] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("seen_announcements_staff");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Announcement form
  const [annOpen, setAnnOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annSaving, setAnnSaving] = useState(false);

  // Resource upload
  const [resOpen, setResOpen] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resFile, setResFile] = useState<File | null>(null);
  const [resUploading, setResUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Signale une panne de chargement des cohortes (au lieu d'un affichage vide muet)
  useEffect(() => {
    if (cohortsError) {
      toast({ title: "Erreur", description: "Impossible de charger les cohortes.", variant: "destructive" });
    }
  }, [cohortsError, toast]);

  // Fetch staff formation assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("staff_formations" as any)
        .select("formation_id")
        .eq("user_id", user.id);
      if (data) {
        setAssignedFormationIds((data as any[]).map((d: any) => d.formation_id));
      }
      setLoadingAssignments(false);
    };
    fetchAssignments();
  }, [user]);

  // Filter cohorts based on assigned formations
  const cohorts = assignedFormationIds.length > 0
    ? allCohorts.filter(c => c.formation_id && assignedFormationIds.includes(c.formation_id))
    : allCohorts;

  // Set first cohort as default
  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      const active = cohorts.find(c => c.status === "active");
      setSelectedCohortId(active?.id || cohorts[0].id);
    }
  }, [cohorts, selectedCohortId]);

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);

  useEffect(() => {
    if (!selectedCohortId) return;
    const fetchData = async () => {
      try {
        // Get only student role user_ids
        const { data: studentRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "student");
        if (rolesError) throw rolesError;
        const studentIds = (studentRoles || []).map((r: any) => r.user_id);

        // Ressources et annonces sont scopees a la cohorte (independantes des etudiants)
        const [resourcesRes, announcementsRes] = await Promise.all([
          supabase.from("resources").select("*").eq("cohort_id", selectedCohortId).order("created_at", { ascending: false }),
          supabase.from("announcements").select("*").eq("cohort_id", selectedCohortId).order("created_at", { ascending: false }),
        ]);
        if (resourcesRes.error || announcementsRes.error) {
          throw (resourcesRes.error || announcementsRes.error);
        }

        // Aucun etudiant : court-circuit la requete enrollments (eviter sentinel "none" sur uuid -> 22P02)
        let enrollments: any[] = [];
        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from("enrollments").select("*")
            .eq("cohort_id", selectedCohortId)
            .in("user_id", studentIds);
          if (studentsError) throw studentsError;
          enrollments = studentsData || [];
        }

        // Pas de FK enrollments -> profiles : jointure cote client via Map sur user_id
        const userIds = [...new Set(enrollments.map((e: any) => e.user_id).filter(Boolean))];
        let profileMap = new Map<string, { first_name: string; last_name: string; phone: string | null }>();
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, first_name, last_name, phone")
            .in("user_id", userIds);
          if (profilesError) throw profilesError;
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, { first_name: p.first_name, last_name: p.last_name, phone: p.phone }]));
        }
        setStudents(enrollments.map((e: any) => ({ ...e, profiles: profileMap.get(e.user_id) })));

        if (resourcesRes.data) setResources(resourcesRes.data);
        if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      } catch (err) {
        console.error("StaffDashboard.fetchData:", err);
        toast({ title: "Erreur", description: "Impossible de charger les données de la cohorte.", variant: "destructive" });
      }
    };
    fetchData();
  }, [selectedCohortId]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohortId || !user) return;
    setAnnSaving(true);
    const { error } = await supabase.from("announcements").insert({
      title: annTitle,
      content: annContent,
      cohort_id: selectedCohortId,
      author_id: user.id,
    });
    setAnnSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Annonce publiée !" });
      setAnnTitle("");
      setAnnContent("");
      setAnnOpen(false);
      // Refresh
      const { data } = await supabase.from("announcements").select("*").eq("cohort_id", selectedCohortId).order("created_at", { ascending: false });
      if (data) setAnnouncements(data);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const handleDeleteResource = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setResources(prev => prev.filter(r => r.id !== id));
  };

  const handleExportStudents = () => {
    exportToCsv("etudiants.csv", students.map((s: any) => ({
      prenom: s.profiles?.first_name || "",
      nom: s.profiles?.last_name || "",
      telephone: s.profiles?.phone || "",
      progression: `${s.progress}%`,
      date_inscription: new Date(s.enrolled_at).toLocaleDateString("fr-FR"),
    })), [
      { key: "prenom", label: "Prénom" },
      { key: "nom", label: "Nom" },
      { key: "telephone", label: "Téléphone" },
      { key: "progression", label: "Progression" },
      { key: "date_inscription", label: "Date d'inscription" },
    ]);
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resFile || !selectedCohortId || !user) return;
    setResUploading(true);

    const ext = resFile.name.split(".").pop();
    const path = `${selectedCohortId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("resources").upload(path, resFile);
    if (uploadError) {
      toast({ title: "Erreur d'upload", description: uploadError.message, variant: "destructive" });
      setResUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);
    const fileType = ext?.toUpperCase() || "FICHIER";

    const { error: dbError } = await supabase.from("resources").insert({
      title: resTitle || resFile.name,
      url: urlData.publicUrl,
      type: fileType,
      cohort_id: selectedCohortId,
      uploaded_by: user.id,
    });

    setResUploading(false);
    if (dbError) {
      toast({ title: "Erreur", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Ressource ajoutée !" });
      setResTitle("");
      setResFile(null);
      setResOpen(false);
      const { data } = await supabase.from("resources").select("*").eq("cohort_id", selectedCohortId).order("created_at", { ascending: false });
      if (data) setResources(data);
    }
  };

  const [studentSearch, setStudentSearch] = useState("");
  const filteredStudents = students.filter((s: any) =>
    !studentSearch ||
    s.profiles?.first_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.profiles?.last_name?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const getStudentHealth = (progress: number) => {
    if (!selectedCohort?.start_date || !selectedCohort?.end_date) return null;
    const now = new Date();
    const start = new Date(selectedCohort.start_date);
    const end = new Date(selectedCohort.end_date);
    if (now < start) return null;
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.min(totalDays, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const expectedPct = (daysPassed / totalDays) * 100;
    if (expectedPct < 10) return null;
    const ratio = progress / expectedPct;
    if (ratio >= 0.75) return { label: "En bonne voie", level: "green", dot: "bg-green-500", color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" };
    if (ratio >= 0.4) return { label: "Attention", level: "orange", dot: "bg-orange-500", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" };
    return { label: "En difficulté", level: "red", dot: "bg-red-500", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" };
  };

  const healthCounts = filteredStudents.reduce(
    (acc: { green: number; orange: number; red: number; unknown: number }, s: any) => {
      const h = getStudentHealth(s.progress);
      if (!h) acc.unknown++;
      else if (h.level === "green") acc.green++;
      else if (h.level === "orange") acc.orange++;
      else acc.red++;
      return acc;
    },
    { green: 0, orange: 0, red: 0, unknown: 0 }
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="staff" />
        <main className="flex-1 overflow-auto">
          <StaffDashboardSkeleton />
        </main>
      </div>
    );
  }

  const avgProgress = students.length > 0
    ? Math.round(students.reduce((a: number, s: any) => a + s.progress, 0) / students.length)
    : 0;

  // Onglet actif (lu depuis l'URL) : pilote l'affichage du contenu
  const tab = searchParams.get("tab") || "overview";

  // Cartes reutilisables (overview + onglets dedies)
  const announcementsCard = (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-display text-base font-semibold text-foreground">Annonces</h2>
        <Dialog open={annOpen} onOpenChange={setAnnOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1 h-4 w-4" /> Nouvelle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Publier une annonce</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="ann-title">Titre</Label>
                <Input id="ann-title" required maxLength={200} value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Titre de l'annonce" />
              </div>
              <div>
                <Label htmlFor="ann-content">Contenu</Label>
                <Textarea id="ann-content" required maxLength={2000} rows={4} value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Rédigez votre annonce..." />
              </div>
              <Button type="submit" disabled={annSaving} className="w-full">
                {annSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Publier
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {announcements.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune annonce</p>
        ) : (
          announcements.map((a: any) => (
            <div key={a.id} className="group flex items-start justify-between px-6 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <ConfirmDialog
                trigger={
                  <button className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
                title="Supprimer cette annonce ?"
                description="Cette action est irréversible."
                confirmLabel="Supprimer"
                onConfirm={() => handleDeleteAnnouncement(a.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  const resourcesCard = (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-display text-base font-semibold text-foreground">Ressources</h2>
        <Dialog open={resOpen} onOpenChange={setResOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Ajouter une ressource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadResource} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="res-title">Titre</Label>
                <Input id="res-title" maxLength={200} value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Titre de la ressource" />
              </div>
              <div>
                <Label>Fichier</Label>
                <input
                  ref={fileRef}
                  type="file"
                  required
                  onChange={e => setResFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
                />
              </div>
              <Button type="submit" disabled={resUploading} className="w-full">
                {resUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Uploader
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {resources.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune ressource</p>
        ) : (
          resources.map((r: any) => (
            <div key={r.id} className="group flex items-center justify-between px-6 py-3">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-accent transition-colors">
                <FileText className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground uppercase">{r.type}</p>
                </div>
              </a>
              <ConfirmDialog
                trigger={
                  <button className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
                title="Supprimer cette ressource ?"
                description="Le fichier sera supprimé définitivement."
                confirmLabel="Supprimer"
                onConfirm={() => handleDeleteResource(r.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role="staff" mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <main className="flex-1 overflow-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 md:px-8 md:py-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg md:text-xl font-bold text-foreground">{greeting()}, {profile?.first_name || "Staff"} !</h1>
              <p className="text-xs md:text-sm text-muted-foreground">60 jours de formation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
              <SelectTrigger className="w-36 md:w-48">
                <SelectValue placeholder="Choisir une cohorte" />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map(c => (
                  <SelectItem key={c.id} value={c.id}>Cohorte {c.name}{c.formation ? ` (${c.formation.name})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormateurMessageSender />
            <OfficialMessageSender />
            <NotificationPanel />
            <Link to="/profile">
              <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profil" className="object-cover" />
                <AvatarFallback className="bg-accent text-accent-foreground font-display font-bold text-xs md:text-sm">
                  {(profile?.first_name?.[0] || "S").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {tab === "calendar" ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <DashboardCalendar role="staff" cohortIds={cohorts.map(c => c.id)} />
            </div>
          ) : tab === "tasks" ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <StaffTasks />
            </div>
          ) : tab === "briefs" ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <BriefManager cohortId={selectedCohortId} role="staff" />
            </div>
          ) : tab === "portfolios" ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5" /> Portfolios
              </h2>
              <PortfolioManager filterCohortIds={cohorts.map(c => c.id)} />
            </div>
          ) : tab === "announcements" ? (
            <div className="mx-auto max-w-2xl">{announcementsCard}</div>
          ) : tab === "resources" ? (
            <div className="mx-auto max-w-2xl">{resourcesCard}</div>
          ) : tab === "messages" ? (
            <div className="mx-auto max-w-2xl">
              <StaffMessages />
            </div>
          ) : tab === "attestations" ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center shadow-card">
              <Award className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 font-display text-lg font-semibold text-foreground">Attestations</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Les attestations sont délivrées par l'administration. Vous n'avez pas d'action à effectuer ici.
              </p>
            </div>
          ) : (
          <>
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard icon={Users} label="Étudiants" value={students.length} subtitle={selectedCohort ? `sur ${selectedCohort.capacity}` : ""} />
            <StatsCard icon={FileText} label="Ressources publiées" value={resources.length} />
            <StatsCard icon={Megaphone} label="Annonces envoyées" value={announcements.length} />
            <StatsCard icon={BookOpen} label="Progression moyenne" value={`${avgProgress}%`} variant="accent" />
          </div>

          {/* Staff Tasks */}
          <div className="mb-8">
            <StaffTasks />
          </div>

          {/* Briefs */}
          <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <BriefManager cohortId={selectedCohortId} role="staff" />
          </div>

          {/* Portfolios */}
          <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5" /> Portfolios
            </h2>
            <PortfolioManager filterCohortIds={cohorts.map(c => c.id)} />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Students with contact info */}
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">Étudiants inscrits</h2>
                  {(healthCounts.green + healthCounts.orange + healthCounts.red) > 0 && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />{healthCounts.green}</span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400"><span className="inline-block h-2 w-2 rounded-full bg-orange-500" />{healthCounts.orange}</span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />{healthCounts.red}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Rechercher..." className="w-40 pl-9 bg-secondary border-0 h-8 text-xs" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportStudents} className="gap-1 h-8 text-xs">
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {filteredStudents.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun étudiant inscrit</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-6 py-3 font-medium">Nom</th>
                        <th className="px-6 py-3 font-medium">Téléphone</th>
                        <th className="px-6 py-3 font-medium">Progression</th>
                        <th className="px-6 py-3 font-medium">Santé</th>
                      </tr>
                    </thead>
                     <tbody>
                      {filteredStudents.map((s: any) => (
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/student/${s.user_id}`)}
                          className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                                {s.profiles?.first_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <span className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                                {s.profiles?.first_name} {s.profiles?.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-muted-foreground">{s.profiles?.phone || "-"}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={s.progress} className="h-1.5 w-16" />
                              <span className="text-xs text-muted-foreground">{s.progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            {(() => {
                              const h = getStudentHealth(s.progress);
                              if (!h) return <span className="text-xs text-muted-foreground/50">-</span>;
                              return (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${h.color} ${h.bg}`}>
                                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${h.dot}`} />{h.label}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {announcementsCard}
              {resourcesCard}
            </div>
          </div>
          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;
