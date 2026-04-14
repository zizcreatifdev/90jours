import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary">
          <span className="font-display text-4xl font-bold text-primary-foreground">404</span>
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Page introuvable</h1>
        <p className="mb-8 text-muted-foreground max-w-sm mx-auto">
          La page <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{location.pathname}</code> n'existe pas ou a été déplacée.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
          </Button>
          <Button asChild>
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" /> Accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
