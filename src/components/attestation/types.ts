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
  elements: [
    {
      id: "topBand",
      type: "pattern",
      x: 0, y: 0, width: 100, height: 3,
      patternType: "topBand",
      patternColor: "#1a1a2e",
    },
    {
      id: "bottomBand",
      type: "pattern",
      x: 0, y: 97, width: 100, height: 3,
      patternType: "bottomBand",
      patternColor: "#1a1a2e",
    },
    {
      id: "logo",
      type: "image",
      x: 35, y: 5, width: 30, height: 12,
      src: "",
      label: "Logo",
    },
    {
      id: "title",
      type: "text",
      x: 10, y: 20, width: 80, height: 8,
      content: "ATTESTATION DE PARTICIPATION",
      fontSize: 22,
      fontWeight: "bold",
      textAlign: "center",
      color: "#1a1a2e",
    },
    {
      id: "subtitle",
      type: "text",
      x: 20, y: 28, width: 60, height: 5,
      content: "Formation professionnelle",
      fontSize: 10,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#999999",
    },
    {
      id: "decerne",
      type: "text",
      x: 30, y: 35, width: 40, height: 5,
      content: "Décerné(e) à",
      fontSize: 12,
      fontWeight: "normal",
      fontStyle: "italic",
      textAlign: "center",
      color: "#666666",
    },
    {
      id: "studentName",
      type: "text",
      x: 15, y: 40, width: 70, height: 8,
      content: "{student_name}",
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      color: "#1a1a2e",
    },
    {
      id: "body",
      type: "text",
      x: 10, y: 50, width: 80, height: 15,
      content: "Pour avoir participé avec succès à la formation « {formation_name} » du {start_date} au {end_date}.",
      fontSize: 11,
      fontWeight: "normal",
      textAlign: "center",
      color: "#444444",
    },
    {
      id: "formationBadge",
      type: "text",
      x: 30, y: 67, width: 40, height: 6,
      content: "{formation_name}",
      fontSize: 10,
      fontWeight: "bold",
      textAlign: "center",
      color: "#ffffff",
    },
    {
      id: "dateText",
      type: "text",
      x: 25, y: 75, width: 50, height: 5,
      content: "Fait le {current_date}",
      fontSize: 10,
      textAlign: "center",
      color: "#999999",
    },
    {
      id: "signature",
      type: "image",
      x: 5, y: 80, width: 20, height: 12,
      src: "",
      label: "Signature",
    },
    {
      id: "directorLabel",
      type: "text",
      x: 5, y: 92, width: 20, height: 4,
      content: "Le Directeur",
      fontSize: 9,
      textAlign: "left",
      color: "#666666",
    },
    {
      id: "certificateNumber",
      type: "text",
      x: 35, y: 90, width: 30, height: 4,
      content: "N° {certificate_number}",
      fontSize: 8,
      textAlign: "center",
      color: "#999999",
    },
    {
      id: "stamp",
      type: "image",
      x: 75, y: 78, width: 18, height: 16,
      src: "",
      label: "Tampon",
    },
  ],
  backgroundColor: "#ffffff",
  primaryColor: "#1a1a2e",
  width: 842,
  height: 595,
};
