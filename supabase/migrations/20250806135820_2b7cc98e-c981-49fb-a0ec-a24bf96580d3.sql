CREATE TABLE IF NOT EXISTS  public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  role TEXT CHECK (role IN ('salesperson', 'sales_management', 'ceo', 'recruiter')),
  sales_description TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Add CallProof configuration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN callproof_api_key text,
ADD COLUMN callproof_api_secret text,
ADD COLUMN callproof_enabled boolean DEFAULT false,
ADD COLUMN callproof_auto_sync boolean DEFAULT false,
ADD COLUMN callproof_sync_interval integer DEFAULT 60; -- minutes

-- Update the RLS policies to include the new CallProof fields
-- Policies already exist for profiles table, so new columns are automatically covered