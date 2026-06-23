/**
 * use-student-badges.ts
 *
 * Fetches and manages student achievement badges.
 * Provides `checkAndAwardBadges(ctx)` which can be called after key events
 * (initial load, new brief submission, portfolio validation, etc.).
 *
 * Badge types:
 *  - first_brief          : first brief submitted
 *  - streak_7             : 7 consecutive days with at least one submission
 *  - portfolio_validated  : portfolio approved by a formateur
 *  - cohort_completed     : cohort status is "completed"
 *  - early_payment        : paid before the cohort start date
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BadgeType =
  | "first_brief"
  | "streak_7"
  | "portfolio_validated"
  | "cohort_completed"
  | "early_payment";

export interface StudentBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  earned_at: string;
  metadata: Record<string, unknown>;
}

export interface BadgeCheckContext {
  cohortId: string;
  cohortStartDate: string;
  cohortStatus: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the user has at least 7 consecutive days with a submission. */
const hasStreak7 = (dates: string[]): boolean => {
  if (dates.length < 7) return false;
  const uniqueDays = [...new Set(dates.map(d => d.slice(0, 10)))].sort();
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diffMs =
      new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      if (streak >= 7) return true;
    } else {
      streak = 1;
    }
  }
  return false;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useStudentBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newBadge, setNewBadge] = useState<BadgeType | null>(null);

  // Ref so callbacks always see the latest badges without being re-created
  const badgesRef = useRef<StudentBadge[]>([]);
  useEffect(() => {
    badgesRef.current = badges;
  }, [badges]);

  // ── Initial fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const fetchBadges = async () => {
      try {
        const { data } = await supabase
          .from("student_badges")
          .select("*")
          .eq("user_id", user.id);
        const loaded = (data || []) as StudentBadge[];
        setBadges(loaded);
        badgesRef.current = loaded;
      } catch (err) {
        console.error("Erreur de chargement des badges", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBadges();
  }, [user]);

  // ── Award checker ────────────────────────────────────────────────────────────
  const checkAndAwardBadges = useCallback(
    async ({ cohortId, cohortStartDate, cohortStatus }: BadgeCheckContext) => {
      if (!user) return;

      const earnedTypes = new Set(badgesRef.current.map(b => b.badge_type));
      const toAward: Array<{ badge_type: BadgeType; metadata: Record<string, unknown> }> = [];

      // ── Fetch all submissions for this user (all statuses) ────────────────
      const { data: allSubs } = await supabase
        .from("brief_submissions")
        .select("completed_at")
        .eq("user_id", user.id);

      const submissionDates = (allSubs || []).map(
        (s: { completed_at: string }) => s.completed_at
      );

      // 1. first_brief: at least one submission exists
      if (!earnedTypes.has("first_brief") && submissionDates.length > 0) {
        toAward.push({ badge_type: "first_brief", metadata: {} });
      }

      // 2. streak_7: 7 consecutive active days
      if (!earnedTypes.has("streak_7") && hasStreak7(submissionDates)) {
        toAward.push({ badge_type: "streak_7", metadata: {} });
      }

      // 3. portfolio_validated: any portfolio with status validated
      if (!earnedTypes.has("portfolio_validated")) {
        const { data: pf } = await supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "validated")
          .limit(1);
        if (pf && pf.length > 0) {
          toAward.push({ badge_type: "portfolio_validated", metadata: {} });
        }
      }

      // 4. cohort_completed: current cohort is completed
      if (!earnedTypes.has("cohort_completed") && cohortStatus === "completed") {
        toAward.push({
          badge_type: "cohort_completed",
          metadata: { cohort_id: cohortId },
        });
      }

      // 5. early_payment: payment confirmed before cohort start date
      if (!earnedTypes.has("early_payment") && cohortStartDate) {
        const { data: ep } = await supabase
          .from("payments")
          .select("paid_at")
          .eq("user_id", user.id)
          .eq("cohort_id", cohortId)
          .not("paid_at", "is", null)
          .lt("paid_at", cohortStartDate)
          .limit(1);
        if (ep && ep.length > 0) {
          toAward.push({ badge_type: "early_payment", metadata: {} });
        }
      }

      if (toAward.length === 0) return;

      // ── Insert only genuinely new badges (UNIQUE constraint + ignoreDuplicates) ──
      const rows = toAward.map(b => ({
        user_id: user.id,
        badge_type: b.badge_type,
        metadata: b.metadata,
      }));

      const { data: inserted } = await supabase
        .from("student_badges")
        .upsert(rows, { onConflict: "user_id,badge_type", ignoreDuplicates: true })
        .select();

      if (inserted && inserted.length > 0) {
        const newOnes = inserted as StudentBadge[];
        setBadges(prev => [...prev, ...newOnes]);
        badgesRef.current = [...badgesRef.current, ...newOnes];
        // Trigger confetti for the first newly earned badge
        setNewBadge(newOnes[0].badge_type);
        setTimeout(() => setNewBadge(null), 3200);
      }
    },
    [user]
  );

  return { badges, isLoading, checkAndAwardBadges, newBadge };
};
