import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://60jours.vercel.app"];

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

    const { email, formation_id, first_name, last_name } = await req.json();

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

    if (existingUser) {
      userId = existingUser.id;

      // Check if user already has staff role
      const { data: existingStaffRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "staff")
        .maybeSingle();

      if (!existingStaffRole) {
        // Add staff role (keep existing student role)
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "staff" });
      }
    } else {
      // Invite new user via email
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: first_name || "",
          last_name: last_name || "",
        },
        redirectTo: `${req.headers.get("origin") || supabaseUrl.replace('.supabase.co', '.vercel.app')}/setup-account`,
      });

      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      userId = inviteData.user.id;

      // Add staff role (user already has student role from trigger)
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "staff" });
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
      JSON.stringify({ success: true, user_id: userId, is_new: !existingUser }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
