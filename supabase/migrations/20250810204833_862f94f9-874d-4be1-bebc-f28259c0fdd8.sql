-- Create admin SELECT policy for email_conversations
DROP POLICY IF EXISTS "Admins can view all email conversations" ON public.email_conversations;
CREATE POLICY "Admins can view all email conversations"
ON public.email_conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));