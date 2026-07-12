import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

const ResetPasswordLanding = () => {
  const [searchParams] = useSearchParams();
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setInvalid(true);
      return;
    }
    try {
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64);
      if (!decoded.startsWith("https://") || !decoded.includes("/auth/v1/verify")) {
        setInvalid(true);
        return;
      }
      setActionLink(decoded);
    } catch {
      setInvalid(true);
    }
  }, [searchParams]);

  const handleConfirm = () => {
    if (actionLink) {
      window.location.href = actionLink;
    }
  };

  if (!actionLink && !invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Lien invalide ou expiré</h1>
          <p className="mb-6 text-muted-foreground">
            Ce lien de réinitialisation est invalide ou a expiré. Les liens sont valables 1 heure.
          </p>
          <Link to="/forgot-password">
            <Button className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              Demander un nouveau lien
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Retour a la connexion
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6">
            <img
              src="/logos/Logo60jours_noir.svg"
              alt="60jours"
              className="h-16 object-contain dark:hidden"
              onError={(e) => { e.currentTarget.classList.add("!hidden"); }}
            />
            <img
              src="/logos/Logo60jours_blanc.svg"
              alt="60jours"
              className="hidden h-16 object-contain dark:block"
              onError={(e) => { e.currentTarget.classList.add("!hidden"); }}
            />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
            Réinitialisation du mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card text-center">
          <Button
            onClick={handleConfirm}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold py-6 text-base"
          >
            Réinitialiser mon mot de passe
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Ce lien est valable pendant 1 heure et ne peut être utilisé qu'une seule fois.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Retour a la connexion
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordLanding;
