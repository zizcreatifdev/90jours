import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoDark from "@/assets/logo-dark.png";
import logoWhite from "@/assets/logo-white.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: signupFirstName, last_name: signupLastName },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inscription réussie !", description: "Vérifiez votre email pour confirmer votre compte." });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 items-center justify-center bg-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mx-auto mb-6">
            <img src={logoWhite} alt="90jours" className="h-16 mx-auto" />
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground">
            90 jours de formation
          </h2>
          <p className="text-primary-foreground/70">
            Votre plateforme de formation intensive en 90 jours. Connectez-vous pour accéder à votre espace.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <img src={logoDark} alt="90jours" className="h-10 dark:hidden" />
            <img src={logoWhite} alt="90jours" className="h-10 hidden dark:block" />
          </div>

          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Connexion</h1>
              <p className="mb-6 text-sm text-muted-foreground">Entrez vos identifiants pour accéder à votre espace.</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="votre@email.com" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Créer un compte</h1>
              <p className="mb-6 text-sm text-muted-foreground">Inscrivez-vous pour accéder à la plateforme.</p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="signup-first">Prénom</Label>
                    <Input id="signup-first" required maxLength={50} value={signupFirstName} onChange={(e) => setSignupFirstName(e.target.value)} placeholder="Aminata" />
                  </div>
                  <div>
                    <Label htmlFor="signup-last">Nom</Label>
                    <Input id="signup-last" required maxLength={50} value={signupLastName} onChange={(e) => setSignupLastName(e.target.value)} placeholder="Diallo" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="votre@email.com" />
                </div>
                <div>
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  {loading ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
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
