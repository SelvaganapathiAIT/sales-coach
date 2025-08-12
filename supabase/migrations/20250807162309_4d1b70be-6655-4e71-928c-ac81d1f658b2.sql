-- Create unique constraint for conversation_history table to enable upserts
ALTER TABLE public.conversation_history 
ADD CONSTRAINT conversation_history_user_agent_unique 
UNIQUE (user_id, agent_id);