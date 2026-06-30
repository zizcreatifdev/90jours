-- ============================================================
-- A coller dans le SQL Editor de votre projet Supabase.
-- Migration : student_initiate_messages
-- Permet a l'etudiant d'initier un message vers son formateur.
-- Date      : 2026-06-30
-- ============================================================

BEGIN;

-- La politique existante "Students can reply to messages" impose parent_id IS NOT NULL,
-- ce qui bloque les messages de premier niveau (parent_id IS NULL).
-- Cette nouvelle politique autorise l'etudiant a creer un message de premier niveau
-- a condition d'adresser le message a un destinataire precis (recipient_id IS NOT NULL).

CREATE POLICY "Students can initiate messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    parent_id IS NULL
    AND auth.uid() = sender_id
    AND recipient_id IS NOT NULL
  );

COMMIT;
