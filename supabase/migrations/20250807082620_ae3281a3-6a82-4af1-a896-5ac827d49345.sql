-- Create coach instructions table for email-based task management
CREATE TABLE public.coach_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  instructions TEXT NOT NULL,
  target_user_email TEXT,
  task_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  response_sent_at TIMESTAMP WITH TIME ZONE
);

-- Create accountability reports table
CREATE TABLE public.accountability_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instruction_id UUID REFERENCES public.coach_instructions(id),
  target_user_email TEXT NOT NULL,
  report_data JSONB,
  goals_analysis TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_coach_instructions_email ON public.coach_instructions(coach_email);
CREATE INDEX idx_coach_instructions_status ON public.coach_instructions(status);
CREATE INDEX idx_accountability_reports_user ON public.accountability_reports(target_user_email);

-- Enable RLS
ALTER TABLE public.coach_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for coach instructions (accessible by system)
CREATE POLICY "Coach instructions are accessible by system" 
ON public.coach_instructions 
FOR ALL 
USING (true);

-- RLS policies for accountability reports (accessible by system)  
CREATE POLICY "Accountability reports are accessible by system"
ON public.accountability_reports
FOR ALL
USING (true);

-- Add trigger for updating updated_at
CREATE TRIGGER update_coach_instructions_updated_at
BEFORE UPDATE ON public.coach_instructions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();