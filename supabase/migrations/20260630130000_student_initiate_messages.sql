-- Migration: student_initiate_messages
-- Allows a student to start a new top-level message addressed to a specific recipient.
-- The existing "Students can reply to messages" policy only covers parent_id IS NOT NULL,
-- so students could not initiate conversations. This policy fills that gap.

CREATE POLICY "Students can initiate messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    parent_id IS NULL
    AND auth.uid() = sender_id
    AND recipient_id IS NOT NULL
  );
