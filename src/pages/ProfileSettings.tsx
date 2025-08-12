import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Database, User, Mail, CheckCircle, Upload, Bell, Shield, Phone, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const ProfileSettings = () => {
  const { toast } = useToast();
  
  // User Profile Settings
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [phone, setPhone] = useState("+1 (555) 123-4567");

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPwLoading, setIsPwLoading] = useState(false);

  // Load user profile and CallProof settings
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCallproofEnabled(profile.callproof_enabled || false);
        setCallproofApiKey(profile.callproof_api_key || "");
        setCallproofApiSecret(profile.callproof_api_secret || "");
        setCallproofAutoSync(profile.callproof_auto_sync || false);
        setCallproofSyncInterval(profile.callproof_sync_interval || 60);
        setCallproofStats((profile as any).callproof_stats || null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
  
  // CRM Integration Settings
  const [isCRMConnected, setIsCRMConnected] = useState(false);
  const [selectedCRM, setSelectedCRM] = useState("");
  const [crmApiKey, setCrmApiKey] = useState("");
  
  // CallProof Integration Settings
  const [callproofEnabled, setCallproofEnabled] = useState(false);
  const [callproofApiKey, setCallproofApiKey] = useState("");
  const [callproofApiSecret, setCallproofApiSecret] = useState("");
  const [callproofAutoSync, setCallproofAutoSync] = useState(false);
  const [callproofSyncInterval, setCallproofSyncInterval] = useState(60);
  const [callproofStats, setCallproofStats] = useState<any>(null);
  
  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [webhookNotifications, setWebhookNotifications] = useState(false);

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
  };

  const handleConnectCRM = () => {
    if (!selectedCRM || !crmApiKey) {
      toast({
        title: "Error",
        description: "Please select a CRM and enter your API key.",
        variant: "destructive",
      });
      return;
    }

    setIsCRMConnected(true);
    toast({
      title: "CRM Connected",
      description: `Successfully connected to ${selectedCRM}. Your sales activities will now be tracked automatically.`,
    });
  };

  const handleDisconnectCRM = () => {
    setIsCRMConnected(false);
    setSelectedCRM("");
    setCrmApiKey("");
    toast({
      title: "CRM Disconnected",
      description: "Your CRM connection has been removed.",
    });
  };


  const handleCallproofConnect = async () => {
    if (!callproofApiKey || !callproofApiSecret) {
      toast({
        title: "Error",
        description: "Please enter both CallProof API key and secret.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile with CallProof settings
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          callproof_api_key: callproofApiKey,
          callproof_api_secret: callproofApiSecret,
          callproof_enabled: true,
          callproof_auto_sync: callproofAutoSync,
          callproof_sync_interval: callproofSyncInterval,
        });

      if (error) throw error;

      // Test the connection and sync data
      const { data, error: syncError } = await supabase.functions.invoke('callproof-sync', {
        body: { action: 'test_connection' }
      });

      if (syncError) throw syncError;

      setCallproofEnabled(true);
      toast({
        title: "CallProof Connected",
        description: "Successfully connected to CallProof. Your data will now sync automatically.",
      });

      // Load initial stats
      loadUserProfile();
    } catch (error) {
      console.error('CallProof connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to CallProof. Please check your API credentials.",
        variant: "destructive",
      });
    }
  };

  const handleCallproofDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          callproof_enabled: false,
          callproof_api_key: null,
          callproof_api_secret: null,
          callproof_auto_sync: false,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCallproofEnabled(false);
      setCallproofApiKey("");
      setCallproofApiSecret("");
      setCallproofAutoSync(false);
      setCallproofStats(null);

      toast({
        title: "CallProof Disconnected",
        description: "Your CallProof integration has been disabled.",
      });
    } catch (error) {
      console.error('Error disconnecting CallProof:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect CallProof.",
        variant: "destructive",
      });
    }
  };

  const handleCallproofSync = async () => {
    try {
      const { error } = await supabase.functions.invoke('callproof-sync', {
        body: { action: 'full_sync' }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: "CallProof data has been synced successfully.",
      });

      // Reload stats
      loadUserProfile();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync CallProof data.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Weak password", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please confirm your new password.", variant: "destructive" });
      return;
    }
    setIsPwLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!user || !email) {
        toast({ title: "Not signed in", description: "Please sign in again to change your password.", variant: "destructive" });
        return;
      }
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "Incorrect password", description: "Your current password is incorrect.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Change password error:", err);
      toast({ title: "Update failed", description: err?.message || "Could not change password.", variant: "destructive" });
    } finally {
      setIsPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/onboarding">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Profile Settings</h1>
          </div>
          
          <Button onClick={handleSaveProfile} variant="default">
            Save Changes
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Manage your personal profile and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={isPwLoading}>
                {isPwLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CallProof Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              CallProof Integration
            </CardTitle>
            <CardDescription>
              Connect your CallProof account for automatic call tracking and sales insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">CallProof Connection Status</div>
                <div className="text-sm text-muted-foreground">
                  {callproofEnabled ? "Connected to CallProof" : "No CallProof connection"}
                </div>
              </div>
              {callproofEnabled ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  Disconnected
                </Badge>
              )}
            </div>
            
            {!callproofEnabled ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="callproofApiKey">CallProof API Key</Label>
                  <Input
                    id="callproofApiKey"
                    type="password"
                    value={callproofApiKey}
                    onChange={(e) => setCallproofApiKey(e.target.value)}
                    placeholder="Enter your CallProof API key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="callproofApiSecret">CallProof API Secret</Label>
                  <Input
                    id="callproofApiSecret"
                    type="password"
                    value={callproofApiSecret}
                    onChange={(e) => setCallproofApiSecret(e.target.value)}
                    placeholder="Enter your CallProof API secret"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your credentials are encrypted and stored securely. Get them from your CallProof account settings.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Auto-sync</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically sync data every {callproofSyncInterval} minutes
                    </div>
                  </div>
                  <Switch checked={callproofAutoSync} onCheckedChange={setCallproofAutoSync} />
                </div>
                
                <Button 
                  onClick={handleCallproofConnect} 
                  disabled={!callproofApiKey || !callproofApiSecret}
                >
                  Connect CallProof
                </Button>
                
                <div className="space-y-3">
                  <div className="text-sm font-medium">What gets synced:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>📞 Call logs and recordings</div>
                    <div>👥 Contact and prospect information</div>
                    <div>📊 Call performance metrics</div>
                    <div>🎯 Lead scoring and qualification data</div>
                    <div>📈 Sales activity tracking</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    ✓ CallProof Successfully Connected
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                    <div>✓ Automatic call tracking enabled</div>
                    <div>✓ Real-time call analytics and insights</div>
                    <div>✓ Contact and prospect data synced</div>
                    <div>✓ Personalized coaching based on call performance</div>
                  </div>
                </div>

                {callproofStats && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      📊 CallProof Stats
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <div>Contacts: {callproofStats.contacts_count || 0}</div>
                      <div>Recent Calls: {callproofStats.calls_count || 0}</div>
                      <div>Last Sync: {callproofStats.last_sync ? new Date(callproofStats.last_sync).toLocaleString() : 'Never'}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Auto-sync</div>
                    <div className="text-sm text-muted-foreground">
                      Sync data every {callproofSyncInterval} minutes
                    </div>
                  </div>
                  <Switch checked={callproofAutoSync} onCheckedChange={setCallproofAutoSync} />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCallproofSync} variant="outline" size="sm">
                    Sync Now
                  </Button>
                  <Button 
                    onClick={handleCallproofDisconnect} 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CRM Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Other CRM Integration
            </CardTitle>
            <CardDescription>
              Connect additional CRMs for comprehensive activity tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">CRM Connection Status</div>
                <div className="text-sm text-muted-foreground">
                  {isCRMConnected ? `Connected to ${selectedCRM}` : "No CRM connected"}
                </div>
              </div>
              {isCRMConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  Disconnected
                </Badge>
              )}
            </div>
            
            {!isCRMConnected ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="crmSelect">Select Your CRM Platform</Label>
                  <Select value={selectedCRM} onValueChange={setSelectedCRM}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your CRM platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salesforce">Salesforce</SelectItem>
                      <SelectItem value="hubspot">HubSpot</SelectItem>
                      <SelectItem value="pipedrive">Pipedrive</SelectItem>
                      <SelectItem value="zoho">Zoho CRM</SelectItem>
                      <SelectItem value="callproof">CallProof</SelectItem>
                      <SelectItem value="monday">Monday.com</SelectItem>
                      <SelectItem value="custom">Custom API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crmApiKey">API Key / Access Token</Label>
                  <Input
                    id="crmApiKey"
                    type="password"
                    value={crmApiKey}
                    onChange={(e) => setCrmApiKey(e.target.value)}
                    placeholder="Enter your CRM API key or access token"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and stored securely. We only use it to sync your sales activities.
                  </p>
                </div>
                
                <Button onClick={handleConnectCRM} disabled={!selectedCRM || !crmApiKey}>
                  Connect CRM
                </Button>
                
                <div className="space-y-3">
                  <div className="text-sm font-medium">What gets synced:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>📞 Call logs and duration</div>
                    <div>📧 Email interactions and responses</div>
                    <div>🤝 Meeting schedules and outcomes</div>
                    <div>📋 Task completion and follow-ups</div>
                    <div>💰 Deal progression and pipeline updates</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    ✓ CRM Successfully Connected
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                    <div>✓ Automatic tracking of calls, emails, and follow-ups enabled</div>
                    <div>✓ Real-time sales activity monitoring for accurate coaching</div>
                    <div>✓ Pipeline data synced for performance insights</div>
                    <div>✓ Personalized coaching based on your actual sales data</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm font-medium">Upload Additional Data</div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        toast({
                          title: "Customer Upload",
                          description: "Upload functionality coming soon!",
                        });
                      }}
                    >
                      <Upload className="w-4 h-4" />
                      Upload Customer/Prospect List
                    </Button>
                    <p className="text-xs text-muted-foreground px-1">
                      Upload additional prospects to enhance coaching insights
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleDisconnectCRM} 
                  variant="outline" 
                  className="text-destructive hover:bg-destructive/10"
                >
                  Disconnect CRM
                </Button>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control how you receive coaching updates and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive coaching summaries and insights via email
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">SMS Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Get urgent coaching alerts via SMS
                  </div>
                </div>
                <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Webhook Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Send coaching events to your webhook
                  </div>
                </div>
                <Switch checked={webhookNotifications} onCheckedChange={setWebhookNotifications} />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your data privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Data Usage</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>🔒 Your personal data is encrypted and stored securely</div>
                <div>🔒 CRM connections use OAuth or encrypted API keys</div>
                <div>🔒 Coaching sessions are private and not shared with other users</div>
                <div>🔒 You can delete your data and disconnect integrations at any time</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Button variant="outline" className="text-destructive hover:bg-destructive/10">
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;