-- Create user profiles table
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

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

drop policy if exists "Users can view their own profile" 
ON public.profiles;

-- Create policies for profile access
create policy "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

drop policy if exists "Users can create their own profile"
ON public.profiles;

create policy "Users can create their own profile" 
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own profile"
ON public.profiles;

create policy  "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

drop policy if exists "Profile photos are publicly accessible" 
ON storage.objects ;
-- Create policies for profile photo uploads
create policy "Profile photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-photos');

drop policy if exists "Users can upload their own profile photo"
ON storage.objects;
create policy  "Users can upload their own profile photo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own profile photo" 
ON storage.objects;
create policy  "Users can update their own profile photo" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own profile photo" 
ON storage.objects;
create policy "Users can delete their own profile photo" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);