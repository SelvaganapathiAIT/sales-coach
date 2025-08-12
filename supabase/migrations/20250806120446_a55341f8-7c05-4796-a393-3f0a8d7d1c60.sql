-- Check if profile-photos bucket exists and create policies
DO $$
BEGIN
    -- Create profile-photos bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('profile-photos', 'profile-photos', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Create storage policies for profile photos
CREATE POLICY "Anyone can view profile photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload profile photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Users can update their profile photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can delete their profile photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-photos');