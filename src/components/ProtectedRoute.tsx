import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "super_admin" | "staff" | "student";
  requiredRoles?: Array<"super_admin" | "staff" | "student">;
}

const ProtectedRoute = ({ children, requiredRole, requiredRoles }: ProtectedRouteProps) => {
  const { user, loading, activeRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const roles = requiredRoles ?? (requiredRole ? [requiredRole] : null);
  if (roles && (!activeRole || !roles.includes(activeRole))) {
    if (activeRole === "super_admin") return <Navigate to="/admin" replace />;
    if (activeRole === "staff") return <Navigate to="/staff" replace />;
    if (activeRole === "student") return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
