import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1B2E] px-6 py-16 text-center">
      <svg
        viewBox="0 0 480 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-10 w-full max-w-sm"
        aria-hidden="true"
      >
        {/* Background shadow */}
        <ellipse cx="240" cy="300" rx="200" ry="24" fill="#0B1624" />

        {/* Open book base */}
        <rect x="100" y="182" width="280" height="14" rx="4" fill="#1A2D48" />

        {/* Left page */}
        <path
          d="M110 196 Q122 118 182 108 L240 106 L240 196 Z"
          fill="#FBFAF8"
          stroke="#C5A05A"
          strokeWidth="1.5"
        />
        {/* Left page lines */}
        <line x1="132" y1="142" x2="222" y2="140" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />
        <line x1="132" y1="154" x2="218" y2="152" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />
        <line x1="132" y1="166" x2="220" y2="164" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />
        <line x1="132" y1="178" x2="214" y2="176" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />

        {/* Right page */}
        <path
          d="M370 196 Q358 118 298 108 L240 106 L240 196 Z"
          fill="#FBFAF8"
          stroke="#C5A05A"
          strokeWidth="1.5"
        />
        {/* Right page lines */}
        <line x1="348" y1="142" x2="258" y2="140" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />
        <line x1="348" y1="154" x2="262" y2="152" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />
        <line x1="348" y1="166" x2="260" y2="164" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />
        <line x1="348" y1="178" x2="266" y2="176" stroke="#C5A05A" strokeWidth="1" opacity="0.35" />

        {/* Book spine */}
        <line x1="240" y1="106" x2="240" y2="196" stroke="#C5A05A" strokeWidth="2.5" />

        {/* Magnifying glass */}
        <circle cx="300" cy="74" r="34" stroke="#C5A05A" strokeWidth="3" fill="none" />
        <circle cx="300" cy="74" r="24" fill="#132236" />
        <line x1="325" y1="99" x2="348" y2="122" stroke="#C5A05A" strokeWidth="4.5" strokeLinecap="round" />

        {/* Question mark */}
        <text
          x="300"
          y="84"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="26"
          fontWeight="bold"
          fill="#C5A05A"
        >
          ?
        </text>

        {/* Stars */}
        <circle cx="78" cy="58" r="2.5" fill="#C5A05A" opacity="0.7" />
        <circle cx="408" cy="48" r="2" fill="#C5A05A" opacity="0.5" />
        <circle cx="148" cy="38" r="1.5" fill="#FBFAF8" opacity="0.4" />
        <circle cx="382" cy="88" r="1.5" fill="#FBFAF8" opacity="0.3" />
        <circle cx="58" cy="128" r="2" fill="#C5A05A" opacity="0.4" />
        <circle cx="422" cy="148" r="1.5" fill="#C5A05A" opacity="0.5" />
        <circle cx="440" cy="60" r="1" fill="#FBFAF8" opacity="0.5" />
        <circle cx="42" cy="90" r="1" fill="#FBFAF8" opacity="0.4" />

        {/* Compass decoration */}
        <polygon points="162,66 155,84 162,80 169,84" fill="#C5A05A" opacity="0.65" />
        <polygon points="162,66 155,48 162,52 169,48" fill="#FBFAF8" opacity="0.4" />
        <circle cx="162" cy="66" r="4" fill="#1A2D48" stroke="#C5A05A" strokeWidth="1.5" />
      </svg>

      <p className="mb-2 font-mono text-xs tracking-[0.25em] text-[#C5A05A] uppercase">
        Erreur 404
      </p>
      <h1 className="mb-4 font-display text-3xl font-bold text-[#FBFAF8] sm:text-4xl">
        Page introuvable
      </h1>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-[#FBFAF8]/60">
        Cette page n'existe pas ou a été déplacée. Revenez à l'accueil pour continuer votre parcours.
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
