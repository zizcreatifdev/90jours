import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation, isValidEmail } from "@/hooks/use-form-validation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/use-site-settings";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { showError, handleBlur, isValid, validateAll } = useFormValidation(
    { email, password },
    {
      email: {
        required: "L'email est requis.",
        validate: (v) => (isValidEmail(String(v)) ? null : "Format d'email invalide."),
      },
      password: { required: "Le mot de passe est requis." },
    },
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const role = roles?.[0]?.role;
        if (role === "super_admin") navigate("/admin");
        else if (role === "staff") navigate("/staff");
        else navigate("/student");
      }
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
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-accent">
                <span className="font-display text-3xl font-bold text-primary">60</span>
              </div>
            )}
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground">
            60 jours de formation
          </h2>
          <p className="text-primary-foreground/70">
            Votre plateforme de formation intensive en 60 jours. Connectez-vous pour accéder à votre espace.
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="font-display text-sm font-bold text-primary-foreground">60</span>
              </div>
            )}
          </div>

          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Connexion</h1>
          <p className="mb-6 text-sm text-muted-foreground">Entrez vos identifiants pour accéder à votre espace.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <RequiredLabel htmlFor="login-email" required>Email</RequiredLabel>
              <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => handleBlur("email")} aria-invalid={!!showError("email")} placeholder="votre@email.com" />
              <FieldError message={showError("email")} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <RequiredLabel htmlFor="login-password" required>Mot de passe</RequiredLabel>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => handleBlur("password")} aria-invalid={!!showError("password")} placeholder="••••••••" />
              <FieldError message={showError("password")} />
            </div>
            <Button type="submit" disabled={loading || !isValid} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to="/register" className="font-medium text-foreground hover:underline">
              S'inscrire
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-medium text-foreground hover:underline">
              ← Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
