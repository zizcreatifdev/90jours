import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "super_admin" | "staff" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  profile: { first_name: string; last_name: string; avatar_url: string | null } | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  activeRole: null,
  setActiveRole: () => {},
  profile: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Priority order for default active role
const rolePriority: AppRole[] = ["super_admin", "staff", "student"];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; avatar_url: string | null } | null>(null);

  const setActiveRole = (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem("90jours-active-role", role);
    }
  };

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("first_name, last_name, avatar_url").eq("user_id", userId).single(),
    ]);
    const fetchedRoles = rolesRes.data ? rolesRes.data.map((r: any) => r.role as AppRole) : [];
    setRoles(fetchedRoles);
    if (profileRes.data) setProfile(profileRes.data as any);

    // Set active role: restore from storage if valid, otherwise use highest priority
    const stored = localStorage.getItem("90jours-active-role") as AppRole | null;
    if (stored && fetchedRoles.includes(stored)) {
      setActiveRoleState(stored);
    } else {
      const defaultRole = rolePriority.find(r => fetchedRoles.includes(r)) || fetchedRoles[0] || null;
      setActiveRoleState(defaultRole);
      if (defaultRole) localStorage.setItem("90jours-active-role", defaultRole);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          fetchUserData(session.user.id);
        }
      }

      if (event === "SIGNED_OUT") {
        setRoles([]);
        setProfile(null);
        setActiveRoleState(null);
        localStorage.removeItem("90jours-active-role");
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem("90jours-active-role");
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, activeRole, setActiveRole, profile, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
