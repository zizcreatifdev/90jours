import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: "default" | "accent" | "dark";
  trend?: { value: number; positive: boolean };
}

const StatsCard = ({ icon: Icon, label, value, subtitle, variant = "default", trend }: StatsCardProps) => {
  if (variant === "dark") {
    return (
      <div className="rounded-xl bg-primary p-4 text-primary-foreground">
        <div className="mb-1 flex items-center gap-2">
          <Icon className="h-4 w-4 opacity-70" />
        </div>
        <p className="font-display text-2xl font-bold">{value}</p>
        <p className="mt-0.5 text-xs opacity-70">{label}</p>
        {subtitle && <p className="text-[11px] opacity-50">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${variant === "accent" ? "bg-accent/10" : "bg-secondary"}`}>
          <Icon className={`h-4 w-4 ${variant === "accent" ? "text-accent" : "text-muted-foreground"}`} />
        </div>
        {trend !== undefined ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            trend.positive
              ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}>
            {trend.positive ? "+" : ""}{trend.value}%
          </span>
        ) : null}
      </div>
      <p className={`font-display text-2xl font-bold ${variant === "accent" ? "text-accent" : "text-foreground"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
};

export default StatsCard;
