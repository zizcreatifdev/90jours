import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, Fragment } from "react";
import {
  LayoutDashboard,
  Users,
  LogOut,
  HelpCircle,
  BookOpen,
  GraduationCap,
  Megaphone,
  History,
  Wallet,
  Tag,
  ClipboardList,
  ListTodo,
  TrendingUp,
  Briefcase,
  TicketPercent,
  Upload,
  UserCircle,
  Settings,
  Menu,
  Award,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Maximize2,
  Minimize2,
  ChevronDown,
  FileSignature,
  MessageSquareQuote,
  MessageSquare,
  ListPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import RoleSwitcher from "@/components/RoleSwitcher";
import { cn } from "@/lib/utils";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ElementType;
  sectionLabel?: string;
}

const adminLinks: SidebarLink[] = [
  { href: "/admin?tab=overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin?tab=calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/admin?tab=messages", label: "Messages", icon: Megaphone },
  { href: "/admin?tab=formations", label: "Formations", icon: GraduationCap, sectionLabel: "Pédagogie" },
  { href: "/admin?tab=formateurs", label: "Staff", icon: UserCircle },
  { href: "/admin?tab=tasks", label: "Tâches", icon: ListTodo },
  { href: "/admin?tab=cohorts", label: "Cohortes", icon: BookOpen },
  { href: "/admin?tab=briefs", label: "Briefs", icon: ClipboardList },
  { href: "/admin?tab=categories", label: "Catégories", icon: Tag },
  { href: "/admin?tab=payments", label: "Paiements", icon: Wallet, sectionLabel: "Finance" },
  { href: "/admin?tab=promos", label: "Codes promo", icon: TicketPercent },
  { href: "/admin?tab=accounting", label: "Comptabilité", icon: TrendingUp },
  { href: "/admin?tab=waitlist", label: "Liste d'attente", icon: ListPlus, sectionLabel: "Admin" },
  { href: "/admin?tab=portfolios", label: "Portfolios", icon: Briefcase },
  { href: "/admin?tab=attestations", label: "Attestations", icon: Award },
  { href: "/admin?tab=contracts", label: "Contrats", icon: FileSignature },
  { href: "/admin?tab=testimonials", label: "Témoignages", icon: MessageSquareQuote },
  { href: "/admin?tab=users", label: "Utilisateurs", icon: Users },
  { href: "/admin?tab=audit", label: "Historique", icon: History },
  { href: "/admin?tab=settings", label: "Paramètres", icon: Settings },
];

const staffLinks: SidebarLink[] = [
  { href: "/staff", label: "Mes cohortes", icon: LayoutDashboard },
  { href: "/staff?tab=calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/staff?tab=messages", label: "Messages", icon: MessageSquare },
  { href: "/staff?tab=tasks", label: "Mes tâches", icon: ClipboardList },
  { href: "/staff?tab=briefs", label: "Briefs", icon: BookOpen },
  { href: "/staff?tab=portfolios", label: "Portfolios", icon: Briefcase },
  { href: "/staff?tab=attestations", label: "Attestations", icon: Award },
  { href: "/staff?tab=announcements", label: "Annonces", icon: Megaphone },
  { href: "/staff?tab=resources", label: "Ressources", icon: Upload },
  { href: "/staff?tab=formations", label: "Formations", icon: GraduationCap, sectionLabel: "Inscription" },
];

const studentLinks: SidebarLink[] = [
  { href: "/student", label: "Ma cohorte", icon: LayoutDashboard },
  { href: "/student?tab=calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/student?tab=messages", label: "Messages", icon: Megaphone },
  { href: "/student?tab=briefs", label: "Mes briefs", icon: ClipboardList },
  { href: "/student?tab=portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/student?tab=payments", label: "Paiements", icon: Wallet },
  { href: "/student?tab=formations", label: "Formations", icon: GraduationCap, sectionLabel: "Inscription" },
];

interface DashboardSidebarProps {
  role: "admin" | "staff" | "student";
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const SidebarNav = ({
  links,
  role,
  expanded,
  unreadCount,
  focusMode,
  onNavigate,
  onToggleFocusMode,
}: {
  links: SidebarLink[];
  role: string;
  expanded: boolean;
  unreadCount: number;
  focusMode: boolean;
  onNavigate?: () => void;
  onToggleFocusMode: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { settings } = useSiteSettings();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className={cn("flex h-full flex-col py-5", expanded ? "items-stretch px-3" : "items-center")}>
      {/* Logo */}
      <Link
        to="/"
        className={cn(
          "mb-4 flex h-10 items-center justify-center overflow-hidden rounded-xl bg-primary",
          expanded ? "w-full" : "w-10"
        )}
        onClick={onNavigate}
      >
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="max-h-7 max-w-[85%] object-contain" />
        ) : (
          <span className="font-display text-xs font-bold text-primary-foreground">60</span>
        )}
      </Link>

      {/* Role Switcher */}
      <div className={cn("mb-2", expanded ? "px-0" : "flex justify-center")}>
        <RoleSwitcher />
      </div>

      {/* Nav links */}
      <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto", expanded ? "" : "items-center")}>
        {links.map((link) => {
          const linkUrl = new URL(link.href, window.location.origin);
          const linkTab = linkUrl.searchParams.get("tab");
          const currentTab = new URLSearchParams(location.search).get("tab");
          const isActive =
            location.pathname === linkUrl.pathname &&
            (linkTab === currentTab || (!linkTab && !currentTab));

          const content = (
            <Link
              to={link.href}
              onClick={onNavigate}
              aria-label={!expanded ? link.label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl transition-colors",
                expanded ? "h-10 px-3" : "h-10 w-10 justify-center",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute -left-[calc(0.75rem+1px)] h-6 w-1 rounded-r-full bg-foreground" />
              )}
              <link.icon className="h-5 w-5 shrink-0" />
              {expanded && (
                <span className="text-sm font-medium truncate">{link.label}</span>
              )}
            </Link>
          );

          return (
            <Fragment key={link.href}>
              {link.sectionLabel && (
                expanded
                  ? <div className="mt-3 mb-0.5 px-1"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">{link.sectionLabel}</p></div>
                  : <div className="my-2 mx-auto h-px w-6 bg-border/60" />
              )}
              {expanded ? (
                <div>{content}</div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{link.label}</TooltipContent>
                </Tooltip>
              )}
            </Fragment>
          );
        })}
      </nav>

      {/* Bottom utility zone */}
      <div className={cn("flex flex-col gap-1 mt-2", expanded ? "" : "items-center")}>
        {/* Icon row: Focus, Theme, Notifications - horizontal when expanded, vertical when collapsed */}
        <div className={cn(
          expanded ? "flex items-center gap-0.5 mb-1" : "flex flex-col items-center gap-1"
        )}>
          {/* Mode Focus */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={focusMode ? "Quitter le mode focus" : "Mode Focus"}
                onClick={onToggleFocusMode}
                className={cn(
                  "flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                  expanded ? "h-8 w-8" : "h-10 w-10"
                )}
              >
                <Maximize2 className={cn("shrink-0", expanded ? "h-4 w-4" : "h-5 w-5")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Mode Focus</TooltipContent>
          </Tooltip>

          {/* ThemeToggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount > 99 ? "99+" : unreadCount} non lues` : ""}`}
                onClick={() => {
                  const path = role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/student";
                  navigate(path);
                  onNavigate?.();
                }}
                className={cn(
                  "relative flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                  expanded ? "h-8 w-8" : "h-10 w-10"
                )}
              >
                <Bell className={cn("shrink-0", expanded ? "h-4 w-4" : "h-5 w-5")} />
                {unreadCount > 0 && (
                  <span className={cn(
                    "absolute flex items-center justify-center rounded-full bg-red-500 font-bold leading-none text-white animate-pulse",
                    expanded
                      ? "-right-1 -top-1 h-3.5 min-w-[0.875rem] px-0.5 text-[9px]"
                      : "-right-1.5 -top-1.5 h-4 min-w-[1rem] px-1 text-[10px]"
                  )}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {unreadCount > 0 ? `${unreadCount > 99 ? "99+" : unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}` : "Notifications"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Profile block - avatar + first name (expanded) or avatar only (collapsed), opens DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menu profil"
              className={cn(
                "flex items-center gap-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                expanded ? "h-10 px-3 w-full" : "h-10 w-10 justify-center"
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profil" className="object-cover" />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                  {(profile?.first_name?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {expanded && (
                <>
                  <span className="flex-1 text-left text-sm font-medium truncate">
                    {profile?.first_name || "Profil"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-44">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => { navigate("/profile"); onNavigate?.(); }}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const DashboardSidebar = ({ role, mobileOpen, onMobileOpenChange }: DashboardSidebarProps) => {
  const links = role === "admin" ? adminLinks : role === "staff" ? staffLinks : studentLinks;
  const [expanded, setExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(
    () => localStorage.getItem("60jours-focus-mode") === "true"
  );
  const { unreadCount } = useUnreadNotifications();

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    localStorage.setItem("60jours-focus-mode", String(next));
  };

  return (
    <>
      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[220px] p-0 border-r border-border bg-card">
          <SidebarNav
            links={links}
            role={role}
            expanded={true}
            unreadCount={unreadCount}
            focusMode={focusMode}
            onNavigate={() => onMobileOpenChange?.(false)}
            onToggleFocusMode={toggleFocusMode}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar, hidden in focus mode */}
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r border-border bg-card sticky top-0 transition-all duration-200",
          focusMode ? "w-0 overflow-hidden border-0" : expanded ? "w-[220px]" : "w-[72px]"
        )}
      >
        <div className="flex-1 overflow-hidden">
          <SidebarNav
            links={links}
            role={role}
            expanded={expanded}
            unreadCount={unreadCount}
            focusMode={focusMode}
            onToggleFocusMode={toggleFocusMode}
          />
        </div>

        {/* Expand/Collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Réduire le menu" : "Développer le menu"}
          className="flex h-10 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {expanded ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
        </button>
      </aside>

      {/* Floating exit button when in focus mode (desktop only) */}
      {focusMode && (
        <button
          onClick={toggleFocusMode}
          aria-label="Quitter le mode focus"
          title="Quitter le mode focus"
          className="hidden md:flex fixed left-3 top-1/2 -translate-y-1/2 z-50 h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}
    </>
  );
};

export default DashboardSidebar;
