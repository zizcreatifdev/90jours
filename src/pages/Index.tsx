import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Sparkles, Users, Calendar, Award, Loader2, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import CohortCard from "@/components/CohortCard";
import { useCohorts } from "@/hooks/use-cohorts";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useHeroSlides } from "@/hooks/use-hero-slides";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import heroImageDefault from "@/assets/hero-image.jpg";
import logoWhite from "@/assets/logo-white.png";

const features = [
  {
    icon: Sparkles,
    title: "Formations pratiques",
    description: "Des cours axés sur la pratique pour développer vos compétences créatives concrètes.",
  },
  {
    icon: Users,
    title: "Cohortes de 25 max",
    description: "Des groupes à taille humaine pour un suivi personnalisé de chaque étudiant.",
  },
  {
    icon: Calendar,
    title: "Programmes intensifs",
    description: "Des programmes condensés et efficaces pour maîtriser les fondamentaux de votre discipline.",
  },
  {
    icon: Award,
    title: "Certification",
    description: "Obtenez une attestation personnalisée à la fin de chaque programme de formation.",
  },
];

const Index = () => {
  const { cohorts, loading } = useCohorts();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { slides, loading: slidesLoading } = useHeroSlides();
  const { user, roles } = useAuth();
  const heroTitle = settings.hero_title || "Formez-vous en 90 jours";
  const heroSubtitle = settings.hero_subtitle || "Des formations intensives qui transforment votre créativité en 90 jours.";
  const [formations, setFormations] = useState<{ id: string; name: string }[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<string>("all");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Carousel images: use slides from DB, fallback to default
  const carouselImages = slides.length > 0 ? slides.map((s) => s.image_url) : [heroImageDefault];
  const isHeroReady = !slidesLoading && !settingsLoading;

  // Auto-advance carousel
  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  useEffect(() => {
    supabase.from("formations").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setFormations(data);
    });
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
    <div className="min-h-screen bg-background">
      {/* ===== HERO FULLSCREEN ===== */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        {/* Carousel background images */}
        {isHeroReady && carouselImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Slide ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Top bar: Logo left, Nav right */}
        <div className="relative z-10 flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-14 w-auto md:h-20" />
            ) : (
              <img src={logoWhite} alt="Formations 90 jours" className="h-14 w-auto md:h-20" />
            )}
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-3">
            <Link to="/register">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 text-xs md:text-sm px-4 md:px-5"
              >
                S'inscrire
              </Button>
            </Link>
            {user ? (
              <Link to={handleDashboard()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 text-xs md:text-sm px-4 md:px-5"
                >
                  Mon espace
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 text-xs md:text-sm px-4 md:px-5"
                >
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Hero title — bottom left */}
        <div className="absolute bottom-16 left-6 right-6 z-10 md:bottom-20 md:left-10 md:right-auto md:max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            {heroTitle}
          </h1>
          <p className="mt-3 max-w-lg text-base text-white/70 md:text-lg">
            {heroSubtitle}
          </p>
          <div className="mt-6">
            <Link to="/register">
              <Button
                size="lg"
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg px-8"
              >
                S'inscrire maintenant
              </Button>
            </Link>
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
          onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Défiler vers le contenu"
          className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 text-white/60 text-xs md:bottom-8 md:right-10 hover:text-white/90 transition-colors cursor-pointer"
        >
          <span>(Défiler)</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="bg-accent py-20">
        <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-accent-foreground">Pourquoi 90 jours ?</h2>
          <p className="mx-auto max-w-xl text-accent-foreground/70">Une approche unique de la formation, pensée pour les créatifs ambitieux.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl glass-card p-6 transition-all hover:shadow-card-hover hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-background/20">
                <f.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ===== COHORTS ===== */}
      <section id="cohorts" className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 font-display text-3xl font-bold text-foreground">Cohortes disponibles</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">Choisissez la session qui correspond à votre planning. Places limitées à 25 étudiants.</p>
            {formations.length > 1 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedFormation("all")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selectedFormation === "all" ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  Toutes
                </button>
                {formations.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormation(f.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selectedFormation === f.id ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeCohorts.map((cohort) => (
                <CohortCard key={cohort.id} cohort={cohort} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
