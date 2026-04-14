import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, CheckCheck, Info, PartyPopper, AlertTriangle, Megaphone, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  official: { icon: Megaphone, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  celebration: { icon: PartyPopper, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  urgent: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-secondary" },
  brief: { icon: Info, color: "text-accent", bg: "bg-accent/10" },
  payment: { icon: Info, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
};

const NotificationPanel = () => {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const getNotificationRoute = (notif: Notification) => {
    const rolePrefix = activeRole === "super_admin" ? "/admin" : activeRole === "staff" ? "/staff" : "/student";
    const typeMap: Record<string, string> = {
      brief: `${rolePrefix}?tab=briefs`,
      payment: activeRole === "student" ? "/student?tab=payments" : "/admin?tab=payments",
      message: activeRole === "student" ? "/student?tab=messages" : `${rolePrefix}?tab=messages`,
      official: activeRole === "student" ? "/student?tab=messages" : `${rolePrefix}?tab=messages`,
      celebration: activeRole === "student" ? "/student?tab=messages" : `${rolePrefix}?tab=messages`,
      urgent: activeRole === "student" ? "/student?tab=messages" : `${rolePrefix}?tab=messages`,
      task: activeRole === "staff" ? "/staff?tab=tasks" : "/admin?tab=tasks",
      portfolio: activeRole === "student" ? "/student?tab=portfolio" : `${rolePrefix}?tab=portfolios`,
      attestation: activeRole === "student" ? "/student?tab=dashboard" : `${rolePrefix}?tab=attestations`,
    };
    return typeMap[notif.type] || rolePrefix;
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    setOpen(false);
    navigate(getNotificationRoute(notif));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-" + user.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount} nouvelles</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1">
                <CheckCheck className="h-3.5 w-3.5" /> Tout lire
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notif => {
                const config = typeConfig[notif.type] || typeConfig.info;
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-6 py-4 transition-colors hover:bg-secondary/50 cursor-pointer ${!notif.is_read ? "bg-accent/5" : ""}`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-accent mt-1.5" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground/60">{formatDate(notif.created_at)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationPanel;
