import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const InvitationLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setInvalid(true);
      return;
    }
    try {
      // Dechiffrage base64url -> base64 standard -> URL
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64);
      // Validation minimale : doit ressembler a une URL Supabase Auth
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
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Lien invalide</h1>
          <p className="mb-6 text-muted-foreground">
            Ce lien d'invitation est invalide ou a expiré. Contactez votre administrateur pour recevoir une nouvelle invitation.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact :{" "}
            <a href="mailto:contact@60jours.com" className="text-accent underline">
              contact@60jours.com
            </a>
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
            Vous avez été invité à rejoindre l'équipe
          </h1>
          <p className="text-sm text-muted-foreground">
            Cliquez sur le bouton ci-dessous pour configurer votre compte et accéder à votre espace formateur.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card text-center">
          <Button
            onClick={handleConfirm}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold py-6 text-base"
          >
            Configurer mon compte
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Ce lien est à usage unique et expire dans 24 heures.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationLanding;
