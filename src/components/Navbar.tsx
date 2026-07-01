import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useSiteSettings } from "@/hooks/use-site-settings";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, activeRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings } = useSiteSettings();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const links = [
    { href: "/", label: "Accueil" },
    { href: "/register", label: "S'inscrire" },
  ];

  const handleDashboard = () => {
    if (activeRole === "super_admin") navigate("/admin");
    else if (activeRole === "staff") navigate("/staff");
    else navigate("/student");
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="60jours" className="h-8 w-auto object-contain" />
          ) : (
            <>
              <img
                src={isDark ? "/logos/Logo60jours_blanc.svg" : "/logos/Logo60jours_noir.svg"}
                alt="60jours"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.classList.add("hidden");
                  const next = e.currentTarget.nextElementSibling as HTMLElement;
                  if (next) next.classList.remove("hidden");
                }}
              />
              <span className="hidden font-display text-sm font-bold text-foreground">60</span>
            </>
          )}
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`font-body text-sm font-medium transition-colors hover:text-foreground ${
                location.pathname === link.href ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleDashboard}>
                Mon espace
              </Button>
              <Button size="sm" variant="ghost" onClick={() => signOut()}>
                Déconnexion
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Connexion</Button>
            </Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <button className="block w-full py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => { setIsOpen(false); handleDashboard(); }}>
                Mon espace
              </button>
              <button className="block w-full py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => { setIsOpen(false); signOut(); }}>
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setIsOpen(false)}>
              <Button size="sm" className="mt-2 w-full">Connexion</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
