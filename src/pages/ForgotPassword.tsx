import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation, isValidEmail } from "@/hooks/use-form-validation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { showError, handleBlur, isValid, validateAll } = useFormValidation(
    { email },
    {
      email: {
        required: "L'email est requis.",
        validate: (v) => (isValidEmail(String(v)) ? null : "Format d'email invalide."),
      },
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 items-center justify-center bg-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mx-auto mb-6">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="60jours" className="h-16 mx-auto" />
            ) : (
              <>
                <img
                  src="/logos/Logo60jours_blanc.svg"
                  alt="60jours"
                  className="h-16 mx-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.classList.add("hidden");
                    const next = e.currentTarget.nextElementSibling as HTMLElement;
                    if (next) next.classList.remove("hidden");
                  }}
                />
                <span className="hidden font-display text-3xl font-bold text-primary-foreground">60</span>
              </>
            )}
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground">
            60 jours de formation
          </h2>
          <p className="text-primary-foreground/70">
            Réinitialisez votre mot de passe pour retrouver l'accès à votre espace.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="60jours" className="h-10" />
            ) : (
              <>
                <img
                  src="/logos/Logo60jours_noir.svg"
                  alt="60jours"
                  className="h-10 w-auto object-contain dark:hidden"
                  onError={(e) => { e.currentTarget.classList.add("!hidden"); }}
                />
                <img
                  src="/logos/Logo60jours_blanc.svg"
                  alt="60jours"
                  className="hidden h-10 w-auto object-contain dark:block"
                  onError={(e) => { e.currentTarget.classList.add("!hidden"); }}
                />
              </>
            )}
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </div>
              <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
                Email envoyé !
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Un lien de réinitialisation a été envoyé à{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Vérifiez votre boîte mail et vos spams.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSent(false)}
              >
                Renvoyer un email
              </Button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="font-medium text-foreground hover:underline"
                >
                  ← Retour à la connexion
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">
                  Mot de passe oublié ?
                </h1>
                <p className="text-center text-sm text-muted-foreground">
                  Entrez votre adresse email. Nous vous enverrons un lien pour
                  réinitialiser votre mot de passe.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <RequiredLabel htmlFor="email" required>Adresse email</RequiredLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    aria-invalid={!!showError("email")}
                    placeholder="votre@email.com"
                    autoFocus
                  />
                  <FieldError message={showError("email")} />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !isValid}
                  className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
