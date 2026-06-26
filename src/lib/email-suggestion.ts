/**
 * Suggestion de correction de domaine email.
 *
 * Utilise la distance de Levenshtein (seuil <= 2) pour detecter les fautes
 * de frappe courantes sur les domaines populaires et proposer une correction.
 * Aucune dependance externe : fonction pure, ~30 lignes de logique.
 *
 * Usage :
 *   suggestEmailCorrection("aminata@gmal.com") // => "aminata@gmail.com"
 *   suggestEmailCorrection("aminata@gmail.com") // => null (aucune suggestion)
 *   suggestEmailCorrection("invalid-format")    // => null
 */

const POPULAR_DOMAINS: readonly string[] = [
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "icloud.com",
  "live.fr",
  "live.com",
  "orange.fr",
  "orange.sn",
  "laposte.net",
  "free.fr",
  "wanadoo.fr",
  "sfr.fr",
  "protonmail.com",
  "me.com",
  "aol.com",
  "msn.com",
];

/** Distance de Levenshtein, optimisee en espace O(n). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const curr =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : 1 + Math.min(row[j - 1], prev, row[j]);
      row[j - 1] = prev;
      prev = curr;
    }
    row[n] = prev;
  }
  return row[n];
}

/**
 * Analyse le domaine de l'email et propose une correction si une faute de
 * frappe courante est detectee (distance <= 2 vers un domaine populaire).
 * Retourne l'email corrige complet, ou null si aucune suggestion.
 */
export function suggestEmailCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();

  if (POPULAR_DOMAINS.includes(domain)) return null;

  let bestDomain: string | null = null;
  let bestDist = 3;

  for (const candidate of POPULAR_DOMAINS) {
    const dist = levenshtein(domain, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      bestDomain = candidate;
    }
  }

  return bestDomain ? `${local}@${bestDomain}` : null;
}
