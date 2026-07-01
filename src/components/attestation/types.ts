export interface TemplateElement {
  id: string;
  type: "text" | "image" | "pattern";
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
}

export interface AttestationTemplate {
  elements: TemplateElement[];
  backgroundColor: string;
  primaryColor: string;
  width: number; // px for canvas
  height: number; // px for canvas
}

export const DEFAULT_TEMPLATE: AttestationTemplate = {
  backgroundColor: "#FAFAF8",
  primaryColor: "#C5A05A",
  width: 842,
  height: 595,
  elements: [
    // Cadre or : 4 bandes fines sur les bords
    { id: "borderTop",    type: "pattern", x: 0,    y: 0,    width: 100,  height: 1.5,  patternType: "topBand",    patternColor: "#C5A05A" },
    { id: "borderBottom", type: "pattern", x: 0,    y: 98.5, width: 100,  height: 1.5,  patternType: "bottomBand", patternColor: "#C5A05A" },
    { id: "borderLeft",   type: "pattern", x: 0,    y: 0,    width: 0.9,  height: 100,  patternType: "topBand",    patternColor: "#C5A05A" },
    { id: "borderRight",  type: "pattern", x: 99.1, y: 0,    width: 0.9,  height: 100,  patternType: "topBand",    patternColor: "#C5A05A" },

    // En-tete : logo 60jours a gauche, logo partenaire a droite
    {
      id: "logo",
      type: "image",
      x: 4, y: 2.5, width: 22, height: 9,
      src: "/logos/Logo60jours_noir.svg",
      label: "Logo 60jours",
    },
    {
      id: "logoPartner",
      type: "image",
      x: 74, y: 2.5, width: 22, height: 9,
      src: "",
      label: "Logo partenaire",
    },

    // Filet or sous l'en-tete
    { id: "headerLine", type: "pattern", x: 3, y: 14, width: 94, height: 0.4, patternType: "topBand", patternColor: "#C5A05A" },

    // Titre principal
    {
      id: "title",
      type: "text",
      x: 5, y: 17, width: 90, height: 10,
      content: "ATTESTATION DE FORMATION",
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      color: "#0E1B2E",
    },

    // Sous-titre (formation + type de cohorte)
    {
      id: "subtitle",
      type: "text",
      x: 10, y: 28, width: 80, height: 6,
      content: "Formation {cohort_type_label} : {formation_name}",
      fontSize: 13,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#C5A05A",
    },

    // Intro
    {
      id: "decerne",
      type: "text",
      x: 20, y: 37, width: 60, height: 5,
      content: "La presente attestation est delivree a",
      fontSize: 11,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#666666",
    },

    // Nom de l'etudiant
    {
      id: "studentName",
      type: "text",
      x: 10, y: 43, width: 80, height: 9,
      content: "{student_name}",
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      color: "#0E1B2E",
    },

    // Corps du certificat
    {
      id: "body",
      type: "text",
      x: 10, y: 54, width: 80, height: 12,
      content: "pour avoir suivi avec succes la formation {formation_name} du {start_date} au {end_date}.",
      fontSize: 12,
      fontWeight: "normal",
      textAlign: "center",
      color: "#444444",
    },

    // Filet or avant le pied de page
    { id: "footerLine", type: "pattern", x: 3, y: 77, width: 94, height: 0.4, patternType: "bottomBand", patternColor: "#C5A05A" },

    // Signature (image)
    {
      id: "signature",
      type: "image",
      x: 5, y: 64, width: 22, height: 12,
      src: "",
      label: "Signature",
    },

    // Nom du signataire
    {
      id: "directorLabel",
      type: "text",
      x: 5, y: 78.5, width: 25, height: 4,
      content: "La Direction",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "left",
      color: "#666666",
    },

    // Date d'emission
    {
      id: "dateText",
      type: "text",
      x: 32, y: 79, width: 36, height: 4,
      content: "Fait le {current_date}",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "center",
      color: "#888888",
    },

    // Numero de certificat
    {
      id: "certificateNumber",
      type: "text",
      x: 70, y: 79, width: 26, height: 4,
      content: "N° {certificate_number}",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "right",
      color: "#888888",
    },

    // Tampon
    {
      id: "stamp",
      type: "image",
      x: 73, y: 63, width: 15, height: 13,
      src: "",
      label: "Tampon",
    },
  ],
};
