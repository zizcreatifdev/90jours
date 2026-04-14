import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const roleConfig = {
  super_admin: { label: "Admin", icon: Shield, path: "/admin" },
  staff: { label: "Formateur", icon: GraduationCap, path: "/staff" },
  student: { label: "Étudiant", icon: BookOpen, path: "/student" },
} as const;

const RoleSwitcher = () => {
  const { roles, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();

  // Only show if user has more than one role
  if (roles.length <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-1 border-b border-border pb-3 mb-2">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Rôle</span>
      {roles.map((role) => {
        const config = roleConfig[role];
        if (!config) return null;
        const isActive = role === activeRole;
        const Icon = config.icon;
        return (
          <Tooltip key={role}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setActiveRole(role);
                  navigate(config.path);
                }}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{config.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default RoleSwitcher;
