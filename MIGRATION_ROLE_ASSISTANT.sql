-- =============================================================================
-- MIGRATION ROLE ASSISTANT
-- =============================================================================
-- Ce fichier doit etre execute EN DEUX PARTIES distinctes.
-- PostgreSQL interdit d'utiliser une valeur d'enum ajoutee dans la meme
-- transaction que sa creation. Executer PARTIE 1 seule, valider, puis
-- executer PARTIE 2.
--
-- ETAPES :
--   1. Copier et executer UNIQUEMENT le bloc PARTIE 1 dans l'editeur SQL Supabase.
--   2. Attendre le message "Success" (ou verifier avec : SELECT enum_range(NULL::app_role);)
--   3. Copier et executer le bloc PARTIE 2 (toutes les policies) dans un nouveau onglet.
--
-- AUCUNE modification des policies existantes. Ajout uniquement.
-- Tables financieres exclues : payments, expenses, staff_payments, promo_codes,
-- promo_code_usage, accounting, audit_logs, site_settings.
-- =============================================================================

-- =========================================================
-- PARTIE 1 : Ajouter la valeur 'assistant' a l'enum app_role
-- Executer SEULE d'abord, dans sa propre transaction.
-- =========================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant';

-- Apres execution, verifier :
-- SELECT enum_range(NULL::app_role);
-- Resultat attendu : {super_admin,staff,student,assistant}


-- =========================================================
-- PARTIE 2 : Policies RLS pour le role assistant
-- Executer APRES que PARTIE 1 soit commitee (session separee).
-- =========================================================

-- ---------------------------------------------------------
-- profiles : assistant peut voir TOUS les profils (gestion operationnelle)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_all_profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- user_roles : assistant peut lire les roles (SELECT uniquement, pas de modification)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_user_roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- cohorts : assistant peut gerer toutes les cohortes (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_cohorts"
  ON public.cohorts FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- enrollments : assistant peut gerer toutes les inscriptions (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_enrollments"
  ON public.enrollments FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- formations : assistant peut voir toutes les formations, y compris inactives
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_all_formations"
  ON public.formations FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- resources : assistant peut gerer les ressources (ALL, comme staff)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_resources"
  ON public.resources FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- announcements : assistant peut gerer les annonces (ALL, comme staff)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_announcements"
  ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- briefs : assistant peut gerer les briefs (ALL, comme staff)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_briefs"
  ON public.briefs FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- brief_submissions : assistant peut voir toutes les soumissions + les corriger
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_all_submissions"
  ON public.brief_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

CREATE POLICY "assistant_can_update_submissions"
  ON public.brief_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'assistant'))
  WITH CHECK (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- portfolios : assistant peut voir tous les portfolios + les valider
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_all_portfolios"
  ON public.portfolios FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

CREATE POLICY "assistant_can_validate_portfolios"
  ON public.portfolios FOR UPDATE
  USING (public.has_role(auth.uid(), 'assistant'))
  WITH CHECK (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- brief_categories : assistant peut gerer les categories (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_categories"
  ON public.brief_categories FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- notifications : assistant peut voir toutes les notifs + en creer
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_notifications"
  ON public.notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

CREATE POLICY "assistant_can_insert_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- masterclass_sessions : assistant peut gerer completement (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_masterclass_sessions"
  ON public.masterclass_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- research_sessions : assistant peut gerer completement (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_research_sessions"
  ON public.research_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- messages : assistant peut voir tous les messages + en envoyer (comme staff)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_messages"
  ON public.messages FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

CREATE POLICY "assistant_can_send_messages"
  ON public.messages FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- staff_tasks : assistant peut gerer toutes les taches (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_tasks"
  ON public.staff_tasks FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- staff_task_comments : assistant peut gerer tous les commentaires (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_task_comments"
  ON public.staff_task_comments FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- attestations : assistant peut VOIR uniquement (SELECT, pas d'emission)
-- L'emission est reservee super_admin (cote front ET cote DB)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_attestations"
  ON public.attestations FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- student_contracts : assistant peut lire (SELECT uniquement)
-- Note : contract_templates a deja une policy "auth.uid() IS NOT NULL" qui couvre assistant
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_student_contracts"
  ON public.student_contracts FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- testimonials : assistant peut gerer les temoignages (ALL)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_manage_testimonials"
  ON public.testimonials FOR ALL
  USING (public.has_role(auth.uid(), 'assistant'))
  WITH CHECK (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- waitlist : assistant peut gerer la liste d'attente (SELECT + UPDATE + DELETE)
-- L'insertion publique est deja couverte par la policy existante
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_select_waitlist"
  ON public.waitlist FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

CREATE POLICY "assistant_can_update_waitlist"
  ON public.waitlist FOR UPDATE
  USING (public.has_role(auth.uid(), 'assistant'));

CREATE POLICY "assistant_can_delete_waitlist"
  ON public.waitlist FOR DELETE
  USING (public.has_role(auth.uid(), 'assistant'));

-- ---------------------------------------------------------
-- staff_formations : assistant peut voir les affectations (SELECT, lecture seule)
-- ---------------------------------------------------------
CREATE POLICY "assistant_can_view_staff_formations"
  ON public.staff_formations FOR SELECT
  USING (public.has_role(auth.uid(), 'assistant'));

-- =============================================================================
-- FIN DE LA MIGRATION
-- Tables financieres / sensibles : AUCUNE policy assistant ajoutee.
--   - payments        : super_admin only
--   - expenses        : super_admin only
--   - staff_payments  : super_admin only
--   - promo_codes     : super_admin only (gestion)
--   - promo_code_usage: super_admin only
--   - audit_logs      : super_admin only
--   - site_settings   : super_admin only (modification)
-- =============================================================================
