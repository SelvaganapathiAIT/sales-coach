-- Add CallProof configuration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN callproof_api_key text,
ADD COLUMN callproof_api_secret text,
ADD COLUMN callproof_enabled boolean DEFAULT false,
ADD COLUMN callproof_auto_sync boolean DEFAULT false,
ADD COLUMN callproof_sync_interval integer DEFAULT 60; -- minutes

-- Update the RLS policies to include the new CallProof fields
-- Policies already exist for profiles table, so new columns are automatically covered