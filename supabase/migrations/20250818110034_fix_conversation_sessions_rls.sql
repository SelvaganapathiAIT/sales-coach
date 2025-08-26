
-- Add soft delete columns to conversation_sessions and conversation_messages
-- Run this script in your Supabase SQL Editor

-- Add deleted_at column to conversation_sessions
ALTER TABLE public.conversation_sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_at column to conversation_messages
ALTER TABLE public.conversation_messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_deleted_at 
ON public.conversation_sessions(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_deleted_at 
ON public.conversation_messages(deleted_at) 
WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.conversation_sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.conversation_sessions 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.conversation_messages;
CREATE POLICY "Users can view messages from their sessions" 
ON public.conversation_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversation_sessions 
  WHERE id = conversation_messages.session_id 
  AND user_id = auth.uid()
  AND deleted_at IS NULL
) AND conversation_messages.deleted_at IS NULL);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_sessions' 
AND column_name = 'deleted_at';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_messages' 
AND column_name = 'deleted_at';

-- Fix RLS policies for conversation_sessions to allow soft deletes
-- Migration: Fix conversation_sessions RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.conversation_sessions;

-- Recreate the update policy to allow soft deletes
CREATE POLICY "Users can update their own sessions"
ON public.conversation_sessions
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add a DELETE policy for hard deletes (fallback)
CREATE POLICY "Users can delete their own sessions"
ON public.conversation_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Update the view policy to be more explicit about soft deletes
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.conversation_sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.conversation_sessions 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

ALTER TABLE conversation_history
DROP CONSTRAINT IF EXISTS conversation_history_user_unique;