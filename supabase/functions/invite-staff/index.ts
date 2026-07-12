import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://60jours.com",
  "https://www.60jours.com",
  "https://60jours.vercel.app",
  "http://localhost:8080",
];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is a super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .single();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Accès réservé aux super admins" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { email, formation_id, first_name, last_name } = body;
    // role param réservé pour le futur rôle assistant (DB enum non encore étendu)
    const assignedRole = "staff";

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get formation name for audit log (only if formation_id provided)
    let formationName = "";
    if (formation_id) {
      const { data: formation } = await supabaseAdmin
        .from("formations")
        .select("name")
        .eq("id", formation_id)
        .single();
      formationName = formation?.name || "";
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;
    let emailSent = false;
    let emailError: string | undefined;

    console.log(`[invite-staff] traitement email=${email} existingUser=${!!existingUser}`);

    if (existingUser) {
      userId = existingUser.id;

      // Check if user already has the assigned role
      const { data: existingAssignedRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", assignedRole)
        .maybeSingle();

      if (!existingAssignedRole) {
        // Add role (keep existing student role)
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: assignedRole });
        console.log(`[invite-staff] role ${assignedRole} attribue a user existant ${userId}`);
      } else {
        console.log(`[invite-staff] user existant ${userId} a deja le role ${assignedRole}`);
      }
    } else {
      // Nouveau compte : générer le lien d'invitation sans envoyer d'email natif Supabase
      // redirectTo fixe via APP_URL (variable d'env provisionnee) plutot que l'origin de
      // la requete, qui peut etre absent ou incorrect selon le contexte d'appel.
      const appUrl = Deno.env.get("APP_URL") || "https://60jours.com";
      const { data: linkData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { first_name: first_name || "", last_name: last_name || "" },
          redirectTo: `${appUrl}/setup-account`,
        },
      });

      if (inviteError || !linkData) {
        return new Response(
          JSON.stringify({ error: inviteError?.message ?? "Erreur lors de la création de l'invitation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = linkData.user.id;
      console.log(`[invite-staff] nouveau user cree id=${userId}`);

      // Attribuer le rôle avant l'envoi de l'email
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: assignedRole });
      console.log(`[invite-staff] role ${assignedRole} attribue`);

      // Envoyer l'email via fetch direct avec Authorization: Bearer <SERVICE_ROLE_KEY>.
      // fetch direct garantit que le header est transmis, contrairement a functions.invoke
      // qui peut ne pas propager la service_role key selon la version de supabase-js.
      // L'action_link ne doit JAMAIS être renvoyé dans la réponse HTTP au client.
      const actionLink = (linkData as any).properties?.action_link ?? "";
      console.log(`[invite-staff] envoi email a ${email} action_link_present=${!!actionLink}`);
      // La page /invitation est une page intermediaire qui protege l'action_link a usage
      // unique contre les scanners d'emails (Outlook SafeLinks, Gmail, etc.) qui pre-visitent
      // les liens et consommeraient le token avant le clic humain.
      // L'action_link est encode en base64url pour le passer en query param sans alteration.
      // La page /invitation ne consomme PAS le lien (juste du HTML) ; seul le clic humain
      // sur le bouton declenche window.location.href = actionLink (dechiffre cote client).
      const encodedToken = btoa(actionLink).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const invitationPageUrl = `${appUrl}/invitation?token=${encodedToken}`;
      try {
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
          },
          body: JSON.stringify({
            to: email,
            template: "staff_invite",
            variables: {
              prenom: first_name || "",
              nom: last_name || "",
              action_link: invitationPageUrl,
            },
          }),
        });
        const sendBody = await sendRes.json().catch(() => ({})) as Record<string, unknown>;
        console.log(`[invite-staff] send-email status=${sendRes.status} body=${JSON.stringify(sendBody)}`);
        if (sendRes.ok && sendBody?.ok === true && sendBody?.mode !== "log") {
          emailSent = true;
        } else {
          emailError = sendBody?.error as string | undefined
            ?? (sendBody?.mode === "log" ? "BREVO_API_KEY non configure" : `HTTP ${sendRes.status}`);
          console.error(`[invite-staff] email non envoye : ${emailError}`);
        }
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error(`[invite-staff] echec fetch send-email: ${emailError}`);
      }
      // L'invitation est considérée réussie même si l'email échoue.
    }

    // Link staff to formation only if formation_id provided
    if (formation_id) {
      const { error: linkError } = await supabaseAdmin
        .from("staff_formations")
        .upsert({ user_id: userId, formation_id }, { onConflict: "user_id,formation_id" });

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      performed_by: caller.id,
      action: existingUser ? "staff_assigned" : "staff_invited",
      target_user_id: userId,
      details: {
        email,
        first_name: first_name || "",
        last_name: last_name || "",
        formation_name: formationName,
        formation_id: formation_id || null,
      },
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId, is_new: !existingUser, email_sent: emailSent, email_error: emailError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
