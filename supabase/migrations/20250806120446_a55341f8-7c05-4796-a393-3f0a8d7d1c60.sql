-- Check if profile-photos bucket exists and create policies
DO $$
BEGIN
    -- Create profile-photos bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('profile-photos', 'profile-photos', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Create storage policies for profile photos
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their profile photos" ON storage.objects;

create policy "Anyone can view profile photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-photos');

create policy "Users can upload profile photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-photos');

create policy "Users can update their profile photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-photos');

create policy "Users can delete their profile photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-photos');