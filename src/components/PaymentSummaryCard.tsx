import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, AlertCircle, Clock, CreditCard, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentDiscount } from "@/lib/student-discount";
import { cn } from "@/lib/utils";

interface Props {
  cohortId: string;
  cohortStartDate: string;
  formationId: string | null;
}

interface SummaryState {
  remaining: number;
  effectiveTotalDue: number;
  nextLabel: string | null;
  nextDate: Date | null;
  daysLeft: number | null;
}

const FORMATION_TYPES = ["tranche_1", "tranche_2", "formation_complete", "formation"];

const PaymentSummaryCard = ({ cohortId, cohortStartDate, formationId }: Props) => {
  const { user } = useAuth();
  const [state, setState] = useState<SummaryState | null>(null);

  useEffect(() => {
    if (!user || !cohortId) return;
    let cancelled = false;

    const load = async () => {
      const [paymentsRes, formationRes, discount] = await Promise.all([
        supabase
          .from("payments")
          .select("amount, payment_type, status")
          .eq("user_id", user.id)
          .eq("cohort_id", cohortId),
        formationId
          ? supabase
              .from("formations")
              .select("registration_fee, total_price, tranche_1_amount, tranche_2_amount")
              .eq("id", formationId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        fetchStudentDiscount(user.id, cohortId),
      ]);

      if (cancelled) return;

      const payments = paymentsRes.data ?? [];
      const f = (formationRes as { data: { registration_fee: number; total_price: number; tranche_1_amount: number; tranche_2_amount: number } | null }).data;

      const inscriptionAmount = f?.registration_fee ?? 10000;
      const totalDue = f?.total_price ?? 50000;
      const effectiveTotalDue = Math.max(0, totalDue - discount);
      const effectiveInscriptionAmount = Math.max(0, inscriptionAmount - discount);
      const formationCost = Math.max(0, totalDue - inscriptionAmount);
      const tranche1 = f?.tranche_1_amount ?? Math.floor(formationCost / 2);

      const sumPaid = (types: string[]) =>
        payments
          .filter((p) => types.includes(p.payment_type) && p.status === "paid")
          .reduce((s, p) => s + p.amount, 0);

      const inscriptionPaid = sumPaid(["inscription"]);
      const formationPaid = sumPaid(FORMATION_TYPES);
      const totalPaid = inscriptionPaid + formationPaid;
      const remaining = Math.max(effectiveTotalDue - totalPaid, 0);

      const inscriptionDone = inscriptionPaid >= effectiveInscriptionAmount;
      const tranche1Done = formationPaid >= tranche1;
      const formationDone = formationPaid >= formationCost;

      const deadlines = [
        { days: 15, done: inscriptionDone, label: "Inscription" },
        { days: 30, done: tranche1Done, label: "1re echeance formation" },
        { days: 60, done: formationDone, label: "2e echeance formation" },
      ];

      const next = deadlines.find((d) => !d.done) ?? null;
      let nextDate: Date | null = null;
      let daysLeft: number | null = null;

      if (next && cohortStartDate) {
        try {
          nextDate = addDays(parseISO(cohortStartDate), next.days);
          daysLeft = differenceInDays(nextDate, new Date());
        } catch {
          // date invalide : on ignore
        }
      }

      setState({
        remaining,
        effectiveTotalDue,
        nextLabel: next?.label ?? null,
        nextDate,
        daysLeft,
      });
    };

    load();
    return () => { cancelled = true; };
  }, [user, cohortId, cohortStartDate, formationId]);

  if (!state) return null;

  const { remaining, effectiveTotalDue, nextLabel, nextDate, daysLeft } = state;
  const allPaid = remaining === 0;
  const isOverdue = !allPaid && daysLeft !== null && daysLeft < 0;
  const isUrgent = !allPaid && !isOverdue && daysLeft !== null && daysLeft <= 7;

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  type StatusColor = "green" | "red" | "amber" | "neutral";
  const statusColor: StatusColor =
    allPaid ? "green" : isOverdue ? "red" : isUrgent ? "amber" : "neutral";

  const borderClass: Record<StatusColor, string> = {
    green: "border-green-200 dark:border-green-800/40",
    red: "border-red-200 dark:border-red-800/40",
    amber: "border-amber-200 dark:border-amber-800/40",
    neutral: "border-border",
  };

  const iconBgClass: Record<StatusColor, string> = {
    green: "bg-green-500/10",
    red: "bg-red-500/10",
    amber: "bg-amber-500/10",
    neutral: "bg-accent/10",
  };

  const amountClass: Record<StatusColor, string> = {
    green: "text-green-700 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    neutral: "text-foreground",
  };

  const deadlineText = (() => {
    if (!nextLabel || !nextDate) return null;
    if (isOverdue) {
      const absDays = Math.abs(daysLeft ?? 0);
      return `${nextLabel} : en retard de ${absDays} jour${absDays > 1 ? "s" : ""}`;
    }
    if (daysLeft === 0) return `${nextLabel} : echeance aujourd'hui`;
    return `${nextLabel} avant le ${format(nextDate, "d MMMM", { locale: fr })}`;
  })();

  return (
    <div className={cn("mb-6 rounded-2xl border bg-card p-4 shadow-card", borderClass[statusColor])}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBgClass[statusColor])}>
            {allPaid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : isOverdue ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : isUrgent ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : (
              <CreditCard className="h-5 w-5 text-accent" />
            )}
          </div>

          <div className="min-w-0">
            {allPaid ? (
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Paiements a jour
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={cn("text-xl font-bold leading-none", amountClass[statusColor])}>
                    {fmt(remaining)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    restant sur {fmt(effectiveTotalDue)}
                  </span>
                </div>
                {deadlineText && (
                  <p className={cn("mt-1 truncate text-xs font-medium", amountClass[statusColor])}>
                    {deadlineText}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Link
          to="/student?tab=payments"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
        >
          Voir mes paiements
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;
