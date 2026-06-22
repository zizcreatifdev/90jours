import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/export-csv";
import { useDebounce } from "@/hooks/use-debounce";
import Pagination from "@/components/ui/Pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, TrendingDown, DollarSign, Download, Plus, Search, Check, FileText, ArrowUpRight, ArrowDownRight,
  Loader2, Receipt, Users as UsersIcon,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";

// Types
interface Payment {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  payment_type: string;
  user_id: string;
  cohort_id: string;
  deleted_at: string | null;
  profiles?: { first_name: string; last_name: string } | null;
  cohorts?: { name: string; formation_id: string | null; formations?: { name: string } | null } | null;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  created_at: string;
  archived_at: string | null;
}

interface StaffPayment {
  id: string;
  staff_user_id: string;
  staff_type: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  profiles?: { first_name: string; last_name: string } | null;
}

type PeriodFilter = "week" | "month" | "quarter" | "year" | "all";

function getPeriodRange(period: PeriodFilter): { start: Date; end: Date } | null {
  const now = new Date();
  switch (period) {
    case "week": return { start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) };
    case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter": return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "year": return { start: startOfYear(now), end: endOfYear(now) };
    default: return null;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

const categoryLabels: Record<string, string> = {
  formateur: "Paiement formateur",
  technique: "Frais techniques",
  autre: "Autre",
};

// ── Main Component ──
const AccountingPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(0);

  // Reset history page when search/filters change
  useEffect(() => { setHistoryPage(0); }, [debouncedSearch, typeFilter, categoryFilter, periodFilter]);

  // Fetch data
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [paymentsRes, expensesRes, staffPaymentsRes] = await Promise.all([
        supabase.from("payments").select("*, profiles:user_id(first_name, last_name), cohorts:cohort_id(name, formation_id, formations:formation_id(name))").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").is("archived_at", null).order("expense_date", { ascending: false }),
        supabase.from("staff_payments").select("*, profiles:staff_user_id(first_name, last_name)").order("created_at", { ascending: false }),
      ]);
      if (paymentsRes.data) setPayments(paymentsRes.data as any);
      if (expensesRes.data) setExpenses(expensesRes.data as any);
      if (staffPaymentsRes.data) setStaffPayments(staffPaymentsRes.data as any);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Computed
  const range = getPeriodRange(periodFilter);
  const prevRange = useMemo(() => {
    if (periodFilter !== "month") return null;
    const prev = subMonths(new Date(), 1);
    return { start: startOfMonth(prev), end: endOfMonth(prev) };
  }, [periodFilter]);

  const inRange = (dateStr: string) => {
    if (!range) return true;
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };
  const inPrevRange = (dateStr: string) => {
    if (!prevRange) return false;
    const d = new Date(dateStr);
    return d >= prevRange.start && d <= prevRange.end;
  };

  const currentRevenue = payments.filter(p => p.status === "paid" && inRange(p.paid_at || p.created_at)).reduce((s, p) => s + p.amount, 0);
  const prevRevenue = payments.filter(p => p.status === "paid" && inPrevRange(p.paid_at || p.created_at)).reduce((s, p) => s + p.amount, 0);
  const currentExpenses = expenses.filter(e => inRange(e.expense_date)).reduce((s, e) => s + e.amount, 0);
  const prevExpenses = expenses.filter(e => inPrevRange(e.expense_date)).reduce((s, e) => s + e.amount, 0);
  const staffExpenses = staffPayments.filter(sp => sp.status === "paid" && inRange(sp.paid_at || sp.created_at)).reduce((s, sp) => s + sp.amount, 0);
  const totalExpenses = currentExpenses + staffExpenses;
  const prevTotalExpenses = prevExpenses;
  const netProfit = currentRevenue - totalExpenses;
  const prevNetProfit = prevRevenue - prevTotalExpenses;

  const pctChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  // ── Add Expense Dialog ──
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "autre", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });
  const [submitting, setSubmitting] = useState(false);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("expenses").insert({
      category: newExpense.category,
      description: newExpense.description,
      amount: parseInt(newExpense.amount),
      expense_date: newExpense.expense_date,
      created_by: user!.id,
    }).select().single();
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      setExpenses(prev => [data as any, ...prev]);
      setExpenseOpen(false);
      setNewExpense({ category: "autre", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd") });
      toast({ title: "Dépense ajoutée" });
    }
    setSubmitting(false);
  };

  // ── Add Staff Payment Dialog ──
  const [staffPayOpen, setStaffPayOpen] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; first_name: string; last_name: string }[]>([]);
  const [newStaffPay, setNewStaffPay] = useState({ staff_user_id: "", staff_type: "formateur", amount: "", period_start: "", period_end: "", notes: "" });

  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "staff");
      if (data) {
        const ids = data.map(r => r.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", ids.length > 0 ? ids : ["none"]);
        if (profiles) setStaffList(profiles as any);
      }
    };
    fetchStaff();
  }, []);

  const handleAddStaffPayment = async () => {
    if (!newStaffPay.staff_user_id || !newStaffPay.amount || !newStaffPay.period_start || !newStaffPay.period_end) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("staff_payments").insert({
      staff_user_id: newStaffPay.staff_user_id,
      staff_type: newStaffPay.staff_type,
      amount: parseInt(newStaffPay.amount),
      period_start: newStaffPay.period_start,
      period_end: newStaffPay.period_end,
      notes: newStaffPay.notes || null,
      created_by: user!.id,
    }).select("*, profiles:staff_user_id(first_name, last_name)").single();
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      setStaffPayments(prev => [data as any, ...prev]);
      setStaffPayOpen(false);
      setNewStaffPay({ staff_user_id: "", staff_type: "formateur", amount: "", period_start: "", period_end: "", notes: "" });
      toast({ title: "Paiement staff ajouté" });
    }
    setSubmitting(false);
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from("staff_payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      setStaffPayments(prev => prev.map(sp => sp.id === id ? { ...sp, status: "paid", paid_at: new Date().toISOString() } : sp));
      toast({ title: "Marqué comme payé" });
    }
  };

  // ── History / Export ──
  const allTransactions = useMemo(() => {
    const revs = payments.filter(p => p.status === "paid").map(p => ({
      date: p.paid_at || p.created_at,
      type: "revenu" as const,
      category: "Inscription",
      description: `${(p.profiles as any)?.first_name || ""} ${(p.profiles as any)?.last_name || ""} (${(p.cohorts as any)?.name || ""})`,
      amount: p.amount,
    }));
    const exps = expenses.map(e => ({
      date: e.expense_date,
      type: "depense" as const,
      category: categoryLabels[e.category] || e.category,
      description: e.description,
      amount: -e.amount,
    }));
    const sps = staffPayments.filter(sp => sp.status === "paid").map(sp => ({
      date: sp.paid_at || sp.created_at,
      type: "depense" as const,
      category: "Paiement formateur",
      description: `${(sp.profiles as any)?.first_name || ""} ${(sp.profiles as any)?.last_name || ""}`,
      amount: -sp.amount,
    }));
    return [...revs, ...exps, ...sps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, staffPayments]);

  const filteredTransactions = useMemo(() => allTransactions.filter(t => {
    if (!inRange(t.date)) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (debouncedSearch && !t.description.toLowerCase().includes(debouncedSearch.toLowerCase()) && !t.category.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [allTransactions, typeFilter, categoryFilter, debouncedSearch, periodFilter]);

  const HISTORY_PAGE_SIZE = 20;
  const historyTotalPages = Math.ceil(filteredTransactions.length / HISTORY_PAGE_SIZE);
  const pagedTransactions = filteredTransactions.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE);

  const handleExport = () => {
    exportToCsv("comptabilite.csv", filteredTransactions.map(t => ({
      ...t,
      amount: Math.abs(t.amount),
      typeLabel: t.type === "revenu" ? "Revenu" : "Dépense",
      dateFormatted: format(new Date(t.date), "dd/MM/yyyy"),
    })), [
      { key: "dateFormatted", label: "Date" },
      { key: "typeLabel", label: "Type" },
      { key: "category", label: "Catégorie" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Montant (FCFA)" },
    ]);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const StatCard = ({ icon: Icon, label, value, change, positive }: { icon: any; label: string; value: string; change?: number; positive?: boolean }) => (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        {change !== undefined && periodFilter === "month" && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-green-600" : "text-destructive"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Comptabilité
        </h2>
        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Revenus" value={formatCurrency(currentRevenue)} change={pctChange(currentRevenue, prevRevenue)} positive={currentRevenue >= prevRevenue} />
        <StatCard icon={TrendingDown} label="Dépenses" value={formatCurrency(totalExpenses)} change={pctChange(totalExpenses, prevTotalExpenses)} positive={totalExpenses <= prevTotalExpenses} />
        <StatCard icon={DollarSign} label="Bénéfice net" value={formatCurrency(netProfit)} change={pctChange(netProfit, prevNetProfit)} positive={netProfit >= prevNetProfit} />
        <StatCard icon={UsersIcon} label="Paiements en attente" value={String(payments.filter(p => p.status === "pending").length)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Revenus</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="formateurs">Formateurs</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* ── Revenus ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Étudiant</th>
                  <th className="px-5 py-3 font-medium">Formation</th>
                  <th className="px-5 py-3 font-medium">Montant</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.filter(p => inRange(p.paid_at || p.created_at)).map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-muted-foreground">{format(new Date(p.paid_at || p.created_at), "dd/MM/yyyy")}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{(p.profiles as any)?.first_name} {(p.profiles as any)?.last_name}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{(p.cohorts as any)?.formations?.name || (p.cohorts as any)?.name || "-"}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        p.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {p.status === "paid" ? "Payé" : p.status === "pending" ? "En attente" : "En retard"}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.filter(p => inRange(p.paid_at || p.created_at)).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun revenu sur cette période</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Dépenses ── */}
        <TabsContent value="expenses" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Ajouter une dépense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formateur">Paiement formateur</SelectItem>
                        <SelectItem value="technique">Frais techniques</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Input value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} placeholder="Description de la dépense" /></div>
                  <div><Label>Montant (FCFA)</Label><Input type="number" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
                  <div><Label>Date</Label><Input type="date" value={newExpense.expense_date} onChange={e => setNewExpense(p => ({ ...p, expense_date: e.target.value }))} /></div>
                  <Button onClick={handleAddExpense} disabled={submitting} className="w-full">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Catégorie</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {expenses.filter(e => inRange(e.expense_date)).map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-muted-foreground">{format(new Date(e.expense_date), "dd/MM/yyyy")}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{categoryLabels[e.category]}</span></td>
                    <td className="px-5 py-3 text-sm text-foreground">{e.description}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-destructive">-{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
                {expenses.filter(e => inRange(e.expense_date)).length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune dépense sur cette période</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Formateurs ── */}
        <TabsContent value="formateurs" className="mt-4 space-y-4">
          <StaffPaymentsSection
            staffPayments={staffPayments.filter(sp => sp.staff_type === "formateur")}
            staffType="formateur"
            onMarkPaid={handleMarkPaid}
            onAdd={() => { setNewStaffPay(p => ({ ...p, staff_type: "formateur" })); setStaffPayOpen(true); }}
          />
        </TabsContent>


        {/* ── Historique ── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9 pr-8 bg-secondary border-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery !== debouncedSearch && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setHistoryPage(0); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="revenu">Revenus</SelectItem>
                <SelectItem value="depense">Dépenses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setHistoryPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="Inscription">Inscription</SelectItem>
                <SelectItem value="Paiement formateur">Paiement formateur</SelectItem>
                <SelectItem value="Frais techniques">Frais techniques</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Catégorie</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {pagedTransactions.map((t, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-muted-foreground">{format(new Date(t.date), "dd/MM/yyyy")}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.type === "revenu" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-destructive/10 text-destructive"
                      }`}>
                        {t.type === "revenu" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {t.type === "revenu" ? "Revenu" : "Dépense"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{t.category}</td>
                    <td className="px-5 py-3 text-sm text-foreground">{t.description}</td>
                    <td className={`px-5 py-3 text-sm font-semibold ${t.amount >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {t.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(t.amount))}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune transaction trouvée</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
        </TabsContent>
      </Tabs>

      {/* Staff Payment Dialog */}
      <Dialog open={staffPayOpen} onOpenChange={setStaffPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau paiement formateur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Membre du staff</Label>
              <Select value={newStaffPay.staff_user_id} onValueChange={v => setNewStaffPay(p => ({ ...p, staff_user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Montant (FCFA)</Label><Input type="number" value={newStaffPay.amount} onChange={e => setNewStaffPay(p => ({ ...p, amount: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Début période</Label><Input type="date" value={newStaffPay.period_start} onChange={e => setNewStaffPay(p => ({ ...p, period_start: e.target.value }))} /></div>
              <div><Label>Fin période</Label><Input type="date" value={newStaffPay.period_end} onChange={e => setNewStaffPay(p => ({ ...p, period_end: e.target.value }))} /></div>
            </div>
            <div><Label>Notes (optionnel)</Label><Textarea value={newStaffPay.notes} onChange={e => setNewStaffPay(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button onClick={handleAddStaffPayment} disabled={submitting} className="w-full">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Staff Payments Sub-section ──
const StaffPaymentsSection = ({ staffPayments, staffType, onMarkPaid, onAdd }: {
  staffPayments: StaffPayment[];
  staffType: string;
  onMarkPaid: (id: string) => void;
  onAdd: () => void;
}) => {
  // Group by staff member
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; payments: StaffPayment[] }>();
    staffPayments.forEach(sp => {
      const key = sp.staff_user_id;
      if (!map.has(key)) {
        map.set(key, { name: `${(sp.profiles as any)?.first_name || ""} ${(sp.profiles as any)?.last_name || ""}`.trim(), payments: [] });
      }
      map.get(key)!.payments.push(sp);
    });
    return Array.from(map.values());
  }, [staffPayments]);

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={onAdd}><Plus className="h-4 w-4" /> Ajouter un paiement</Button>
      </div>
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun paiement {staffType} enregistré
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => {
            const totalDue = g.payments.reduce((s, p) => s + p.amount, 0);
            const totalPaid = g.payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
            const remaining = totalDue - totalPaid;
            return (
              <div key={g.name} className="rounded-2xl border border-border bg-card shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{g.name}</h3>
                    <p className="text-xs text-muted-foreground">{g.payments.length} paiement(s)</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Dû : <strong className="text-foreground">{formatCurrency(totalDue)}</strong></span>
                    <span className="text-muted-foreground">Payé : <strong className="text-green-600">{formatCurrency(totalPaid)}</strong></span>
                    <span className="text-muted-foreground">Reste : <strong className={remaining > 0 ? "text-destructive" : "text-foreground"}>{formatCurrency(remaining)}</strong></span>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-2 font-medium">Période</th>
                      <th className="px-5 py-2 font-medium">Montant</th>
                      <th className="px-5 py-2 font-medium">Statut</th>
                      <th className="px-5 py-2 font-medium">Notes</th>
                      <th className="px-5 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.payments.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="px-5 py-3 text-sm text-muted-foreground">{format(new Date(p.period_start), "dd/MM/yyyy")} au {format(new Date(p.period_end), "dd/MM/yyyy")}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {p.status === "paid" ? "Payé" : "En attente"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">{p.notes || "-"}</td>
                        <td className="px-5 py-3">
                          {p.status === "pending" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onMarkPaid(p.id)}>
                              <Check className="h-3 w-3" /> Marquer payé
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AccountingPanel;
