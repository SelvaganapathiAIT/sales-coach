-- Add admin select policy for email_conversations so admins can see all records
CREATE POLICY IF NOT EXISTS "Admins can view all email conversations"
ON public.email_conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));