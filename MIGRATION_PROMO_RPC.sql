-- ============================================================================
-- MIGRATION : RPC de validation et d'application des codes promo.
--
-- A coller dans le SQL Editor Supabase, exécuter en une fois.
--
-- Contexte : la table promo_codes n'est modifiable que par super_admin (RLS).
-- Pour qu'un étudiant puisse appliquer un code (incrément de current_uses +
-- trace dans promo_code_usage) sans lui donner de droit d'écriture direct, on
-- expose deux fonctions SECURITY DEFINER :
--   1. validate_promo_code : valide et retourne type/valeur (lecture seule).
--   2. apply_promo_code     : applique de façon atomique (incrément concurrent-safe
--                             borné par max_uses + insertion de l'usage).
--
-- La réduction porte sur les frais d'inscription, calculée côté front (etape 2/2) :
--   - percentage : inscription * (1 - discount_value / 100)
--   - fixed      : max(0, inscription - discount_value)
-- Les fonctions ne connaissent pas le montant, elles renvoient seulement
-- discount_type + discount_value.
--
-- Sécurité : search_path figé, vérification auth.uid(), EXECUTE révoqué de PUBLIC
-- puis accordé à authenticated uniquement.
-- ============================================================================

BEGIN;

-- ── 1. Validation (lecture seule) ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.validate_promo_code(text, uuid);

CREATE FUNCTION public.validate_promo_code(p_code text, p_cohort_id uuid DEFAULT NULL)
RETURNS TABLE (
  valid boolean,
  promo_code_id uuid,
  discount_type text,
  discount_value integer,
  message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.promo_codes%ROWTYPE;
BEGIN
  SELECT * INTO v
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::integer, 'Code inconnu.'::text;
    RETURN;
  END IF;

  IF v.is_active IS NOT TRUE THEN
    RETURN QUERY SELECT false, v.id, v.discount_type, v.discount_value, 'Ce code n''est plus actif.'::text;
    RETURN;
  END IF;

  IF v.early_bird_deadline IS NOT NULL AND v.early_bird_deadline < now() THEN
    RETURN QUERY SELECT false, v.id, v.discount_type, v.discount_value, 'Ce code a expiré.'::text;
    RETURN;
  END IF;

  IF v.max_uses IS NOT NULL AND v.current_uses >= v.max_uses THEN
    RETURN QUERY SELECT false, v.id, v.discount_type, v.discount_value, 'Ce code a atteint son nombre maximum d''utilisations.'::text;
    RETURN;
  END IF;

  IF v.cohort_id IS NOT NULL AND v.cohort_id IS DISTINCT FROM p_cohort_id THEN
    RETURN QUERY SELECT false, v.id, v.discount_type, v.discount_value, 'Ce code n''est pas valable pour cette cohorte.'::text;
    RETURN;
  END IF;

  -- Code valide
  RETURN QUERY SELECT true, v.id, v.discount_type, v.discount_value, NULL::text;
END;
$$;

-- ── 2. Application (atomique) ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.apply_promo_code(text, uuid, uuid, uuid);

CREATE FUNCTION public.apply_promo_code(
  p_code text,
  p_user_id uuid,
  p_payment_id uuid,
  p_cohort_id uuid DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_updated uuid;
BEGIN
  -- Sécurité : un étudiant ne peut appliquer un code que pour lui-même.
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, 'Action non autorisée.'::text;
    RETURN;
  END IF;

  SELECT id INTO v_id
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(p_code))
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, 'Code inconnu.'::text;
    RETURN;
  END IF;

  -- Incrément atomique : toutes les conditions sont dans le WHERE, donc deux
  -- applications concurrentes sont sérialisées par le verrou de ligne et la
  -- seconde échoue si max_uses serait dépassé (current_uses re-évalué a jour).
  UPDATE public.promo_codes
     SET current_uses = current_uses + 1,
         updated_at = now()
   WHERE id = v_id
     AND is_active = true
     AND (early_bird_deadline IS NULL OR early_bird_deadline > now())
     AND (max_uses IS NULL OR current_uses < max_uses)
     AND (cohort_id IS NULL OR cohort_id = p_cohort_id)
   RETURNING id INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN QUERY SELECT false, 'Ce code n''est plus valable (inactif, expiré, épuisé ou réservé à une autre cohorte).'::text;
    RETURN;
  END IF;

  -- Trace l'usage (lié au paiement déclaré)
  INSERT INTO public.promo_code_usage (promo_code_id, user_id, payment_id)
  VALUES (v_id, p_user_id, p_payment_id);

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ── 3. Permissions : EXECUTE réservé aux utilisateurs authentifiés ──────────
REVOKE ALL ON FUNCTION public.validate_promo_code(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_promo_code(text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_promo_code(text, uuid, uuid, uuid) TO authenticated;

COMMIT;
