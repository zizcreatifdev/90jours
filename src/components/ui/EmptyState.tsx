import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Primary heading text */
  title: string;
  /** Optional secondary description */
  description?: string;
  /** Optional call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Extra classes applied to the wrapper — use to override card styling */
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-1 font-display text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
