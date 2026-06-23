import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1B2E] px-6 py-16 text-center">
      <svg
        viewBox="0 0 560 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-10 w-full max-w-lg"
        aria-hidden="true"
      >
        {/* Background geometric grid lines, subtle navy */}
        <line x1="0" y1="56" x2="560" y2="56" stroke="#1A2D48" strokeWidth="1" />
        <line x1="0" y1="112" x2="560" y2="112" stroke="#1A2D48" strokeWidth="1" />
        <line x1="0" y1="168" x2="560" y2="168" stroke="#1A2D48" strokeWidth="1" />
        <line x1="0" y1="224" x2="560" y2="224" stroke="#1A2D48" strokeWidth="1" />
        <line x1="80" y1="0" x2="80" y2="280" stroke="#1A2D48" strokeWidth="1" />
        <line x1="200" y1="0" x2="200" y2="280" stroke="#1A2D48" strokeWidth="1" />
        <line x1="280" y1="0" x2="280" y2="280" stroke="#1A2D48" strokeWidth="1" />
        <line x1="360" y1="0" x2="360" y2="280" stroke="#1A2D48" strokeWidth="1" />
        <line x1="480" y1="0" x2="480" y2="280" stroke="#1A2D48" strokeWidth="1" />

        {/* Decorative gold accent lines */}
        <line x1="0" y1="140" x2="560" y2="140" stroke="#C5A05A" strokeWidth="0.5" opacity="0.4" />
        <line x1="280" y1="0" x2="280" y2="280" stroke="#C5A05A" strokeWidth="0.5" opacity="0.3" />

        {/* Corner accent marks */}
        <polyline points="20,20 20,4 36,4" stroke="#C5A05A" strokeWidth="1.5" fill="none" opacity="0.7" />
        <polyline points="540,20 540,4 524,4" stroke="#C5A05A" strokeWidth="1.5" fill="none" opacity="0.7" />
        <polyline points="20,260 20,276 36,276" stroke="#C5A05A" strokeWidth="1.5" fill="none" opacity="0.7" />
        <polyline points="540,260 540,276 524,276" stroke="#C5A05A" strokeWidth="1.5" fill="none" opacity="0.7" />

        {/* Large "4" left */}
        <text
          x="64"
          y="210"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="200"
          fontWeight="bold"
          fill="none"
          stroke="#C5A05A"
          strokeWidth="2"
          opacity="0.18"
        >
          4
        </text>
        <text
          x="64"
          y="210"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="200"
          fontWeight="bold"
          fill="#C5A05A"
          opacity="0.85"
        >
          4
        </text>

        {/* "0" center */}
        <text
          x="186"
          y="210"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="200"
          fontWeight="bold"
          fill="none"
          stroke="#C5A05A"
          strokeWidth="2"
          opacity="0.18"
        >
          0
        </text>
        <text
          x="186"
          y="210"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="200"
          fontWeight="bold"
          fill="#C5A05A"
          opacity="0.85"
        >
          0
        </text>

        {/* Large "4" right */}
        <text
          x="344"
          y="210"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="200"
          fontWeight="bold"
          fill="none"
          stroke="#C5A05A"
          strokeWidth="2"
          opacity="0.18"
        >
          4
        </text>
        <text
          x="344"
          y="210"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="200"
          fontWeight="bold"
          fill="#C5A05A"
          opacity="0.85"
        >
          4
        </text>

        {/* Horizontal rule through midpoint of numbers */}
        <line x1="52" y1="140" x2="508" y2="140" stroke="#C5A05A" strokeWidth="1.5" opacity="0.6" />

        {/* Small scattered dots */}
        <circle cx="530" cy="36" r="2.5" fill="#C5A05A" opacity="0.5" />
        <circle cx="30" cy="248" r="2" fill="#C5A05A" opacity="0.4" />
        <circle cx="530" cy="248" r="2" fill="#C5A05A" opacity="0.4" />
        <circle cx="30" cy="36" r="2.5" fill="#C5A05A" opacity="0.5" />

        {/* Fine diagonal accent */}
        <line x1="420" y1="60" x2="500" y2="120" stroke="#C5A05A" strokeWidth="1" opacity="0.25" strokeDasharray="4 4" />
        <line x1="60" y1="160" x2="140" y2="220" stroke="#C5A05A" strokeWidth="1" opacity="0.25" strokeDasharray="4 4" />
      </svg>

      <p className="mb-2 font-mono text-xs tracking-[0.25em] uppercase text-[#C5A05A]">
        Page introuvable
      </p>
      <h1 className="mb-4 font-display text-2xl font-bold text-[#FBFAF8] sm:text-3xl">
        Cette page n'existe pas
      </h1>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-[#FBFAF8]/55">
        Elle a peut-être été déplacée ou supprimée. Revenez à l'accueil pour continuer votre parcours.
      </p>

      <Button
        onClick={() => navigate("/")}
        className="bg-[#C5A05A] px-8 text-[#0E1B2E] font-semibold hover:bg-[#b08d49] transition-colors"
      >
        Retour à l'accueil
      </Button>
    </div>
  );
};

export default NotFound;
