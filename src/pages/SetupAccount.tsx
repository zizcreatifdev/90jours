import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import PasswordStrengthIndicator, { getPasswordStrength } from "@/components/PasswordStrengthIndicator";

const SetupAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // When the user arrives from the invite link, Supabase auto-signs them in
    // via the token in the URL hash. We just need to wait for the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also check current session
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

    if (getPasswordStrength(password) === "weak") {
      toast({ title: "Mot de passe trop faible", description: "Ajoutez une majuscule, un chiffre et un caractère spécial (8 caractères minimum).", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Compte configuré ! 🎉", description: "Vous pouvez maintenant accéder à votre espace." });
      // Redirect based on role
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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="font-display text-2xl font-bold text-primary-foreground">60</span>
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Lien expiré</h1>
          <p className="mb-6 text-muted-foreground">
            Ce lien d'invitation n'est plus valide ou a déjà été utilisé.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full">
            Aller à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="font-display text-2xl font-bold text-primary-foreground">60</span>
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
            Finalisez votre compte
          </h1>
          <p className="text-sm text-muted-foreground">
            Choisissez un mot de passe pour accéder à votre espace formateur.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <PasswordStrengthIndicator password={password} />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configuration...</>
            ) : (
              <><CheckCircle className="mr-2 h-4 w-4" /> Activer mon compte</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SetupAccount;
