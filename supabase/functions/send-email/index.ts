/**
 * send-email : Edge Function generique et reutilisable.
 *
 * Entree (POST JSON) : { to, template, variables }
 *   - to        : adresse du destinataire (string) OU { email, name }
 *   - template  : identifiant de template (ex "welcome")
 *   - variables : donnees pour remplir le template (Record<string, string>)
 *
 * Securite : JWT obligatoire (createClient.auth.getUser). L'email du destinataire
 * doit correspondre exactement a l'email de l'utilisateur authentifie. Un visiteur
 * anonyme ou un utilisateur authentifie ciblant une adresse tierce recoit une
 * erreur 401/403 sans qu'aucun email ne soit envoye.
 * La verification est faite par le serveur Supabase (signature JWT verifiee) et
 * non par simple decodage de payload, afin d'eviter toute falsification.
 *
 * Envoi :
 *   - Si le secret BREVO_API_KEY est present : envoi via l'API transactionnelle
 *     Brevo (POST https://api.brevo.com/v3/smtp/email, header api-key).
 *   - Si BREVO_API_KEY est ABSENT : mode "log". On n'envoie rien, on logge le
 *     destinataire + sujet + un apercu du corps, et on retourne un succes
 *     { ok: true, mode: "log" }. La fonction ne plante jamais.
 *
 * Secrets (Deno.env) a provisionner pour l'envoi reel :
 *   - BREVO_API_KEY  : cle API transactionnelle Brevo (active l'envoi reel).
 *   - EMAIL_FROM     : adresse expediteur (ex. noreply@60jours.com).
 *   - EMAIL_REPLY_TO : adresse de reponse (ex. contact@60jours.com).
 *   - APP_URL        : base de l'app pour les liens dans les emails.
 *
 * Pour ajouter un template : ajouter une entree dans le registre TEMPLATES.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://60jours.com",
  "https://www.60jours.com",
  "https://60jours.vercel.app",
  "http://localhost:8080",
];

const FROM_NAME = "60jours";
const FROM_EMAIL_FALLBACK = "noreply@60jours.com";
const REPLY_TO_EMAIL_FALLBACK = "contact@60jours.com";
const APP_URL_FALLBACK = "https://60jours.vercel.app";

// Adresse de contact publique (affichee dans le footer des emails).
const CONTACT_EMAIL = "contact@60jours.com";

// Palette 60jours (couleurs en dur car un email ne peut pas lire les CSS vars).
const NAVY = "#0E1B2E";
const GOLD = "#C5A05A";
const CREAM = "#FBFAF8";
const INK = "#1F2937";
const MUTED = "#6B7280";

interface SendEmailPayload {
  to: string | { email: string; name?: string };
  template: string;
  variables?: Record<string, string>;
}

interface RenderedTemplate {
  subject: string;
  html: string;
}

/** Echappe le HTML des variables injectees pour eviter toute rupture de balise. */
const esc = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/**
 * Enveloppe commune 60jours (structure en tableaux, CSS inline, compatible
 * clients mail). Tout template reutilise ce shell pour un rendu coherent.
 */
const layout = (innerHtml: string): string => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ECE7DD;">
          <tr>
            <td style="background-color:${NAVY};padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${GOLD};border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;color:${NAVY};">60</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:#ffffff;">60jours</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #ECE7DD;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${MUTED};">
                60jours, formations intensives. Cet email est automatique. Pour nous contacter :
                <a href="mailto:${CONTACT_EMAIL}" style="color:${MUTED};text-decoration:underline;">${CONTACT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/** Bouton CTA dore, texte navy (bon contraste, compatible mail). */
const ctaButton = (label: string, href: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="border-radius:9999px;background-color:${GOLD};">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${NAVY};text-decoration:none;border-radius:9999px;">
        ${esc(label)}
      </a>
    </td>
  </tr>
</table>`;

/**
 * Registre des templates. Chaque template renvoie un sujet + un corps HTML.
 * Ajouter un nouveau template = ajouter une entree ici.
 */
const TEMPLATES: Record<string, (vars: Record<string, string>, appUrl: string) => RenderedTemplate> = {
  welcome: (vars, appUrl) => {
    const prenom = esc(vars.prenom || "");
    const formation = esc(vars.formation || "votre formation");
    const link = vars.link || `${appUrl}/student`;
    const greeting = prenom ? `Bonjour ${prenom},` : "Bonjour,";

    const inner = `
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;font-weight:bold;color:${NAVY};">
        Bienvenue chez 60jours
      </h1>
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${INK};">
        ${greeting}
      </p>
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${INK};">
        Nous sommes ravis de vous compter parmi nous. Votre inscription a
        <strong style="color:${NAVY};">${formation}</strong> est bien enregistree.
      </p>
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${INK};">
        Prochaine etape : finaliser votre paiement depuis votre espace etudiant pour
        confirmer votre place.
      </p>
      ${ctaButton("Acceder a mon espace de paiement", link)}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
        <a href="${esc(link)}" target="_blank" style="color:${GOLD};text-decoration:underline;">${esc(link)}</a>
      </p>`;

    return { subject: "Bienvenue chez 60jours", html: layout(inner) };
  },
};

const json = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // OPTIONS : repondre immediatement (pas de JWT requis sur le preflight CORS).
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as SendEmailPayload;
    const { to, template, variables } = payload;

    if (!to || !template) {
      return json({ ok: false, error: "Champs 'to' et 'template' requis." }, 400, corsHeaders);
    }

    const recipientEmail = typeof to === "string" ? to : to.email;
    const recipientName = typeof to === "string" ? undefined : to.name;
    if (!recipientEmail) {
      return json({ ok: false, error: "Destinataire invalide." }, 400, corsHeaders);
    }

    // ── Securite : verification cote serveur de l'identite de l'appelant ──────
    // createClient.auth.getUser() fait une requete vers l'API Supabase Auth avec
    // le JWT fourni. La signature est verifiee par le serveur (pas un simple
    // decodage de payload), ce qui empeche toute falsification de l'email.
    // Un appel sans JWT valide retourne user=null -> 401.
    // Un appel avec un JWT valide mais un email destinataire different -> 403.
    // Consequence : seul un utilisateur authentifie peut declencher un envoi,
    // et uniquement vers sa propre adresse (pas d'envoi a des tiers).
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();

    if (!authUser?.email) {
      return json({ ok: false, error: "Non autorise." }, 401, corsHeaders);
    }
    if (recipientEmail.toLowerCase() !== authUser.email.toLowerCase()) {
      return json({ ok: false, error: "Destinataire non autorise." }, 403, corsHeaders);
    }
    // ── Fin verification ───────────────────────────────────────────────────────

    const render = TEMPLATES[template];
    if (!render) {
      return json({ ok: false, error: `Template inconnu : ${template}` }, 400, corsHeaders);
    }

    const appUrl = Deno.env.get("APP_URL") || APP_URL_FALLBACK;
    const { subject, html } = render(variables ?? {}, appUrl);

    const brevoKey = Deno.env.get("BREVO_API_KEY");

    // ── Mode log : pas de cle Brevo, on n'envoie rien mais on trace ──
    if (!brevoKey) {
      console.log(
        `[send-email][mode=log] to=${recipientEmail} template=${template} subject="${subject}" ` +
          `preview="${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)}"`,
      );
      return json({ ok: true, mode: "log", to: recipientEmail, subject }, 200, corsHeaders);
    }

    // ── Envoi reel via Brevo ──
    const fromEmail = Deno.env.get("EMAIL_FROM") || FROM_EMAIL_FALLBACK;
    const replyToEmail = Deno.env.get("EMAIL_REPLY_TO") || REPLY_TO_EMAIL_FALLBACK;

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: FROM_NAME },
        to: [recipientName ? { email: recipientEmail, name: recipientName } : { email: recipientEmail }],
        replyTo: { email: replyToEmail, name: FROM_NAME },
        subject,
        htmlContent: html,
      }),
    });

    if (!brevoRes.ok) {
      const detail = await brevoRes.text().catch(() => "");
      console.error(`[send-email][brevo] echec ${brevoRes.status} : ${detail}`);
      // Non bloquant : on renvoie 200 avec ok:false pour ne jamais faire echouer l'appelant.
      return json({ ok: false, mode: "send", status: brevoRes.status, error: "Echec envoi Brevo" }, 200, corsHeaders);
    }

    console.log(`[send-email][mode=send] to=${recipientEmail} template=${template} envoye.`);
    return json({ ok: true, mode: "send", to: recipientEmail, subject }, 200, corsHeaders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-email] erreur:", message);
    // On reste non bloquant cote appelant : 200 avec ok:false.
    return json({ ok: false, error: message }, 200, corsHeaders);
  }
});
