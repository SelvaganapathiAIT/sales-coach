-- Add admin select policy for email_conversations so admins can see all records
drop policy if exists "Admins can view all email conversations" on public.email_conversations;
create policy "Admins can view all email conversations"
ON public.email_conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));