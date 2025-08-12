import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Mic, Settings, User, CheckCircle, Upload, Clock, Phone, Mail, Users, Crown, TrendingUp, FileText, Database, Play, Pause, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EmailComposer } from "@/components/EmailComposer";
import { SendRobertWelcome } from "@/components/SendRobertWelcome";

const CoachSettings = () => {
  const { toast } = useToast();
  const [coachName, setCoachName] = useState("Bobby Hartline");
  const [coachingStyle, setCoachingStyle] = useState("supportive");
  const [industry, setIndustry] = useState("saas");
  const [methodology, setMethodology] = useState("challenger");
  const [voiceId, setVoiceId] = useState("9BWtsMINqrJLrRacOk9x");
  const [voiceGender, setVoiceGender] = useState("all");
  const [salesRoastLevel, setSalesRoastLevel] = useState([3]); // Scale 1-5
  const [customInstructions, setCustomInstructions] = useState("");
  const [firstMessage, setFirstMessage] = useState("Hello! I'm your AI sales coach. Ready to improve your sales performance?");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  const [coachImageUrl, setCoachImageUrl] = useState("");
  
  
  // Work Schedule Settings
  const [workDays, setWorkDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false, // Default off
    sunday: false,   // Default off
  });
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [enableSchedule, setEnableSchedule] = useState(true);
  
  // Coach Contact Info
  const [coachPhone, setCoachPhone] = useState("+1 (555) 123-4567");
  
  // Company Leaders Integration
  const [enableLeadershipReports, setEnableLeadershipReports] = useState(false);
  const [ceoEmail, setCeoEmail] = useState("");
  const [salesDirectorEmail, setSalesDirectorEmail] = useState("");
  const [reportFrequency, setReportFrequency] = useState("weekly");
  const [reportingEnabled, setReportingEnabled] = useState(false);
  
  
  // Available ElevenLabs voices
  const availableVoices = [
    { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", gender: "female" },
    { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female" },
    { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female" },
    { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male" },
    { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male" },
    { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "male" },
    { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "neutral" },
    { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male" },
    { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", gender: "female" },
    { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "female" },
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female" },
    { id: "bIHbv24MWmeRgasZH58o", name: "Will", gender: "male" },
    { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female" },
    { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male" },
    { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "male" },
    { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male" },
    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female" },
    { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", gender: "male" }
  ];

  // CRM Connection Status
  const [isCRMConnected, setIsCRMConnected] = useState(false);

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('coachSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        console.log('Loading saved coach settings:', settings);
        
        // Load all the coach settings
        if (settings.coachName) setCoachName(settings.coachName);
        if (settings.coachingStyle) setCoachingStyle(settings.coachingStyle);
        if (settings.customInstructions !== undefined) setCustomInstructions(settings.customInstructions);
        if (settings.firstMessage) setFirstMessage(settings.firstMessage);
        if (settings.industry) setIndustry(settings.industry);
        if (settings.methodology) setMethodology(settings.methodology);
        if (settings.voiceId) setVoiceId(settings.voiceId);
        if (settings.voiceGender) setVoiceGender(settings.voiceGender);
        
        // Convert roasting level string back to number for slider
        if (settings.roastingLevel) {
          const levelMap = { 'low': 1, 'medium': 3, 'high': 4, 'maximum': 5 };
          setSalesRoastLevel([levelMap[settings.roastingLevel] || 3]);
        }
        
        // Load work schedule if present
        if (settings.workSchedule) {
          if (settings.workSchedule.workDays) setWorkDays(settings.workSchedule.workDays);
          if (settings.workSchedule.workStartTime) setWorkStartTime(settings.workSchedule.workStartTime);
          if (settings.workSchedule.workEndTime) setWorkEndTime(settings.workSchedule.workEndTime);
          if (settings.workSchedule.enableSchedule !== undefined) setEnableSchedule(settings.workSchedule.enableSchedule);
        }
        
        // Load contact info if present
        if (settings.contactInfo?.phone) setCoachPhone(settings.contactInfo.phone);
        if (settings.coachImageUrl) setCoachImageUrl(settings.coachImageUrl);
        
        
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    try {
      // Save coach configuration to localStorage for sync with chat
      const coachConfig = {
        coachName,
        coachingStyle,
        roastingLevel: convertRoastLevelToString(salesRoastLevel[0]),
        customInstructions,
        firstMessage,
        industry,
        methodology,
        voiceId,
        voiceGender,
        workSchedule: {
          workDays,
          workStartTime,
          workEndTime,
          enableSchedule
        },
        contactInfo: {
          phone: coachPhone
        },
        coachImageUrl
      };
      
      localStorage.setItem('coachSettings', JSON.stringify(coachConfig));
      console.log('Coach settings saved to localStorage:', coachConfig);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update ElevenLabs agent with custom instructions
      const { data, error } = await supabase.functions.invoke('update-agent-instructions', {
        body: {
          customInstructions,
          firstMessage,
          coachName,
          coachingStyle,
          roastingLevel: convertRoastLevelToString(salesRoastLevel[0]),
          intensityLevel: 'high', // Default for now
          performanceStandard: 'veteran', // Default for now
          voiceId: voiceId, // Add voice ID
          userId: user?.id
        }
      });

      if (error) {
        console.error('Error updating agent:', error);
        toast({
          title: "Error",
          description: "Failed to update coach instructions. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Agent updated successfully:', data);
      
      toast({
        title: "Settings Saved",
        description: `${coachName} has been updated with your custom instructions and coaching preferences.`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to convert roast level number to string
  const convertRoastLevelToString = (level: number): string => {
    switch (level) {
      case 1: return 'low';
      case 2: return 'medium';
      case 3: return 'medium';
      case 4: return 'high';
      case 5: return 'maximum';
      default: return 'medium';
    }
  };

  const handleCalendarConnect = () => {
    // TODO: Implement calendar OAuth
    setCalendarConnected(true);
    toast({
      title: "Calendar Connected",
      description: "Your coach can now see your availability and schedule around your meetings.",
    });
  };

  const handleEnableReporting = () => {
    setReportingEnabled(true);
    setEnableLeadershipReports(true);
    toast({
      title: "Leadership Reporting Enabled",
      description: "Your coach will now generate insights for company leadership.",
    });
  };


  const handleWorkDayToggle = (day: string) => {
    setWorkDays(prev => ({ ...prev, [day]: !prev[day as keyof typeof prev] }));
  };

  // Generate coach email based on name
  const generateCoachEmail = (name: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z\s]/g, '');
    const nameParts = cleanName.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]}.${nameParts[nameParts.length - 1]}@salescoaches.ai`;
    }
    return `${cleanName.replace(/\s+/g, '.')}@salescoaches.ai`;
  };

  // Filter voices based on selected gender
  const filteredVoices = voiceGender === "all" 
    ? availableVoices 
    : availableVoices.filter(voice => voice.gender === voiceGender);

  // Play voice sample
  const handlePlayVoiceSample = async (voiceIdToPlay: string, voiceName: string) => {
    try {
      setIsPlayingVoice(voiceIdToPlay);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: `Hello! I'm ${voiceName}, your AI sales coach. I'm here to help you improve your sales performance and achieve your goals.`,
          voice: voiceIdToPlay
        }
      });

      if (error) throw error;

      // Play the audio
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.onended = () => setIsPlayingVoice(null);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing voice sample:', error);
      setIsPlayingVoice(null);
      toast({
        title: "Error",
        description: "Failed to play voice sample. Please try again.",
        variant: "destructive",
      });
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
                Back to Chat
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Customize Your Coach</h1>
          </div>
          
          <Button onClick={handleSaveSettings} variant="default">
            Save Changes
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        
        {/* Coach Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Coach Identity
            </CardTitle>
            <CardDescription>
              Customize your AI coach's name and personality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coach Profile Image */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={coachImageUrl} />
                <AvatarFallback className="text-2xl">
                  {coachName.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <input
                  type="file"
                  id="coach-photo-upload"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        console.log('Starting file upload:', file.name, file.size);
                        
                        // Generate unique filename
                        const fileName = `coach-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        console.log('Generated filename:', fileName);
                        
                        // Upload to Supabase storage
                        const { data, error } = await supabase.storage
                          .from('profile-photos')
                          .upload(fileName, file, {
                            upsert: true,
                            contentType: file.type
                          });

                        console.log('Upload result:', { data, error });

                        if (error) {
                          console.error('Upload error details:', error);
                          throw error;
                        }

                        // Get public URL
                        const { data: urlData } = supabase.storage
                          .from('profile-photos')
                          .getPublicUrl(fileName);

                        console.log('Public URL generated:', urlData.publicUrl);
                        
                        if (urlData.publicUrl) {
                          setCoachImageUrl(urlData.publicUrl);
                          console.log('Coach image URL set to:', urlData.publicUrl);
                          
                          toast({
                            title: "Photo updated",
                            description: "Coach profile photo has been uploaded successfully.",
                          });
                        } else {
                          throw new Error('Failed to generate public URL');
                        }
                      } catch (error) {
                        console.error('Error uploading image:', error);
                        toast({
                          title: "Upload failed",
                          description: `Failed to upload profile photo: ${error.message}`,
                          variant: "destructive",
                        });
                        // Keep the blob URL as fallback for preview
                        if (file) {
                          const imageUrl = URL.createObjectURL(file);
                          setCoachImageUrl(imageUrl);
                        }
                      }
                    }
                  }}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => document.getElementById('coach-photo-upload')?.click()}
                  type="button"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coachName">Coach Name</Label>
                <Input
                  id="coachName"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Alex, Sarah, Mike..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="coachingStyle">Coaching Style</Label>
                <Select value={coachingStyle} onValueChange={setCoachingStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Supportive & Encouraging</SelectItem>
                    <SelectItem value="direct">Direct & Results-Focused</SelectItem>
                    <SelectItem value="motivational">High-Energy Motivational</SelectItem>
                    <SelectItem value="analytical">Data-Driven & Analytical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customInstructions">Custom Instructions</Label>
              <Textarea
                id="customInstructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add specific instructions for how your coach should behave..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="firstMessage">First Message</Label>
              <Textarea
                id="firstMessage"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="How your coach will greet users when they start a conversation..."
                className="min-h-[80px]"
              />
            </div>
            
            <Separator className="my-4" />
            
            {/* Sales Roast Level */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roastLevel">Sales Roast Level</Label>
                <div className="px-3">
                  <Slider
                    id="roastLevel"
                    min={1}
                    max={5}
                    step={1}
                    value={salesRoastLevel}
                    onValueChange={setSalesRoastLevel}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-3">
                  <span>Level 1</span>
                  <span>Level 2</span>
                  <span>Level 3</span>
                  <span>Level 4</span>
                  <span>Level 5</span>
                </div>
              </div>
              
              {/* All 5 Levels Display */}
              <div className="space-y-3">
                <div className="text-sm font-medium">Sales Roasting Levels:</div>
                <div className="grid gap-2">
                  {[
                    { level: 1, title: "Gentle Nudges", description: "Your coach will gently remind you about missed activities with encouragement.", color: "text-green-600" },
                    { level: 2, title: "Friendly Reminders", description: "Your coach will politely point out missed calls and emails with supportive suggestions.", color: "text-blue-600" },
                    { level: 3, title: "Direct Feedback", description: "Your coach will directly call out missed activities and hold you accountable.", color: "text-yellow-600" },
                    { level: 4, title: "Tough Love", description: "Your coach will aggressively challenge you on missed opportunities and lack of follow-up.", color: "text-orange-600" },
                    { level: 5, title: "Savage Roasting", description: "Your coach will ruthlessly roast you for every missed call, email, and follow-up. No mercy.", color: "text-red-600" }
                  ].map((item) => (
                    <div 
                      key={item.level}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        salesRoastLevel[0] === item.level 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">Level {item.level}:</span>
                        <span className={`text-sm font-medium ${item.color}`}>{item.title}</span>
                        {salesRoastLevel[0] === item.level && (
                          <Badge variant="default" className="text-xs">SELECTED</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {isCRMConnected 
                  ? "💡 Your coach tracks calls, emails, and follow-ups to keep you accountable for your sales activities"
                  : "💡 Your coach relies on self-reporting of sales activities to provide accountability and coaching"
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Specialization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Sales Specialization
            </CardTitle>
            <CardDescription>
              Configure your coach for your specific sales environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry Focus</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS & Technology</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="automotive">Automotive</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="financial">Financial Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="methodology">Sales Methodology</Label>
                <Select value={methodology} onValueChange={setMethodology}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="challenger">Challenger Sale</SelectItem>
                    <SelectItem value="spin">SPIN Selling</SelectItem>
                    <SelectItem value="meddic">MEDDIC</SelectItem>
                    <SelectItem value="sandler">Sandler</SelectItem>
                    <SelectItem value="solution">Solution Selling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coach Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Coach Contact Information
            </CardTitle>
            <CardDescription>
              Your coach's contact details for direct communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coachEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Coach Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="coachEmail"
                    value={generateCoachEmail(coachName)}
                    readOnly
                    className="bg-muted/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email automatically generated based on coach name
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="coachPhone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Coach Phone Number
                </Label>
                <Input
                  id="coachPhone"
                  type="tel"
                  value={coachPhone}
                  onChange={(e) => setCoachPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
                <p className="text-xs text-muted-foreground">
                  Direct line for urgent coaching needs
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Contact Preferences</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>📧 Email: Best for detailed coaching plans and follow-ups</div>
                <div>📞 Phone: Available during work hours for urgent sales situations</div>
                <div>💬 Chat: Real-time coaching through the platform (recommended)</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="text-sm font-medium">Send Coaching Emails</div>
              <p className="text-xs text-muted-foreground">
                Send personalized emails to people you're coaching using your AI coach's email address
              </p>
              <EmailComposer coachName={coachName} coachEmail={generateCoachEmail(coachName)} coachPhone={coachPhone} coachImageUrl={coachImageUrl} />
            </div>
          </CardContent>
        </Card>

        {/* Voice & Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Voice & Communication
            </CardTitle>
            <CardDescription>
              Customize how your coach communicates with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Voice Conversations</div>
                <div className="text-sm text-muted-foreground">
                  Enable voice-based coaching sessions
                </div>
              </div>
              <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
            </div>
            
            {voiceEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voiceGender">Voice Gender</Label>
                  <Select value={voiceGender} onValueChange={setVoiceGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Voices</SelectItem>
                      <SelectItem value="male">Male Voices</SelectItem>
                      <SelectItem value="female">Female Voices</SelectItem>
                      <SelectItem value="neutral">Neutral Voices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>Available Voices</Label>
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {filteredVoices.map((voice) => (
                      <div
                        key={voice.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-muted/50 ${
                          voiceId === voice.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted'
                        }`}
                        onClick={() => setVoiceId(voice.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{voice.name}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  voice.gender === 'male' ? 'text-blue-600 border-blue-200' :
                                  voice.gender === 'female' ? 'text-pink-600 border-pink-200' :
                                  'text-purple-600 border-purple-200'
                                }`}
                              >
                                {voice.gender}
                              </Badge>
                              {voiceId === voice.id && (
                                <Badge variant="default" className="text-xs">SELECTED</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVoiceSample(voice.id, voice.name);
                          }}
                          disabled={isPlayingVoice === voice.id}
                        >
                          {isPlayingVoice === voice.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click on a voice to select it, or click the play button to hear a sample.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your calendar so your coach can see your availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Google Calendar</div>
                <div className="text-sm text-muted-foreground">
                  Allow your coach to view your appointments and schedule coaching around meetings
                </div>
              </div>
              {calendarConnected ? (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Button onClick={handleCalendarConnect} variant="outline" size="sm">
                  Connect Calendar
                </Button>
              )}
            </div>
            
            {calendarConnected && (
              <div className="text-xs text-muted-foreground bg-success/5 p-3 rounded-md">
                ✓ Your coach can now see when you're in meetings and will avoid interrupting important calls.
                <br />
                ✓ Coaching sessions can be automatically scheduled around your availability.
              </div>
            )}
          </CardContent>
        </Card>


        {/* Work Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Work Schedule
            </CardTitle>
            <CardDescription>
              Set your availability so your coach knows when to contact you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Enable Schedule</div>
                <div className="text-sm text-muted-foreground">
                  Respect work hours for coaching interactions
                </div>
              </div>
              <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} />
            </div>
            
            {enableSchedule && (
              <div className="space-y-4">
                <Separator />
                
                {/* Work Days */}
                <div className="space-y-3">
                  <Label>Work Days</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { key: 'monday', label: 'Mon' },
                      { key: 'tuesday', label: 'Tue' },
                      { key: 'wednesday', label: 'Wed' },
                      { key: 'thursday', label: 'Thu' },
                      { key: 'friday', label: 'Fri' },
                      { key: 'saturday', label: 'Sat' },
                      { key: 'sunday', label: 'Sun' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <Button
                          variant={workDays[key as keyof typeof workDays] ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-12 text-xs"
                          onClick={() => handleWorkDayToggle(key)}
                        >
                          {workDays[key as keyof typeof workDays] ? '✓' : '—'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Work Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Schedule Summary */}
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-1">Your Coach Schedule</div>
                  <div className="text-xs text-muted-foreground">
                    Active: {Object.entries(workDays)
                      .filter(([_, active]) => active)
                      .map(([day, _]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
                      .join(', ')} from {workStartTime} to {workEndTime}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    🤫 Your coach will stay quiet outside these hours unless it's urgent
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Leadership Integration */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Connect with Company Leaders
                    <Crown className="w-4 h-4 text-primary" />
                  </CardTitle>
                  <CardDescription>
                    Enhanced reporting for C-suite executives on sales team performance and needs
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-primary text-primary">
                Premium Feature
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {!reportingEnabled ? (
              <div className="text-center space-y-4 py-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Executive Sales Intelligence</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Enable advanced reporting that provides C-suite executives with actionable insights on sales team performance, resource needs, and market opportunities.
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="text-center space-y-1">
                    <TrendingUp className="w-6 h-6 mx-auto text-primary" />
                    <div className="text-xs font-medium">Performance Analytics</div>
                  </div>
                  <div className="text-center space-y-1">
                    <FileText className="w-6 h-6 mx-auto text-primary" />
                    <div className="text-xs font-medium">Resource Reports</div>
                  </div>
                  <div className="text-center space-y-1">
                    <Users className="w-6 h-6 mx-auto text-primary" />
                    <div className="text-xs font-medium">Team Insights</div>
                  </div>
                </div>
                
                <Button onClick={handleEnableReporting} className="mt-4">
                  Enable Leadership Reports
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Leadership Reporting</div>
                    <div className="text-sm text-muted-foreground">
                      Generate executive insights and recommendations
                    </div>
                  </div>
                  <Switch checked={enableLeadershipReports} onCheckedChange={setEnableLeadershipReports} />
                </div>
                
                {enableLeadershipReports && (
                  <>
                    <Separator />
                    
                    {/* Executive Contacts */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="ceoEmail">CEO / Executive Email</Label>
                        <Input
                          id="ceoEmail"
                          type="email"
                          value={ceoEmail}
                          onChange={(e) => setCeoEmail(e.target.value)}
                          placeholder="ceo@company.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="salesDirectorEmail">Sales Director Email</Label>
                        <Input
                          id="salesDirectorEmail"
                          type="email"
                          value={salesDirectorEmail}
                          onChange={(e) => setSalesDirectorEmail(e.target.value)}
                          placeholder="sales.director@company.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reportFrequency">Report Frequency</Label>
                        <Select value={reportFrequency} onValueChange={setReportFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily Summary</SelectItem>
                            <SelectItem value="weekly">Weekly Report</SelectItem>
                            <SelectItem value="monthly">Monthly Analysis</SelectItem>
                            <SelectItem value="quarterly">Quarterly Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Report Configuration */}
                    <div className="space-y-3">
                      <Label>Report Contents</Label>
                      <div className="space-y-2">
                        {[
                          { id: 'performance', label: 'Sales Performance Metrics', desc: 'KPIs, conversion rates, pipeline health' },
                          { id: 'resources', label: 'Resource & Training Needs', desc: 'What tools/training sales team needs' },
                          { id: 'market', label: 'Market Intelligence', desc: 'Competitor insights and opportunities' },
                          { id: 'coaching', label: 'Coaching Effectiveness', desc: 'AI coaching impact and ROI' },
                          { id: 'recommendations', label: 'Strategic Recommendations', desc: 'Actionable C-suite insights' }
                        ].map(({ id, label, desc }) => (
                          <div key={id} className="flex items-start space-x-3 p-3 rounded-lg border">
                            <Switch defaultChecked className="mt-0.5" />
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{label}</div>
                              <div className="text-xs text-muted-foreground">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-success">Leadership Integration Active</div>
                          <div className="text-xs text-muted-foreground">
                            Your coach will analyze sales activities and generate executive reports with:
                          </div>
                          <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
                            <li>• Performance trends and bottlenecks</li>
                            <li>• Resource gaps affecting sales outcomes</li>
                            <li>• Coaching ROI and team development needs</li>
                            <li>• Strategic recommendations for growth</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Training Materials
            </CardTitle>
            <CardDescription>
              Upload company-specific sales materials to train your coach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files or click to browse
              </p>
              <Button variant="outline" size="sm">
                Upload Files
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, Word docs, PowerPoint, and text files. Max 10MB per file.
            </p>
          </CardContent>
        </Card>

        {/* Robert Welcome Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Customer Welcome Emails
            </CardTitle>
            <CardDescription>
              Send personalized welcome emails to new coaching clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendRobertWelcome />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CoachSettings;