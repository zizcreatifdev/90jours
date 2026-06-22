import { useState, useEffect, useRef } from "react";
import { ArrowRight, ChevronDown, Loader2, Quote, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCohorts } from "@/hooks/use-cohorts";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useHeroSlides } from "@/hooks/use-hero-slides";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ── Filière colour map ────────────────────────────────────────────────────────
const FILIERE_COLORS: Record<string, { accent: string; glow: string; text: string; bg: string }> = {
  graphisme: {
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.35)",
    text: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]",
  },
  motion: {
    accent: "#F97316",
    glow: "rgba(249,115,22,0.35)",
    text: "text-[#F97316]",
    bg: "bg-[#F97316]",
  },
  vibecoding: {
    accent: "#0D9488",
    glow: "rgba(13,148,136,0.35)",
    text: "text-[#0D9488]",
    bg: "bg-[#0D9488]",
  },
};

const getFiliereKey = (name = ""): keyof typeof FILIERE_COLORS => {
  const n = name.toLowerCase();
  if (n.includes("motion")) return "motion";
  if (n.includes("vibe") || n.includes("code") || n.includes("coding")) return "vibecoding";
  return "graphisme";
};

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

const Index = () => {
  const { cohorts, loading } = useCohorts();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { slides, loading: slidesLoading } = useHeroSlides();
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");
  const heroTitle = settings.hero_title || "Révélez votre potentiel créatif en 60 jours";
  const heroSubtitle = settings.hero_subtitle || "Que vous soyez en reconversion, en quête de perfectionnement ou simplement curieux d'apprendre, nos formations intensives transforment votre créativité.";

  const [formations, setFormations] = useState<{ id: string; name: string }[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<string>("all");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Intersection observer refs for scroll animations
  const howRef = useRef<HTMLElement>(null);
  const formationsRef = useRef<HTMLElement>(null);
  const [howVisible, setHowVisible] = useState(false);
  const [formationsVisible, setFormationsVisible] = useState(false);

  // Carousel images: use slides from DB. When empty, the hero shows a navy gradient fallback (no stock photo).
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

  // Load formations
  useEffect(() => {
    supabase.from("formations").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setFormations(data);
    });
  }, []);

  // Load visible testimonials
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("testimonials")
      .select("id, name, role, content, photo_url")
      .eq("is_visible", true)
      .order("display_order", { ascending: true })
      .then(({ data }: { data: Testimonial[] | null }) => {
        if (data) setTestimonials(data);
      });
  }, []);

  // Intersection Observer — "Comment ça marche"
  useEffect(() => {
    if (!howRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHowVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(howRef.current);
    return () => obs.disconnect();
  }, []);

  // Intersection Observer — Formations
  useEffect(() => {
    if (!formationsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setFormationsVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(formationsRef.current);
    return () => obs.disconnect();
  }, []);

  const activeCohorts = cohorts
    .filter((c) => c.status !== "archived")
    .filter((c) => selectedFormation === "all" || c.formation_id === selectedFormation);

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
              <span className="font-display text-3xl font-semibold tracking-tight text-accent md:text-4xl">60</span>
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

        {/* Hero title — bottom left */}
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

        {/* Scroll indicator — bottom right */}
        <button
          onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Défiler vers le contenu"
          className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 text-white/60 text-xs md:bottom-8 md:right-10 hover:text-white/90 transition-colors cursor-pointer"
        >
          <span>(Défiler)</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* ===== SECTION 2 — COMMENT ÇA MARCHE ===== */}
      <section
        id="how"
        ref={howRef}
        className="bg-white dark:bg-[#111111] py-24 overflow-hidden"
      >
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Le parcours</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Comment ça marche ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              De l'inscription à la certification, un parcours structuré pour faire de votre créativité un atout professionnel durable.
            </p>
          </div>

          {/* Steps — editorial, typographic, no icons */}
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

      {/* ===== SECTION 3 — NOS FORMATIONS ===== */}
      <section
        id="formations"
        ref={formationsRef}
        className="bg-[#f8f8f8] dark:bg-[#0a0a0a] py-24"
      >
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Catalogue</p>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Nos formations
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Choisissez la session qui correspond à votre agenda. Effectifs volontairement limités à 25 apprenants par cohorte.
            </p>

            {/* Filière filter pills */}
            {formations.length > 1 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedFormation("all")}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                    selectedFormation === "all"
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "bg-white dark:bg-[#1a1a1a] border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  Toutes
                </button>
                {formations.map((f) => {
                  const key = getFiliereKey(f.name);
                  const colors = FILIERE_COLORS[key];
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormation(f.id)}
                      style={selectedFormation === f.id ? { backgroundColor: colors.accent, color: "#fff" } : {}}
                      className={cn(
                        "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                        selectedFormation === f.id
                          ? "shadow-md"
                          : "bg-white dark:bg-[#1a1a1a] border border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cohort cards — editorial grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : activeCohorts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-xl font-semibold text-foreground">Aucune session ouverte pour le moment.</p>
              <p className="mt-2 text-sm text-muted-foreground">De nouvelles cohortes arrivent prochainement. Revenez bientôt ou inscrivez-vous pour être informé en priorité.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activeCohorts.map((cohort, i) => {
                const key = getFiliereKey(cohort.formation?.name);
                const colors = FILIERE_COLORS[key];
                const enrolled = cohort.enrollment_count ?? 0;
                const spotsLeft = cohort.capacity - enrolled;
                const isFull = spotsLeft === 0;
                const isAlmostFull = spotsLeft > 0 && spotsLeft <= 3;

                return (
                  <div
                    key={cohort.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-[#111111] transition-all duration-500 hover:-translate-y-1",
                      formationsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    )}
                    style={{ transitionDelay: formationsVisible ? `${i * 80}ms` : "0ms" }}
                  >
                    {/* Bold left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ backgroundColor: colors.accent }}
                    />

                    <div className="flex flex-1 flex-col pl-7 pr-6 pt-6 pb-6">
                      {/* Formation label — no pill, just colored small-caps text */}
                      {cohort.formation && (
                        <p
                          className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                          style={{ color: colors.accent }}
                        >
                          {cohort.formation.name}
                        </p>
                      )}

                      {/* Cohort name — big, typographic */}
                      <h3 className="font-display text-2xl font-black leading-tight text-foreground">
                        {cohort.name}
                      </h3>

                      {/* Thin separator */}
                      <div className="my-4 h-px w-10" style={{ backgroundColor: colors.accent }} />

                      {/* Formation description */}
                      {cohort.formation?.description && (
                        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {cohort.formation.description}
                        </p>
                      )}

                      {/* Dates */}
                      <p className="text-sm text-muted-foreground">
                        {new Date(cohort.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        <span className="mx-1.5 text-border">→</span>
                        {new Date(cohort.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>

                      {/* Spots + level */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {isFull ? (
                          <span className="font-semibold text-destructive">Complet</span>
                        ) : isAlmostFull ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-accent">
                            <Zap className="h-3 w-3 fill-current" />
                            {spotsLeft} place{spotsLeft > 1 ? "s" : ""} restante{spotsLeft > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span>{spotsLeft} places disponibles</span>
                        )}
                        {cohort.level && (
                          <>
                            <span className="text-border">·</span>
                            <span>{cohort.level}</span>
                          </>
                        )}
                      </div>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Price + CTA row */}
                      <div className="mt-6 flex items-end justify-between gap-2">
                        {cohort.total_price != null ? (
                          <div>
                            <p className="text-xl font-black text-foreground">
                              {cohort.total_price.toLocaleString("fr-FR")}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">FCFA</p>
                          </div>
                        ) : <div />}

                        <Link
                          to={isFull ? "#" : `/register?cohort=${cohort.id}`}
                          aria-disabled={isFull}
                          tabIndex={isFull ? -1 : undefined}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                              isFull
                                ? "cursor-not-allowed text-muted-foreground"
                                : "hover:gap-2.5"
                            )}
                            style={isFull ? {} : { color: colors.accent }}
                          >
                            {isFull ? "Complet" : "S'inscrire"}
                            {!isFull && <ArrowRight className="h-4 w-4" />}
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== SECTION 4 — TÉMOIGNAGES (hidden if none) ===== */}
      {testimonials.length > 0 && (
        <section className="bg-white dark:bg-[#111111] py-24 overflow-hidden">
          <div className="container mx-auto px-4">
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

      {/* ===== SECTION 5 — CTA FINAL ===== */}
      <section className="relative overflow-hidden bg-[#0E1B2E] py-28">
        {/* Subtle gold radial glow from below */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(75% 55% at 50% 110%, rgba(197,160,90,0.20), transparent 60%)" }}
        />
        {/* Fine gold top border */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A05A]/35 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 text-center">
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

      {/* ===== SECTION 6 — FOOTER ===== */}
      <footer className="border-t border-white/10 bg-[#0E1B2E] text-white">
        <div className="container mx-auto px-4 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Col 1 — Logo + tagline */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-10 w-auto brightness-0 invert" />
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                      <span className="font-display text-xs font-bold text-accent-foreground">60</span>
                    </div>
                    <span className="font-display text-lg font-semibold text-white">60 jours</span>
                  </>
                )}
              </div>
              <p className="text-sm leading-relaxed text-white/60 max-w-xs">
                {settings.footer_text || "Des formations intensives qui transforment votre créativité en 60 jours."}
              </p>
              {/* Filière colour dots */}
              <div className="mt-5 flex gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" title="Graphisme" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" title="Motion Design" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#0D9488]" title="Vibecoding" />
              </div>
            </div>

            {/* Col 2 — Navigation */}
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

            {/* Col 3 — Contact */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Contact</h4>
              <p className="text-sm text-white/60">{settings.footer_email || "info@60jours.com"}</p>
              <p className="mt-1 text-sm text-white/60">{settings.footer_phone || "+225 07 00 00 00 00"}</p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/30 sm:flex-row">
            <span>© 2026 60 jours de formation. Tous droits réservés.</span>
            <span>Conçu au Sénégal</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
