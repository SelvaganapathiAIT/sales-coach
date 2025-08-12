-- Add unique constraint for conversation_history table to support ON CONFLICT
ALTER TABLE conversation_history 
ADD CONSTRAINT conversation_history_user_agent_unique 
UNIQUE (user_id, agent_id);

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_agent 
ON conversation_history(user_id, agent_id);