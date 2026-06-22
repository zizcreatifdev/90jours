import { useState, useEffect } from "react";
import { Lock, PenLine, Flame, Palette, GraduationCap, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeType, StudentBadge } from "@/hooks/use-student-badges";
import type { LucideIcon } from "lucide-react";

// ── Badge definitions ─────────────────────────────────────────────────────────

interface BadgeDef {
  Icon: LucideIcon;
  label: string;
  description: string;
  earned: string;
}

const BADGE_DEFS: Record<BadgeType, BadgeDef> = {
  first_brief: {
    Icon: PenLine,
    label: "Premier pas",
    description: "Soumettre son premier brief",
    earned:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
  streak_7: {
    Icon: Flame,
    label: "Flamme 7j",
    description: "Actif 7 jours consécutifs",
    earned:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
  },
  portfolio_validated: {
    Icon: Palette,
    label: "Portfolio",
    description: "Portfolio approuvé par un formateur",
    earned:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
  },
  cohort_completed: {
    Icon: GraduationCap,
    label: "Diplômé",
    description: "Cohorte terminée avec succès",
    earned:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  },
  early_payment: {
    Icon: Zap,
    label: "Early bird",
    description: "Paiement effectué avant la rentrée",
    earned:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
  },
};

const BADGE_ORDER: BadgeType[] = [
  "first_brief",
  "streak_7",
  "portfolio_validated",
  "cohort_completed",
  "early_payment",
];

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#06b6d4"];

interface Particle {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
  isCircle: boolean;
}

const buildParticles = (): Particle[] =>
  Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    delay: Math.random() * 0.6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    isCircle: i % 3 === 0,
  }));

const Confetti = () => {
  const [particles] = useState<Particle[]>(buildParticles);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map(p => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `badge-confetti-fall 2.6s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes badge-confetti-fall {
          0%   { transform: translateY(0)    rotate(0deg);   opacity: 1; }
          100% { transform: translateY(102vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ── BadgeShowcase ─────────────────────────────────────────────────────────────

interface BadgeShowcaseProps {
  badges: StudentBadge[];
  newBadge?: BadgeType | null;
  isLoading?: boolean;
}

const BadgeShowcase = ({
  badges,
  newBadge,
  isLoading = false,
}: BadgeShowcaseProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!newBadge) return;
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, [newBadge]);

  const earnedMap = new Map(badges.map(b => [b.badge_type as BadgeType, b]));
  const earnedCount = badges.length;

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="rounded-2xl border border-border bg-card shadow-card p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" aria-hidden="true" /> Mes badges
          </h2>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {earnedCount}/{BADGE_ORDER.length}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {isLoading
            ? BADGE_ORDER.map(bt => (
                <div key={bt} className="flex flex-col items-center gap-2">
                  <div className="h-14 w-full rounded-2xl bg-muted animate-pulse" />
                  <div className="h-2.5 w-3/4 rounded bg-muted animate-pulse" />
                </div>
              ))
            : BADGE_ORDER.map(bt => {
                const earned = earnedMap.get(bt);
                const def = BADGE_DEFS[bt];
                const isNew = newBadge === bt;

                return (
                  <div
                    key={bt}
                    title={
                      earned
                        ? `${def.label}, obtenu le ${new Date(earned.earned_at).toLocaleDateString("fr-FR")}`
                        : def.description
                    }
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-all duration-200 cursor-default select-none",
                      earned
                        ? cn(
                            def.earned,
                            isNew &&
                              "ring-2 ring-offset-2 ring-offset-card ring-current scale-110 shadow-lg"
                          )
                        : "border-border bg-muted/20 opacity-40"
                    )}
                  >
                    {/* Icon */}
                    <span
                      className="flex h-7 w-7 items-center justify-center"
                      aria-hidden="true"
                    >
                      {earned
                        ? <def.Icon className="h-6 w-6" />
                        : <Lock className="h-5 w-5 text-muted-foreground" />}
                    </span>

                    {/* Label */}
                    <p className="text-center text-[10px] font-semibold leading-tight">
                      {def.label}
                    </p>

                    {/* Earned date */}
                    {earned && (
                      <p className="text-[9px] opacity-60 leading-tight">
                        {new Date(earned.earned_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
        </div>

        {/* Progress bar */}
        {!isLoading && (
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${(earnedCount / BADGE_ORDER.length) * 100}%` }}
              />
            </div>
            {earnedCount === BADGE_ORDER.length && (
              <p className="mt-1.5 text-center text-xs font-semibold text-green-600 dark:text-green-400">
                Tous les badges débloqués !
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default BadgeShowcase;
