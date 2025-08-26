import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  role: string;
  salesDescription: string;
  profilePhotoUrl: string;
  default_coach_id?: string; // Optional for now, can be added later
}

interface ProfileEditorProps {
  onProfileSaved?: () => void;
}

const ProfileEditor = ({ onProfileSaved }: ProfileEditorProps) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    role: "",
    salesDescription: "",
    profilePhotoUrl: "",
    default_coach_id: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading profile:', error);
        return;
      }

      if (profileData) {
        setProfile({
          firstName: profileData.first_name || "",
          lastName: profileData.last_name || "",
          email: profileData.email || "",
          companyName: profileData.company_name || "",
          role: profileData.role || "",
          salesDescription: profileData.sales_description || "",
          profilePhotoUrl: profileData.profile_photo_url || "",
          default_coach_id: profileData.default_coach_id || ""
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload photos');
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Update the profile state with the new photo URL
      setProfile(prev => ({ ...prev, profilePhotoUrl: publicUrl }));
      
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to save your profile');
      }

      // Use the update-user-profile function for consistency
      const { data, error } = await supabase.functions.invoke('update-user-profile', {
        body: {
          userId: user.id,
          userName: `${profile.firstName} ${profile.lastName}`.trim() || user.email?.split('@')[0] || 'User',
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          companyName: profile.companyName,
          role: profile.role,
          salesDescription: profile.salesDescription,
          profilePhotoUrl: profile.profilePhotoUrl,
          coachId: profile.default_coach_id
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      });
      onProfileSaved?.();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Edit Your Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-y-auto">
        {/* Profile Photo Section */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.profilePhotoUrl} />
            <AvatarFallback className="text-2xl">
              {profile.firstName.charAt(0) || profile.lastName.charAt(0) || profile.companyName.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          
          <div className="relative">
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('photo-upload')?.click()}
              disabled={isUploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Change Photo"}
            </Button>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name</Label>
            <Input
              id="first-name"
              value={profile.firstName}
              onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter your first name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name</Label>
            <Input
              id="last-name"
              value={profile.lastName}
              onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter your last name"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email address (for CRM integration)"
          />
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={profile.companyName}
            onChange={(e) => setProfile(prev => ({ ...prev, companyName: e.target.value }))}
            placeholder="Enter your company name"
          />
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={profile.role} onValueChange={(value) => setProfile(prev => ({ ...prev, role: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salesperson">Salesperson</SelectItem>
              <SelectItem value="sales_management">Sales Management</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
              <SelectItem value="recruiter">Recruiter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sales Description */}
        <div className="space-y-2">
          <Label htmlFor="sales-description">What Do You Sell?</Label>
          <Textarea
            id="sales-description"
            value={profile.salesDescription}
            onChange={(e) => setProfile(prev => ({ ...prev, salesDescription: e.target.value }))}
            placeholder="Describe what you sell, your target market, and key value propositions..."
            rows={4}
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileEditor;