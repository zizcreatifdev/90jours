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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get target user info for audit log (before deletion)
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user_id)
      .single();

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id);

    // Step 1 : child tables (attestation_actions before attestations)
    await supabaseAdmin.from("attestation_actions").delete().eq("user_id", user_id);
    await supabaseAdmin.from("attestations").delete().eq("user_id", user_id);

    // Staff tasks : comments first, then tasks
    await supabaseAdmin.from("staff_task_comments").delete().eq("author_id", user_id);
    await supabaseAdmin.from("staff_tasks").delete().eq("assigned_to", user_id);

    // Step 2 : independent data tables
    await supabaseAdmin.from("brief_submissions").delete().eq("user_id", user_id);
    await supabaseAdmin.from("portfolios").delete().eq("user_id", user_id);
    await supabaseAdmin.from("payments").delete().eq("user_id", user_id);
    await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", user_id);
    await supabaseAdmin.from("promo_code_usage").delete().eq("user_id", user_id);
    await supabaseAdmin.from("seen_announcements").delete().eq("user_id", user_id);

    // Messages : supprimer d'abord les replies dont le parent appartient a cet utilisateur
    // (parent_id FK), puis les messages dont il est expediteur ou destinataire.
    const { data: sentMessages } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("sender_id", user_id);
    if (sentMessages && sentMessages.length > 0) {
      const sentIds = sentMessages.map((m: any) => m.id);
      await supabaseAdmin.from("messages").delete().in("parent_id", sentIds);
    }
    await supabaseAdmin.from("messages").delete().eq("sender_id", user_id);
    await supabaseAdmin.from("messages").delete().eq("recipient_id", user_id);

    await supabaseAdmin.from("staff_payments").delete().eq("staff_user_id", user_id);

    // Step 3 : nullify FK references that are not CASCADE (resources.uploaded_by, announcements.author_id)
    await supabaseAdmin.from("resources").update({ uploaded_by: null }).eq("uploaded_by", user_id);
    await supabaseAdmin.from("announcements").update({ author_id: null }).eq("author_id", user_id);

    // Step 4 : profile-level data (already handled previously, preserved order)
    await supabaseAdmin.from("staff_formations").delete().eq("user_id", user_id);
    await supabaseAdmin.from("notifications").delete().eq("user_id", user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);

    // Step 5 : delete auth user (CASCADE handles enrollments, student_badges, student_contracts, personal_events)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 6 : audit log (target_user_id is now gone from auth, but UUID is still valid as a record)
    await supabaseAdmin.from("audit_logs").insert({
      performed_by: caller.id,
      action: "user_deleted",
      target_user_id: user_id,
      details: {
        first_name: targetProfile?.first_name || "",
        last_name: targetProfile?.last_name || "",
        roles: (targetRoles || []).map((r: any) => r.role),
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
