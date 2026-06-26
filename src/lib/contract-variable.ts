import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Variables du contrat. `key` = identifiant utilisé dans {{key}} (et par
 * fillTemplate cote ContractSign). `label` = libellé court affiché dans la chip.
 * `description` = aide affichée dans le panneau lateral de l'éditeur.
 */
export interface ContractVariable {
  key: string;
  label: string;
  description: string;
}

export const CONTRACT_VARIABLES: ContractVariable[] = [
  { key: "prenom", label: "prénom", description: "Prénom de l'étudiant" },
  { key: "nom", label: "nom", description: "Nom de famille" },
  { key: "email", label: "email", description: "Email" },
  { key: "formation", label: "formation", description: "Nom de la formation" },
  { key: "cohorte", label: "cohorte", description: "Numéro/nom de la cohorte" },
  { key: "formateur", label: "formateur", description: "Nom du formateur référent" },
  { key: "date_debut", label: "date de début", description: "Date de début de la cohorte" },
  { key: "date_fin", label: "date de fin", description: "Date de fin de la cohorte" },
  { key: "montant", label: "montant", description: "Montant total (hérité)" },
  { key: "frais_inscription", label: "frais d'inscription", description: "Frais d'inscription" },
  { key: "cout_total", label: "coût total", description: "Coût total de la formation" },
  { key: "livrable", label: "livrable", description: "Libellé du livrable (ex: Portfolio)" },
  { key: "date_signature", label: "date de signature", description: "Date de signature" },
  { key: "heure_signature", label: "heure de signature", description: "Heure de signature" },
  { key: "signature_name", label: "nom de signature", description: "Nom saisi lors de la signature" },
];

const LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_VARIABLES.map((v) => [v.key, v.label])
);

/** Libellé lisible d'une clé (repli sur la clé elle-meme si inconnue). */
export function variableLabel(key: string): string {
  return LABELS[key] ?? key;
}

/**
 * CHARGEMENT : convertit le {{cle}} (texte brut stocké) en marqueur de node
 * <span data-var="cle"> que parseHTML reconnait pour afficher une chip.
 */
export function varTextToEditorHtml(html: string): string {
  return (html || "").replace(/\{\{(\w+)\}\}/g, (_m, key) => `<span data-var="${key}"></span>`);
}

/**
 * SAUVEGARDE : reconvertit les spans de variable produits par getHTML() en
 * {{cle}} texte brut, pour que le HTML stocké reste compatible fillTemplate.
 */
export function editorHtmlToVarText(html: string): string {
  return (html || "").replace(
    /<span[^>]*\bdata-var="([^"]+)"[^>]*><\/span>/g,
    (_m, key) => `{{${key}}}`
  );
}

/**
 * Node TipTap inline atomique représentant une variable.
 *  - Affichage editeur : une chip (NodeView DOM, non éditable).
 *  - Sérialisation (getHTML) : <span data-var="cle"></span>, reconverti en
 *    {{cle}} par editorHtmlToVarText au moment de la sauvegarde.
 *  - parseHTML : reconnait <span data-var="cle"> au chargement.
 */
export const VariableNode = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      key: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-var") || "",
        renderHTML: (attrs) => ({ "data-var": attrs.key }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-var]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Sérialisation : span vide porteur de data-var (reconverti en {{cle}} a la sauvegarde).
    return ["span", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = "contract-var";
      dom.setAttribute("data-var", node.attrs.key);
      dom.setAttribute("contenteditable", "false");
      dom.textContent = variableLabel(node.attrs.key);
      return { dom };
    };
  },
});
