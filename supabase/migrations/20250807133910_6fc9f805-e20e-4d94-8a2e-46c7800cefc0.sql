-- Fix conversation history table to allow proper upserts
-- First, check if the table exists and has the constraint
DO $$ 
BEGIN
    -- Drop the unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversation_history_user_agent_unique' 
        AND table_name = 'conversation_history'
    ) THEN
        ALTER TABLE conversation_history DROP CONSTRAINT conversation_history_user_agent_unique;
    END IF;
    
    -- Add the constraint as a primary key instead to support proper upserts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'PRIMARY KEY' 
        AND table_name = 'conversation_history'
    ) THEN
        ALTER TABLE conversation_history ADD PRIMARY KEY (user_id, agent_id);
    END IF;
END $$;