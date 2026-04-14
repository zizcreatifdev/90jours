import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Wallet, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface AlertData {
  pendingPortfolios: number;
  pendingPayments: number;
  urgentBriefs: number;
}

const AdminAlertBanner = () => {
  const [data, setData] = useState<AlertData | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

      const [portfoliosRes, paymentsRes, briefsRes] = await Promise.all([
        supabase
          .from("portfolios")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("briefs")
          .select("id", { count: "exact", head: true })
          .gte("deadline", now.toISOString())
          .lte("deadline", in48h),
      ]);

      setData({
        pendingPortfolios: portfoliosRes.count ?? 0,
        pendingPayments: paymentsRes.count ?? 0,
        urgentBriefs: briefsRes.count ?? 0,
      });
    };
    fetchAlerts();
  }, []);

  if (!data) return null;

  const alerts: { icon: typeof Briefcase; text: string; color: string; bg: string; tab: string }[] = [];

  if (data.pendingPortfolios > 0) {
    alerts.push({
      icon: Briefcase,
      text: `${data.pendingPortfolios} portfolio${data.pendingPortfolios > 1 ? "s" : ""} en attente de validation`,
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900",
      tab: "portfolios",
    });
  }
  if (data.pendingPayments > 0) {
    alerts.push({
      icon: Wallet,
      text: `${data.pendingPayments} paiement${data.pendingPayments > 1 ? "s" : ""} non confirmé${data.pendingPayments > 1 ? "s" : ""}`,
      color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900",
      tab: "payments",
    });
  }
  if (data.urgentBriefs > 0) {
    alerts.push({
      icon: Clock,
      text: `${data.urgentBriefs} brief${data.urgentBriefs > 1 ? "s" : ""} avec deadline dans moins de 48h`,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900",
      tab: "briefs",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {alerts.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <div key={i} className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 ${alert.bg}`}>
            <AlertTriangle className={`h-4 w-4 shrink-0 ${alert.color}`} />
            <span className={`text-sm font-medium ${alert.color}`}>{alert.text}</span>
            <Link
              to={`/admin?tab=${alert.tab}`}
              className={`ml-1 text-xs underline opacity-60 hover:opacity-100 transition-opacity ${alert.color}`}
            >
              Voir →
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default AdminAlertBanner;
