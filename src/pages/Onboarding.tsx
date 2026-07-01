import { useEffect, useState, useRef } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  FileSignature,
  CreditCard,
  ExternalLink,
  Lock,
  Loader2,
  ArrowRight,
  Camera,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useSiteSettings, WAVE_PAYMENT_URL_FALLBACK } from "@/hooks/use-site-settings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const compressImage = (file: File, maxSizeMB: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let quality = 0.9;
      const canvas = document.createElement("canvas");
      const { width, height } = img;
      const size = Math.min(width, height);
      const sx = (width - size) / 2;
      const sy = (height - size) / 2;
      const MAX_DIM = 800;
      const outSize = Math.min(size, MAX_DIM);
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, sx, sy, size, size, 0, 0, outSize, outSize);
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            quality -= 0.1;
            tryCompress();
          }
        }, "image/jpeg", quality);
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
};

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cohortId = searchParams.get("cohort_id") ?? "";
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contractCardRef = useRef<HTMLDivElement>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    loading,
    hasActiveTemplate,
    contractSigned,
    hasAvatar,
    avatarUrl,
    cohortStartDate,
    registrationFee,
    formationName,
  } = useOnboardingState(cohortId);

  const { settings } = useSiteSettings();
  const waveBaseUrl = settings.wave_payment_url || WAVE_PAYMENT_URL_FALLBACK;

  const photoStepDone = hasAvatar || !!localAvatarUrl;
  const contractActive = photoStepDone;
  const paymentActive = contractSigned;
  const currentAvatarDisplay = localAvatarUrl || avatarUrl;

  useEffect(() => {
    if (loading || !cohortId) return;
    if (photoStepDone && (!hasActiveTemplate || contractSigned)) {
      navigate("/student", { replace: true });
    }
  }, [loading, cohortId, photoStepDone, hasActiveTemplate, contractSigned, navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    setUploading(true);
    if (file.size > 5 * 1024 * 1024) {
      try {
        file = await compressImage(file, 5);
      } catch {
        toast({ title: "Erreur", description: "Impossible de compresser l'image.", variant: "destructive" });
        setUploading(false);
        return;
      }
    }
    const filePath = `${user.id}/avatar.jpeg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erreur", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
    if (updateError) {
      toast({ title: "Erreur", description: updateError.message, variant: "destructive" });
    } else {
      setLocalAvatarUrl(newUrl);
      toast({ title: "Photo enregistrée !" });
      setTimeout(() => {
        contractCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
    setUploading(false);
  };

  if (!cohortId) return <Navigate to="/student" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

        {/* Step indicator - 3 steps */}
        <div className="mb-10 flex items-center justify-center">
          {/* Step 1: Photo */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-colors",
                photoStepDone
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-accent bg-accent/10 text-accent"
              )}
            >
              {photoStepDone ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm">1</span>}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                photoStepDone ? "text-green-600 dark:text-green-400" : "text-accent"
              )}
            >
              Photo
            </span>
          </div>

          {/* Connector */}
          <div
            className={cn(
              "mx-3 mb-4 h-0.5 w-12 transition-colors",
              photoStepDone ? "bg-green-500" : "bg-border"
            )}
          />

          {/* Step 2: Contract */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-colors",
                contractSigned
                  ? "border-green-500 bg-green-500 text-white"
                  : contractActive
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {contractSigned ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : contractActive ? (
                <span className="text-sm">2</span>
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                contractSigned
                  ? "text-green-600 dark:text-green-400"
                  : contractActive
                  ? "text-accent"
                  : "text-muted-foreground"
              )}
            >
              Contrat
            </span>
          </div>

          {/* Connector */}
          <div
            className={cn(
              "mx-3 mb-4 h-0.5 w-12 transition-colors",
              contractSigned ? "bg-green-500" : "bg-border"
            )}
          />

          {/* Step 3: Payment */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-colors",
                paymentActive
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {paymentActive ? (
                <span className="text-sm">3</span>
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                paymentActive ? "text-accent" : "text-muted-foreground"
              )}
            >
              Paiement
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          {/* Step 1: Photo */}
          <div
            className={cn(
              "rounded-2xl border bg-card p-6 shadow-card",
              photoStepDone
                ? "border-green-200 dark:border-green-800/40"
                : "border-accent/40"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  photoStepDone ? "bg-green-500/10" : "bg-accent/10"
                )}
              >
                {photoStepDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Camera className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground mb-1">
                  Photo de profil
                </h2>
                {photoStepDone ? (
                  <div className="space-y-3">
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 hover:bg-green-500/10"
                    >
                      Photo enregistrée
                    </Badge>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={currentAvatarDisplay || undefined} alt="Photo de profil" className="object-cover" />
                        <AvatarFallback className="bg-accent/10">
                          <User className="h-6 w-6 text-accent" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Modifier la photo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Une photo de profil est requise pour accéder à votre espace étudiant.
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-24 w-24 border-2 border-dashed border-border">
                        <AvatarFallback className="bg-secondary">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="gap-2"
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                          Choisir une photo
                        </Button>
                        <Button
                          disabled={!localAvatarUrl}
                          onClick={() => contractCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="gap-2"
                        >
                          Continuer
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Contract */}
          <div
            ref={contractCardRef}
            className={cn(
              "rounded-2xl border bg-card p-6 shadow-card transition-opacity",
              contractSigned
                ? "border-green-200 dark:border-green-800/40"
                : contractActive
                ? "border-accent/40"
                : "border-border opacity-60"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  contractSigned ? "bg-green-500/10" : contractActive ? "bg-accent/10" : "bg-muted"
                )}
              >
                {contractSigned ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : contractActive ? (
                  <FileSignature className="h-5 w-5 text-accent" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground mb-1">
                  Contrat de formation
                </h2>
                {contractSigned ? (
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
                ) : !contractActive ? (
                  <p className="text-sm text-muted-foreground">
                    Disponible après ajout de votre photo de profil.
                  </p>
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

          {/* Step 3: Payment */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card p-6 shadow-card transition-opacity",
              !paymentActive && "opacity-60"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  paymentActive ? "bg-accent/10" : "bg-muted"
                )}
              >
                {paymentActive ? (
                  <CreditCard className="h-5 w-5 text-accent" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground mb-1">
                  Frais d'inscription
                </h2>
                {!paymentActive ? (
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
