/**
 * send-email : Edge Function generique et reutilisable.
 *
 * Entree (POST JSON) : { to, template, variables }
 *   - to        : adresse du destinataire (string) OU { email, name }
 *   - template  : identifiant de template (ex "welcome")
 *   - variables : donnees pour remplir le template (Record<string, string>)
 *
 * Securite : deux chemins d'autorisation.
 *   1. Appel interne (edge function serveur) : Authorization = Bearer <SERVICE_ROLE_KEY>.
 *      La service_role key n'est jamais exposee au navigateur. Autorise a envoyer
 *      a n'importe quel destinataire valide sans verification JWT utilisateur.
 *      Utilisé par : invite-staff, reset-password, brief-reminders, payment-reminders.
 *   2. Appel front (navigateur) : Authorization = Bearer <JWT utilisateur>.
 *      Auto-envoi (isSelf) : tout utilisateur authentifie.
 *      Envoi a un tiers : reserve aux admin/super_admin.
 *      La verification est faite par le serveur Supabase (signature JWT verifiee),
 *      pas par simple decodage de payload.
 * Un appel avec un JWT utilisateur non admin ciblant une adresse tierce recoit 403.
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

// Palette 60jours (couleurs en dur, email ne supporte pas les CSS vars).
const NIGHT = "#001D52";      // bleu nuit : header, footer, accents forts
const GOLD = "#C5A05A";       // dore : filet, bouton, badge, liens footer
const CREAM = "#F3EFE2";      // creme : fond page et encadres
const BROWN = "#2E2212";      // brun chaud : titres h1, texte bouton
const BODY_TEXT = "#4a4436";  // texte principal corps
const MUTED = "#8B8070";      // texte secondaire et footer

interface SendEmailPayload {
  to?: string | { email: string; name?: string };
  to_user_id?: string;
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
 * Layout commun 60jours.
 * En-tete bleu nuit + logo centre + filet dore 3px + corps + footer bleu nuit.
 * Compatible Gmail, Outlook, Apple Mail : tableaux role=presentation, CSS inline, largeurs fixes.
 */
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

/** Bouton CTA dore, texte brun fonce (contraste WCAG), coins 9px. */
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

/** Encadre creme pour informations secondaires (usage unique, securite, etc.). */
const infoBox = (html: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 0;">
  <tr>
    <td style="background-color:${CREAM};border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">${html}</p>
    </td>
  </tr>
</table>`;

/** Badge court en majuscules dore, centre, au-dessus du titre. */
const badge = (text: string): string =>
  `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:3px;color:${GOLD};text-align:center;">${text}</p>`;

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
      ${badge("BIENVENUE")}
      <h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;font-weight:bold;color:${BROWN};text-align:center;">
        Bienvenue chez 60jours
      </h1>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        ${greeting}
      </p>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        Nous sommes ravis de vous compter parmi nous. Votre inscription &#224;
        <strong style="color:${NIGHT};">${formation}</strong> est bien enregistr&#233;e.
      </p>
      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        Prochaine &#233;tape : finalisez votre paiement depuis votre espace &#233;tudiant pour confirmer votre place.
      </p>
      ${ctaButton("Accéder à mon espace", link)}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
        <a href="${esc(link)}" target="_blank" style="color:${GOLD};text-decoration:underline;">${esc(link)}</a>
      </p>`;

    return { subject: "Bienvenue chez 60jours", html: layout(inner) };
  },

  attestation_ready: (vars, appUrl) => {
    const prenom = esc(vars.prenom || "");
    const nom = esc(vars.nom || "");
    const formationRaw = vars.formation || "";
    const formation = esc(formationRaw);
    const link = vars.link || `${appUrl}/student`;
    const greeting = prenom ? `Bonjour ${prenom}${nom ? " " + nom : ""},` : "Bonjour,";
    const subject = formationRaw
      ? `Votre attestation est disponible - ${formationRaw}`
      : "Votre attestation est disponible";

    const inner = `
      ${badge("ATTESTATION")}
      <h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;font-weight:bold;color:${BROWN};text-align:center;">
        Votre attestation est pr&#234;te
      </h1>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        ${greeting}
      </p>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        F&#233;licitations ! Votre attestation de r&#233;ussite${formation ? ` pour la formation <strong style="color:${NIGHT};">${formation}</strong>` : ""} vient d&#39;&#234;tre d&#233;livr&#233;e.
      </p>
      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        Vous pouvez la consulter et la t&#233;l&#233;charger depuis votre espace &#233;tudiant.
      </p>
      ${ctaButton("Voir mon attestation", link)}
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
        <a href="${esc(link)}" target="_blank" style="color:${GOLD};text-decoration:underline;">${esc(link)}</a>
      </p>`;

    return { subject, html: layout(inner) };
  },

  staff_invite: (vars, _appUrl) => {
    const prenom = esc(vars.prenom || "");
    const nom = esc(vars.nom || "");
    const actionLink = vars.action_link || "";
    const greeting = prenom ? `Bonjour ${prenom}${nom ? " " + nom : ""},` : "Bonjour,";

    const inner = `
      ${badge("INVITATION")}
      <h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:32px;font-weight:bold;color:${BROWN};text-align:center;">
        Bienvenue dans l&#39;&#233;quipe
      </h1>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        ${greeting}
      </p>
      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BODY_TEXT};">
        Vous avez &#233;t&#233; invit&#233; &#224; rejoindre l&#39;&#233;quipe 60jours en tant que membre du staff.
        Cliquez sur le bouton ci-dessous pour configurer votre compte et acc&#233;der &#224; votre espace.
      </p>
      ${ctaButton("Configurer mon compte", actionLink)}
      ${infoBox("Ce lien d&#39;invitation est &#224; usage unique et expire dans 24 heures. Si vous n&#39;&#234;tes pas &#224; l&#39;origine de cette invitation, ignorez cet email.")}
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
        Si le bouton ne fonctionne pas, demandez &#224; votre administrateur de vous renvoyer une invitation.
      </p>`;

    return {
      subject: "Invitation à rejoindre l’équipe 60jours",
      html: layout(inner),
    };
  },

  password_reset: (vars, _appUrl) => {
    const link = vars.link || "";

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
      ${ctaButton("Réinitialiser mon mot de passe", link)}
      ${infoBox("Si vous n&#39;&#234;tes pas &#224; l&#39;origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifi&#233;.")}
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
        Si le bouton ne fonctionne pas, rendez-vous sur la page de connexion et cliquez sur
        &#171;&#160;Mot de passe oubli&#233;&#160;&#187; pour obtenir un nouveau lien.
      </p>`;

    return {
      subject: "Réinitialisation de votre mot de passe 60jours",
      html: layout(inner),
    };
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
    const { to, to_user_id, template, variables } = payload;

    if (!template || (!to && !to_user_id)) {
      return json({ ok: false, error: "Champs 'template' et ('to' ou 'to_user_id') requis." }, 400, corsHeaders);
    }

    const toEmail = to ? (typeof to === "string" ? to : to.email) : null;
    const toName = to ? (typeof to === "string" ? undefined : to.name) : undefined;
    if (!to_user_id && !toEmail) {
      return json({ ok: false, error: "Destinataire invalide." }, 400, corsHeaders);
    }

    // ── Securite : verification cote serveur de l'identite de l'appelant ──────
    const SUPABASE_URL_ENV = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY_ENV = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY_ENV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorizationHeader = req.headers.get("Authorization") ?? "";

    // Chemin interne : Authorization = Bearer <SERVICE_ROLE_KEY>.
    // La service_role key est reservee aux edge functions serveur ; un navigateur
    // ne peut jamais l'envoyer. Ce chemin bypasse la verification JWT utilisateur.
    const isInternalCall = !!SUPABASE_SERVICE_ROLE_KEY_ENV &&
      authorizationHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY_ENV}`;

    let recipientEmail: string;
    let recipientName: string | undefined;

    if (isInternalCall) {
      if (to_user_id) {
        const supabaseAdmin = createClient(SUPABASE_URL_ENV, SUPABASE_SERVICE_ROLE_KEY_ENV);
        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(to_user_id);
        if (!targetUser?.email) {
          return json({ ok: false, error: "Destinataire introuvable." }, 400, corsHeaders);
        }
        recipientEmail = targetUser.email;
      } else if (toEmail) {
        recipientEmail = toEmail;
        recipientName = toName;
      } else {
        return json({ ok: false, error: "Destinataire invalide." }, 400, corsHeaders);
      }
    } else {
      // Chemin front : JWT utilisateur obligatoire.
      // getUser() verifie la signature cote serveur (pas un decodage de payload).
      const supabaseClient = createClient(
        SUPABASE_URL_ENV,
        SUPABASE_ANON_KEY_ENV,
        { global: { headers: { Authorization: authorizationHeader } } },
      );
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();

      if (!authUser?.email) {
        return json({ ok: false, error: "Non autorisé." }, 401, corsHeaders);
      }

      const isSelf = !to_user_id && !!toEmail && toEmail.toLowerCase() === authUser.email.toLowerCase();

      if (!isSelf) {
        // Envoi a un tiers : verifie que l'appelant est admin ou super_admin.
        const supabaseAdmin = createClient(SUPABASE_URL_ENV, SUPABASE_SERVICE_ROLE_KEY_ENV);
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", authUser.id)
          .in("role", ["admin", "super_admin"])
          .maybeSingle();
        if (!roleRow) {
          return json({ ok: false, error: "Destinataire non autorisé." }, 403, corsHeaders);
        }
        if (to_user_id) {
          const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(to_user_id);
          if (!targetUser?.email) {
            return json({ ok: false, error: "Destinataire introuvable." }, 400, corsHeaders);
          }
          recipientEmail = targetUser.email;
        } else {
          recipientEmail = toEmail!;
          recipientName = toName;
        }
      } else {
        recipientEmail = toEmail!;
        recipientName = toName;
      }
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
