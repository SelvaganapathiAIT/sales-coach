-- Create conversation sessions table
CREATE TABLE public.conversation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_personality TEXT NOT NULL,
  session_title TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  session_summary TEXT,
  key_outcomes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation messages table
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create coaching notes table
CREATE TABLE public.coaching_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_personality TEXT NOT NULL,
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('observation', 'goal', 'challenge', 'progress', 'recommendation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user coaching context table
CREATE TABLE public.user_coaching_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sales_experience_level TEXT CHECK (sales_experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  primary_sales_challenges TEXT[],
  current_goals TEXT[],
  preferred_coaching_style TEXT,
  industry_focus TEXT,
  target_deal_size TEXT,
  sales_process_stage_focus TEXT[],
  communication_preferences JSONB DEFAULT '{}'::jsonb,
  coaching_history_summary TEXT,
  total_sessions INTEGER DEFAULT 0,
  last_session_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coaching_context ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversation_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.conversation_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.conversation_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.conversation_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for conversation_messages
CREATE POLICY "Users can view messages from their sessions" 
ON public.conversation_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.conversation_sessions 
  WHERE id = conversation_messages.session_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their sessions" 
ON public.conversation_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversation_sessions 
  WHERE id = conversation_messages.session_id 
  AND user_id = auth.uid()
));

-- Create RLS policies for coaching_notes
CREATE POLICY "Users can view their own coaching notes" 
ON public.coaching_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching notes" 
ON public.coaching_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching notes" 
ON public.coaching_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_coaching_context
CREATE POLICY "Users can view their own coaching context" 
ON public.user_coaching_context 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching context" 
ON public.user_coaching_context 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching context" 
ON public.user_coaching_context 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_conversation_sessions_user_id ON public.conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_started_at ON public.conversation_sessions(started_at);
CREATE INDEX idx_conversation_messages_session_id ON public.conversation_messages(session_id);
CREATE INDEX idx_conversation_messages_timestamp ON public.conversation_messages(timestamp);
CREATE INDEX idx_coaching_notes_user_id ON public.coaching_notes(user_id);
CREATE INDEX idx_coaching_notes_session_id ON public.coaching_notes(session_id);
CREATE INDEX idx_coaching_notes_note_type ON public.coaching_notes(note_type);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_conversation_sessions_updated_at
BEFORE UPDATE ON public.conversation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_notes_updated_at
BEFORE UPDATE ON public.coaching_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_coaching_context_updated_at
BEFORE UPDATE ON public.user_coaching_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user coaching history for AI context
CREATE OR REPLACE FUNCTION public.get_user_coaching_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'user_context', (
      SELECT to_jsonb(uc.*) 
      FROM public.user_coaching_context uc 
      WHERE uc.user_id = p_user_id
    ),
    'recent_sessions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'session_id', cs.id,
          'coach_personality', cs.coach_personality,
          'session_title', cs.session_title,
          'started_at', cs.started_at,
          'session_summary', cs.session_summary,
          'key_outcomes', cs.key_outcomes
        )
      )
      FROM public.conversation_sessions cs
      WHERE cs.user_id = p_user_id
      ORDER BY cs.started_at DESC
      LIMIT 5
    ),
    'active_notes', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'note_type', cn.note_type,
          'title', cn.title,
          'content', cn.content,
          'priority', cn.priority,
          'coach_personality', cn.coach_personality,
          'created_at', cn.created_at
        )
      )
      FROM public.coaching_notes cn
      WHERE cn.user_id = p_user_id 
      AND cn.is_active = true
      ORDER BY cn.created_at DESC
    ),
    'conversation_stats', (
      SELECT jsonb_build_object(
        'total_sessions', COUNT(DISTINCT cs.id),
        'total_messages', COUNT(cm.id),
        'recent_topics', array_agg(DISTINCT cs.session_title) FILTER (WHERE cs.session_title IS NOT NULL)
      )
      FROM public.conversation_sessions cs
      LEFT JOIN public.conversation_messages cm ON cs.id = cm.session_id
      WHERE cs.user_id = p_user_id
      AND cs.started_at > NOW() - INTERVAL '30 days'
    )
  );
$$;