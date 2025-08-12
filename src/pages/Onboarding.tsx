import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Linkedin, Mic, MicOff, Database, Volume2, Square, Phone, Mail, FileText, Users, TrendingUp, DollarSign, Calendar, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileEditor from "@/components/ProfileEditor";
import VoiceCoach from "@/components/VoiceCoach";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import { supabase } from "@/integrations/supabase/client";
import { CRMConnectModal } from "@/components/CRMConnectModal";


interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

const Onboarding = () => {
  // Get the first message from saved coach settings, with fallback
  const getFirstMessage = () => {
    const savedSettings = localStorage.getItem('coachSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings.firstMessage || "Hello! I'm Bobby your AI sales coach. Let's get to know each other. What is your name?";
      } catch (e) {
        console.error('Error loading coach settings:', e);
      }
    }
    return "Hello! I'm Bobby your AI sales coach. Let's get to know each other. What is your name?";
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: getFirstMessage(),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isConnectedToLinkedIn, setIsConnectedToLinkedIn] = useState(false);
  // Initialize CRM connection state from localStorage and check profile
  const [isConnectedToCRM, setIsConnectedToCRM] = useState(() => {
    const crmConnection = localStorage.getItem('crmConnection');
    return crmConnection ? true : false;
  });
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(true);
  const [realtimeChat, setRealtimeChat] = useState<RealtimeChat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [connectedCRMName, setConnectedCRMName] = useState<string | null>(() => {
    const crmConnection = localStorage.getItem('crmConnection');
    if (crmConnection) {
      try {
        const connection = JSON.parse(crmConnection);
        return connection.name || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Check for CallProof connection on component mount
  const checkCRMConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('callproof_enabled, callproof_api_key, callproof_api_secret')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.callproof_enabled && profile.callproof_api_key && profile.callproof_api_secret) {
          setIsConnectedToCRM(true);
          setConnectedCRMName('CallProof');
          
          // Also update localStorage
          const crmConnection = {
            id: 'callproof',
            name: 'CallProof',
            apiKey: profile.callproof_api_key,
            apiSecret: profile.callproof_api_secret,
            connectedAt: new Date().toISOString()
          };
          localStorage.setItem('crmConnection', JSON.stringify(crmConnection));
        }
      }
    } catch (error) {
      console.error('Error checking CRM connection:', error);
    }
  };

  // Check CRM connection on mount
  useEffect(() => {
    checkCRMConnection();
  }, []);

  // Personalize first assistant message with the user's name if available
  useEffect(() => {
    const personalize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Build display name from auth metadata or profiles table
        let displayName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";

        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name,last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          const nameFromProfile = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
          if (nameFromProfile) displayName = nameFromProfile;
        }

        if (!displayName && user.email) {
          displayName = user.email.split('@')[0];
        }

        if (!displayName) return;

        const coachConfig = getCoachConfig();
        const base = coachConfig.firstMessage || getFirstMessage();
        const coachName = (coachConfig.coachName as string) || 'Bobby';

        let personalized = base
          .replace(/\{name\}/g, displayName)
          .replace(/\{coach_name\}/g, coachName);

        // If greeting still asks for the name, remove that question
        personalized = personalized.replace(/\s*What is your name\??/i, '');

        setMessages(prev => {
          if (prev.length && prev[0].role === 'assistant') {
            const updated = [...prev];
            updated[0] = { ...updated[0], content: personalized.trim() };
            return updated;
          }
          return prev;
        });
      } catch (e) {
        console.error('Error personalizing first message:', e);
      }
    };

    personalize();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get coach configuration from localStorage or defaults
  const getCoachConfig = () => {
    try {
      const savedConfig = localStorage.getItem('coachSettings');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Error loading coach settings:', error);
    }
    
    // Return default configuration
    return {
      coachName: 'Bobby Hartline',
      coachingStyle: 'supportive',
      roastingLevel: 'medium',
      customInstructions: '',
      firstMessage: 'Hello! I\'m Bobby your AI sales coach. Let\'s get to know each other. What is your name?',
      industry: 'saas',
      methodology: 'challenger'
    };
  };

  // Initialize realtime chat connection
  const initRealtimeChat = async () => {
    if (realtimeChat) return realtimeChat;

    try {
      const coachConfig = getCoachConfig();
      
      const chat = new RealtimeChat((message) => {
        if (message.type === 'connected') {
          setIsConnected(true);
        } else if (message.type === 'disconnected') {
          setIsConnected(false);
        } else if (message.type === 'error') {
          console.error('Connection error:', message.message);
          setIsConnected(false);
        } else if (message.type === 'response.audio_transcript.delta') {
          // Handle text transcripts from voice responses
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + message.delta
              };
              return updated;
            });
          } else {
            // Start new assistant message
            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: message.delta,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
        } else if (message.type === 'response.audio_transcript.done') {
          setIsCoachSpeaking(false);
        } else if (message.type === 'response.audio.delta') {
          setIsCoachSpeaking(true);
        } else if (message.type === 'response.audio.done') {
          setIsCoachSpeaking(false);
        }
      }, coachConfig);

      await chat.connect();
      setRealtimeChat(chat);
      return chat;
    } catch (error) {
      console.error('Error initializing chat:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoadingResponse) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue("");
    setIsLoadingResponse(true);

    try {
      // SPECIAL TEST CASE - Direct CRM call
      if (messageText.includes('FORCE_CRM_TEST_Ashley_DeBon')) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const response = await supabase.functions.invoke('crm-account-query', {
          body: {
            searchTerm: 'robert@callproof.com',
            query: 'Direct test of robert@callproof.com search',
            userId: user.id
          }
        });

        if (response.error) {
          console.error('Direct CRM error:', response.error);
          throw new Error(response.error.message);
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoadingResponse(false);
        return;
      }

      // FORCE TEST - check if "Brad Cook" is in the message
      if (messageText.toLowerCase().includes('brad cook')) {
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Call CRM query function
          const response = await supabase.functions.invoke('crm-account-query', {
            body: {
              searchTerm: 'Brad Cook',
              query: messageText,
              userId: user.id
            }
          });

          if (response.error) {
            console.error('CRM query error:', response.error);
            throw new Error(response.error.message);
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.response,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoadingResponse(false);
          return;
        } catch (crmError) {
          console.error('CRM query error:', crmError);
          // Fall back to regular chat if CRM query fails
        }
      }

      // Generic CallProof contact/account lookup intent (e.g., "look up the phone# for stacey moody in callproof")
      if (
        isConnectedToCRM &&
        /callproof/i.test(messageText) &&
        /(look\s?up|lookup|find|search)/i.test(messageText)
      ) {
        try {
          // Try to extract a search term/name/email between common phrases
          let cleaned = messageText
            .replace(/\s+in\s+callproof.*/i, '')
            .replace(/.*?(look\s?up|lookup|find|search)\s*/i, '')
            .replace(/^(the\s+)?(phone#|phone\s*number|email|contact|account)\s*(for\s*)?/i, '')
            .trim();

          // If we still have a "for NAME" pattern, capture NAME
          const forMatch = cleaned.match(/(?:for|about|of)\s+(.+)/i);
          const searchTerm = (forMatch ? forMatch[1] : cleaned)
            .replace(/\s{2,}/g, ' ')
            .trim();

          if (searchTerm && searchTerm.length >= 2) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const response = await supabase.functions.invoke('crm-account-query', {
              body: {
                searchTerm,
                query: messageText,
                userId: user.id
              }
            });

            if (response.error) {
              console.error('CRM query error:', response.error);
              throw new Error(response.error.message);
            }

            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: response.data.response || `No results found for ${searchTerm}.`,
              timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
            setIsLoadingResponse(false);
            return;
          }
        } catch (crmErr) {
          console.error('Generic CallProof lookup error:', crmErr);
          // Continue to other handlers/fallbacks
        }
      }

      // Handle "latest activities in CallProof" requests
      const wantsActivity = /callproof/i.test(messageText) && (
        /\b(latest|last|recent)\b/i.test(messageText) ||
        /\b(calls?|appointments?|meetings?|emails?)\b/i.test(messageText) ||
        /activit/i.test(messageText)
      );
      if (isConnectedToCRM && wantsActivity) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const response = await supabase.functions.invoke('callproof-activity', {
            body: { userId: user.id, limit: 10, days: 7 }
          });

          if (response.error) throw new Error(response.error.message);

          const content = response.data?.summary || 'No recent activity found.';
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoadingResponse(false);
          return;
        } catch (actErr) {
          console.error('CallProof activity error:', actErr);
          // Continue to fallback chat below
        }
      }

      // TEMP: Direct call to chat function for debugging
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const directResponse = await fetch('https://rfevteftvvniiuihugfk.supabase.co/functions/v1/chat-with-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            conversationId: null, // Start fresh
            coachConfig: getCoachConfig(),
            userId: user?.id
          })
        });

        const directData = await directResponse.json();

        if (directData.success) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: directData.response,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error(directData.error || 'Direct call failed');
        }
      } catch (directError) {
        console.error('Direct call error:', directError);
        
        // Fallback to original method
        let chatInstance = realtimeChat;
        
        if (!chatInstance) {
          chatInstance = await initRealtimeChat();
        }
        
        if (chatInstance) {
          await chatInstance.sendTextMessage(messageText);
        } else {
          throw new Error('Unable to initialize connection to Bobby Hartline');
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback response
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or call me at (615) 845-6286 for immediate coaching support.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleLinkedInConnect = () => {
    // TODO: Implement LinkedIn OAuth
    setIsConnectedToLinkedIn(true);
    
    const linkedInMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Great! I can see you're a Senior Sales Manager in SaaS. Based on your experience, I'd like to understand your current sales goals and challenges. What's the biggest obstacle you're facing in closing deals right now?",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, linkedInMessage]);
  };

  const handleCRMConnect = (crmId?: string, crmName?: string) => {
    if (crmId && crmName) {
      // Handle successful connection from modal
      setIsConnectedToCRM(true);
      setConnectedCRMName(crmName);
      
      const crmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Excellent! I can now access your ${crmName} data to better understand your sales pipeline and help optimize your approach. This will help me provide more targeted coaching based on your actual deals and customer interactions. Would you like to see your pipeline overview?`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, crmMessage]);
      setShowPipeline(true);
    } else {
      // Show CRM selection modal
      setShowCRMModal(true);
    }
  };

  const handleCRMButtonClick = () => {
    setShowCRMModal(true);
  };

  const handleProfileSaved = () => {
    setShowPipeline(true);
    setShowProfileEditor(false);
  };

  const toggleProfileEditor = () => {
    setShowProfileEditor(!showProfileEditor);
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };

  const startVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (realtimeChat) {
        realtimeChat.stopRecording();
      }
    } else {
      // Start recording
      try {
        if (!realtimeChat || !isConnected) {
          await initRealtimeChat();
        }
        
        if (realtimeChat && isConnected) {
          await realtimeChat.startRecording();
          setIsRecording(true);
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoadingResponse) return;
    
    setInputValue(suggestion);
    setIsLoadingResponse(true);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: suggestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    try {
      // Check if this is a CRM query (account or contact)
      const accountQueryPattern = /(?:tell me about|what about|analyze|show me|how is|status of|information on)\s+(?:account\s+|contact\s+|person\s+)?([^?]+)/i;
      const contactQueryPattern = /(?:tell me about|what about|analyze|show me|how is|status of|information on)\s+(?:contact\s+|person\s+)([^?]+)/i;
      
      const accountMatch = suggestion.match(accountQueryPattern);
      const isContactQuery = contactQueryPattern.test(suggestion);
      
      if (accountMatch && isConnectedToCRM) {
        const searchTerm = accountMatch[1].trim();
        const queryType = isContactQuery ? 'contact' : 'account/contact';
        
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Call CRM query function
          const response = await supabase.functions.invoke('crm-account-query', {
            body: {
              searchTerm: searchTerm,
              query: suggestion,
              userId: user.id
            }
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.response,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoadingResponse(false);
          return;
        } catch (crmError) {
          console.error('CRM query error:', crmError);
          // Fall back to regular chat if CRM query fails
        }
      }

      // Try activity fetch if user asked for latest activity in CallProof
      const wantsActivitySug = /callproof/i.test(suggestion) && (
        /\b(latest|last|recent)\b/i.test(suggestion) ||
        /\b(calls?|appointments?|meetings?|emails?)\b/i.test(suggestion) ||
        /activit/i.test(suggestion)
      );
      if (isConnectedToCRM && wantsActivitySug) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const response = await supabase.functions.invoke('callproof-activity', {
            body: { userId: user.id, limit: 10, days: 7 }
          });

          if (response.error) throw new Error(response.error.message);

          const content = response.data?.summary || 'No recent activity found.';
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoadingResponse(false);
          return;
        } catch (err) {
          console.error('Activity fetch error:', err);
          // fall through to regular chat
        }
      }

      // Regular chat flow
      let chatInstance = realtimeChat;
      
      if (!chatInstance) {
        chatInstance = await initRealtimeChat();
      }
      
      if (chatInstance) {
        await chatInstance.sendTextMessage(suggestion);
      } else {
        throw new Error('Unable to initialize connection to Bobby Hartline');
      }
    } catch (error) {
      console.error('Error getting agent response:', error);
      
      // Fallback response
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or call me at (615) 845-6286 for immediate coaching support.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const suggestions = [
    {
      icon: Phone,
      title: "🚀 TEST: Search Brad Cook",
      description: "Direct test of CallProof integration",
      prompt: "FORCE_CRM_TEST_Brad_Cook"
    },
    {
      icon: Phone,
      title: "Role Play: Cold Call",
      description: "Practice making cold calls with realistic scenarios",
      prompt: "Help me role play a cold call. You be the prospect and I'll practice my opening."
    },
    {
      icon: Users,
      title: "Handle Objections",
      description: "Learn to overcome common sales objections",
      prompt: "Let's practice handling objections. Give me some tough objections to work through."
    },
    {
      icon: Mail,
      title: "Write Sales Email",
      description: "Craft compelling outreach emails that get responses",
      prompt: "Help me write a sales email that will get prospects to respond and book a meeting."
    },
    {
      icon: FileText,
      title: "Discovery Questions",
      description: "Master the art of asking the right questions",
      prompt: "Teach me powerful discovery questions to uncover prospect pain points and needs."
    },
    {
      icon: Users,
      title: "Closing Techniques",
      description: "Learn proven methods to close more deals",
      prompt: "Help me practice different closing techniques and when to use each one."
    },
    {
      icon: Phone,
      title: "Follow-up Strategy",
      description: "Create systematic follow-up sequences",
      prompt: "Help me create an effective follow-up strategy for prospects who went quiet."
    },
    ...(isConnectedToCRM ? [
      {
        icon: Database,
        title: "Analyze Account",
        description: "Get insights about a specific CRM account",
        prompt: "Tell me about account [Account Name] and what opportunities I should focus on"
      },
      {
        icon: Users,
        title: "Contact Information",
        description: "Get details about a specific contact",
        prompt: "Tell me about contact [Contact Name] and their engagement history"
      },
      {
        icon: Phone,
        title: "Latest CallProof Activity",
        description: "Last 10 calls, appointments, emails (7 days)",
        prompt: "Show me the latest activities in CallProof from the past 7 days."
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          {/* CRM Connection Bar */}
          {!isConnectedToCRM && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <Database className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Connect your CRM to unlock advanced coaching features</span>
                <Button 
                  onClick={handleCRMButtonClick}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Connect CRM
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">AI Sales Coach Onboarding</h1>
              <Link to="/coach-settings">
                <Button variant="outline" size="sm">
                  Customize Coach
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-2">
              {!isConnectedToLinkedIn && (
                <Button 
                  onClick={handleLinkedInConnect}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Linkedin className="w-4 h-4" />
                  Connect LinkedIn
                </Button>
              )}
              
              {isConnectedToCRM && (
                <Button
                  onClick={handleCRMButtonClick}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-success/10 border-success/20 text-success hover:bg-success/20"
                >
                  <Database className="w-4 h-4" />
                  {connectedCRMName || 'CRM'} Connected
                </Button>
              )}
              
              
              <Button
                onClick={toggleProfileEditor}
                variant={showProfileEditor ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Profile
              </Button>
            </div>
          </div>
          
          {/* Coach Information */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-primary">Your Sales Coach: Bobby Hartline</h2>
              <p className="text-sm text-muted-foreground">AI Sales Training Expert • Available 24/7</p>
              <p className="text-lg font-mono font-semibold text-primary mt-1">(615) 845-6286</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-160px)]">
          
          
          {/* Suggestions Section - Always visible for testing */}
          {true && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
                How can I help you today?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {suggestions.map((suggestion, index) => {
                  const IconComponent = suggestion.icon;
                  return (
                    <Card 
                      key={`suggestion-${index}-${suggestion.title}`}
                      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
                      onClick={() => handleSuggestionClick(suggestion.prompt)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <IconComponent className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{suggestion.title}</div>
                          <div className="text-xs text-muted-foreground leading-tight">
                            {suggestion.description}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-6 mb-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className={message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                    {message.role === 'assistant' ? 'BH' : 'You'}
                  </AvatarFallback>
                </Avatar>
                
                <Card className={`max-w-[80%] p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-card'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span className="text-xs opacity-60 mt-2 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </Card>
              </div>
            ))}
            
            {isConnectedToLinkedIn && (
              <Card className="p-4 bg-success/10 border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm font-medium">LinkedIn Connected</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your profile information will help personalize your coaching experience
                </p>
              </Card>
            )}
            
            
            {/* Loading indicator */}
            {isLoadingResponse && (
              <div className="flex gap-4">
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    BH
                  </AvatarFallback>
                </Avatar>
                <Card className="max-w-[80%] p-4 bg-card">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Bobby is thinking...</p>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Voice Mode Interface */}
          {isVoiceMode && (
            <div className="border-t pt-4">
              <VoiceCoach 
                coachPersonality={getCoachConfig().coachingStyle || "supportive sales coach"}
                scenario={`sales coaching for ${getCoachConfig().industry || "general"} industry`}
                onTranscript={(transcript) => {
                  // Add voice transcript to chat messages
                  const voiceMessage: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: transcript,
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, voiceMessage]);
                }}
              />
            </div>
          )}

           {/* Text Input Area */}
           {!isVoiceMode && (
             <div>
              <div className="border-t pt-4">
                <div className="flex gap-3">
                 <div className="flex-1">
                   <Input
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     placeholder="Tell me about your sales goals and challenges..."
                     onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                     className="h-12"
                     disabled={isRecording || isCoachSpeaking || isLoadingResponse}
                   />
                 </div>
                 
                 {/* Voice Chat Toggle */}
                 <Button
                   onClick={toggleVoiceMode}
                   variant={isVoiceMode ? "default" : "outline"}
                   size="lg"
                   className="h-12 px-4"
                   title="Toggle Voice Chat Mode"
                 >
                   {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                 </Button>

                 {/* Voice Recording Button */}
                 <Button 
                   onClick={startVoiceRecording}
                   variant={isRecording ? "destructive" : "outline"}
                   size="lg"
                   className={`h-12 px-4 ${isRecording ? 'animate-pulse' : ''}`}
                   disabled={isCoachSpeaking}
                 >
                   {isRecording ? (
                     <Square className="w-4 h-4" />
                   ) : (
                     <Mic className="w-4 h-4" />
                   )}
                 </Button>
                 
                 {/* Send Text Button */}
                 <Button 
                   onClick={handleSendMessage}
                   disabled={!inputValue.trim() || isRecording || isCoachSpeaking}
                   size="lg"
                   className="h-12 px-6"
                 >
                   <Send className="w-4 h-4" />
                 </Button>
               </div>
               
               {/* Status Messages */}
               <div className="mt-2 text-center">
                 {isRecording && (
                   <p className="text-xs text-destructive font-medium animate-pulse">
                     🔴 Recording... Click stop when finished
                   </p>
                 )}
                 {isCoachSpeaking && (
                   <p className="text-xs text-primary font-medium flex items-center justify-center gap-1">
                     <Volume2 className="w-3 h-3" />
                     Coach is speaking...
                   </p>
                 )}
                 {!isRecording && !isCoachSpeaking && (
                   <p className="text-xs text-muted-foreground">
                     Type a message, or click the mic to record voice
                   </p>
                 )}
               </div>
               </div>
             </div>
          )}
        </div>
          
          {/* Profile Editor Section */}
          {showProfileEditor && (
            <div className="space-y-4">
              <ProfileEditor onProfileSaved={handleProfileSaved} />
            </div>
          )}

          {/* Pipeline Section */}
          {showPipeline && (
            <div className="space-y-4">
              <Card>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Pipeline Overview</h3>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Active Deals</div>
                          <div className="text-xs text-muted-foreground">Currently in pipeline</div>
                        </div>
                        <div className="text-2xl font-bold text-primary">24</div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Pipeline Value
                          </div>
                          <div className="text-xs text-muted-foreground">Total potential revenue</div>
                        </div>
                        <div className="text-2xl font-bold text-success">$847K</div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Follow-ups Due
                          </div>
                          <div className="text-xs text-muted-foreground">This week</div>
                        </div>
                        <div className="text-2xl font-bold text-destructive">7</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {
                      // TODO: Navigate to full pipeline view
                      console.log("View full pipeline clicked");
                    }}
                  >
                    View Full Pipeline
                  </Button>
                </div>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <div className="p-4">
                  <h4 className="text-md font-semibold mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start">
                      <Phone className="w-4 h-4 mr-2" />
                      Log Call
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* CRM Connect Modal */}
      <CRMConnectModal 
        open={showCRMModal}
        onOpenChange={setShowCRMModal}
        onConnect={handleCRMConnect}
      />
    </div>
  );
};

export default Onboarding;