import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "super_admin" | "staff" | "student";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, roles, activeRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && !roles.includes(requiredRole)) {
    // Redirect to appropriate dashboard based on active role
    if (activeRole === "super_admin") return <Navigate to="/admin" replace />;
    if (activeRole === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
