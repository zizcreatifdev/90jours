import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/required-label";
import FieldError from "@/components/ui/field-error";
import { useFormValidation, isValidEmail, type ValidationRules } from "@/hooks/use-form-validation";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCohorts } from "@/hooks/use-cohorts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, Loader2, Bell } from "lucide-react";
import PasswordStrengthIndicator, { getPasswordStrength } from "@/components/PasswordStrengthIndicator";
import WaitlistForm from "@/components/WaitlistForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cohorts, loading: cohortsLoading } = useCohorts();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const cohortFromUrl = searchParams.get("cohort");
  const [selectedCohort, setSelectedCohort] = useState(cohortFromUrl || "");
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", motivation: "" });
  const [submitting, setSubmitting] = useState(false);
  const [staffFormationIds, setStaffFormationIds] = useState<string[]>([]);
  const [waitlistFormationId, setWaitlistFormationId] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Fetch formations where current user is staff
  useEffect(() => {
    if (!user) return;
    const fetchStaffFormations = async () => {
      const { data } = await supabase.from("staff_formations" as any).select("formation_id").eq("user_id", user.id);
      if (data) setStaffFormationIds((data as any[]).map(d => d.formation_id));
    };
    fetchStaffFormations();
  }, [user]);

  // Fix URL bypass: if cohort from URL is full, clear selection and open waitlist
  useEffect(() => {
    if (!cohortFromUrl || cohortsLoading || cohorts.length === 0) return;
    const target = cohorts.find((c) => c.id === cohortFromUrl);
    if (!target) return;
    const enrolled = target.enrollment_count ?? 0;
    if (enrolled >= target.capacity) {
      setSelectedCohort("");
      setWaitlistFormationId(target.formation_id ?? null);
      setWaitlistOpen(true);
    }
  }, [cohortFromUrl, cohorts, cohortsLoading]);

  const openCohorts = cohorts.filter((c) => c.status !== "archived");
  const aucuneCohorteOuverte = !cohortsLoading && openCohorts.length === 0;
  const toutesPleines = !cohortsLoading && openCohorts.length > 0 &&
    openCohorts.every((c) => (c.enrollment_count ?? 0) >= c.capacity);

  const validationRules: ValidationRules = {
    selectedCohort: { required: "Veuillez sélectionner une cohorte." },
    ...(!user
      ? {
          firstName: { required: "Le prénom est requis." },
          lastName: { required: "Le nom est requis." },
          email: {
            required: "L'email est requis.",
            validate: (v) => (isValidEmail(String(v)) ? null : "Format d'email invalide."),
          },
          password: { required: "Le mot de passe est requis." },
          phone: { required: "Le téléphone est requis." },
        }
      : {}),
  };

  const { showError, handleBlur, isValid, validateAll } = useFormValidation(
    {
      selectedCohort,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
    },
    validationRules,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!selectedCohort) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une cohorte.", variant: "destructive" });
      return;
    }
    if (!user && getPasswordStrength(formData.password) === "weak") {
      toast({ title: "Mot de passe trop faible", description: "Ajoutez une majuscule, un chiffre et un caractère spécial (8 caractères minimum).", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      // Server-side capacity check before creating account
      const [{ data: serverCount }, { data: cohortData }] = await Promise.all([
        supabase.rpc("get_cohort_enrollment_count", { cohort_uuid: selectedCohort }),
        supabase.from("cohorts").select("capacity").eq("id", selectedCohort).single(),
      ]);

      if (cohortData && serverCount != null && serverCount >= cohortData.capacity) {
        toast({ title: "Cette cohorte est complète", description: "Il n'y a plus de places disponibles.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      let userId = user?.id;
      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { first_name: formData.firstName, last_name: formData.lastName },
          },
        });
        if (authError) throw authError;
        userId = authData.user?.id;
      }

      if (!userId) throw new Error("Impossible de créer le compte");

      // Save phone to profile
      if (formData.phone) {
        await supabase.from("profiles").update({ phone: formData.phone }).eq("user_id", userId);
      }

      const { error: enrollError } = await supabase.from("enrollments").insert({
        user_id: userId,
        cohort_id: selectedCohort,
        motivation: formData.motivation || null,
      });
      if (enrollError) throw enrollError;

      // Check if an active contract template exists → redirect to signing step
      const { data: template } = await supabase
        .from("contract_templates")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (template) {
        toast({ title: "Inscription enregistrée !", description: "Veuillez lire et signer votre contrat de formation." });
        setTimeout(() => navigate(`/contract-sign?cohort_id=${selectedCohort}`), 1200);
      } else {
        toast({ title: "Inscription réussie !", description: "Bienvenue dans votre espace étudiant." });
        setTimeout(() => navigate("/student"), 2000);
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const showWaitlistOnly = aucuneCohorteOuverte || toutesPleines;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-3 font-display text-3xl font-bold text-foreground">Inscription</h1>
            <p className="text-muted-foreground">
              {showWaitlistOnly
                ? "Rejoignez notre liste d'attente pour etre notifie en priorite."
                : "Rejoignez notre prochaine cohorte, 60 jours de formation."}
            </p>
          </div>

          {/* ── Chargement ── */}
          {cohortsLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          )}

          {/* ── Waitlist uniquement (aucune cohorte ou toutes pleines) ── */}
          {!cohortsLoading && showWaitlistOnly && (
            <div className="rounded-2xl border border-[#C5A05A]/30 bg-card p-4 sm:p-8 shadow-card">
              <div className="mb-6 rounded-xl bg-[#C5A05A]/8 px-5 py-4 text-center">
                <p className="font-display font-bold text-foreground">
                  {aucuneCohorteOuverte
                    ? "Pas de cohorte ouverte en ce moment"
                    : "Toutes les cohortes sont completes"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Laissez vos coordonnees et nous vous contacterons en priorite a l'ouverture de la prochaine session.
                </p>
              </div>
              <WaitlistForm preselectedFormationId={null} />
            </div>
          )}

          {/* ── Formulaire d'inscription (au moins une cohorte disponible) ── */}
          {!cohortsLoading && !showWaitlistOnly && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-card">
              {/* Cohort selection */}
              <div className="mb-8">
                <h2 className="mb-1 font-display text-lg font-semibold text-foreground">Choisir une cohorte</h2>
                <FieldError message={showError("selectedCohort")} className="mb-3" />
                <div className="grid gap-3">
                  {openCohorts.map((cohort) => {
                    const enrolled = cohort.enrollment_count ?? 0;
                    const isFull = enrolled >= cohort.capacity;
                    const isStaffOnFormation = !!cohort.formation_id && staffFormationIds.includes(cohort.formation_id);
                    const isDisabled = isFull || isStaffOnFormation;
                    const spotsLeft = cohort.capacity - enrolled;
                    const isSelected = selectedCohort === cohort.id;
                    return (
                      <div
                        key={cohort.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border-2 p-3 sm:p-4 gap-2 transition-all ${
                          isDisabled
                            ? "border-border bg-muted/40"
                            : isSelected
                            ? "border-accent bg-accent/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              setSelectedCohort(cohort.id);
                              handleBlur("selectedCohort");
                            }
                          }}
                          className={`flex-1 text-left ${isDisabled ? "cursor-default opacity-60" : "cursor-pointer"}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display font-semibold text-foreground">Cohorte {cohort.name}</p>
                            {cohort.formation && (
                              <span className="inline-block rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                                {cohort.formation.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(cohort.start_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} au{" "}
                            {new Date(cohort.end_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                          </p>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isStaffOnFormation ? (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Vous etes formateur</span>
                          ) : isFull ? (
                            <>
                              <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">Complete</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setWaitlistFormationId(cohort.formation_id ?? null);
                                  setWaitlistOpen(true);
                                }}
                                className="flex items-center gap-1.5 rounded-full border border-[#C5A05A] px-3 py-1 text-xs font-semibold text-[#C5A05A] hover:bg-[#C5A05A]/10 transition-colors"
                              >
                                <Bell className="h-3 w-3" />
                                Me prevenir
                              </button>
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-accent">
                              <Users className="h-3.5 w-3.5" />
                              {spotsLeft} places
                            </span>
                          )}
                          {isSelected && <CheckCircle className="h-5 w-5 text-accent" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Personal info */}
              {!user && (
                <>
                  <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Créer votre compte</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <RequiredLabel htmlFor="firstName" required>Prénom</RequiredLabel>
                      <Input id="firstName" maxLength={50} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} onBlur={() => handleBlur("firstName")} aria-invalid={!!showError("firstName")} placeholder="Aminata" />
                      <FieldError message={showError("firstName")} />
                    </div>
                    <div>
                      <RequiredLabel htmlFor="lastName" required>Nom</RequiredLabel>
                      <Input id="lastName" maxLength={50} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} onBlur={() => handleBlur("lastName")} aria-invalid={!!showError("lastName")} placeholder="Diallo" />
                      <FieldError message={showError("lastName")} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <RequiredLabel htmlFor="email" required>Email</RequiredLabel>
                    <Input id="email" type="email" maxLength={100} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} onBlur={() => handleBlur("email")} aria-invalid={!!showError("email")} placeholder="aminata@email.com" />
                    <FieldError message={showError("email")} />
                  </div>
                  <div className="mt-4">
                    <RequiredLabel htmlFor="password" required>Mot de passe</RequiredLabel>
                    <Input id="password" type="password" minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} onBlur={() => handleBlur("password")} aria-invalid={!!showError("password")} placeholder="••••••••" />
                    <FieldError message={showError("password")} />
                    <PasswordStrengthIndicator password={formData.password} />
                  </div>
                  <div className="mt-4">
                    <RequiredLabel htmlFor="phone" required>Téléphone</RequiredLabel>
                    <Input id="phone" type="tel" maxLength={20} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} onBlur={() => handleBlur("phone")} aria-invalid={!!showError("phone")} placeholder="+221 77 000 00 00" />
                    <FieldError message={showError("phone")} />
                  </div>
                </>
              )}

              {/* Motivation */}
              <div className="mt-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Votre motivation</h2>
                <Label htmlFor="motivation">Pourquoi souhaitez-vous rejoindre cette formation ?</Label>
                <Textarea
                  id="motivation"
                  maxLength={1000}
                  rows={4}
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  placeholder="Parlez-nous de votre parcours, vos objectifs et ce qui vous motive à apprendre le graphisme..."
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">{formData.motivation.length}/1000 caractères</p>
              </div>

              <Button type="submit" size="lg" disabled={submitting || !isValid} className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inscription en cours...</> : "Confirmer l'inscription"}
              </Button>
            </form>
          )}
        </div>
      </div>
      <Footer />

      {/* Waitlist dialog for individual full-cohort "Me prevenir" buttons */}
      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-foreground">
              Liste d'attente
            </DialogTitle>
          </DialogHeader>
          <WaitlistForm
            preselectedFormationId={waitlistFormationId}
            onSuccess={() => setTimeout(() => setWaitlistOpen(false), 2500)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
