import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import logoDark from "@/assets/logo-dark.png";
import logoWhite from "@/assets/logo-white.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, AlertTriangle } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase auto-signs the user in from the recovery token in the URL hash.
    // We listen for the PASSWORD_RECOVERY event to know the session is active.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also check if there's already an active session (page refresh case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Les mots de passe ne correspondent pas",
        description: "Veuillez vérifier la confirmation du mot de passe.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Mot de passe mis à jour !",
        description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
      });
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 items-center justify-center bg-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mx-auto mb-6">
            <img src={logoWhite} alt="90jours" className="mx-auto h-16" />
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground">
            90 jours de formation
          </h2>
          <p className="text-primary-foreground/70">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <img src={logoDark} alt="90jours" className="h-10 dark:hidden" />
            <img src={logoWhite} alt="90jours" className="hidden h-10 dark:block" />
          </div>

          {checking ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Vérification du lien...</p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
                Lien invalide ou expiré
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Ce lien de réinitialisation n'est plus valide. Les liens expirent
                après 1 heure.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                  Demander un nouveau lien
                </Button>
              </Link>
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
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">
                  Nouveau mot de passe
                </h1>
                <p className="text-center text-sm text-muted-foreground">
                  Choisissez un mot de passe d'au moins 6 caractères.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    "Mettre à jour le mot de passe"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="font-medium text-foreground hover:underline"
                >
                  ← Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
