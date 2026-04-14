import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STALE_TIME = 60_000; // 1 minute — real-time subscription handles freshness

async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

export function useUnreadNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Invalidate whenever a notification is inserted, updated, or deleted
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-unread-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["unread-notifications", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    staleTime: STALE_TIME,
  });

  return { unreadCount };
}
