import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Building, Linkedin, Mail, Phone, User, Globe, Lock, Plus, X, Shield, Users, Settings, Camera, Upload, Target, Zap, Heart, TrendingUp, Flame, ChevronDown } from "lucide-react";
import { CoachInstructionsManager } from "@/components/CoachInstructionsManager";
import { EmailComposer } from "@/components/EmailComposer";
import { CoachWelcomeManager } from "@/components/CoachWelcomeManager";
import { Slider } from "@/components/ui/slider";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfilePhotoCropper from "@/components/ProfilePhotoCropper";

const CompanyCoach = () => {
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit');
  const incomingName = searchParams.get('name') || '';
  const incomingEmail = searchParams.get('email') || '';
  const incomingTitle = searchParams.get('title') || '';
  // Treat presence of coach-identifying params as edit mode, or explicit ?edit=
  const isEditing = !!editMode || !!incomingName || !!incomingEmail || !!incomingTitle;

  // Get coach data based on edit mode
  const getCoachData = () => {
    if (editMode === '0') {
      // Bobby Hartline data
      return {
        name: "Bobby Hartline",
        description: "Your personal AI sales coach for cold calling mastery and prospecting excellence",
        email: "bobby@salescoach.ai",
        phone: "(615) 845-6286",
        linkedinUrl: "",
        isPublic: true,
        allowedEmails: [],
        newEmail: "",
        permissions: "public",
        photoUrl: "/lovable-uploads/d9f95472-dc0b-4dd5-90af-1f2fdb49a565.png",
        coachingStyle: "direct",
        roastingLevel: "3",
        intensityLevel: "high",
        performanceStandard: "veteran",
        agentLanguage: "en",
        firstMessage: "Hey {name}! I'm Bobby, your sales coach. Ready to dominate those calls today?",
        systemPrompt: "You are Bobby Hartline, an experienced sales coach specializing in cold calling and prospecting. You have a direct, no-nonsense coaching style with high energy. Help sales reps improve their techniques, overcome objections, and close more deals. Be encouraging but firm when needed.",
        llmModel: "gpt-4.1-2025-04-14",
        temperature: "0.8",
        enableCRM: true,
        enableCalendar: false,
        enableEmail: true,
        enableTracking: true,
        enableEndCall: true,
        enableDetectLanguage: false,
        enableSkipTurn: true,
        enableTransferAgent: false,
        enableTransferNumber: true,
        enableKeypadTone: false,
        enableVoicemailDetection: true
      };
    } else if (editMode === '1') {
      // Jack Daly data
      return {
        name: "Jack Daly Sales Coach",
        description: "Specializes in cold calling and prospecting techniques based on Jack Daly's proven methodologies",
        email: "",
        phone: "",
        linkedinUrl: "",
        isPublic: false,
        allowedEmails: ["sarah@techcorp.com", "mike@salesboost.com"],
        newEmail: "",
        permissions: "team_only",
        photoUrl: "/src/assets/jack-daly.jpg",
        coachingStyle: "tough_love",
        roastingLevel: "4",
        intensityLevel: "maximum",
        performanceStandard: "elite",
        agentLanguage: "en",
        firstMessage: "Listen up {name}! I'm Jack Daly, and we're about to turn you into a sales machine. No excuses!",
        systemPrompt: "You are Jack Daly, a legendary sales trainer and coach known for tough love and high-performance standards. You push sales reps to their limits, demand excellence, and don't accept excuses. Your coaching is intense, direct, and focused on building sales champions through rigorous training and accountability.",
        llmModel: "gpt-4.1-2025-04-14",
        temperature: "0.7",
        enableCRM: true,
        enableCalendar: true,
        enableEmail: true,
        enableTracking: true,
        enableEndCall: true,
        enableDetectLanguage: true,
        enableSkipTurn: false,
        enableTransferAgent: true,
        enableTransferNumber: true,
        enableKeypadTone: true,
        enableVoicemailDetection: true
      };
    }
    // Default for new coach
    return {
      name: incomingName || "",
      description: incomingTitle ? `${incomingTitle} – customize this coach` : "",
      email: incomingEmail || "",
      phone: "",
      linkedinUrl: "",
      isPublic: true,
      allowedEmails: [],
      newEmail: "",
      permissions: "public",
      photoUrl: "",
      coachingStyle: "motivational",
      roastingLevel: "1",
      intensityLevel: "medium",
      performanceStandard: "beginner",
      agentLanguage: "en",
      firstMessage: "Hi {name}! I'm {coach_name}, your AI sales coach. Let's get started!",
      systemPrompt: "You are an experienced sales coach who helps sales reps improve their techniques, overcome objections, and close more deals. Be supportive, professional, and focus on actionable advice.",
      llmModel: "gpt-4.1-2025-04-14",
      temperature: "0.8",
      enableCRM: false,
      enableCalendar: false,
      enableEmail: false,
      enableTracking: false,
      enableEndCall: false,
      enableDetectLanguage: false,
      enableSkipTurn: false,
      enableTransferAgent: false,
      enableTransferNumber: false,
      enableKeypadTone: false,
      enableVoicemailDetection: false
    };
  };

  const [formData, setFormData] = useState(getCoachData());
  const { toast } = useToast();
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEmail = () => {
    if (formData.newEmail && !formData.allowedEmails.includes(formData.newEmail)) {
      setFormData(prev => ({
        ...prev,
        allowedEmails: [...prev.allowedEmails, prev.newEmail],
        newEmail: ""
      }));
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      allowedEmails: prev.allowedEmails.filter(email => email !== emailToRemove)
    }));
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const uploadPhotoIfNeeded = async (photoUrl?: string | null, coachName?: string) => {
    if (!photoUrl) return '';
    if (!photoUrl.startsWith('data:')) return photoUrl; // already a URL

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || 'anon';
    const safeName = (coachName || 'coach').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const path = `coaches/${userId}/${safeName}-${Date.now()}.png`;

    const blob = dataUrlToBlob(photoUrl);
    const { error: upErr } = await supabase.storage.from('profile-photos').upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path);
    return pub.publicUrl;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // If editing, dispatch update event
      if (isEditing && editMode) {
        const coachId = parseInt(editMode);
        // Persist photo if needed before broadcasting update
        const persistedPhoto = await uploadPhotoIfNeeded(formData.photoUrl, formData.name);
        if (persistedPhoto && persistedPhoto !== formData.photoUrl) {
          setFormData(prev => ({ ...prev, photoUrl: persistedPhoto }));
        }
        const updateData = {
          name: formData.name,
          description: formData.description,
          image: persistedPhoto || formData.photoUrl
        };
        
        // Persist to localStorage so Coach Management reflects changes when reopened
        try {
          const saved = localStorage.getItem('coaches');
          if (saved) {
            const list = JSON.parse(saved);
            const updated = list.map((c: any) => c.id === coachId ? { ...c, ...updateData, lastUpdated: 'Just now' } : c);
            localStorage.setItem('coaches', JSON.stringify(updated));
          }
        } catch (e) {
          console.warn('Failed to update localStorage coaches', e);
        }
        
        // Broadcast update for any listeners
        const event = new CustomEvent('coachUpdated', {
          detail: { coachId, updatedData: updateData }
        });
        window.dispatchEvent(event);

        // Update ElevenLabs agent configuration using Supabase client
        const agentPayload = {
          coachName: formData.name,
          agentLanguage: formData.agentLanguage,
          firstMessage: formData.firstMessage,
          systemPrompt: formData.systemPrompt,
          llmModel: formData.llmModel,
          temperature: formData.temperature,
          tools: {
            enableEndCall: formData.enableEndCall,
            enableDetectLanguage: formData.enableDetectLanguage,
            enableSkipTurn: formData.enableSkipTurn,
            enableTransferAgent: formData.enableTransferAgent,
            enableTransferNumber: formData.enableTransferNumber,
            enableKeypadTone: formData.enableKeypadTone,
            enableVoicemailDetection: formData.enableVoicemailDetection
          }
        };

        console.log('Updating ElevenLabs agent with:', agentPayload);

        // Use Supabase client to invoke the edge function
        const { data: result, error: functionError } = await supabase.functions.invoke('update-agent-instructions', {
          body: agentPayload
        });

        if (functionError) {
          console.error('Function error:', functionError);
          throw new Error(functionError.message || 'Failed to update agent configuration');
        }

        console.log('Agent updated successfully:', result);
      }
      
      toast({
        title: isEditing ? "Coach Updated" : "Coach Created",
        description: isEditing 
          ? "Your coach settings and voice agent have been updated successfully!" 
          : "Your new coach has been created successfully!",
      });
      
    } catch (error) {
      console.error('Error updating coach:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update coach settings",
        variant: "destructive",
      });
    }
    
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/coach-management" 
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Coach Management
            </Link>
            <div className="flex items-center space-x-2">
              <Building className="w-6 h-6 text-accent" />
              <span className="text-lg font-semibold">{isEditing ? "Edit Coach" : "Create Coach"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {isEditing ? "Edit Your AI Coach" : "Build Your Company's AI Coach"}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isEditing 
                ? "Update your coach settings, permissions, and availability." 
                : "Transform your top sales performers into AI coaches that can train your entire team 24/7."
              }
            </p>
          </div>

            <form id="coach-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-accent" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Configure your coach's basic details and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Coach Name</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enter coach name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="space-y-4">
                  <Label>Profile Photo</Label>
                  <div className="flex items-start space-x-4">
                    {/* Current Photo Preview */}
                    <div className="flex-shrink-0">
                      {formData.photoUrl ? (
                        <img
                          src={formData.photoUrl}
                          alt="Coach profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </Button>
                        {formData.photoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInputChange("photoUrl", "")}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setCropSrc(url);
                            setCropOpen(true);
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 200x200 pixels
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this coach's expertise and specializations..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="min-h-[100px]"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coaching Behavior */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-accent" />
                  Coaching Behavior
                </CardTitle>
                <CardDescription>
                  Configure how your AI coach interacts with sales reps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Coaching Style */}
                <div className="space-y-4">
                  <Label>Coaching Style</Label>
                  <Select value={formData.coachingStyle} onValueChange={(value) => handleInputChange("coachingStyle", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coaching approach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motivational">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">Motivational</div>
                            <div className="text-sm text-muted-foreground">Encouraging and supportive approach</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="direct">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">Direct</div>
                            <div className="text-sm text-muted-foreground">Straightforward, no-nonsense feedback</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="tough_love">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="font-medium">Tough Love</div>
                            <div className="text-sm text-muted-foreground">Challenging but caring approach</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="analytical">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium">Analytical</div>
                            <div className="text-sm text-muted-foreground">Data-driven and methodical</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Sales Roasting */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Flame className="w-5 h-5 mr-2 text-accent" />
                  Sales Roasting
                </CardTitle>
                <CardDescription>
                  Configure how aggressively your coach provides feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sales Roasting Level */}
                <div className="space-y-4">
                  <Label>Roasting Level: {formData.roastingLevel}</Label>
                  <div className="space-y-4">
                    <Slider
                      value={[parseInt(formData.roastingLevel)]}
                      onValueChange={(value) => handleInputChange("roastingLevel", value[0].toString())}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Gentle</span>
                      <span>Friendly</span>
                      <span>Firm</span>
                      <span>Tough</span>
                      <span>Savage</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        {formData.roastingLevel === "1" && (
                          <p className="text-sm font-medium text-green-600">Level 1 - Gentle Nudges</p>
                        )}
                        {formData.roastingLevel === "2" && (
                          <p className="text-sm font-medium text-blue-600">Level 2 - Friendly Reminders</p>
                        )}
                        {formData.roastingLevel === "3" && (
                          <p className="text-sm font-medium text-yellow-600">Level 3 - Firm Feedback</p>
                        )}
                        {formData.roastingLevel === "4" && (
                          <p className="text-sm font-medium text-orange-600">Level 4 - Tough Love</p>
                        )}
                        {formData.roastingLevel === "5" && (
                          <p className="text-sm font-medium text-red-600">Level 5 - Sales Savage</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {formData.roastingLevel === "1" && "Your coach will gently remind you about missed activities with encouragement"}
                          {formData.roastingLevel === "2" && "Your coach will politely point out missed calls and emails with supportive suggestions"}
                          {formData.roastingLevel === "3" && "Your coach will be direct about poor performance and push you to improve"}
                          {formData.roastingLevel === "4" && "Your coach will call out excuses and demand better performance with intensity"}
                          {formData.roastingLevel === "5" && "Your coach will roast you mercilessly for missed opportunities and poor effort"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Agent Configuration */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-accent" />
                  Voice Agent Settings
                </CardTitle>
                <CardDescription>
                  Configure your AI coach's voice interactions and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Agent Language */}
                <div className="space-y-2">
                  <Label>Agent Language</Label>
                  <Select value={formData.agentLanguage || "en"} onValueChange={(value) => handleInputChange("agentLanguage", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* First Message */}
                <div className="space-y-2">
                  <Label>First Message</Label>
                  <Textarea
                    placeholder="Hey {name}! I'm {coach_name}, your AI sales coach. Ready to crush some calls today?"
                    value={formData.firstMessage || ""}
                    onChange={(e) => handleInputChange("firstMessage", e.target.value)}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables: {"{name}"}, {"{coach_name}"}, {"{company}"}
                  </p>
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    placeholder="You are an experienced sales coach who helps sales reps improve their techniques, overcome objections, and close more deals..."
                    value={formData.systemPrompt || ""}
                    onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define the persona and context for your AI coach's interactions
                  </p>
                </div>

                {/* LLM Model */}
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={formData.llmModel || "gpt-4.1-2025-04-14"} onValueChange={(value) => handleInputChange("llmModel", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1 (Recommended)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                      <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-4">
                  <Label>Response Creativity: {formData.temperature || "0.8"}</Label>
                  <div className="space-y-4">
                    <Slider
                      value={[parseFloat(formData.temperature || "0.8")]}
                      onValueChange={(value) => handleInputChange("temperature", value[0].toString())}
                      max={1.0}
                      min={0.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Consistent</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>

                {/* Advanced Tools */}
                <div className="space-y-2">
                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between">
                        Advanced Tools
                        <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <p className="text-sm text-muted-foreground">Let the agent perform specific actions.</p>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">End call</div>
                            <div className="text-sm text-muted-foreground">Gives agent the ability to end the call with the user.</div>
                          </div>
                          <Switch
                            id="end-call"
                            checked={formData.enableEndCall || false}
                            onCheckedChange={(value) => handleInputChange("enableEndCall", value)}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">Detect language</div>
                            <div className="text-sm text-muted-foreground">Gives agent the ability to change the language during conversation.</div>
                          </div>
                          <Switch
                            id="detect-language"
                            checked={formData.enableDetectLanguage || false}
                            onCheckedChange={(value) => handleInputChange("enableDetectLanguage", value)}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">Skip turn</div>
                            <div className="text-sm text-muted-foreground">Agent will skip its turn if user explicitly indicates they need a moment.</div>
                          </div>
                          <Switch
                            id="skip-turn"
                            checked={formData.enableSkipTurn || false}
                            onCheckedChange={(value) => handleInputChange("enableSkipTurn", value)}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">Transfer to agent</div>
                            <div className="text-sm text-muted-foreground">Gives agent the ability to transfer the call to another AI agent.</div>
                          </div>
                          <Switch
                            id="transfer-agent"
                            checked={formData.enableTransferAgent || false}
                            onCheckedChange={(value) => handleInputChange("enableTransferAgent", value)}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">Transfer to number</div>
                            <div className="text-sm text-muted-foreground">Gives agent the ability to transfer the call to a human.</div>
                          </div>
                          <Switch
                            id="transfer-number"
                            checked={formData.enableTransferNumber || false}
                            onCheckedChange={(value) => handleInputChange("enableTransferNumber", value)}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">Play keypad touch tone</div>
                            <div className="text-sm text-muted-foreground">Gives agent the ability to play keypad touch tones during a phone call.</div>
                          </div>
                          <Switch
                            id="keypad-tone"
                            checked={formData.enableKeypadTone || false}
                            onCheckedChange={(value) => handleInputChange("enableKeypadTone", value)}
                          />
                        </div>
                        
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">Voicemail detection</div>
                            <div className="text-sm text-muted-foreground">Allows agent to detect voicemail systems and optionally leave a message.</div>
                          </div>
                          <Switch
                            id="voicemail-detection"
                            checked={formData.enableVoicemailDetection || false}
                            onCheckedChange={(value) => handleInputChange("enableVoicemailDetection", value)}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>

            {/* Coaching Performance */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-accent" />
                  Coaching Performance
                </CardTitle>
                <CardDescription>
                  Configure intensity and performance expectations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Coaching Intensity */}
                <div className="space-y-4">
                  <Label>Coaching Intensity</Label>
                  <Select value={formData.intensityLevel} onValueChange={(value) => handleInputChange("intensityLevel", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intensity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div>
                          <div className="font-medium">Low Intensity</div>
                          <div className="text-sm text-muted-foreground">Relaxed coaching sessions, basic feedback</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div>
                          <div className="font-medium">Medium Intensity</div>
                          <div className="text-sm text-muted-foreground">Focused sessions with actionable insights</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div>
                          <div className="font-medium">High Intensity</div>
                          <div className="text-sm text-muted-foreground">Demanding sessions, detailed analysis</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="maximum">
                        <div>
                          <div className="font-medium">Maximum Intensity</div>
                          <div className="text-sm text-muted-foreground">Elite-level coaching, no stone unturned</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Performance Standards */}
                <div className="space-y-4">
                  <Label>Performance Standards</Label>
                  <Select value={formData.performanceStandard} onValueChange={(value) => handleInputChange("performanceStandard", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select performance expectations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">
                        <div>
                          <div className="font-medium">Beginner Standards</div>
                          <div className="text-sm text-muted-foreground">Patient approach for new sales reps</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <div>
                          <div className="font-medium">Intermediate Standards</div>
                          <div className="text-sm text-muted-foreground">Moderate expectations for developing reps</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="veteran">
                        <div>
                          <div className="font-medium">Veteran Standards</div>
                          <div className="text-sm text-muted-foreground">High expectations for experienced reps</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="elite">
                        <div>
                          <div className="font-medium">Elite Standards</div>
                          <div className="text-sm text-muted-foreground">Exceptional standards for top performers</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview Box */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                  <h4 className="font-semibold mb-2 text-foreground">Coaching Preview</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    With these settings, your coach will be:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{formData.coachingStyle.replace('_', ' ')}</Badge>
                    <Badge variant="outline">Level {formData.roastingLevel} roasting</Badge>
                    <Badge variant="outline">{formData.intensityLevel} intensity</Badge>
                    <Badge variant="outline">{formData.performanceStandard} standards</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visibility & Access Control */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-accent" />
                  Visibility & Access Control
                </CardTitle>
                <CardDescription>
                  Configure who can access and use this coach
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Coach Visibility</Label>
                  <Select value={formData.permissions} onValueChange={(value) => handleInputChange("permissions", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Public</div>
                            <div className="text-sm text-muted-foreground">Anyone can access this coach</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="team_only">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Team Only</div>
                            <div className="text-sm text-muted-foreground">Only your team members can access</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="email_restricted">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Email Restricted</div>
                            <div className="text-sm text-muted-foreground">Only specific email addresses can access</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.permissions === "email_restricted" && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <Label>Allowed Email Addresses</Label>
                    
                    {/* Email List */}
                    <div className="space-y-2">
                      {formData.allowedEmails.map((email, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEmail(email)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {formData.allowedEmails.length === 0 && (
                        <p className="text-sm text-muted-foreground">No email addresses added yet</p>
                      )}
                    </div>

                    {/* Add Email */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Enter email address"
                          value={formData.newEmail}
                          onChange={(e) => handleInputChange("newEmail", e.target.value)}
                          className="pl-10"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                        />
                      </div>
                      <Button type="button" onClick={addEmail} disabled={!formData.newEmail}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">Public Directory Listing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Allow this coach to appear in public coach directory
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        Users can discover and interact with your coach publicly
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => handleInputChange("isPublic", checked)}
                    />
                  </div>
                </div>

                {/* Current Status */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Current Status:</span>
                  {formData.permissions === "public" ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <Globe className="h-3 w-3 mr-1" />
                      Public Access
                    </Badge>
                  ) : formData.permissions === "team_only" ? (
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      Team Only
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <Lock className="h-3 w-3 mr-1" />
                      Email Restricted ({formData.allowedEmails.length} emails)
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information (for non-editing mode) */}
            {!isEditing && (
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2 text-accent" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    We'll use this information to get in touch and help you build your custom AI coach.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                    <div className="relative">
                      <Linkedin className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={formData.linkedinUrl}
                        onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
          {/* Email Instructions Section - Only show when editing existing coach */}
          {false && (
            <div className="mt-8 space-y-6">
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-accent" />
                    Coach Communication
                  </CardTitle>
                  <CardDescription>
                    Send instructions, accountability tasks, or emails to your AI sales coach
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <CoachInstructionsManager 
                      coachName={formData.name} 
                      coachEmail={formData.email} 
                    />
                    <EmailComposer
                      coachName={formData.name}
                      coachEmail={formData.email}
                      coachPhone={formData.phone}
                      coachImageUrl={formData.photoUrl}
                    />
                    <CoachWelcomeManager
                      coachName={formData.name}
                      coachEmail={formData.email}
                      coachPhone={formData.phone}
                      coachImageUrl={formData.photoUrl}
                      coachDescription={formData.description}
                    />
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">How it works:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Instructions:</strong> Send tasks like "analyze Robert's CallProof activity" for accountability reports</li>
                      <li>• <strong>Email:</strong> Send emails as your coach to prospects or team members</li>
                      <li>• <strong>Welcome:</strong> Send automated welcome emails to introduce the coach to new users</li>
                      <li>• <strong>Responses:</strong> The AI coach will analyze data and respond via email</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <Button type="submit" size="lg" form="coach-form">{isEditing ? 'Save Changes' : 'Create Coach'}</Button>
          </div>


          {!isEditing && (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Our team will review your submission and reach out within 24 hours to discuss 
                building your custom AI coach based on your company's best sales practices.
              </p>
            </div>
          )}
        </div>
      </main>

      <ProfilePhotoCropper
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={() => setCropOpen(false)}
        onCropped={(dataUrl) => handleInputChange("photoUrl", dataUrl)}
      />
    </div>
  );
};

export default CompanyCoach;