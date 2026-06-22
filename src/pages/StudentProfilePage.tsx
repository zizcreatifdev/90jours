import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import EmptyState from "@/components/ui/EmptyState";
import {
  ArrowLeft, Loader2, User, Phone, Calendar, ClipboardList,
  Briefcase, Wallet, MessageSquare, CheckCircle2, Clock, Send,
  AlertTriangle, XCircle, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface Enrollment {
  id: string;
  user_id: string;
  cohort_id: string;
  enrolled_at: string;
  progress: number;
  cohorts: { name: string; start_date: string; end_date: string } | null;
}

interface BriefSubmission {
  id: string;
  brief_id: string;
  status: string;
  is_late: boolean;
  delay_days: number;
  completed_at: string;
  briefs: { title: string; deadline: string } | null;
}

interface Portfolio {
  id: string;
  url: string;
  status: string;
  admin_notes: string | null;
  cohort_id: string;
  cohorts?: { name: string } | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  paid_at: string | null;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  title: string | null;
  created_at: string;
  sender_id: string;
  recipient_id: string | null;
  cohort_id: string | null;
}

const formatCurrency = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

const StudentProfilePage = () => {
  const { id: studentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [submissions, setSubmissions] = useState<BriefSubmission[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Guard: staff and super_admin only
  useEffect(() => {
    if (!activeRole) return;
    if (activeRole !== "staff" && activeRole !== "super_admin") {
      navigate(activeRole === "student" ? "/student" : "/login", { replace: true });
    }
  }, [activeRole, navigate]);

  useEffect(() => {
    if (!studentId) return;

    const fetchAll = async () => {
      setLoading(true);
      const [profileRes, enrollRes, subsRes, portfoliosRes, paymentsRes, messagesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, phone").eq("user_id", studentId).single(),
        supabase.from("enrollments").select("*, cohorts:cohort_id(name, start_date, end_date)").eq("user_id", studentId).order("enrolled_at", { ascending: false }),
        supabase.from("brief_submissions").select("*, briefs:brief_id(title, deadline)").eq("user_id", studentId).order("completed_at", { ascending: false }),
        supabase.from("portfolios").select("*, cohorts:cohort_id(name)").eq("user_id", studentId).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("user_id", studentId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("messages")
          .select("*")
          .or(`sender_id.eq.${studentId},recipient_id.eq.${studentId}`)
          .is("parent_id", null)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (enrollRes.data) setEnrollments(enrollRes.data as Enrollment[]);
      if (subsRes.data) setSubmissions(subsRes.data as BriefSubmission[]);
      if (portfoliosRes.data) setPortfolios(portfoliosRes.data as Portfolio[]);
      if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
      if (messagesRes.data) setMessages(messagesRes.data as Message[]);
      setLoading(false);
    };

    fetchAll();
  }, [studentId]);

  const role = activeRole === "super_admin" ? "super_admin" : "staff";
  const backPath = role === "super_admin" ? "/admin?tab=users" : "/staff";

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Étudiant";
  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "?";

  const deliveredCount = submissions.filter(s => s.status === "delivered").length;
  const totalBriefs = submissions.length;
  const progressPercent = totalBriefs > 0 ? Math.round((deliveredCount / totalBriefs) * 100) : 0;
  const totalPaid = payments.filter(p => p.status === "paid").reduce((acc, p) => acc + p.amount, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={role} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={role} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-muted-foreground">Étudiant introuvable.</p>
          <Button variant="outline" onClick={() => navigate(backPath)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar role={role} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="font-display text-lg font-bold text-foreground">Profil étudiant</h1>
        </header>

        <div className="p-4 md:p-8 space-y-6">
          {/* Profile card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-display text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-bold text-foreground">{fullName}</h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  {profile.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {profile.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Inscrit le {enrollments[0]
                      ? format(new Date(enrollments[0].enrolled_at), "dd MMM yyyy", { locale: fr })
                      : "-"}
                  </span>
                </div>

                {/* Cohorts */}
                {enrollments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {enrollments.map(e => (
                      <Badge key={e.id} variant="secondary" className="gap-1">
                        Cohorte {e.cohorts?.name || e.cohort_id.slice(0, 6)}
                        <span className="text-muted-foreground">· {e.progress}%</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl bg-secondary px-4 py-2.5 text-center min-w-[80px]">
                  <p className="text-lg font-bold text-foreground">{deliveredCount}</p>
                  <p className="text-xs text-muted-foreground">Briefs livrés</p>
                </div>
                <div className="rounded-xl bg-secondary px-4 py-2.5 text-center min-w-[80px]">
                  <p className="text-lg font-bold text-foreground">{portfolios.length}</p>
                  <p className="text-xs text-muted-foreground">Portfolio{portfolios.length > 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-xl bg-secondary px-4 py-2.5 text-center min-w-[80px]">
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                  <p className="text-xs text-muted-foreground">Payé</p>
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            {totalBriefs > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Progression globale (briefs livrés)</span>
                  <span className="text-xs font-semibold text-foreground">{deliveredCount}/{totalBriefs}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="briefs">
            <TabsList>
              <TabsTrigger value="briefs" className="gap-1.5">
                <ClipboardList className="h-4 w-4" /> Briefs
                {submissions.length > 0 && <Badge variant="secondary" className="text-xs px-1.5">{submissions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="gap-1.5">
                <Briefcase className="h-4 w-4" /> Portfolio
              </TabsTrigger>
              <TabsTrigger value="paiements" className="gap-1.5">
                <Wallet className="h-4 w-4" /> Paiements
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5">
                <MessageSquare className="h-4 w-4" /> Messages
              </TabsTrigger>
            </TabsList>

            {/* ── Briefs ── */}
            <TabsContent value="briefs" className="mt-4">
              {submissions.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucun brief soumis"
                  description="Cet étudiant n'a encore soumis aucun brief."
                />
              ) : (
                <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-5 py-3 font-medium">Brief</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Retard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map(s => (
                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-foreground">
                            {s.briefs?.title || "-"}
                          </td>
                          <td className="px-5 py-3">
                            {s.status === "delivered" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <Send className="h-3 w-3" /> Livré
                              </span>
                            ) : s.status === "validated" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                                <CheckCircle2 className="h-3 w-3" /> Validé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                <Clock className="h-3 w-3" /> Réalisé
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-muted-foreground">
                            {format(new Date(s.completed_at), "dd/MM/yyyy", { locale: fr })}
                          </td>
                          <td className="px-5 py-3">
                            {s.is_late ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                                <AlertTriangle className="h-3 w-3" /> {s.delay_days}j
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 font-medium">À temps</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Portfolio ── */}
            <TabsContent value="portfolio" className="mt-4">
              {portfolios.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Aucun portfolio soumis"
                  description="Cet étudiant n'a pas encore soumis de portfolio."
                />
              ) : (
                <div className="space-y-3">
                  {portfolios.map(p => (
                    <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1.5">
                          {p.cohorts && (
                            <Badge variant="secondary" className="mb-1">Cohorte {p.cohorts.name}</Badge>
                          )}
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-accent hover:underline font-medium"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> {p.url}
                          </a>
                          {p.admin_notes && (
                            <p className="mt-1 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Note : </span>{p.admin_notes}
                            </p>
                          )}
                        </div>
                        <div>
                          {p.status === "validated" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Validé
                            </span>
                          ) : p.status === "rejected" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> Rejeté
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Clock className="h-3.5 w-3.5" /> En attente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Paiements ── */}
            <TabsContent value="paiements" className="mt-4">
              {payments.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Aucun paiement enregistré"
                  description="Aucun paiement n'a été enregistré pour cet étudiant."
                />
              ) : (
                <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium">Montant</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-muted-foreground">
                            {format(new Date(p.paid_at || p.created_at), "dd/MM/yyyy", { locale: fr })}
                          </td>
                          <td className="px-5 py-3 text-sm text-foreground capitalize">{p.payment_type}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              p.status === "paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : p.status === "pending"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              {p.status === "paid" ? "Payé" : p.status === "pending" ? "En attente" : "Échoué"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Messages ── */}
            <TabsContent value="messages" className="mt-4">
              {messages.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Aucun message"
                  description="Aucun échange avec cet étudiant pour le moment."
                />
              ) : (
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          msg.sender_id === studentId
                            ? "bg-secondary text-muted-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}>
                          {msg.sender_id === studentId ? initials : "F"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">
                              {msg.sender_id === studentId ? fullName : "Formateur"}
                            </span>
                            {msg.recipient_id ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Message privé</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Cohorte</Badge>
                            )}
                            <span className="text-xs text-muted-foreground/60">
                              {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {msg.title && (
                            <p className="mt-0.5 text-xs font-semibold text-foreground">{msg.title}</p>
                          )}
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default StudentProfilePage;
