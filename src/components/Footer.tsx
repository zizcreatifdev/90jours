import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/use-site-settings";

const Footer = () => {
  const { settings } = useSiteSettings();

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-8 w-auto brightness-0 invert" />
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                    <span className="font-display text-xs font-bold text-accent-foreground">60</span>
                  </div>
                  <span className="font-display text-lg font-bold">60 jours de formation</span>
                </>
              )}
            </div>
            <p className="text-sm opacity-80">
              {settings.footer_text || "Des formations intensives qui transforment votre créativité en 60 jours."}
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider opacity-60">Navigation</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-sm opacity-80 hover:opacity-100 transition-opacity">Accueil</Link>
              <Link to="/register" className="text-sm opacity-80 hover:opacity-100 transition-opacity">Inscription</Link>
              <Link to="/login" className="text-sm opacity-80 hover:opacity-100 transition-opacity">Connexion</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider opacity-60">Contact</h4>
            <p className="text-sm opacity-80">{settings.footer_email || "info@60jours.com"}</p>
            <p className="text-sm opacity-80">{settings.footer_phone || "+221 77 000 00 00"}</p>
          </div>
        </div>
        <div className="mt-8 border-t border-primary-foreground/10 pt-6 text-center text-xs opacity-50">
          © 2026 60 jours de formation. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
