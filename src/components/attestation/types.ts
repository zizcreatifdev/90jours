export interface TemplateElement {
  id: string;
  type: "text" | "image" | "pattern" | "rect" | "line";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage
  height: number; // percentage
  // Text props
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right";
  color?: string;
  // Image props
  src?: string;
  label?: string;
  opacity?: number; // 0-100
  isBackground?: boolean; // render behind everything
  // Pattern/decoration props
  patternType?: "border" | "topBand" | "bottomBand" | "cornerOrnaments";
  patternColor?: string;
  // Rect props (solid color rectangle)
  borderRadius?: number; // px
  // Line props
  orientation?: "horizontal" | "vertical";
}

export interface AttestationTemplate {
  elements: TemplateElement[];
  backgroundColor: string;
  primaryColor: string;
  width: number; // px for canvas
  height: number; // px for canvas
}

// Template Aere : sidebar bleu nuit (3 infos centrees, grand vide milieu),
// contenu droit aere, zone signature entierement separee du corps.
// A4 paysage 842x595px. Coordonnees en % du canvas.
// Hauteurs visuelles de reference : 28px=4.7%, 12px=2%, 11px=1.85%,
//   10px=1.68%, 9px=1.51%, 8px=1.34%, 7px=1.18%.
export const DEFAULT_TEMPLATE: AttestationTemplate = {
  backgroundColor: "#FFFFFF",
  primaryColor: "#C5A05A",
  width: 842,
  height: 595,
  elements: [

    // -- SIDEBAR GAUCHE (x : 0-28.5%, centre a 14.25%) --

    // Fond bleu nuit
    {
      id: "sidebarBg",
      type: "rect",
      x: 0, y: 0, width: 28.5, height: 100,
      color: "#001D52",
    },

    // Filet dore vertical de separation
    {
      id: "sidebarDivider",
      type: "rect",
      x: 28.5, y: 0, width: 0.5, height: 100,
      color: "#C5A05A",
    },

    // Logo 60jours : x=3, width=22.5 => centre a 14.25%, y=8, bas=18%
    {
      id: "logo",
      type: "image",
      x: 3, y: 8, width: 22.5, height: 10,
      src: "/logos/Logo60jours_blanc.svg",
      label: "Logo 60jours",
    },

    // Filet dore sous le logo : y=19 (1% apres bas du logo a 18%)
    {
      id: "sidebarSep",
      type: "line",
      x: 5, y: 19, width: 19, height: 0.4,
      color: "#C5A05A",
      orientation: "horizontal",
    },

    // Nom de l'ecole : y=24 (4.6% apres le filet a 19.4%)
    // Bas visuel : 24 + 1.18 = 25.18%
    {
      id: "labelDesCreatifs",
      type: "text",
      x: 3, y: 24, width: 22.5, height: 3,
      content: "LABEL DES CREATIFS",
      fontSize: 7,
      fontWeight: "bold",
      textAlign: "center",
      color: "#C5A05A",
    },

    // -- Espace vide y=27 a y=44 (17% de respiration) --

    // Nom de la formation : y=45, bas visuel=46.85%
    {
      id: "valFormation",
      type: "text",
      x: 3, y: 45, width: 22.5, height: 6,
      content: "{formation_name}",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#ffffff",
    },

    // Type de cohorte : y=53 (6.15% apres bas visuel valFormation)
    // Bas visuel : 53 + 1.85 = 54.85%
    {
      id: "valType",
      type: "text",
      x: 3, y: 53, width: 22.5, height: 6,
      content: "{cohort_type_label}",
      fontSize: 11,
      fontWeight: "bold",
      textAlign: "center",
      color: "#C5A05A",
    },

    // -- Espace vide y=61 a y=89 (28% de respiration) --

    // Numero de certificat : y=90, bas visuel=91.18%
    {
      id: "valCertificat",
      type: "text",
      x: 3, y: 90, width: 22.5, height: 4,
      content: "{certificate_number}",
      fontSize: 7,
      fontWeight: "normal",
      textAlign: "center",
      color: "#C5A05A",
    },

    // -- CONTENU DROIT (x : 31-97%, centre a 64%) --

    // Titre du document : y=12, bas visuel=13.34%
    {
      id: "headerTag",
      type: "text",
      x: 31, y: 12, width: 66, height: 4,
      content: "ATTESTATION DE FORMATION",
      fontSize: 8,
      fontWeight: "bold",
      textAlign: "center",
      color: "#8899aa",
    },

    // -- Espace vide y=17 a y=35 (18% de respiration) --

    // Phrase d'introduction : y=36, bas visuel=38%
    {
      id: "certifieQue",
      type: "text",
      x: 31, y: 36, width: 66, height: 4,
      content: "Nous certifions que",
      fontSize: 12,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#8B8070",
    },

    // Nom etudiant (vedette 28px) : y=44, bas visuel=48.7%
    // Gap depuis certifieQue (bas=38%) : 6%
    {
      id: "studentName",
      type: "text",
      x: 31, y: 44, width: 66, height: 5,
      content: "{student_name}",
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      color: "#2E2212",
    },

    // Filet dore sous le nom : y=49 (0.3% apres bas visuel 48.7%)
    // x=43, width=40 => de 43% a 83%, centre a 63%
    {
      id: "nameLine",
      type: "line",
      x: 43, y: 49, width: 40, height: 0.4,
      color: "#C5A05A",
      orientation: "horizontal",
    },

    // Corps texte (4 lignes, espacement ~6% entre debuts)
    // bodyLine1 : y=56 (7% apres le filet a 49%)
    // Bas visuel : 56 + 1.85 = 57.85%
    {
      id: "bodyLine1",
      type: "text",
      x: 31, y: 56, width: 66, height: 4,
      content: "a complete avec succes la formation",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#8B8070",
    },
    // bodyLine2 : y=62 (gap 4.15% depuis bas 57.85%)
    // Bas visuel : 63.85%
    {
      id: "bodyLine2",
      type: "text",
      x: 31, y: 62, width: 66, height: 4,
      content: "{formation_name} - {cohort_type_label}",
      fontSize: 11,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#667788",
    },
    // bodyLine3 : y=68 (gap 4.15% depuis bas 63.85%)
    // Bas visuel : 69.68%
    {
      id: "bodyLine3",
      type: "text",
      x: 31, y: 68, width: 66, height: 4,
      content: "du {start_date} au {end_date} ({duration})",
      fontSize: 10,
      fontWeight: "normal",
      textAlign: "center",
      color: "#8B8070",
    },
    // bodyLine4 : y=74 (gap 4.32% depuis bas 69.68%)
    // Bas visuel : 75.85%
    {
      id: "bodyLine4",
      type: "text",
      x: 31, y: 74, width: 66, height: 4,
      content: "organisee par le Label des Creatifs",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#8B8070",
    },

    // -- ZONE SIGNATURE : y=82 a y=97 (bien separee du corps a 75.85%) --

    // Signature (placeholder image) : x=38-50, y=82-88
    {
      id: "signature",
      type: "image",
      x: 38, y: 82, width: 12, height: 6,
      src: "",
      label: "Signature",
    },

    // Tampon (placeholder image) : x=58-66, y=82-88
    // Pas de chevauchement avec la signature (gap x de 8%)
    {
      id: "stamp",
      type: "image",
      x: 58, y: 82, width: 8, height: 6,
      src: "",
      label: "Tampon",
    },

    // Nom du signataire : y=90, bas visuel=91.68%
    // Gap depuis bas images (88%) : 2%
    {
      id: "directorName",
      type: "text",
      x: 38, y: 90, width: 22, height: 3,
      content: "Abdoul Aziz Fall",
      fontSize: 10,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "left",
      color: "#2E2212",
    },

    // Ligne sous signature : y=92 (0.32% apres bas visuel directorName 91.68%)
    // Aligne horizontalement avec dateText
    {
      id: "signatureLine",
      type: "line",
      x: 35, y: 92, width: 15, height: 0.4,
      color: "#C5A05A",
      orientation: "horizontal",
    },

    // Date en bas droite : y=92 (meme ligne que signatureLine)
    // x=62, width=34, right-aligned => bord droit a 96%
    {
      id: "dateText",
      type: "text",
      x: 62, y: 92, width: 34, height: 3,
      content: "Dakar, {current_date}",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "right",
      color: "#8B8070",
    },

    // Fonction du signataire : y=95, bas visuel=96.34%
    // Gap depuis signatureLine (92.4%) : 2.6%
    {
      id: "directorLabel",
      type: "text",
      x: 38, y: 95, width: 18, height: 3,
      content: "Directeur",
      fontSize: 8,
      fontWeight: "normal",
      textAlign: "left",
      color: "#8B8070",
    },
  ],
};
