import { useEffect } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  FileSignature,
  CreditCard,
  ExternalLink,
  Lock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useSiteSettings, WAVE_PAYMENT_URL_FALLBACK } from "@/hooks/use-site-settings";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cohortId = searchParams.get("cohort_id") ?? "";

  const {
    loading,
    hasActiveTemplate,
    contractSigned,
    cohortStartDate,
    registrationFee,
    formationName,
  } = useOnboardingState(cohortId);

  const { settings } = useSiteSettings();
  const waveBaseUrl = settings.wave_payment_url || WAVE_PAYMENT_URL_FALLBACK;

  // No active template means no onboarding required : go straight to dashboard
  useEffect(() => {
    if (!loading && cohortId && !hasActiveTemplate) {
      navigate("/student", { replace: true });
    }
  }, [loading, cohortId, hasActiveTemplate, navigate]);

  if (!cohortId) return <Navigate to="/student" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const step1Done = contractSigned;
  const step2Active = contractSigned;

  const inscriptionDeadline = cohortStartDate
    ? format(addDays(new Date(cohortStartDate), 15), "d MMMM yyyy", { locale: fr })
    : null;

  const waveHref =
    registrationFee > 0 ? `${waveBaseUrl}?amount=${registrationFee}` : waveBaseUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="font-display text-xs font-bold text-primary-foreground">60</span>
            </div>
            <span className="font-display text-sm font-bold text-foreground">60 Jours</span>
          </div>
          {contractSigned && (
            <Link
              to="/student"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Accéder à mon espace
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Finalisez votre inscription
          </h1>
          {formationName && (
            <p className="text-sm text-muted-foreground">{formationName}</p>
          )}
        </div>

        {/* Step indicator */}
        <div className="mb-10 flex items-center justify-center">
          {/* Step 1 bubble */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-colors",
                step1Done
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-accent bg-accent/10 text-accent"
              )}
            >
              {step1Done ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm">1</span>}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                step1Done ? "text-green-600 dark:text-green-400" : "text-accent"
              )}
            >
              Contrat
            </span>
          </div>

          {/* Connector line */}
          <div
            className={cn(
              "mx-3 mb-4 h-0.5 w-16 transition-colors",
              step1Done ? "bg-green-500" : "bg-border"
            )}
          />

          {/* Step 2 bubble */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-colors",
                step2Active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {step2Active ? (
                <span className="text-sm">2</span>
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                step2Active ? "text-accent" : "text-muted-foreground"
              )}
            >
              Paiement
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Step 1: Contract */}
          <div
            className={cn(
              "rounded-2xl border bg-card p-6 shadow-card",
              step1Done
                ? "border-green-200 dark:border-green-800/40"
                : "border-accent/40"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  step1Done ? "bg-green-500/10" : "bg-accent/10"
                )}
              >
                {step1Done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <FileSignature className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground mb-1">
                  Contrat de formation
                </h2>
                {step1Done ? (
                  <div className="space-y-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 hover:bg-green-500/10"
                    >
                      Contrat signé
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Votre contrat a été signé avec succès. Passez à l'étape suivante.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Votre contrat de formation doit être signé avant d'accéder à votre espace étudiant.
                    </p>
                    <Link to={`/contract-sign?cohort_id=${cohortId}`}>
                      <Button className="gap-2">
                        <FileSignature className="h-4 w-4" />
                        Lire et signer le contrat
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Payment */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card p-6 shadow-card transition-opacity",
              !step2Active && "opacity-60"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  step2Active ? "bg-accent/10" : "bg-muted"
                )}
              >
                {step2Active ? (
                  <CreditCard className="h-5 w-5 text-accent" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground mb-1">
                  Frais d'inscription
                </h2>
                {!step2Active ? (
                  <p className="text-sm text-muted-foreground">
                    Disponible après signature du contrat.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-secondary p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Montant</span>
                        <span className="font-semibold text-foreground">
                          {registrationFee > 0
                            ? `${registrationFee.toLocaleString("fr-FR")} FCFA`
                            : "À définir par l'administration"}
                        </span>
                      </div>
                      {inscriptionDeadline && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Échéance (J+15)</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {inscriptionDeadline}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {registrationFee > 0 && (
                        <a
                          href={waveHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                            <CreditCard className="h-4 w-4" />
                            Payer via Wave
                            <ExternalLink className="ml-auto h-3 w-3" />
                          </Button>
                        </a>
                      )}
                      <Link
                        to="/student"
                        className={cn("flex-1", !registrationFee && "sm:flex-none")}
                      >
                        <Button variant="outline" className="w-full gap-2">
                          Accéder à mon espace
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Vous pouvez accéder à votre espace maintenant et déclarer votre paiement depuis l'onglet Paiements.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
