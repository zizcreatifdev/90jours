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

// Template Aere : sidebar bleu nuit a gauche (3 infos, beaucoup de vide),
// contenu droit aere (grands espaces entre blocs, nom etudiant en vedette).
// A4 paysage 842x595px.
export const DEFAULT_TEMPLATE: AttestationTemplate = {
  backgroundColor: "#FFFFFF",
  primaryColor: "#C5A05A",
  width: 842,
  height: 595,
  elements: [

    // -- SIDEBAR GAUCHE (x : 0-28.5%) --

    // Fond bleu nuit de la sidebar
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

    // Logo 60jours (centre, respire en haut)
    {
      id: "logo",
      type: "image",
      x: 3, y: 9, width: 22.5, height: 11,
      src: "/logos/Logo60jours_blanc.svg",
      label: "Logo 60jours",
    },

    // Filet dore sous le logo
    {
      id: "sidebarSep",
      type: "line",
      x: 3, y: 23, width: 22.5, height: 0.4,
      color: "#C5A05A",
      orientation: "horizontal",
    },

    // Nom de l'ecole (petit, dore)
    {
      id: "labelDesCreatifs",
      type: "text",
      x: 3, y: 25.5, width: 22.5, height: 4,
      content: "LABEL DES CREATIFS",
      fontSize: 7,
      fontWeight: "bold",
      textAlign: "center",
      color: "#C5A05A",
    },

    // Grand espace vide entre l'en-tete et les infos formation (y : 30-43%)

    // Nom de la formation (centre, blanc, milieu de sidebar)
    {
      id: "valFormation",
      type: "text",
      x: 3, y: 44, width: 22.5, height: 9,
      content: "{formation_name}",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#ffffff",
    },

    // Type de cohorte (centre, dore)
    {
      id: "valType",
      type: "text",
      x: 3, y: 54, width: 22.5, height: 6,
      content: "{cohort_type_label}",
      fontSize: 11,
      fontWeight: "bold",
      textAlign: "center",
      color: "#C5A05A",
    },

    // Grand espace vide (y : 60-84%)

    // Numero de certificat tout en bas (dore, mono, petit)
    {
      id: "valCertificat",
      type: "text",
      x: 3, y: 88, width: 22.5, height: 5,
      content: "{certificate_number}",
      fontSize: 7,
      fontWeight: "normal",
      textAlign: "center",
      color: "#C5A05A",
    },

    // -- CONTENU DROIT (x : 31-97%) --

    // En-tete : titre du document (lettres espacees, gris discret)
    {
      id: "headerTag",
      type: "text",
      x: 31, y: 13, width: 66, height: 5,
      content: "ATTESTATION DE FORMATION",
      fontSize: 8,
      fontWeight: "bold",
      textAlign: "center",
      color: "#8899aa",
    },

    // Grand espace (y : 18-36%)

    // Phrase d'introduction
    {
      id: "certifieQue",
      type: "text",
      x: 31, y: 36, width: 66, height: 5,
      content: "Nous certifions que",
      fontSize: 12,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#8B8070",
    },

    // Nom de l'etudiant (star du document, grand, brun chaud)
    {
      id: "studentName",
      type: "text",
      x: 31, y: 42, width: 66, height: 11,
      content: "{student_name}",
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      color: "#2E2212",
    },

    // Filet dore sous le nom
    {
      id: "nameLine",
      type: "line",
      x: 36, y: 54, width: 54, height: 0.4,
      color: "#C5A05A",
      orientation: "horizontal",
    },

    // Corps (4 lignes, debut a y:59%, espacement 6% entre chaque)
    {
      id: "bodyLine1",
      type: "text",
      x: 31, y: 59, width: 66, height: 5,
      content: "a complete avec succes la formation",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#8B8070",
    },
    {
      id: "bodyLine2",
      type: "text",
      x: 31, y: 64, width: 66, height: 5,
      content: "{formation_name} - {cohort_type_label}",
      fontSize: 11,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#667788",
    },
    {
      id: "bodyLine3",
      type: "text",
      x: 31, y: 70, width: 66, height: 5,
      content: "du {start_date} au {end_date} ({duration})",
      fontSize: 10,
      fontWeight: "normal",
      textAlign: "center",
      color: "#8B8070",
    },
    {
      id: "bodyLine4",
      type: "text",
      x: 31, y: 75, width: 66, height: 5,
      content: "organisee par le Label des Creatifs",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#8B8070",
    },

    // Grand espace (y : 80-82%)

    // Signature (bas gauche)
    {
      id: "signature",
      type: "image",
      x: 33, y: 82, width: 15, height: 11,
      src: "",
      label: "Signature",
    },

    // Tampon (bas centre)
    {
      id: "stamp",
      type: "image",
      x: 60, y: 82, width: 13, height: 11,
      src: "",
      label: "Tampon",
    },

    // Nom du signataire
    {
      id: "directorName",
      type: "text",
      x: 33, y: 87, width: 22, height: 4.5,
      content: "Abdoul Aziz Fall",
      fontSize: 10,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "left",
      color: "#2E2212",
    },

    // Fonction du signataire
    {
      id: "directorLabel",
      type: "text",
      x: 33, y: 91.5, width: 18, height: 4,
      content: "Directeur",
      fontSize: 8,
      fontWeight: "normal",
      textAlign: "left",
      color: "#8B8070",
    },

    // Date en bas droite
    {
      id: "dateText",
      type: "text",
      x: 62, y: 89, width: 34, height: 4,
      content: "Dakar, {current_date}",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "right",
      color: "#8B8070",
    },
  ],
};
