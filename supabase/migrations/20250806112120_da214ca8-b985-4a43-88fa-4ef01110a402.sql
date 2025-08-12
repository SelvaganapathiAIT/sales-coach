-- Create table for email conversations
CREATE TABLE public.email_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_name TEXT NOT NULL,
  coach_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  email_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for email conversations
CREATE POLICY "Users can view their own email conversations" 
ON public.email_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email conversations" 
ON public.email_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_email_conversations_user_id ON public.email_conversations(user_id);
CREATE INDEX idx_email_conversations_sent_at ON public.email_conversations(sent_at);