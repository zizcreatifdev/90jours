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

// Template Moderne : sidebar navy a gauche, contenu a droite.
// A4 paysage 842x595px.
// Renderer supporte "text", "image", et "pattern" (topBand/bottomBand = gradient).
// La sidebar navy utilise patternType "topBand" avec patternColor #0E1B2E
// (gradient #0E1B2E -> rgb(74,87,106) a 135deg, effet sobre sur fond etroit).
export const DEFAULT_TEMPLATE: AttestationTemplate = {
  backgroundColor: "#ffffff",
  primaryColor: "#C5A05A",
  width: 842,
  height: 595,
  elements: [

    // ── SIDEBAR GAUCHE (x : 0-28.5%) ─────────────────────────────────────────

    // Fond navy de la sidebar (gradient diagonal sobre)
    {
      id: "sidebarBg",
      type: "pattern",
      x: 0, y: 0, width: 28.5, height: 100,
      patternType: "topBand",
      patternColor: "#0E1B2E",
    },

    // Filet or vertical de separation
    {
      id: "sidebarDivider",
      type: "pattern",
      x: 28.2, y: 0, width: 0.6, height: 100,
      patternType: "topBand",
      patternColor: "#C5A05A",
    },

    // Logo 60jours version blanche
    {
      id: "logo",
      type: "image",
      x: 3, y: 4, width: 22.5, height: 10,
      src: "/logos/Logo60jours_blanc.svg",
      label: "Logo 60jours",
    },

    // Filet or horizontal + nom de l'ecole
    {
      id: "sidebarSep",
      type: "pattern",
      x: 2, y: 17, width: 24.5, height: 0.5,
      patternType: "topBand",
      patternColor: "#C5A05A",
    },
    {
      id: "labelDesCreatifs",
      type: "text",
      x: 2, y: 19, width: 24.5, height: 3.5,
      content: "LABEL DES CREATIFS",
      fontSize: 7,
      fontWeight: "bold",
      textAlign: "center",
      color: "#C5A05A",
    },

    // Bloc FORMATION
    {
      id: "lblFormation",
      type: "text",
      x: 2, y: 25, width: 24.5, height: 2.5,
      content: "FORMATION",
      fontSize: 6,
      fontWeight: "bold",
      textAlign: "left",
      color: "#8899aa",
    },
    {
      id: "valFormation",
      type: "text",
      x: 2, y: 27.5, width: 24.5, height: 5.5,
      content: "{formation_name}",
      fontSize: 10,
      fontWeight: "normal",
      textAlign: "left",
      color: "#ffffff",
    },

    // Bloc TYPE
    {
      id: "lblType",
      type: "text",
      x: 2, y: 35, width: 24.5, height: 2.5,
      content: "TYPE",
      fontSize: 6,
      fontWeight: "bold",
      textAlign: "left",
      color: "#8899aa",
    },
    {
      id: "valType",
      type: "text",
      x: 2, y: 37.5, width: 24.5, height: 4.5,
      content: "{cohort_type_label}",
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "left",
      color: "#C5A05A",
    },

    // Bloc DUREE
    {
      id: "lblDuree",
      type: "text",
      x: 2, y: 44, width: 24.5, height: 2.5,
      content: "DUREE",
      fontSize: 6,
      fontWeight: "bold",
      textAlign: "left",
      color: "#8899aa",
    },
    {
      id: "valDuree",
      type: "text",
      x: 2, y: 46.5, width: 24.5, height: 4.5,
      content: "{duration}",
      fontSize: 12,
      fontWeight: "normal",
      textAlign: "left",
      color: "#ffffff",
    },

    // Bloc PERIODE
    {
      id: "lblPeriode",
      type: "text",
      x: 2, y: 53, width: 24.5, height: 2.5,
      content: "PERIODE",
      fontSize: 6,
      fontWeight: "bold",
      textAlign: "left",
      color: "#8899aa",
    },
    {
      id: "valPeriode",
      type: "text",
      x: 2, y: 55.5, width: 24.5, height: 4.5,
      content: "{start_date} au {end_date}",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "left",
      color: "#cccccc",
    },

    // Bloc CERTIFICAT
    {
      id: "lblCertificat",
      type: "text",
      x: 2, y: 63, width: 24.5, height: 2.5,
      content: "CERTIFICAT",
      fontSize: 6,
      fontWeight: "bold",
      textAlign: "left",
      color: "#8899aa",
    },
    {
      id: "valCertificat",
      type: "text",
      x: 2, y: 65.5, width: 24.5, height: 4,
      content: "{certificate_number}",
      fontSize: 8,
      fontWeight: "normal",
      textAlign: "left",
      color: "#C5A05A",
    },

    // ── CONTENU DROIT (x : 31-97%) ───────────────────────────────────────────

    // Tag d'en-tete
    {
      id: "headerTag",
      type: "text",
      x: 31, y: 7, width: 66, height: 5,
      content: "ATTESTATION DE FORMATION",
      fontSize: 8,
      fontWeight: "bold",
      textAlign: "center",
      color: "#8899aa",
    },

    // Intro
    {
      id: "certifieQue",
      type: "text",
      x: 31, y: 26, width: 66, height: 4.5,
      content: "Nous certifions que",
      fontSize: 12,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#667788",
    },

    // Nom de l'etudiant (element principal)
    {
      id: "studentName",
      type: "text",
      x: 31, y: 31, width: 66, height: 12,
      content: "{student_name}",
      fontSize: 32,
      fontWeight: "bold",
      textAlign: "center",
      color: "#0E1B2E",
    },

    // Filet or sous le nom
    {
      id: "nameLine",
      type: "pattern",
      x: 34, y: 44, width: 58, height: 0.5,
      patternType: "topBand",
      patternColor: "#C5A05A",
    },

    // Corps du certificat (3 lignes)
    {
      id: "bodyLine1",
      type: "text",
      x: 31, y: 47, width: 66, height: 4.5,
      content: "a complete avec succes la formation",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#667788",
    },
    {
      id: "bodyLine2",
      type: "text",
      x: 31, y: 52, width: 66, height: 4.5,
      content: "{formation_name} - Formation {cohort_type_label}",
      fontSize: 11,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#667788",
    },
    {
      id: "bodyLine3",
      type: "text",
      x: 31, y: 57, width: 66, height: 4.5,
      content: "organisee par le Label des Creatifs",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#667788",
    },

    // Zone signature + tampon
    {
      id: "signature",
      type: "image",
      x: 32, y: 70, width: 18, height: 14,
      src: "",
      label: "Signature",
    },
    {
      id: "stamp",
      type: "image",
      x: 77, y: 70, width: 15, height: 14,
      src: "",
      label: "Tampon",
    },

    // Signataire
    {
      id: "directorName",
      type: "text",
      x: 32, y: 85, width: 24, height: 4.5,
      content: "Abdoul Aziz Fall",
      fontSize: 11,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "left",
      color: "#0E1B2E",
    },
    {
      id: "directorLine",
      type: "pattern",
      x: 32, y: 90, width: 20, height: 0.3,
      patternType: "bottomBand",
      patternColor: "#cccccc",
    },
    {
      id: "directorLabel",
      type: "text",
      x: 32, y: 91, width: 24, height: 3.5,
      content: "Directeur",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "left",
      color: "#8899aa",
    },

    // Date en bas a droite
    {
      id: "dateText",
      type: "text",
      x: 66, y: 88, width: 30, height: 4,
      content: "Dakar, {current_date}",
      fontSize: 9,
      fontWeight: "normal",
      textAlign: "right",
      color: "#8899aa",
    },
  ],
};
