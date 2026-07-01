import { useState, useEffect, useRef } from "react";
import { AlertCircle, ArrowRight, Bell, ChevronDown, Copy, Loader2, Quote, RefreshCw, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCohorts } from "@/hooks/use-cohorts";
import type { CohortRow } from "@/hooks/use-cohorts";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useHeroSlides } from "@/hooks/use-hero-slides";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import WaitlistForm from "@/components/WaitlistForm";

const SITE_URL = "https://60jours.com";

// ── Testimonial type ──────────────────────────────────────────────────────────
interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  photo_url: string | null;
}

// ── Steps for "Comment ça marche" ─────────────────────────────────────────────
const HOW_STEPS = [
  {
    number: "01",
    title: "Choisissez votre discipline",
    description: "Graphisme, Motion Design ou Vibecoding : trouvez la filière qui correspond à votre ambition et à votre rythme de progression.",
  },
  {
    number: "02",
    title: "Rejoignez une cohorte",
    description: "25 apprenants maximum par session. Un encadrement individualisé dans une dynamique collective qui accélère l'apprentissage.",
  },
  {
    number: "03",
    title: "Progressez par la pratique",
    description: "Briefs professionnels, projets concrets et retours exigeants de formateurs issus directement du secteur créatif.",
  },
  {
    number: "04",
    title: "Obtenez votre attestation",
    description: "À l'issue des 60 jours, recevez une attestation officielle et intégrez un réseau d'alumni actifs dans les industries créatives.",
  },
];

// ── Public cohort card ────────────────────────────────────────────────────────
interface PublicCohortCardProps {
  cohort: CohortRow;
  index: number;
  formationsVisible: boolean;
  onWaitlist: (formationId: string | null) => void;
}

const PublicCohortCard = ({ cohort, index, formationsVisible, onWaitlist }: PublicCohortCardProps) => {
  const { toast } = useToast();
  const enrolled = cohort.enrollment_count ?? 0;
  const spotsLeft = cohort.capacity - enrolled;
  const isFull = spotsLeft === 0;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 3;

  // Donnees pour les liens de partage
  const formationName = cohort.formation?.name ?? "60jours";
  const durationDays = cohort.start_date && cohort.end_date
    ? Math.round(
        (new Date(cohort.end_date + "T00:00:00").getTime() - new Date(cohort.start_date + "T00:00:00").getTime())
        / (1000 * 60 * 60 * 24)
      )
    : null;
  const price = cohort.total_price ?? cohort.formation?.total_price ?? null;
  const durationPart = durationDays ? `${durationDays} jours` : null;
  const pricePart = price ? `${price.toLocaleString("fr-FR")} FCFA` : null;
  const details = [durationPart, pricePart].filter(Boolean).join(", ");
  const whatsappMsg = `Decouvrez la formation ${formationName} chez 60jours !${details ? ` ${details}.` : ""} Inscrivez-vous : ${SITE_URL}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      toast({ title: "Lien copie", description: "L'URL a ete copiee dans le presse-papier." });
    } catch {
      toast({ title: "Impossible de copier le lien", variant: "destructive" });
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-[#111111] transition-all duration-500 hover:-translate-y-1",
        formationsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: formationsVisible ? `${index * 80}ms` : "0ms" }}
    >
      {/* Navy header : duree a gauche, niveau a droite */}
      <div className="flex items-center justify-between bg-[#0E1B2E] px-5 py-3">
        {cohort.start_date && cohort.end_date ? (
          <p className="text-[11px] font-medium text-white/70">
            {Math.round((new Date(cohort.end_date + "T00:00:00").getTime() - new Date(cohort.start_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))} jours
          </p>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
            cohort.cohort_type === "standard"
              ? "bg-[#C5A05A]/25 text-[#d4b06a]"
              : "bg-white/10 text-[#C5A05A]"
          )}
        >
          {cohort.cohort_type === "standard" ? "Perfectionnement" : "Initiation"}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
        {/* Grand titre : nom de la formation (element distinctif principal) */}
        <h3 className="font-display text-xl font-black leading-tight text-foreground">
          {cohort.formation?.name ?? "Formation"}
        </h3>

        {/* Sous-titre : nom de la cohorte, discret en doré petites caps */}
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C5A05A]">
          Promo {cohort.name}
        </p>

        {/* Description */}
        {cohort.formation?.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {cohort.formation.description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: dates, places, price, CTA */}
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {/* Dates */}
          <p className="text-xs text-muted-foreground">
            {new Date(cohort.start_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            <span className="mx-1.5">-</span>
            {new Date(cohort.end_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          {/* Places + CTA */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs">
              {isFull ? (
                <span className="font-semibold text-destructive">Complet</span>
              ) : isAlmostFull ? (
                <span className="inline-flex items-center gap-1 font-semibold text-accent">
                  <Zap className="h-3 w-3 fill-current" />
                  {spotsLeft} place{spotsLeft > 1 ? "s" : ""} restante{spotsLeft > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">{spotsLeft} places disponibles</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {(cohort.total_price ?? cohort.formation?.total_price) != null && (
                <span className="text-sm font-bold text-foreground">
                  {(cohort.total_price ?? cohort.formation!.total_price).toLocaleString("fr-FR")}{" "}
                  <span className="text-[10px] font-normal uppercase tracking-widest text-muted-foreground">FCFA</span>
                </span>
              )}
              {isFull ? (
                <button
                  onClick={() => onWaitlist(cohort.formation_id ?? null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#C5A05A] px-3 py-1.5 text-[11px] font-semibold text-[#C5A05A] transition-colors hover:bg-[#C5A05A]/10"
                >
                  <Bell className="h-3 w-3" />
                  Me prévenir
                </button>
              ) : (
                <Link to={`/register?cohort=${cohort.id}`}>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C5A05A] transition-all hover:gap-2.5">
                    S'inscrire
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Boutons de partage */}
        <div className="mt-3 flex items-center gap-0.5 border-t border-border/40 pt-3">
          <span className="mr-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            Partager
          </span>
          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Partager sur WhatsApp"
            className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:text-[#25D366]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Partager sur Facebook"
            className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:text-[#1877F2]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          {/* LinkedIn */}
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Partager sur LinkedIn"
            className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:text-[#0A66C2]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          {/* Copier le lien */}
          <button
            onClick={handleCopy}
            aria-label="Copier le lien"
            className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:text-[#C5A05A]"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page component ────────────────────────────────────────────────────────────
const Index = () => {
  const { cohorts, loading, isError: cohortsError, refetch: refetchCohorts } = useCohorts();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { slides, loading: slidesLoading } = useHeroSlides();
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");
  const heroTitle = settings.hero_title || "Révélez votre potentiel créatif en 60 jours";
  const heroSubtitle = settings.hero_subtitle || "Que vous soyez en reconversion, en quête de perfectionnement ou simplement curieux d'apprendre, nos formations intensives transforment votre créativité.";

  const [currentSlide, setCurrentSlide] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistFormationId, setWaitlistFormationId] = useState<string | null>(null);

  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Intersection observer refs for scroll animations
  const howRef = useRef<HTMLElement>(null);
  const formationsRef = useRef<HTMLElement>(null);
  const [howVisible, setHowVisible] = useState(false);
  const [formationsVisible, setFormationsVisible] = useState(false);

  // Carousel images: use slides from DB. When empty, the hero shows a navy gradient fallback.
  const carouselImages = slides.map((s) => s.image_url);
  const isHeroReady = !slidesLoading && !settingsLoading;

  // Auto-advance hero carousel
  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // Auto-advance testimonials carousel
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Load visible testimonials
  useEffect(() => {
    supabase
      .from("testimonials")
      .select("id, name, role, content, photo_url")
      .eq("is_visible", true)
      .order("display_order", { ascending: true })
      .then(({ data }: { data: Testimonial[] | null }) => {
        if (data) setTestimonials(data);
      });
  }, []);

  // Intersection Observer : "Comment ça marche"
  useEffect(() => {
    if (!howRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHowVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(howRef.current);
    return () => obs.disconnect();
  }, []);

  // Intersection Observer : Formations
  useEffect(() => {
    if (!formationsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setFormationsVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(formationsRef.current);
    return () => obs.disconnect();
  }, []);

  const activeCohorts = cohorts.filter((c) => c.status !== "archived");
  const initiation = activeCohorts.filter((c) => c.cohort_type === "initiation");
  const perfectionnement = activeCohorts.filter((c) => c.cohort_type === "standard");
  const aucuneCohorteOuverte = !loading && activeCohorts.length === 0;

  const handleDashboard = () => {
    if (roles.includes("super_admin")) return "/admin";
    if (roles.includes("staff")) return "/staff";
    return "/student";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">

      {/* ===== HERO FULLSCREEN ===== */}
      <section className="relative h-screen w-full overflow-hidden bg-[#0E1B2E]">
        {/* Premium navy base + fallback background (shown when no hero_slides are uploaded) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0E1B2E] via-[#13243d] to-[#0a1422]" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(120% 80% at 75% 18%, rgba(197,160,90,0.16), transparent 55%)" }}
        />
        {/* Carousel background images */}
        {isHeroReady && carouselImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Slide ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1B2E] via-[#0E1B2E]/60 to-[#0E1B2E]/25" />

        {/* Top bar: Logo left, Nav right */}
        <div className="relative z-10 flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-14 w-auto md:h-20" />
            ) : (
              <>
                <img
                  src="/logos/Logo60jours_blanc.svg"
                  alt="60jours"
                  className="h-14 w-auto object-contain md:h-20"
                  onError={(e) => {
                    e.currentTarget.classList.add("hidden");
                    const next = e.currentTarget.nextElementSibling as HTMLElement;
                    if (next) next.classList.remove("hidden");
                  }}
                />
                <span className="hidden font-display text-3xl font-semibold tracking-tight text-accent md:text-4xl">60</span>
              </>
            )}
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-3">
            {!isSuperAdmin && (
              <Link to="/register">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-accent text-xs md:text-sm px-4 md:px-5"
                >
                  S'inscrire
                </Button>
              </Link>
            )}
            {user ? (
              <Link to={handleDashboard()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-accent text-xs md:text-sm px-4 md:px-5"
                >
                  Mon espace
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border border-white/20 bg-white/5 text-white backdrop-blur-sm transition-colors hover:border-accent/60 hover:text-accent text-xs md:text-sm px-4 md:px-5"
                >
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Hero title : bottom left */}
        <div className="absolute bottom-16 left-6 right-6 z-10 md:bottom-20 md:left-10 md:right-auto md:max-w-2xl">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            {heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
            {heroSubtitle}
          </p>
          <div className="mt-6">
            {isSuperAdmin ? (
              <Link to="/admin">
                <Button
                  size="lg"
                  className="rounded-full bg-accent px-8 font-semibold text-accent-foreground shadow-lg shadow-[#C5A05A]/25 transition-all hover:bg-[#d4b06a] hover:shadow-[#C5A05A]/40"
                >
                  Mon espace
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button
                  size="lg"
                  className="rounded-full bg-accent px-8 font-semibold text-accent-foreground shadow-lg shadow-[#C5A05A]/25 transition-all hover:bg-[#d4b06a] hover:shadow-[#C5A05A]/40"
                >
                  S'inscrire maintenant
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Carousel dots */}
        {carouselImages.length > 1 && (
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {carouselImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Aller à la slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === currentSlide ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        )}

        {/* Scroll indicator : bottom right */}
        <button
          onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Défiler vers le contenu"
          className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 text-white/60 text-xs md:bottom-8 md:right-10 hover:text-white/90 transition-colors cursor-pointer"
        >
          <span>(Défiler)</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* ===== SECTION 2 : COMMENT ÇA MARCHE ===== */}
      <section
        id="how"
        ref={howRef}
        className="bg-white dark:bg-[#111111] py-24 overflow-hidden"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Le parcours</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Comment ça marche ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              De l'inscription à la certification, un parcours structuré pour faire de votre créativité un atout professionnel durable.
            </p>
          </div>

          {/* Steps : editorial, typographic, no icons */}
          <div className="grid gap-px bg-border md:grid-cols-4">
            {HOW_STEPS.map((step, i) => (
              <div
                key={step.number}
                className={cn(
                  "bg-white dark:bg-[#111111] px-8 py-10 transition-all duration-700",
                  howVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: howVisible ? `${i * 100}ms` : "0ms" }}
              >
                {/* Big number */}
                <p className="mb-6 font-display text-7xl font-black leading-none text-accent/[0.12] select-none">
                  {step.number}
                </p>
                {/* Short accent bar */}
                <div className="mb-5 h-0.5 w-8 bg-accent" />
                <h3 className="mb-3 font-display text-base font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 3 : NOS FORMATIONS ===== */}
      <section
        id="formations"
        ref={formationsRef}
        className="bg-[#f8f8f8] dark:bg-[#0a0a0a] py-24"
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Catalogue</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Nos formations
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Choisissez la session qui correspond à votre agenda. Effectifs volontairement limités à 25 apprenants par cohorte.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : cohortsError ? (
            <div className="py-16 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-4 font-display text-xl font-semibold text-foreground">Impossible de charger les formations pour le moment.</p>
              <p className="mt-2 text-sm text-muted-foreground">Veuillez réessayer dans quelques instants.</p>
              <button
                onClick={() => refetchCohorts()}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#C5A05A] px-6 py-2.5 text-sm font-semibold text-[#C5A05A] transition-colors hover:bg-[#C5A05A]/10"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </button>
            </div>
          ) : aucuneCohorteOuverte ? (
            <div className="py-16 text-center">
              <p className="font-display text-xl font-semibold text-foreground">Aucune session ouverte pour le moment.</p>
              <p className="mt-2 text-sm text-muted-foreground">De nouvelles cohortes arrivent prochainement.</p>
              <button
                onClick={() => { setWaitlistFormationId(null); setWaitlistOpen(true); }}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#C5A05A] px-6 py-2.5 text-sm font-semibold text-[#C5A05A] transition-colors hover:bg-[#C5A05A]/10"
              >
                Rejoindre la liste d'attente
              </button>
            </div>
          ) : (
            <div className="space-y-14">
              {/* Zone Initiation */}
              {initiation.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-4">
                    <h3 className="font-display text-2xl font-bold text-foreground">Initiation</h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Pour démarrer de zéro et poser des bases solides.
                  </p>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {initiation.map((cohort, i) => (
                      <PublicCohortCard
                        key={cohort.id}
                        cohort={cohort}
                        index={i}
                        formationsVisible={formationsVisible}
                        onWaitlist={(formationId) => { setWaitlistFormationId(formationId); setWaitlistOpen(true); }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Zone Perfectionnement */}
              {perfectionnement.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-4">
                    <h3 className="font-display text-2xl font-bold text-foreground">Perfectionnement</h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Pour monter en niveau et affiner sa pratique.
                  </p>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {perfectionnement.map((cohort, i) => (
                      <PublicCohortCard
                        key={cohort.id}
                        cohort={cohort}
                        index={i}
                        formationsVisible={formationsVisible}
                        onWaitlist={(formationId) => { setWaitlistFormationId(formationId); setWaitlistOpen(true); }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== SECTION 4 : TÉMOIGNAGES (hidden if none) ===== */}
      {testimonials.length > 0 && (
        <section className="bg-white dark:bg-[#111111] py-24 overflow-hidden">
          <div className="container mx-auto px-6 sm:px-8 lg:px-12">
            <div className="mb-14 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Alumni</p>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Ce qu'ils en disent
              </h2>
            </div>

            {/* Carousel */}
            <div className="relative mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-2xl border border-border bg-[#f8f8f8] dark:bg-[#1a1a1a] p-8 md:p-12">
                {testimonials.map((t, i) => (
                  <div
                    key={t.id}
                    className={cn(
                      "transition-all duration-700 absolute inset-0 flex flex-col justify-center p-8 md:p-12",
                      i === currentTestimonial
                        ? "opacity-100 translate-x-0 pointer-events-auto"
                        : i < currentTestimonial
                        ? "opacity-0 -translate-x-full pointer-events-none"
                        : "opacity-0 translate-x-full pointer-events-none"
                    )}
                  >
                    <Quote className="mb-6 h-8 w-8 text-accent opacity-40" />
                    <p className="mb-8 text-lg leading-relaxed text-foreground md:text-xl">
                      {t.content}
                    </p>
                    <div className="flex items-center gap-4">
                      {t.photo_url ? (
                        <img
                          src={t.photo_url}
                          alt={t.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground">
                          {t.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Spacer to maintain height */}
                <div className="invisible pointer-events-none p-0">
                  <Quote className="mb-6 h-8 w-8" />
                  <p className="mb-8 text-lg leading-relaxed md:text-xl min-h-[4rem]">
                    {testimonials[currentTestimonial]?.content}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full" />
                    <div>
                      <p className="font-semibold">{testimonials[currentTestimonial]?.name}</p>
                      <p className="text-sm">{testimonials[currentTestimonial]?.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots */}
              {testimonials.length > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTestimonial(i)}
                      aria-label={`Témoignage ${i + 1}`}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === currentTestimonial ? "w-6 bg-accent" : "w-2 bg-border hover:bg-accent/40"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 5 : CTA FINAL ===== */}
      <section className="relative overflow-hidden bg-[#0E1B2E] py-28">
        {/* Subtle gold radial glow from below */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(75% 55% at 50% 110%, rgba(197,160,90,0.20), transparent 60%)" }}
        />
        {/* Fine gold top border */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A05A]/35 to-transparent" />

        <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Passez à l'action</p>
          <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-5xl">
            Prêts à transformer votre trajectoire ?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-white/65 md:text-lg">
            Rejoignez des centaines de créatifs qui ont consacré 60 jours à faire de leur passion un véritable métier.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="rounded-full bg-accent px-10 font-bold text-accent-foreground shadow-lg shadow-[#C5A05A]/25 transition-all hover:bg-[#d4b06a] hover:shadow-[#C5A05A]/40"
              >
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-white/5 px-10 font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/10"
              >
                J'ai déjà un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SECTION 6 : FOOTER ===== */}
      <footer className="border-t border-white/10 bg-[#0E1B2E] text-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Col 1 : Logo + tagline */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-10 w-auto brightness-0 invert" />
                ) : (
                  <>
                    <img
                      src="/logos/Logo60jours_blanc.svg"
                      alt="60jours"
                      className="h-10 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.classList.add("hidden");
                        const next = e.currentTarget.nextElementSibling as HTMLElement;
                        if (next) next.classList.remove("hidden");
                      }}
                    />
                    <span className="hidden font-display text-lg font-semibold text-white">60 jours</span>
                  </>
                )}
              </div>
              <p className="text-sm leading-relaxed text-white/60 max-w-xs">
                {settings.footer_text || "Des formations intensives qui transforment votre créativité en 60 jours."}
              </p>
              <div className="mt-5 h-px w-12 bg-[#C5A05A]/40" />
            </div>

            {/* Col 2 : Navigation */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Navigation</h4>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-left text-sm text-white/60 transition-colors hover:text-white"
                >
                  Comment ça marche
                </button>
                <button
                  onClick={() => document.getElementById("formations")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-left text-sm text-white/60 transition-colors hover:text-white"
                >
                  Nos formations
                </button>
                <Link to="/register" className="text-sm text-white/60 transition-colors hover:text-white">
                  S'inscrire
                </Link>
                <Link to="/login" className="text-sm text-white/60 transition-colors hover:text-white">
                  Connexion
                </Link>
              </div>
            </div>

            {/* Col 3 : Contact */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Contact</h4>
              <p className="text-sm text-white/60">{settings.footer_email || "contact@60jours.com"}</p>
              <p className="mt-1 text-sm text-white/60">{settings.footer_phone || "+221 77 000 00 00"}</p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/30 sm:flex-row">
            <span>© 2026 60 jours de formation. Tous droits réservés.</span>
            <span>Conçu au Sénégal</span>
          </div>
        </div>
      </footer>

      {/* Waitlist dialog */}
      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-foreground">Liste d'attente</DialogTitle>
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

export default Index;
