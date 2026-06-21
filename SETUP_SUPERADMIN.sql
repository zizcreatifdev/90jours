-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP_SUPERADMIN.sql — Attribuer le rôle super_admin à un compte existant
-- ═══════════════════════════════════════════════════════════════════════════
-- ORDRE D'EXÉCUTION (IMPORTANT) :
--   1. D'ABORD créer le compte, de l'une de ces deux façons :
--        a) via l'inscription normale de l'application (page /register), OU
--        b) via le dashboard Supabase : Authentication > Users > "Add user".
--      Dans les deux cas, l'entrée dans auth.users est créée, et le trigger
--      on_auth_user_created crée automatiquement la ligne dans public.profiles.
--   2. ENSUITE SEULEMENT, exécuter ce snippet (remplacer l'email ci-dessous).
--
-- Note : ne crée PAS d'utilisateur ni de mot de passe ici. On se contente
-- d'ajouter le rôle 'super_admin' à un user déjà existant, identifié par email.
-- Rejouable sans risque grâce à ON CONFLICT (user_id, role) DO NOTHING.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users AS u
WHERE u.email = 'REMPLACER_PAR_TON_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;

-- Vérification (optionnel) : lister les rôles du compte ciblé
-- SELECT u.email, r.role
-- FROM auth.users u
-- JOIN public.user_roles r ON r.user_id = u.id
-- WHERE u.email = 'REMPLACER_PAR_TON_EMAIL';
