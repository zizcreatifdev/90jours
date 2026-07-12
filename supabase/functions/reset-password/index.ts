/**
 * reset-password : Edge Function non authentifiée pour la réinitialisation de mot de passe.
 *
 * Reçoit { email }, génère un lien de récupération via Supabase Auth (service_role),
 * envoie l'email via Brevo (template password_reset), et retourne TOUJOURS { ok: true }
 * quelle que soit l'issue (anti-énumération : ne révèle pas si le compte existe).
 *
 * Sécurité critique :
 *   - Le lien de récupération (action_link) n'est JAMAIS renvoyé dans la réponse HTTP.
 *   - Pas d'authentification requise (l'utilisateur a oublié son mot de passe).
 *   - Toute erreur (email inexistant, Brevo indisponible) est absorbée silencieusement.
 *   - La réponse est toujours identique pour éviter toute énumération de comptes.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://60jours.com",
  "https://www.60jours.com",
  "https://60jours.vercel.app",
  "http://localhost:8080",
];

const NIGHT = "#001D52";
const GOLD = "#C5A05A";
const CREAM = "#F3EFE2";
const BROWN = "#2E2212";
const BODY_TEXT = "#4a4436";
const MUTED = "#8B8070";
const CONTACT_EMAIL = "contact@60jours.com";
const FROM_NAME = "60jours";
const FROM_EMAIL_FALLBACK = "noreply@60jours.com";
const REPLY_TO_EMAIL_FALLBACK = "contact@60jours.com";

const esc = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

const layout = (innerHtml: string): string => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,29,82,0.10);">
          <tr>
            <td style="background-color:${NIGHT};padding:32px 40px;text-align:center;">
              <img src="https://60jours.com/logos/Logo60jours_blanc.png" alt="60jours" height="48" style="display:inline-block;height:48px;max-width:180px;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:${GOLD};font-size:0;line-height:0;height:3px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:38px 40px;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:${NIGHT};padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;line-height:20px;color:#ffffff;">
                60jours - Formations intensives
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${MUTED};">
                Cet email est automatique. Pour nous contacter :
                <a href="mailto:${CONTACT_EMAIL}" style="color:${GOLD};text-decoration:none;">${CONTACT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const ctaButton = (label: string, href: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
  <tr>
    <td align="center" style="border-radius:9px;background-color:${GOLD};">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${BROWN};text-decoration:none;border-radius:9px;">
        ${esc(label)}
      </a>
    </td>
  </tr>
</table>`;

const infoBox = (html: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 0;">
  <tr>
    <td style="background-color:${CREAM};border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">${html}</p>
    </td>
  </tr>
</table>`;

const badge = (text: string): string =>
  `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:3px;color:${GOLD};text-align:center;">${text}</p>`;

const renderEmail = (actionLink: string): { subject: string; html: string } => {
  const inner = `
    ${badge("SECURITE")}
    <h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;font-weight:bold;color:${BROWN};text-align:center;">
      R&#233;initialisation du mot de passe
    </h1>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
      Nous avons re&#231;u une demande de r&#233;initialisation du mot de passe pour votre compte 60jours.
    </p>
    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
      Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pendant 1 heure.
    </p>
    ${ctaButton("Réinitialiser mon mot de passe", actionLink)}
    ${infoBox("Si vous n&#39;&#234;tes pas &#224; l&#39;origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifi&#233;.")}
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
      Si le bouton ne fonctionne pas, rendez-vous sur la page de connexion et cliquez sur
      &#171;&#160;Mot de passe oubli&#233;&#160;&#187; pour obtenir un nouveau lien.
    </p>`;

  return {
    subject: "Réinitialisation de votre mot de passe 60jours",
    html: layout(inner),
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Réponse générique définie en avance : TOUJOURS renvoyée (anti-énumération).
  const success = new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const reqBody = await req.json().catch(() => ({}));
    const email = typeof reqBody.email === "string" ? reqBody.email.trim() : "";
    if (!email) return success;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const appUrl = Deno.env.get("APP_URL") || "https://60jours.com";
    const redirectTo = `${appUrl}/reset-password`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Si generateLink échoue (email inexistant ou autre), absorber silencieusement.
    if (linkError || !linkData) {
      console.log(`[reset-password] generateLink echec ou compte inexistant (anti-enum, aucune info revelee).`);
      return success;
    }

    const actionLink = (linkData as any).properties?.action_link as string | undefined;
    if (!actionLink) return success;

    const brevoKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoKey) {
      console.log(`[reset-password][mode=log] to=${email} subject="Réinitialisation de votre mot de passe 60jours"`);
      return success;
    }

    // Encoder l'action_link en base64url pour le passer via la page intermediaire
    // /reinitialisation, qui protege le lien a usage unique contre les scanners d'emails.
    const encodedToken = btoa(actionLink).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const emailLink = `${appUrl}/reinitialisation?token=${encodedToken}`;
    const { subject, html } = renderEmail(emailLink);
    const fromEmail = Deno.env.get("EMAIL_FROM") || FROM_EMAIL_FALLBACK;
    const replyToEmail = Deno.env.get("EMAIL_REPLY_TO") || REPLY_TO_EMAIL_FALLBACK;

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: FROM_NAME },
        to: [{ email }],
        replyTo: { email: replyToEmail, name: FROM_NAME },
        subject,
        htmlContent: html,
      }),
    }).catch((err: unknown) => {
      console.error("[reset-password] echec envoi Brevo:", err instanceof Error ? err.message : String(err));
    });

    console.log(`[reset-password][mode=send] to=${email} envoye.`);
  } catch (err: unknown) {
    // Anti-énumération : absorber toutes les erreurs sans rien révéler.
    console.error("[reset-password] erreur:", err instanceof Error ? err.message : String(err));
  }

  return success;
});
