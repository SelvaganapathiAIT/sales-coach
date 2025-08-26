-- Create a table to store CRM connections for all supported CRMs
CREATE TABLE IF NOT EXISTS  public.crm_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crm_type TEXT NOT NULL, -- 'callproof', 'hubspot', 'salesforce', 'pipedrive', etc.
  crm_name TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT, -- For CRMs that need it (like CallProof)
  instance_url TEXT, -- For CRMs that need it (like Salesforce)
  additional_config JSONB, -- For any additional configuration data
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one active connection per CRM type per user
  UNIQUE(user_id, crm_type)
);

-- Enable Row Level Security
ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;
-- Create policies for CRM connections
DROP POLICY IF EXISTS "Users can view their own CRM connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Users can create their own CRM connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Users can update their own CRM connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Users can delete their own CRM connections" ON public.crm_connections;


-- Create policies for user access
create policy "Users can view their own CRM connections" 
ON public.crm_connections 
FOR SELECT 
USING (auth.uid() = user_id);

create policy "Users can create their own CRM connections" 
ON public.crm_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

create policy "Users can update their own CRM connections" 
ON public.crm_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

create policy "Users can delete their own CRM connections" 
ON public.crm_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_crm_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crm_connections_updated_at
BEFORE UPDATE ON public.crm_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_crm_connections_updated_at();

-- Create index for better performance
CREATE INDEX idx_crm_connections_user_type ON public.crm_connections(user_id, crm_type);