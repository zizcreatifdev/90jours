/**
 * Style premium du contrat, FIGÉ côté code (Voie A).
 *
 * Le contenu stocké en base (contract_templates.content) ne contient plus que le
 * CORPS éditable (les articles). Ce style scopé .contract-doc + l'enveloppe
 * .contract-doc > .page sont réinjectés au rendu (ContractSign, aperçu admin)
 * pour un affichage identique a l'existant.
 *
 * CONTRACT_STYLE reprend exactement le <style> du template premium, complété de
 * quelques sélecteurs de balises de base (h1/h2/h3/strong/ol) afin que le contenu
 * normalisé par l'éditeur WYSIWYG (qui ne conserve pas les classes décoratives)
 * reste sur la charte. Les règles a base de classes gardent la priorité (plus
 * spécifiques), donc un template existant non édité s'affiche a l'identique.
 */

export const CONTRACT_STYLE = `<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
.contract-doc{--navy:#0E1B2E;--gold:#C5A05A;--ink:#2b3445;--muted:#6b7280;--line:#e7e3da;font-family:'Inter',Arial,sans-serif;color:var(--ink);line-height:1.75;background:#FBFAF8;margin:0;padding:0}
.contract-doc *{box-sizing:border-box}
.contract-doc .page{max-width:760px;margin:0 auto;padding:56px 48px;background:#FBFAF8}
.contract-doc .doc-head{text-align:center;margin-bottom:42px}
.contract-doc .brand{font-family:'Fraunces',Georgia,serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:14px}
.contract-doc .doc-title{font-family:'Fraunces',Georgia,serif;font-size:29px;font-weight:700;color:var(--navy);letter-spacing:.3px;margin:0 0 18px;line-height:1.25}
.contract-doc .rule{width:64px;height:2px;background:var(--gold);margin:0 auto;border:none}
.contract-doc .parties{margin:34px 0;font-size:15px}
.contract-doc .parties p{margin:6px 0}
.contract-doc .party-name{font-weight:600;color:var(--navy)}
.contract-doc article{margin:26px 0}
.contract-doc .art-title{font-family:'Fraunces',Georgia,serif;font-size:16px;font-weight:600;color:var(--navy);margin:0 0 10px;display:flex;align-items:baseline;gap:10px}
.contract-doc .art-num{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border:1px solid var(--gold);border-radius:50%;color:var(--gold);font-size:12px;font-weight:600;font-family:'Inter',Arial,sans-serif;line-height:1}
.contract-doc p{margin:0 0 12px}
.contract-doc ul{margin:8px 0 12px;padding-left:20px}
.contract-doc li{margin:6px 0}
.contract-doc .fin{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 22px;margin:12px 0}
.contract-doc .fin .row{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;font-size:15px}
.contract-doc .fin .row.total{border-top:1px solid var(--line);margin-top:4px;padding-top:12px;font-weight:600;color:var(--navy)}
.contract-doc .fin .amount{font-weight:600;color:var(--navy)}
.contract-doc .sign{margin-top:46px;padding-top:24px;border-top:1px solid var(--line);font-size:15px}
.contract-doc .sign .name{font-family:'Fraunces',Georgia,serif;font-size:21px;color:var(--navy);margin-top:8px}
.contract-doc .foot{margin-top:38px;text-align:center;font-size:12px;color:var(--muted)}
.contract-doc h1,.contract-doc h2,.contract-doc h3{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-weight:600;letter-spacing:.2px}
.contract-doc h1{font-size:24px;margin:0 0 14px}
.contract-doc h2{font-size:18px;margin:22px 0 10px}
.contract-doc h3{font-size:15px;margin:18px 0 8px}
.contract-doc strong{color:var(--navy)}
.contract-doc ol{margin:8px 0 12px;padding-left:20px}
</style>`;

const ENVELOPE_OPEN = '<div class="contract-doc"><div class="page">';
const ENVELOPE_CLOSE = "</div></div>";

/**
 * Sépare le corps éditable du style/enveloppe figés.
 *  1. Retire tout bloc <style>...</style>.
 *  2. Si présente, déballe l'enveloppe <div class="contract-doc"><div class="page">
 *     pour ne garder que le corps interne.
 * Robuste aux templates existants (style + enveloppe) comme aux nouveaux (corps seul).
 */
export function extractContractBody(content: string): string {
  let body = (content || "").trim();
  body = body.replace(/<style[\s\S]*?<\/style>/gi, "").trim();

  const docMatch = body.match(/<div\s+class="contract-doc"\s*>([\s\S]*)<\/div>\s*$/i);
  if (docMatch) {
    let inner = docMatch[1].trim();
    const pageMatch = inner.match(/<div\s+class="page"\s*>([\s\S]*)<\/div>\s*$/i);
    if (pageMatch) inner = pageMatch[1].trim();
    body = inner.trim();
  }
  return body;
}

/** Réinjecte le style premium + enveloppe autour du corps, pour le rendu. */
export function renderContractDocument(body: string): string {
  return `${CONTRACT_STYLE}\n${ENVELOPE_OPEN}\n${body}\n${ENVELOPE_CLOSE}`;
}
