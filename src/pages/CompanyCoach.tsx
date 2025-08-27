import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Building, Linkedin, Mail, Phone, User, Globe, Lock, Plus, X, Shield, Users, Settings, Camera, Upload, Target, Zap, Heart, TrendingUp, Flame, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { CoachInstructionsManager } from "@/components/CoachInstructionsManager";
import { EmailComposer } from "@/components/EmailComposer";
import { CoachWelcomeManager } from "@/components/CoachWelcomeManager";
import { Slider } from "@/components/ui/slider";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfilePhotoCropper from "@/components/ProfilePhotoCropper";

// Types
interface CoachFormData {
  name: string;
  description: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  isPublic: boolean;
  allowedEmails: string[];
  newEmail: string;
  permissions: string;
  photoUrl: string;
  coachingStyle: string;
  roastingLevel: string;
  intensityLevel: string;
  performanceStandard: string;
  agentLanguage: string;
  firstMessage: string;
  systemPrompt: string;
  llmModel: string;
  temperature: string;
  enableCRM: boolean;
  enableCalendar: boolean;
  enableEmail: boolean;
  enableTracking: boolean;
  enableEndCall: boolean;
  enableDetectLanguage: boolean;
  enableSkipTurn: boolean;
  enableTransferAgent: boolean;
  enableTransferNumber: boolean;
  enableKeypadTone: boolean;
  enableVoicemailDetection: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

const CompanyCoach: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // URL parameters
  const editMode = searchParams.get('edit');
  const incomingName = searchParams.get('name') || '';
  const incomingEmail = searchParams.get('email') || '';
  const incomingTitle = searchParams.get('title') || '';

  // Determine if we're in edit mode
  const isEditing = !!editMode || !!incomingName || !!incomingEmail || !!incomingTitle;

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  // Get coach data based on edit mode
  const getCoachData = useCallback((): CoachFormData => {
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
  }, [editMode, incomingName, incomingEmail, incomingTitle]);

  // Memoize initial data to prevent recalculation
  const initialData = useMemo(() => getCoachData(), [getCoachData]);
  const [formData, setFormData] = useState<CoachFormData>(initialData);

  // Cleanup object URLs on unmount
  useEffect(() => {

    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  // Load actual coach data if editing with a real ID
  useEffect(() => {
    const loadCoachData = async () => {
      if (isEditing && editMode && !['0', '1'].includes(editMode)) {
        setIsLoadingCoach(true);
        try {
          const { data, error } = await supabase
            .from("coaches")
            .select(`
            id,
            name,
            email,
            description,
            avatar_url,
            is_draft,
            created_at,
            updated_at,
            coach_assistants:coach_assistants!coach_assistants_coach_id_fkey (
              system_prompt,
              first_message,
              llm_model,
              temperature,
              agent_language,
              performance_standard,
              intensity_level,
              coaching_style,
              roasting_level,
              permissions,
              is_public,
              phone,
              linkedin_url,
              allowed_emails,
              enable_crm,
              enable_calendar,
              enable_email,
              enable_transfer_agent,
              enable_transfer_number,
              enable_voicemail_detection,
              enable_tracking,
              enable_detect_language,
              enable_end_call,
              enable_skip_turn,
              enable_keypad_tone
            )
          `)
            .eq("id", editMode.trim()).maybeSingle();

          console.group("Supabase Coach Query");
          console.log("Edit mode (id):", editMode);
          console.log("Returned data:", data);
          console.log("Returned error:", error);
          console.groupEnd();
          if (error) throw error;

          if (data) {
            const assistantData = (data.coach_assistants && data.coach_assistants[0]) || {};
            setFormData({
              name: data.name || '',
              description: data.description || '',
              email: data.email || '',
              phone: assistantData.phone || '',
              linkedinUrl: assistantData.linkedin_url || '',
              isPublic: assistantData.is_public || false,
              allowedEmails: assistantData.allowed_emails || [],
              newEmail: '',
              permissions: assistantData.permissions || 'public',
              photoUrl: data.avatar_url || '',
              coachingStyle: assistantData.coaching_style || 'motivational',
              roastingLevel: assistantData.roasting_level?.toString() || '1',
              intensityLevel: assistantData.intensity_level || 'medium',
              performanceStandard: assistantData.performance_standard || 'beginner',
              agentLanguage: assistantData.agent_language || 'en',
              firstMessage: assistantData.first_message || '',
              systemPrompt: assistantData.system_prompt || '',
              llmModel: assistantData.llm_model || 'gpt-4.1-2025-04-14',
              temperature: assistantData.temperature?.toString() || '0.8',
              enableCRM: assistantData.enable_crm || false,
              enableCalendar: assistantData.enable_calendar || false,
              enableEmail: assistantData.enable_email || false,
              enableTracking: assistantData.enable_tracking || false,
              enableEndCall: assistantData.enable_end_call || false,
              enableDetectLanguage: assistantData.enable_detect_language || false,
              enableSkipTurn: assistantData.enable_skip_turn || false,
              enableTransferAgent: assistantData.enable_transfer_agent || false,
              enableTransferNumber: assistantData.enable_transfer_number || false,
              enableKeypadTone: assistantData.enable_keypad_tone || false,
              enableVoicemailDetection: assistantData.enable_voicemail_detection || false,
            });
          }
        } catch (error) {
          console.error('Error loading coach data:', error);
          toast({
            title: "Error",
            description: "Failed to load coach data",
            variant: "destructive",
             duration: 3000,
          });
        } finally {
          setIsLoadingCoach(false);
        }
      }
    };

    loadCoachData();
  }, [editMode, isEditing, toast]);

  // Form validation
  const validateForm = (data: CoachFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Coach name is required' });
    }

    if (!data.description?.trim()) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    if (data.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(data.phone)) {
      errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }

    if (data.permissions === 'email_restricted' && data.allowedEmails.length === 0) {
      errors.push({ field: 'allowedEmails', message: 'At least one email address is required for email restricted access' });
    }

    const roastingLevel = parseInt(data.roastingLevel);
    if (isNaN(roastingLevel) || roastingLevel < 1 || roastingLevel > 5) {
      errors.push({ field: 'roastingLevel', message: 'Roasting level must be between 1 and 5' });
    }

    const temperature = parseFloat(data.temperature);
    if (isNaN(temperature) || temperature < 0 || temperature > 1) {
      errors.push({ field: 'temperature', message: 'Temperature must be between 0 and 1' });
    }

    return errors;
  };

  // Handle input changes with proper typing
  const handleInputChange = useCallback((field: keyof CoachFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Add email to allowed list
  const addEmail = useCallback(() => {
    if (formData.newEmail && !formData.allowedEmails.includes(formData.newEmail)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.newEmail)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
           duration: 3000,
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        allowedEmails: [...prev.allowedEmails, prev.newEmail],
        newEmail: ""
      }));
    }
  }, [formData.newEmail, formData.allowedEmails, toast]);

  // Remove email from allowed list
  const removeEmail = useCallback((emailToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      allowedEmails: prev.allowedEmails.filter(email => email !== emailToRemove)
    }));
  }, []);

  // Convert data URL to blob
  const dataUrlToBlob = useCallback((dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }, []);

  // Upload photo if needed
  const uploadPhotoIfNeeded = useCallback(async (photoUrl?: string | null, coachName?: string): Promise<string> => {
    if (!photoUrl) return '';
    if (!photoUrl.startsWith('data:')) return photoUrl; // already a URL

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

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
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw new Error('Failed to upload photo. Please try again.');
    }
  }, [dataUrlToBlob]);

  // Handle photo upload with cleanup
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
           duration: 3000,
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file",
          variant: "destructive",
           duration: 3000,
        });
        return;
      }

      const url = URL.createObjectURL(file);
      setObjectUrls(prev => [...prev, url]);
      setCropSrc(url);
      setCropOpen(true);
    }

    // Clear the input
    e.target.value = '';
  }, [toast]);

  // AI Pre-fill functionality
  const handleAIPrefill = useCallback(async () => {
    setIsPrefilling(true);

    try {
      // Get the system prompts from the attached file
      const systemPrompts = [
        "You are an expert sales assistant for [insert product/service or company name]. Your goal is to engage customers in a friendly, professional, and conversational manner to drive sales, build trust, and maintain long-term relationships. Follow these guidelines:\n\nUnderstand the Customer: Ask open-ended questions to uncover the customer's needs, preferences, and pain points. Actively listen and tailor responses to their specific context.\nHighlight Value: Clearly articulate the benefits of the product/service, emphasizing how it addresses the customer's challenges or goals. Use simple, relatable language.\nBuild Rapport: Use a warm, approachable tone. Personalize responses with the customer's name (if available) and adapt to their communication style to foster connection.\nHandle Objections: Address concerns empathetically and transparently. Provide honest answers, and offer solutions like discounts, trials, or additional resources when appropriate.\nGuide to Action: Include a clear, specific call-to-action in every response (e.g., 'Would you like to schedule a demo?' or 'Can I send you a personalized quote?').\nFollow-Up Strategy:\nInitial Follow-Up: If the customer doesn't commit immediately, propose a follow-up action (e.g., 'Can I check in with you next week to answer any questions?' or 'Would you like me to send a reminder about our free trial offer?').\nTrack Interactions: Reference prior conversations (if available) to show continuity (e.g., 'Last time, you mentioned [specific need]; here's how we can help with that').\nTiming and Tone: Space follow-ups appropriately (e.g., 2-3 days for warm leads, 5-7 days for colder ones) and maintain a polite, non-pushy tone.\nProvide Value in Follow-Ups: Include useful information, such as tips, case studies, or exclusive offers, to keep the customer engaged (e.g., 'Here's a case study showing how [product] helped a similar business').\nMulti-Channel Awareness: If applicable, suggest follow-up via email, phone, or another preferred channel (e.g., 'Would you prefer I send this info via email?').\nStay Ethical: Be transparent about pricing, features, and limitations. Never use high-pressure tactics or misleading information.\nPersonalize and Adapt: Leverage any available customer data (e.g., past interactions, preferences) to customize responses. If no data exists, ask relevant questions to gather insights.\nKeep It Concise: Deliver clear, succinct responses that respect the customer's time while addressing their needs.",
        "You are an expert sales assistant for [insert product/service or company name]. Your goal is to engage customers in a friendly, professional, and conversational manner to drive sales, build trust, and maintain long-term relationships. Follow these guidelines:\n\nBefore starting any conversation, retrieve relevant context from the previous_history tool to understand prior interactions and maintain continuity. Use this memory to personalize your responses and create a seamless customer experience.\n\nRecall Context:\nBefore responding, check for prior summaries or transcripts using the previous_history tool.\nReference relevant past interactions to maintain continuity and build rapport.\n\nUnderstand the Customer: Ask open-ended questions to uncover the customer's needs, preferences, and pain points. Actively listen and tailor responses to their specific context.\nHighlight Value: Clearly articulate the benefits of the product/service, emphasizing how it addresses the customer's challenges or goals. Use simple, relatable language.\nBuild Rapport: Use a warm, approachable tone. Personalize responses with the customer's name (if available) and adapt to their communication style to foster connection.\nHandle Objections: Address concerns empathetically and transparently. Provide honest answers, and offer solutions like discounts, trials, or additional resources when appropriate.\nGuide to Action: Include a clear, specific call-to-action in every response (e.g., 'Would you like to schedule a demo?' or 'Can I send you a personalized quote?').\nFollow-Up Strategy:\nInitial Follow-Up: If the customer doesn't commit immediately, propose a follow-up action (e.g., 'Can I check in with you next week to answer any questions?' or 'Would you like me to send a reminder about our free trial offer?').\nTrack Interactions: Reference prior conversations (if available) to show continuity (e.g., 'Last time, you mentioned [specific need]; here's how we can help with that').\nTiming and Tone: Space follow-ups appropriately (e.g., 2-3 days for warm leads, 5-7 days for colder ones) and maintain a polite, non-pushy tone.\nProvide Value in Follow-Ups: Include useful information, such as tips, case studies, or exclusive offers, to keep the customer engaged (e.g., 'Here's a case study showing how [product] helped a similar business').\nMulti-Channel Awareness: If applicable, suggest follow-up via email, phone, or another preferred channel (e.g., 'Would you prefer I send this info via email?').\nStay Ethical: Be transparent about pricing, features, and limitations. Never use high-pressure tactics or misleading information.\nPersonalize and Adapt: Leverage any available customer data (e.g., past interactions, preferences) to customize responses. If no data exists, ask relevant questions to gather insights.\nKeep It Concise: Deliver clear, succinct responses that respect the customer's time while addressing their needs."
      ];
      const randomSystemPrompt = systemPrompts[Math.floor(Math.random() * systemPrompts.length)];

      // Generate AI content based on the system prompts
      const aiGeneratedContent = {
        description: "AI-powered sales coach specializing in customer engagement, objection handling, and follow-up strategies. Built with advanced conversational AI to drive sales, build trust, and maintain long-term customer relationships through personalized, ethical sales approaches.",
        firstMessage: "Hey {name}! I'm {coach_name}, your AI sales coach. I'm here to help you engage customers professionally, handle objections effectively, and build lasting relationships. Ready to boost your sales performance today?",
        systemPrompt: randomSystemPrompt,
        coachingStyle: "motivational",
        roastingLevel: "2",
        intensityLevel: "medium",
        performanceStandard: "intermediate",
        agentLanguage: "en",
        llmModel: "gpt-4.1-2025-04-14",
        temperature: "0.7"
      };

      // Update form data with AI-generated content
      setFormData(prev => ({
        ...prev,
        ...aiGeneratedContent
      }));

      toast({
        title: "AI Pre-fill Complete",
        description: "Your coach has been pre-filled with AI-generated content based on expert sales coaching principles.",
         variant: "success",
          duration: 3000,
      });

    } catch (error) {
      console.error('Error during AI pre-fill:', error);
      toast({
        title: "Pre-fill Error",
        description: "Failed to pre-fill form with AI content. Please try again.",
        variant: "destructive",
         duration: 3000,
      });
    } finally {
      setIsPrefilling(false);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm(formData);
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors[0].message,
        variant: "destructive",
      });
      return;
    }

    // 👉 Ask user first (confirm toast)
    toast({
      title: "Save Coach",
      description: "Do you want to save this coach as a draft or publish it?",
      variant: "info",
      duration: 8000,
      action: (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => createCoach(true)} // draft
          >
            Save Draft
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => createCoach(false)} // publish
          >
            Publish
          </Button>
        </div>
      ),
    });
  };

  // separate function to actually call supabase
  const createCoach = async (isDraft: boolean) => {
    setIsSubmitting(true);

    try {
      // Upload photo if needed
      let persistedPhoto = formData.photoUrl;
      if (formData.photoUrl && formData.photoUrl.startsWith("data:")) {
        persistedPhoto = await uploadPhotoIfNeeded(formData.photoUrl, formData.name);
      }

      // Get logged-in user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData?.user?.id;
      if (!userId) throw new Error("You must be logged in to create a coach");

      // Build payload
      const coachPayload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        description: formData.description.trim(),
        avatar_url: persistedPhoto,
        owner_user_id: userId,
        is_draft: isDraft,

        // Assistant-specific fields
        coaching_style: formData.coachingStyle,
        roasting_level: parseInt(formData.roastingLevel),
        intensity_level: formData.intensityLevel,
        performance_standard: formData.performanceStandard,
        agent_language: formData.agentLanguage,
        first_message: formData.firstMessage.trim() || null,
        system_prompt: formData.systemPrompt.trim() || null,
        llm_model: formData.llmModel,
        temperature: parseFloat(formData.temperature),
        permissions: formData.permissions,
        allowed_emails: formData.allowedEmails,
        is_public: formData.isPublic,
        enable_crm: formData.enableCRM,
        enable_calendar: formData.enableCalendar,
        enable_email: formData.enableEmail,
        enable_tracking: formData.enableTracking,
        enable_end_call: formData.enableEndCall,
        enable_detect_language: formData.enableDetectLanguage,
        enable_skip_turn: formData.enableSkipTurn,
        enable_transfer_agent: formData.enableTransferAgent,
        enable_transfer_number: formData.enableTransferNumber,
        enable_keypad_tone: formData.enableKeypadTone,
        enable_voicemail_detection: formData.enableVoicemailDetection,
      };

      let result;
      if (isEditing && editMode && !['0', '1'].includes(editMode)) {
        // 1. Check if user is admin or ceo
        const { data: isAdmin, error: adminErr } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin"
        });
        if (adminErr) throw adminErr;

        const { data: isCeo, error: ceoErr } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "ceo"
        });
        if (ceoErr) throw ceoErr;

        // 2. Build query
        let query = supabase
          .from("coaches")
          .update({
            name: coachPayload.name,
            email: coachPayload.email,
            description: coachPayload.description,
            avatar_url: coachPayload.avatar_url,
            is_draft: coachPayload.is_draft,
          })
          .eq("id", editMode);

        // 3. Apply owner restriction only if not admin/ceo
        if (!isAdmin && !isCeo) {
          query = query.eq("owner_user_id", userId);
        }

        // 4. Execute
        const { data: coachData, error: coachError } = await query.select();

        if (coachError) throw coachError;

        // Update the coach_assistants table
        const { data: assistantData, error: assistantError } = await supabase
          .from("coach_assistants")
          .update({
            coaching_style: coachPayload.coaching_style,
            roasting_level: coachPayload.roasting_level,
            intensity_level: coachPayload.intensity_level,
            performance_standard: coachPayload.performance_standard,
            agent_language: coachPayload.agent_language,
            first_message: coachPayload.first_message,
            system_prompt: coachPayload.system_prompt,
            llm_model: coachPayload.llm_model,
            temperature: coachPayload.temperature,
            permissions: coachPayload.permissions,
            allowed_emails: coachPayload.allowed_emails,
            phone: coachPayload.phone,
            linkedin_url: coachPayload.linkedinUrl,
            enable_crm: coachPayload.enable_crm,
            enable_calendar: coachPayload.enable_calendar,
            enable_email: coachPayload.enable_email,
            enable_tracking: coachPayload.enable_tracking,
            enable_end_call: coachPayload.enable_end_call,
            enable_detect_language: coachPayload.enable_detect_language,
            enable_skip_turn: coachPayload.enable_skip_turn,
            enable_transfer_agent: coachPayload.enable_transfer_agent,
            enable_transfer_number: coachPayload.enable_transfer_number,
            enable_keypad_tone: coachPayload.enable_keypad_tone,
            enable_voicemail_detection: coachPayload.enable_voicemail_detection,
            is_public: coachPayload.is_public,
          })
          .eq("coach_id", editMode)
          .select();

        if (coachError || assistantError) {
          console.error("Error updating coach or assistant:", coachError, assistantError);
          throw coachError || assistantError;
        }
        result = { success: true, coach: coachData, assistant: assistantData };
      } else {
        const { data, error } = await supabase.functions.invoke("create-coach", {
          body: coachPayload,
        });
        if (error) throw error;
        result = data;
      }

      toast({
        title: isDraft ? "Draft Saved" : "Coach Published",
        variant: "success",
        description: isDraft
          ? "Your coach has been saved as a draft."
          : "Your coach has been published successfully!",
        duration: 3000,
      });
      console.log("Coach save result:", result);
      // Redirect to coach management after a short delay
      setTimeout(() => {
        window.location.href = "/coach-management";
      }, 3000);

      return result;
    } catch (error) {
      console.error("Error saving coach:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save coach. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Coaching Style
  const coachingOptions = {
    motivational: {
      label: "Motivational",
      description: "Encouraging and supportive approach",
      icon: <Heart className="h-4 w-4 text-green-500" />,
    },
    direct: {
      label: "Direct",
      description: "Straightforward, no-nonsense feedback",
      icon: <Target className="h-4 w-4 text-blue-500" />,
    },
    tough_love: {
      label: "Tough Love",
      description: "Challenging but caring approach",
      icon: <Zap className="h-4 w-4 text-orange-500" />,
    },
    analytical: {
      label: "Analytical",
      description: "Data-driven and methodical",
      icon: <TrendingUp className="h-4 w-4 text-purple-500" />,
    },
  };

  // Coaching Intensity
  const intensityOptions = {
    low: {
      label: "Low Intensity",
      description: "Relaxed coaching sessions, basic feedback",
    },
    medium: {
      label: "Medium Intensity",
      description: "Focused sessions with actionable insights",
    },
    high: {
      label: "High Intensity",
      description: "Demanding sessions, detailed analysis",
    },
    maximum: {
      label: "Maximum Intensity",
      description: "Elite-level coaching, no stone unturned",
    },
  };

  // Performance Standards
  const performanceOptions = {
    beginner: {
      label: "Beginner Standards",
      description: "Patient approach for new sales reps",
    },
    intermediate: {
      label: "Intermediate Standards",
      description: "Moderate expectations for developing reps",
    },
    veteran: {
      label: "Veteran Standards",
      description: "High expectations for experienced reps",
    },
    elite: {
      label: "Elite Standards",
      description: "Exceptional standards for top performers",
    },
  };

  // Permission Options
  const permissionOptions = {
    public: {
      label: "Public",
      description: "Anyone can access this coach",
      icon: <Globe className="h-4 w-4" />,
    },
    team_only: {
      label: "Team Only",
      description: "Only your team members can access",
      icon: <Users className="h-4 w-4" />,
    },
    email_restricted: {
      label: "Email Restricted",
      description: "Only specific email addresses can access",
      icon: <Lock className="h-4 w-4" />,
    },
  };

  if (isLoadingCoach) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading coach data...</p>
        </div>
      </div>
    );
  }

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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-accent" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Configure your coach's basic details and description
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIPrefill}
                    disabled={isPrefilling}
                    className="flex items-center gap-2"
                  >
                    {isPrefilling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isPrefilling ? 'Pre-filling...' : 'Ask AI to pre-fill'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Coach Name *</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enter coach name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10"
                      required
                      maxLength={100}
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
                        onChange={handlePhotoUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 200x200 pixels, max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this coach's expertise and specializations..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="min-h-[100px]"
                    required
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/500 characters
                  </p>
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
                  <Select
                    value={formData.coachingStyle}
                    onValueChange={(value) => handleInputChange("coachingStyle", value)}
                  >
                    <SelectTrigger>
                      {formData.coachingStyle ? (
                        <div className="flex items-center gap-2">
                          {coachingOptions[formData.coachingStyle].icon}
                          <span className="font-medium">
                            {coachingOptions[formData.coachingStyle].label}
                          </span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select coaching approach" />
                      )}
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(coachingOptions).map(([value, option]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
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

                {/* Greeting Message */}
                <div className="space-y-2">
                  <Label>Greeting Message</Label>
                  <Textarea
                    placeholder="Hey {name}! I'm {coach_name}, your AI sales coach. Ready to crush some calls today?"
                    value={formData.firstMessage || ""}
                    onChange={(e) => handleInputChange("firstMessage", e.target.value)}
                    className="min-h-[80px]"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Use variables: {"{name}"}, {"{coach_name}"}, {"{company}"}</span>
                    <span>{(formData.firstMessage || '').length}/500</span>
                  </div>
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    placeholder="You are an experienced sales coach who helps sales reps improve their techniques, overcome objections, and close more deals..."
                    value={formData.systemPrompt || ""}
                    onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                    className="min-h-[120px]"
                    maxLength={10000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Define the persona and context for your AI coach's interactions</span>
                    <span>{(formData.systemPrompt || '').length}/1000</span>
                  </div>
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
                      <SelectItem value="gpt-5">GPT-5</SelectItem>
                      <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-sonnet-4@20250514">Claude Sonnet 4</SelectItem>
                      <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                      <SelectItem value="gemini-2.0-flash-001">Gemini 2.0 Flash 001</SelectItem>
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
                            <div className="font-medium text-sm">CRM</div>
                            <div className="text-sm text-muted-foreground">Use CRM Data</div>
                          </div>
                          <Switch
                            id="enable-crm"
                            checked={formData.enableCRM || false}
                            onCheckedChange={(value) => handleInputChange("enableCRM", value)}
                          />
                        </div>
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
                  <Select
                    value={formData.intensityLevel}
                    onValueChange={(value) => handleInputChange("intensityLevel", value)}
                  >
                    <SelectTrigger>
                      {formData.intensityLevel ? (
                        <span className="font-medium">
                          {intensityOptions[formData.intensityLevel].label}
                        </span>
                      ) : (
                        <SelectValue placeholder="Select intensity level" />
                      )}
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(intensityOptions).map(([value, option]) => (
                        <SelectItem key={value} value={value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Performance Standards */}
                <div className="space-y-4">
                  <Label>Performance Standards</Label>
                  <Select
                    value={formData.performanceStandard}
                    onValueChange={(value) => handleInputChange("performanceStandard", value)}
                  >
                    <SelectTrigger>
                      {formData.performanceStandard ? (
                        <span className="font-medium">
                          {performanceOptions[formData.performanceStandard].label}
                        </span>
                      ) : (
                        <SelectValue placeholder="Select performance expectations" />
                      )}
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(performanceOptions).map(([value, option]) => (
                        <SelectItem key={value} value={value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
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

                  {/** Permission Options */}
                 <Select
                    value={formData.permissions}
                    onValueChange={(value) => handleInputChange("permissions", value)}
                  >
                    <SelectTrigger>
                      {formData.permissions ? (
                        <div className="flex items-center gap-2">
                          {permissionOptions[formData.permissions].icon}
                          <span className="font-medium">
                            {permissionOptions[formData.permissions].label}
                          </span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select visibility level" />
                      )}
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(permissionOptions).map(([value, option]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
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

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              size="lg"
              form="coach-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Create Coach'
              )}
            </Button>
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

      {/* Profile Photo Cropper Modal */}
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