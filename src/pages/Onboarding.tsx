import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft, Send, Linkedin, Mic, MicOff, Database, Volume2, Square, Phone, Mail, FileText, Users, TrendingUp, DollarSign, Calendar, Settings, Copy, Check, PhoneCallIcon, Home, ChevronRight, History, MessageCircleDashedIcon } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileEditor from "@/components/ProfileEditor";
import VoiceCoach from "@/components/VoiceCoach";
import ChatHistory from "@/components/ChatHistory";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import { supabase } from "@/integrations/supabase/client";
import { CRMConnectModal } from "@/components/CRMConnectModal";
import { sessionManager } from "@/utils/sessionManager";
import { get } from "http";
import { toast } from "sonner";

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  type?: 'crm_data' | 'general' | 'test';
  message_type?: 'text' | 'audio' | 'system';
  metadata?: Record<string, any>;
  session_id?: string;
}

interface CoachConfig {
  coachId?: string;
  coachName: string;
  coachingStyle: string;
  roastingLevel: string;
  customInstructions: string;
  firstMessage: string;
  industry: string;
  methodology: string;
  phone?: string | null;
  avatarUrl?: string | null;
  agentId?: string | null;
}

// Improved message ID generation with strong uniqueness
let __messageIdCounter = 0;
const generateMessageId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `msg-${(crypto as Crypto).randomUUID()}`;
    }
  } catch { }

  __messageIdCounter = (__messageIdCounter + 1) % Number.MAX_SAFE_INTEGER;
  const timePart = Date.now().toString(36);
  const perfPart = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000).toString(36) : '';
  const counterPart = __messageIdCounter.toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `msg-${timePart}-${perfPart}-${counterPart}-${randomPart}`;
};

// Component to render message content with markdown support
const MessageContent = ({ content = "", type, messageId, typewriterState }: {
  content?: string;
  type?: string;
  messageId?: string;
  typewriterState?: { fullText: string; displayText: string; isTyping: boolean };
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Error copying text
    }
  };

  // Use typewriter content if available, otherwise use original content
  const displayContent = typewriterState?.displayText ?? content ?? "";
  const safeContent = displayContent;
  const hasMarkdown =
    /[*_`#\[\]()]/.test(safeContent) ||
    safeContent.includes('📋') ||
    safeContent.includes('📈') ||
    safeContent.includes('💡') ||
    safeContent.includes('**') ||
    safeContent.includes('#') ||
    safeContent.includes('>') ||
    safeContent.includes('```') ||
    safeContent.includes('*');


  const isMultipleContactSelection =
    safeContent.includes('Multiple Contacts Found') &&
    safeContent.includes('Please select the correct one');

  const extractContactOptions = () => {
    const lines = content.split('\n');
    const options: { number: string; name: string; company?: string; email?: string }[] = [];

    lines.forEach(line => {
      const match = line.match(/^\*\*(\d+)\.\*\*\s*(.+?)(?:\s*-\s*(.+?))?(?:\s*\((.+?)\))?$/);
      if (match) {
        options.push({
          number: match[1],
          name: match[2].trim(),
          company: match[3]?.trim(),
          email: match[4]?.trim()
        });
      }
    });

    return options;
  };

  const contactOptions = isMultipleContactSelection ? extractContactOptions() : [];

  const renderFormattedContent = (text: string) => {
    const lines = text.split("\n");

    let currentList: JSX.Element[] = [];
    let listType: "ul" | null = null;
    const rendered: JSX.Element[] = [];

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        rendered.push(
          <ul key={`ul-${rendered.length}`} className="ml-3 mb-3 space-y-1">
            {currentList}
          </ul>
        );
        currentList = [];
        listType = null;
      }
    };

    const formatInline = (line: string) => {
      const parseLinksAndImages = (text: string): (string | JSX.Element)[] => {
        const elements: (string | JSX.Element)[] = [];
        const regex = /(!)?\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            elements.push(text.slice(lastIndex, match.index));
          }
          const isImage = !!match[1];
          const altOrText = match[2] || (isImage ? 'View image' : 'link');
          const url = match[3];
          if (isImage) {
            elements.push(
              <a
                key={`img-${elements.length}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block my-2"
              >
                <img
                  src={url}
                  alt={altOrText || 'Image'}
                  className="h-24 w-24 rounded-full object-cover border shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.replaceWith(
                        Object.assign(document.createElement('a'), {
                          href: url,
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          textContent: altOrText || url,
                          className: 'underline text-blue-600 hover:text-blue-700',
                        })
                      );
                    }
                  }}
                />
              </a>
            );
          } else {
            elements.push(
              <a
                key={`link-${elements.length}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-700"
              >
                {altOrText || url}
              </a>
            );
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          elements.push(text.slice(lastIndex));
        }
        return elements;
      };

      const parts = parseLinksAndImages(line);

      const applyEmphasis = (segment: string, keyPrefix: string) => {
        if (/\*\*\*.*?\*\*\*/.test(segment)) {
          return segment.split(/(\*\*\*.*?\*\*\*)/g).map((part, i) =>
            part.startsWith("***") && part.endsWith("***") ? (
              <em key={`${keyPrefix}-b+i-${i}`}>
                <strong>{part.slice(3, -3)}</strong>
              </em>
            ) : (
              part
            )
          );
        }

        if (/\*\*[^*]*\*\*/.test(segment)) {
          return segment.split(/(\*\*[^*]*\*\*)/g).map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>
            ) : (
              part
            )
          );
        }

        if (/\*.*?\*/.test(segment)) {
          return segment.split(/(\*.*?\*)/g).map((part, i) =>
            part.startsWith("*") && part.endsWith("*") ? (
              <em key={`${keyPrefix}-i-${i}`}>{part.slice(1, -1)}</em>
            ) : (
              part
            )
          );
        }

        return segment;
      };

      const nodes: (string | JSX.Element)[] = [];
      parts.forEach((part, idx) => {
        if (typeof part === 'string') {
          const emphasized = applyEmphasis(part, `seg-${idx}`);
          if (Array.isArray(emphasized)) nodes.push(...emphasized);
          else nodes.push(emphasized);
        } else {
          nodes.push(part);
        }
      });

      return nodes as any;
    };

    const normalizedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const current = lines[i];
      const next = i + 1 < lines.length ? lines[i + 1] : '';
      const labelMatch = current.trim().match(/(!)?\[[^\]]+\]\s*$/);
      const urlMatch = next.trim().match(/^\((https?:\/\/[^)]+)\)$/);
      if (labelMatch && urlMatch) {
        normalizedLines.push(`${current.trim()}(${urlMatch[1]})`);
        i++;
      } else {
        normalizedLines.push(current);
      }
    }

    normalizedLines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed === "") {
        flushList();
        rendered.push(<div key={`br-${index}`} className="mb-3" />);
        return;
      }

      const sectionMatch = trimmed.match(/^([A-Z][A-Za-z ]+):$/);
      if (sectionMatch) {
        flushList();
        rendered.push(
          <h3 key={`section-${index}`} className="font-semibold text-lg mb-2 text-primary">
            {sectionMatch[1]}
          </h3>
        );
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const Tag = `h${Math.min(level, 3)}` as keyof JSX.IntrinsicElements;
        rendered.push(
          <Tag key={`h-${index}`} className="font-semibold text-lg mb-2 text-primary">
            {text}
          </Tag>
        );
        return;
      }

      const listMatch = trimmed.match(/^(?:\d+\.|[-•])\s+(.*)$/);
      if (listMatch) {
        if (listType !== "ul") flushList();
        listType = "ul";
        currentList.push(
          <li key={`ul-item-${index}`} className="flex items-start">
            <span className="mr-2"></span>
            <span>{formatInline(listMatch[1])}</span>
          </li>
        );
        return;
      }

      flushList();
      rendered.push(
        <p key={`p-${index}`} className="mb-2 text-sm leading-relaxed">
          {formatInline(trimmed)}
        </p>
      );
    });

    flushList();
    return rendered;
  };

  return (
    <div className="relative">
      <div className="prose prose-sm max-w-none">
        {hasMarkdown ? (
          <>
            {renderFormattedContent(safeContent)}
            <div className="absolute right-0 bottom-0 flex gap-1 group-hover:opacity-100 transition-opacity" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-6 w-6"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {safeContent}
          </p>
        )}
          
      </div>

      {isMultipleContactSelection && contactOptions.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Quick Selection:</div>
          <div className="flex flex-wrap gap-2">
            {contactOptions.map((option) => (
              <Button
                key={option.number}
                variant="outline"
                size="sm"
                onClick={() => {
                  const event = new CustomEvent('contactSelection', {
                    detail: { selection: option.number }
                  });
                  window.dispatchEvent(event);
                }}
                className="text-xs"
              >
                {option.number}. {option.name}
                {option.company && ` - ${option.company}`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Onboarding = () => {
  const getDefaultCoachConfig = (): CoachConfig => ({
    coachName: 'Bobby Hartline',
    coachingStyle: 'supportive',
    roastingLevel: 'medium',
    customInstructions: '',
    firstMessage: 'Hello! I\'m Bobby your AI sales coach. Let\'s get to know each other. What is your name?',
    industry: 'saas',
    methodology: 'challenger',
    phone: '(615) 845-6286',
    avatarUrl: null,
  });

  const getFirstMessage = () => {
    try {
      const savedSettings = localStorage.getItem('coachSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        return settings.firstMessage || getDefaultCoachConfig().firstMessage;
      }
    } catch (e) {
      console.error('Error loading coach settings:', e);
    }
    return getDefaultCoachConfig().firstMessage;
  };

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateMessageId(),
      role: 'assistant',
      content: getFirstMessage(),
      timestamp: new Date()
    }
  ]);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [isConnectedToLinkedIn, setIsConnectedToLinkedIn] = useState(false);
  const [isConnectedToCRM, setIsConnectedToCRM] = useState(() => {
    const crmConnection = localStorage.getItem('crmConnection');
    return crmConnection ? true : false;
  });
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false);

  const [showPipeline, setShowPipeline] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [realtimeChat, setRealtimeChat] = useState<RealtimeChat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [coachConfigState, setCoachConfigState] = useState<CoachConfig>(() => {
    try {
      const saved = localStorage.getItem('coachSettings');
      if (saved) return JSON.parse(saved);
    } catch { }
    return getDefaultCoachConfig();
  });
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
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [typewriterMessages, setTypewriterMessages] = useState<Record<string, { fullText: string; displayText: string; isTyping: boolean }>>({});

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
  useEffect(() => {
    checkCRMConnection();
  }, []);
  const scrollToChatArea = () => {
    setTimeout(() => {
      const messagesContainer = document.getElementById('chat-messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: "smooth"
        });
      }
      const mainContainer = document.querySelector('.overflow-y-auto.scrollbar-thin');
      if (mainContainer) {
        mainContainer.scrollTo({
          top: mainContainer.scrollHeight,
          behavior: "smooth"
        });
      }
    }, 300);
  };
  // Typewriter effect function
  const startTypewriterEffect = useCallback((messageId: string, fullText: string) => {
    setTypewriterMessages(prev => ({
      ...prev,
      [messageId]: {
        fullText,
        displayText: '',
        isTyping: true
      }
    }));

    let currentIndex = 0;

    const typeNextCharacter = () => {
      if (currentIndex < fullText.length) {
        setTypewriterMessages(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            displayText: fullText.slice(0, currentIndex + 10)
          }
        }));
        currentIndex++;

        if (currentIndex % 20 === 0) {
          scrollToChatArea();
        }

        setTimeout(typeNextCharacter, 1);
      } else {
        setTypewriterMessages(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            isTyping: false
          }
        }));
        setTimeout(() => scrollToChatArea(), 100);
      }
    };

    typeNextCharacter();
  }, []);
  useEffect(() => {
    const loadCoach = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        await sessionManager.cleanupOldSessions();

        const { data: profile } = await supabase
          .from('profiles')
          .select('default_coach_id, first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.default_coach_id) {
          const coachId = profile.default_coach_id as string;

          const { data: coach, error: coachErr } = await supabase
            .from('coaches')
            .select('id, name, description, avatar_url, agent_id')
            .eq('id', coachId)
            .maybeSingle();

          if (coachErr) {
            console.warn('Coach query error:', coachErr);
            return;
          }

          if (!coach || typeof coach !== "object") {
            console.warn('Invalid coach data - not an object:', { coach });
            return;
          }
          if (!("id" in (coach as Record<string, any>))) {
            console.warn('Invalid coach data - missing id:', { coach });
            return;
          }
          const validCoach = coach as { id: string; name?: string; avatar_url?: string; agent_id?: string };

          const { data: assistant, error: asstErr } = await (supabase as unknown as any)
            .from('coach_assistants')
            .select('first_message, coaching_style, roasting_level, phone')
            .eq('coach_id', coachId)
            .maybeSingle();

          const c = validCoach;
          const newConfig: CoachConfig = {
            coachId: c.id,
            coachName: c.name || getDefaultCoachConfig().coachName,
            coachingStyle: assistant?.coaching_style || getDefaultCoachConfig().coachingStyle,
            roastingLevel: assistant?.roasting_level || getDefaultCoachConfig().roastingLevel,
            customInstructions: '',
            firstMessage: assistant?.first_message || getDefaultCoachConfig().firstMessage,
            industry: getDefaultCoachConfig().industry,
            methodology: getDefaultCoachConfig().methodology,
            phone: assistant?.phone || null,
            avatarUrl: c.avatar_url || null,
            agentId: c.agent_id || null,
          };

          setCoachConfigState(newConfig);
          try { localStorage.setItem('coachSettings', JSON.stringify(newConfig)); } catch { }

          try {
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
            const displayName = fullName || (user.email ? user.email.split('@')[0] : '');
            const coachName = newConfig.coachName || 'Coach';
            const base = newConfig.firstMessage || getDefaultCoachConfig().firstMessage;
            const personalized = base
              .replace(/\{name\}/g, displayName)
              .replace(/\{coach_name\}/g, coachName)
              .replace(/\s*What is your name\??/i, '')
              .trim();
            setMessages(prev => {
              if (prev.length && prev[0].role === 'assistant') {
                const updated = [...prev];
                updated[0] = { ...updated[0], content: personalized };
                return updated;
              }
              return prev;
            });
          } catch { }
          await initializeSession(newConfig.coachingStyle || 'supportive sales coach');
        } else {
          await initializeSession('supportive sales coach');
        }
      } catch (err) {
        console.error('Error loading default coach:', err);
      }
    };

    loadCoach();
  }, []);

  // Initialize session management
  const initializeSession = async (coachPersonality: string) => {
    try {
      const currentSessionId = sessionManager.getCurrentSession();

      if (currentSessionId) {
        const isActive = await sessionManager.isSessionActive(currentSessionId);
        if (isActive) {
          setSessionId(currentSessionId);
          const sessionMessages = await sessionManager.getSessionMessages(currentSessionId);
          if (sessionMessages.length > 0) {
            const convertedMessages: Message[] = sessionMessages.map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              message_type: msg.message_type as 'text' | 'audio' | 'system',
              metadata: msg.metadata as Record<string, any>,
              session_id: msg.session_id
            }));
            setMessages(convertedMessages);
            setHasUserSentMessage(true);
          }
        } else {
          console.log('Previous session ended, waiting for user interaction to start new session');
        }
      } else {
        console.log('No current session, waiting for user interaction to start new session');
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };


  useEffect(() => {
    if (!sessionId || messages.length < 3) return;

    const updateHistory = async () => {
      try {
        const coachConfig = getCoachConfig();
        const agentId = coachConfig.agentId || 'default-agent';

        // Extract key insights from recent messages
        const recentMessages = messages.slice(-5);
        const topics = recentMessages
          .map(msg => msg.content)
          .join(' ')
          .toLowerCase()
          .match(/\b(sales|pipeline|prospecting|closing|objections|follow-up|meeting|call|email|proposal|demo|negotiation|quota|target|goal|challenge|problem|solution|value|roi|budget|decision|timeline|competitor|market|industry|saas|enterprise|smb|startup)\b/g) || [];

        const uniqueTopics = [...new Set(topics)].slice(0, 5);

        await sessionManager.updateConversationHistory(
          agentId,
          `Recent conversation with ${coachConfig.coachName}`,
          [`Session has ${messages.length} messages`, `Topics discussed: ${uniqueTopics.join(', ')}`],
          uniqueTopics
        );
      } catch (error) {
        console.error('Error updating conversation history:', error);
      }
    };

    if (messages.length % 10 === 0) {
      updateHistory();
    }
  }, [messages.length, sessionId]);

  const handleContactSelection = useCallback((event: CustomEvent) => {
    const { selection } = event.detail;

    if (isProcessing || isLoadingResponse) return;

    setInputValue(selection);

    setTimeout(() => {
      if (selection && !isLoadingResponse && !isProcessing) {
        setIsProcessing(true);
        setHasUserSentMessage(true);

        const userMessage: Message = {
          id: generateMessageId(),
          role: 'user',
          content: selection,
          timestamp: new Date()
        };

        setMessages(prev => {
          const messageExists = prev.some(msg =>
            msg.content === selection &&
            msg.role === 'user' &&
            Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 1000
          );

          if (messageExists) {
            return prev;
          }

          return [...prev, userMessage];
        });

        setInputValue("");
        setIsLoadingResponse(true);
        scrollToChatArea();
        handleSendMessageDirect(selection);
      }
    }, 100);
  }, [isProcessing, isLoadingResponse]);
  useEffect(() => {
    window.addEventListener('contactSelection', handleContactSelection as EventListener);

    return () => {
      window.removeEventListener('contactSelection', handleContactSelection as EventListener);
    };
  }, [handleContactSelection]);
  const handleSendMessageDirect = async (messageText: string) => {
    // Direct message send
    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const coachConfig = getCoachConfig();
        currentSessionId = await sessionManager.createSession(
          coachConfig.coachingStyle || 'supportive sales coach',
          'Sales Coaching Session'
        );
        setSessionId(currentSessionId);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const previousResponse = typeof window !== 'undefined' ? localStorage.getItem('lastAgentResponse') : null;
      const directResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversationId: null,
          coachConfig: getCoachConfig(),
          userId: user?.id,
          previousResponse: previousResponse || undefined,
          coachId: getCoachConfig().coachId,
        })
      });

      const directData = await directResponse.json();
      let content: string = directData.response || "No response received.";

      if (directData.success) {
        let smsId = generateMessageId();
        setIsLoadingResponse(false);

        startTypewriterEffect(smsId, content);
        const assistantMessage: Message = {
          id: smsId,
          role: 'assistant',
          content: content,
          timestamp: new Date(),
          type: 'general',
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Save messages to session
        if (currentSessionId) {
          await sessionManager.addMessage(currentSessionId, 'user', messageText, 'text');
          await sessionManager.addMessage(currentSessionId, 'assistant', assistantMessage.content, 'text');
        }

        // Start typewriter effect for the response
        try { localStorage.setItem('lastAgentResponse', directData.response || ''); } catch { }
      } else {
        throw new Error(directData.error || 'Direct call failed');
      }
    } catch (error) {
      // Direct call error
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: error.message || "Unable to process your request. Please try again later.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Save error message to session
      if (sessionId) {
        await sessionManager.addMessage(sessionId, 'user', messageText, 'text');
        await sessionManager.addMessage(sessionId, 'assistant', errorMessage.content, 'text');
      }

      // Start typewriter effect for the response
      setIsLoadingResponse(false);

      startTypewriterEffect(errorMessage.id, errorMessage.content);
    } finally {
      setIsProcessing(false);
    }
  };
  useEffect(() => {
    const personalize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
  }, []);
  const getCoachConfig = (): CoachConfig => {
    if (coachConfigState) return coachConfigState;
    try {
      const savedConfig = localStorage.getItem('coachSettings');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Error loading coach settings:', error);
    }
    return getDefaultCoachConfig();
  };
  // Memoize coach initials calculation
  const getCoachInitials = useCallback((name: string) => {
    try {
      const parts = name.trim().split(/\s+/);
      const initials = parts.slice(0, 2).map((p) => p[0]).join('');
      return initials.toUpperCase() || 'AI';
    } catch {
      return 'AI';
    }
  }, []);
  const initRealtimeChat = async () => {
    if (realtimeChat) return realtimeChat;
    const { data: { session } } = await supabase.auth.getSession();
    let token = '';
    if (session?.access_token) {
      token = `?token=${encodeURIComponent(session.access_token)}`;
    }
    try {
      const coachConfig = getCoachConfig();

      const chat = new RealtimeChat({
        coachId: coachConfig.agentId || "",
        voiceId: undefined,
        signedUrlEndpoint: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-websocket${token}`,
        onConnect: () => {
          setIsConnected(true);
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsRecording(false);
          setIsCoachSpeaking(false);
        },
        onError: (err) => {
          setIsConnected(false);
          setIsRecording(false);
          setIsCoachSpeaking(false);
        },
        onMessage: (evt) => {
          console.log('Received event:', {
            type: evt.type,
            transcript: evt.transcript,
            response: evt.response,
            fullEvent: evt
          });

          // Handle user speech/transcript events
          const userTranscriptEvents = [
            "user_transcript",
            "transcript",
            "user_speaking",
            "speech_transcript",
            "user_message",
            "user_input",
            "conversation.item.created",
            "conversation_item_created"
          ];

          // Check for user transcript in various event structures
          let userTranscript = null;

          if (userTranscriptEvents.includes(evt.type)) {
            if (evt.transcript?.trim()) {
              userTranscript = evt.transcript.trim();
            } else if (evt.item?.content?.[0]?.transcript?.trim()) {
              userTranscript = evt.item.content[0].transcript.trim();
            } else if (evt.item?.content?.trim()) {
              userTranscript = evt.item.content.trim();
            } else if (evt.delta?.transcript?.trim()) {
              userTranscript = evt.delta.transcript.trim();
            } else if (evt.text?.trim()) {
              userTranscript = evt.text.trim();
            }
          }

          if (userTranscript) {
            const userMessage: Message = {
              id: generateMessageId(),
              role: "user", // RIGHT side
              content: userTranscript,
              timestamp: new Date(),
              message_type: 'audio'
            };

            setMessages(prev => {
              // Check for recent duplicates
              const isDuplicate = prev.some(msg =>
                msg.content.trim() === userTranscript &&
                msg.role === 'user' &&
                Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 5000
              );

              if (isDuplicate) {
                return prev;
              }
              const newMessages = [...prev, userMessage];
              setTimeout(() => scrollToChatArea(), 100);
              return newMessages;
            });

            let currentSessionId = sessionId;
            if (!currentSessionId) {
              const coachConfig = getCoachConfig();
              sessionManager.createSession(
                coachConfig.coachingStyle || 'supportive sales coach',
                'Sales Coaching Session'
              ).then(newSessionId => {
                if (newSessionId) {
                  setSessionId(newSessionId);
                  sessionManager.addMessage(newSessionId, 'user', userTranscript, 'audio').catch(console.error);
                }
              }).catch(console.error);
            } else {
              sessionManager.addMessage(currentSessionId, 'user', userTranscript, 'audio').catch(console.error);
            }

            setInputValue("");
            return;
          }

          const assistantResponseEvents = [
            "agent_response",
            "response",
            "coach_response",
            "assistant_response",
            "bot_response",
            "response.text.done",
            "response.done"
          ];

          let assistantResponse = null;

          if (assistantResponseEvents.includes(evt.type)) {
            // Direct response field
            if (evt.response?.trim()) {
              assistantResponse = evt.response.trim();
            }
            // Text field
            else if (evt.text?.trim()) {
              assistantResponse = evt.text.trim();
            }
            // Content field
            else if (evt.content?.trim()) {
              assistantResponse = evt.content.trim();
            }
            // Delta text
            else if (evt.delta?.text?.trim()) {
              assistantResponse = evt.delta.text.trim();
            }
          }

          if (assistantResponse) {
            console.log('Agent response found:', assistantResponse);

            const assistantMessage: Message = {
              id: generateMessageId(),
              role: "assistant", // LEFT side
              content: assistantResponse,
              timestamp: new Date(),
              message_type: 'audio'
            };

            setMessages(prev => {
              // Check for duplicates
              const isDuplicate = prev.some(msg =>
                msg.content.trim() === assistantResponse &&
                msg.role === 'assistant' &&
                Math.abs(msg.timestamp.getTime() - assistantMessage.timestamp.getTime()) < 3000
              );

              if (isDuplicate) {
                return prev;
              }

              const newMessages = [...prev, assistantMessage];

              // Start typewriter effect for the assistant response
              setTimeout(() => startTypewriterEffect(assistantMessage.id, assistantMessage.content), 100);

              return newMessages;
            });

            // Save assistant voice message to session
            if (sessionId) {
              sessionManager.addMessage(sessionId, 'assistant', assistantResponse, 'audio').catch(console.error);
            }
            return; // Exit early
          }

          // Handle audio/speaking status
          const speakingStartEvents = ["audio", "audio_start", "speaking_start", "response.audio.start"];
          const speakingStopEvents = ["audio_done", "audio_end", "speaking_stop", "response.audio.done"];

          if (speakingStartEvents.includes(evt.type)) {
            setIsCoachSpeaking(true);
          }

          if (speakingStopEvents.includes(evt.type)) {
            setIsCoachSpeaking(false);
          }

          // Handle recording status
          const recordingStartEvents = ["user_speaking_started", "recording_start", "listening_start", "input_audio_buffer.speech_started"];
          const recordingStopEvents = ["user_speaking_stopped", "recording_stop", "listening_stop", "input_audio_buffer.speech_stopped"];

          if (recordingStartEvents.includes(evt.type)) {
            console.log(' User started speaking');
            setIsRecording(true);
          }

          if (recordingStopEvents.includes(evt.type)) {
            setIsRecording(false);
          }

          // Log all unhandled events to help identify what we're missing
          const allHandledEvents = [
            ...userTranscriptEvents,
            ...assistantResponseEvents,
            ...speakingStartEvents,
            ...speakingStopEvents,
            ...recordingStartEvents,
            ...recordingStopEvents,
            "session.created", "session.updated", "error", "rate_limits.updated"
          ];

          if (!allHandledEvents.includes(evt.type)) {
            console.log('Event keys:', Object.keys(evt));
            if (evt.transcript || evt.text || evt.content || (evt.item && evt.item.content)) {
              console.log('UNHANDLED EVENT CONTAINS TEXT CONTENT - THIS MIGHT BE USER INPUT!');
            }
          }
        }
      });

      await chat.start();
      setRealtimeChat(chat);
      console.log('RealtimeChat initialized successfully');
      return chat;
    } catch (error) {
      console.error('Error initializing RealtimeChat:', error);
      throw error;
    }
  };
  const startVoiceRecording = async () => {
    if (isRecording) {
      console.log('Stopping voice recording');
      setIsRecording(false);
      if (realtimeChat) {
        try {
          await realtimeChat.stopRecording();
        } catch (error) {
          console.error(' Error stopping recording:', error);
        }
      }
    } else {
      try {
        let chatInstance = realtimeChat;

        // Always reinitialize if not connected to ensure fresh connection
        if (!chatInstance || !isConnected) {
          setMessages([]);
          if (chatInstance) {
            try {
              await chatInstance.disconnect();
            } catch (e) {
              console.log('Previous connection cleanup done');
            }
          }
          chatInstance = await initRealtimeChat();
          setRealtimeChat(chatInstance);
        }

        // Simplified connection wait - the initRealtimeChat should handle connection
        let connectionWaitTime = 0;
        const maxWaitTime = 8000; // 8 seconds
        const checkInterval = 500; // 500ms

        while (!isConnected && connectionWaitTime < maxWaitTime) {
          console.log(`Waiting for connection... (${connectionWaitTime}ms)`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          connectionWaitTime += checkInterval;
        }

        if (!isConnected) {
          throw new Error("Connection timeout - unable to connect to voice service");
        }

        if (chatInstance && isConnected) {
          console.log('Starting recording...');

          // Request microphone permission explicitly
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Clean up test stream
          } catch (permError) {
            throw new Error("Microphone permission denied. Please allow microphone access and try again.");
          }

          await chatInstance.startRecording();
          setIsRecording(true);
          console.log('Recording started successfully');
        } else {
          throw new Error("Failed to establish connection for recording");
        }
      } catch (error) {
        console.error('Error with voice recording:', error);

        // More user-friendly error messages
        let errorMessage = error.message;
        if (errorMessage.includes('permission')) {
          errorMessage = "Please allow microphone access in your browser settings and try again.";
        } else if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
          errorMessage = "Connection timeout. Please check your internet connection and try again.";
        }

        setIsRecording(false);
        setIsConnected(false);

        // Clean up failed connection
        if (realtimeChat) {
          try {
            await realtimeChat.disconnect();
          } catch (e) {
            console.log('Cleanup after recording error done');
          }
          setRealtimeChat(null);
        }
      }
    }
  };
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoadingResponse || isProcessing) return;

    setIsProcessing(true);
    setHasUserSentMessage(true);

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => {
      const messageExists = prev.some(msg =>
        msg.content === userMessage.content &&
        msg.role === 'user' &&
        Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 1000
      );

      if (messageExists) {
        return prev;
      }

      return [...prev, userMessage];
    });

    const messageText = inputValue;
    setInputValue("");
    setIsLoadingResponse(true);

    // Ensure we have an active session before sending messages
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const coachConfig = getCoachConfig();
      currentSessionId = await sessionManager.createSession(
        coachConfig.coachingStyle || 'supportive sales coach',
        'Sales Coaching Session'
      );
      setSessionId(currentSessionId);
    }

    // Save user message to session
    if (currentSessionId) {
      await sessionManager.addMessage(currentSessionId, 'user', messageText, 'text');
    }

    // Auto-scroll to chat area after sending message
    scrollToChatArea();

    try {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const previousResponse = typeof window !== 'undefined' ? localStorage.getItem('lastAgentResponse') : null;
        const directResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            conversationId: null,
            coachConfig: getCoachConfig(),
            userId: user?.id,
            previousResponse: previousResponse || undefined,
            coachId: getCoachConfig().coachId || undefined,
          })
        });

        const directData = await directResponse.json();

        if (directData.success) {
          let content: string = directData.response || '';
          if (Array.isArray(directData.candidates) && directData.candidates.length > 0) {
            const lines = directData.candidates.map((c: any, idx: number) => `**${idx + 1}.** ${c.name || 'Unknown'}${c.company ? ` - ${c.company}` : ''}${c.email ? ` (${c.email})` : ''}`);
            content = `**Multiple Contacts Found**\n\nPlease select the correct one by number:\n\n${lines.join('\n')}`;
          }
          
          const isCRMData = content.includes('Contact Information') ||
          content.includes('**Contact Information**') ||
          content.includes('**Name:**') ||
          content.includes('**Company:**') ||
          content.includes('**Email:**') ||
          content.includes('**Phone:**') ||
          content.includes('Multiple Contacts Found');

          let variableId = generateMessageId();
          setIsLoadingResponse(false);
          startTypewriterEffect(variableId, content);

          const assistantMessage: Message = {
            id: variableId,
            role: 'assistant',
            content,
            timestamp: new Date(),
            type: isCRMData ? 'crm_data' : 'general'
          };

          setMessages(prev => [...prev, assistantMessage]);
          if (sessionId) {
            await sessionManager.addMessage(sessionId, 'assistant', assistantMessage.content, 'text');
          }
          try { localStorage.setItem('lastAgentResponse', directData.response || ''); } catch { }
        } else {
          throw new Error(directData.error || 'Direct call failed');
        }
      } catch (directError) {
        console.error('Direct call error:', directError);
        let chatInstance = realtimeChat;
        if (!chatInstance) {
          chatInstance = await initRealtimeChat();
        }
        if (chatInstance) {
          await chatInstance.sendText(messageText);
        } else {
          throw new Error(`Unable to initialize connection to ${getCoachConfig().coachName || 'your coach'}`);
        }
      }
    } catch (error) {
      const fallbackResponse: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or call me at (615) 845-6286 for immediate coaching support.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fallbackResponse]);
      if (sessionId) {
        await sessionManager.addMessage(sessionId, 'assistant', fallbackResponse.content, 'text');
      }
      setIsLoadingResponse(false);
      startTypewriterEffect(fallbackResponse.id, fallbackResponse.content);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isLoadingResponse, isProcessing, isConnectedToCRM, getCoachConfig]);

  const handleLinkedInConnect = () => {
    setIsConnectedToLinkedIn(true);

    const linkedInMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: "Great! I can see you're a Senior Sales Manager in SaaS. Based on your experience, I'd like to understand your current sales goals and challenges. What's the biggest obstacle you're facing in closing deals right now?",
      timestamp: new Date()
    };
    startTypewriterEffect(linkedInMessage.id, linkedInMessage.content);
    setMessages(prev => [...prev, linkedInMessage]);
  };

  const handleCRMConnect = (crmId?: string, crmName?: string) => {
    if (crmId && crmName) {
      setIsConnectedToCRM(true);
      setConnectedCRMName(crmName);

      const crmMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Excellent! I can now access your ${crmName} data to better understand your sales pipeline and help optimize your approach. This will help me provide more targeted coaching based on your actual deals and customer interactions. Would you like to see your pipeline overview?`,
        timestamp: new Date()
      };
      startTypewriterEffect(crmMessage.id, crmMessage.content);
      setMessages(prev => [...prev, crmMessage]);     
      setShowPipeline(true);
    } else {
      setShowCRMModal(true);
    }
  };

  const handleCRMButtonClick = () => {
    setShowCRMModal(true);
  };

  const handleProfileSaved = () => {
    if (!showChatHistory) {
      setShowPipeline(true);
      setShowProfileEditor(false);
    }
  };

  const toggleProfileEditor = () => {
    setShowChatHistory(false);
    setShowProfileEditor(!showProfileEditor);
    setShowPipeline(false);
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };

  // Handle session resume from chat history
  const handleResumeSession = async (sessionId: string) => {
    try {
      // Load messages from the selected session
      const sessionMessages = await sessionManager.getSessionMessages(sessionId);
      const convertedMessages: Message[] = sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        message_type: msg.message_type as 'text' | 'audio' | 'system',
        metadata: msg.metadata as Record<string, any>,
        session_id: msg.session_id
      }));

      setMessages(convertedMessages);
      setSessionId(sessionId);
      sessionManager.setCurrentSession(sessionId);
      setShowChatHistory(false);
      setShowProfileEditor(false);
      setShowPipeline(false);
      setHasUserSentMessage(true);
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  // Handle starting a new session
  const handleNewSession = async () => {
    try {
      // End the current session if it exists
      if (sessionId) {
        await sessionManager.endSession(sessionId);
      }

      const coachConfig = getCoachConfig();
      const newSessionId = await sessionManager.createSession(
        coachConfig.coachingStyle || 'supportive sales coach',
        'New Sales Coaching Session'
      );

      if (newSessionId) {
        setSessionId(newSessionId);
        setMessages([{
          id: generateMessageId(),
          role: 'assistant',
          content: getFirstMessage(),
          timestamp: new Date()
        }]);
        setHasUserSentMessage(false);
        setShowChatHistory(false);
        setShowProfileEditor(false);
        setShowPipeline(false);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  // Handle loading session messages in main chat area
  const handleLoadSessionMessages = async (sessionId: string) => {
    try {
      // If sessionId is empty, clear the current session and messages
      if (!sessionId || sessionId.trim() === '') {
        setMessages([]);
        setSessionId('');
        sessionManager.setCurrentSession(null);
        setHasUserSentMessage(false);
        return;
      }

      // End the current session if it exists and is different from the new session
      const currentSession = sessionManager.getCurrentSession();
      if (currentSession && currentSession !== sessionId) {
        await sessionManager.endSession(currentSession);
      }

      const sessionMessages = await sessionManager.getSessionMessages(sessionId);
      const convertedMessages: Message[] = sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        message_type: msg.message_type as 'text' | 'audio' | 'system',
        metadata: msg.metadata as Record<string, any>,
        session_id: msg.session_id
      }));

      setMessages(convertedMessages);
      setSessionId(sessionId);
      sessionManager.setCurrentSession(sessionId);
      setHasUserSentMessage(true);
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  };


  const handleSuggestionClick = useCallback(async (suggestion: string, type: string) => {
    if (isLoadingResponse || isProcessing) return;

    if (type === "CRM") {
      setInputValue(suggestion);

    } else {
      setIsProcessing(true);
      setHasUserSentMessage(true);
      setInputValue(suggestion);
      setIsLoadingResponse(true);
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: suggestion,
        timestamp: new Date()
      };

      setMessages(prev => {
        const messageExists = prev.some(msg =>
          msg.content === suggestion &&
          msg.role === 'user' &&
          Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 1000
        );

        if (messageExists) {
          return prev;
        }

        return [...prev, userMessage];
      });

      setInputValue("");
      scrollToChatArea();

      try {
        await handleSendMessageDirect(suggestion);
      } catch (error) {
        const fallbackResponse: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again or call me at (615) 845-6286 for immediate coaching support.",
          timestamp: new Date()
        };
        setIsLoadingResponse(false);
        startTypewriterEffect(fallbackResponse.id, fallbackResponse.content);
        setMessages(prev => [...prev, fallbackResponse]);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isLoadingResponse, isProcessing, handleSendMessageDirect]);

  // Memoize suggestions array to prevent unnecessary re-renders
  const suggestions = useMemo(() => [
    {
      icon: Phone,
      title: "Role Play: Cold Call",
      description: "Practice making cold calls with realistic scenarios",
      prompt: "Help me role play a cold call. You be the prospect and I'll practice my opening.",
      type: "ElevenLabs"
    },
    {
      icon: Users,
      title: "Handle Objections",
      description: "Learn to overcome common sales objections",
      prompt: "Let's practice handling objections. Give me some tough objections to work through.",
      type: "General"
    },
    {
      icon: Mail,
      title: "Write Sales Email",
      description: "Craft compelling outreach emails that get responses",
      prompt: "Help me write a sales email that will get prospects to respond and book a meeting.",
      type: "General"
    },
    {
      icon: FileText,
      title: "Discovery Questions",
      description: "Master the art of asking the right questions",
      prompt: "Teach me powerful discovery questions to uncover prospect pain points and needs.",
      type: "General"
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
        prompt: "Tell me about account [Account Name] and what opportunities I should focus on",
        type: "CRM"
      },
      {
        icon: Users,
        title: "Contact Information",
        description: "Get details about a specific contact",
        prompt: "Tell me about contact [Contact Name] and their engagement history",
        type: "CRM"
      },
      {
        icon: Phone,
        title: "Latest CallProof Activity",
        description: "Last 10 calls, appointments, emails (7 days)",
        prompt: "Show me the latest activities in CallProof from the past 7 days  for  [Account Name].",
        type: "CRM"
      }
    ] : [])
  ], [isConnectedToCRM]);

  return (
    <div className="h-[100%] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 shadow-lg flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-[5%]">
          {/* CRM Connection Bar */}
          {!isConnectedToCRM && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200/60 dark:border-blue-800/60 rounded-xl p-2 my-2 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Connect your CRM to unlock advanced coaching features</span>
                </div>
                <Button
                  onClick={handleCRMButtonClick}
                  size="sm"
                  className="flex items-center gap-1 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  <Database className="w-3 h-3" />
                  <span className="text-xs">Connect CRM</span>
                </Button>
              </div>
            </div>
          )}

          {/* Main Header Content */}
          <div className="py-2">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              {/* Title and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                  AI Sales Coach Onboarding
                </h1>
                <Link to={`/company-coach?edit=${getCoachConfig().coachId }`} className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800">
                    <Settings className="w-3 h-3 mr-1" />
                    Customize Coach
                  </Button>
                </Link>
              </div>

              {/* Connection Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!isConnectedToLinkedIn && (
                  <Button
                    onClick={handleLinkedInConnect}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 flex-1 sm:flex-none text-sm border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950/50"
                  >
                    <Linkedin className="w-3 h-3" />
                    <span className="hidden sm:inline">Connect LinkedIn</span>
                    <span className="sm:hidden">LinkedIn</span>
                  </Button>
                )}

                {isConnectedToCRM && (
                  <Button
                    onClick={handleCRMButtonClick}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/70 flex-1 sm:flex-none text-xs"
                  >
                    <Database className="w-3 h-3" />
                    <span className="hidden sm:inline">{connectedCRMName || 'CRM'} Connected</span>
                    <span className="sm:hidden">CRM</span>
                  </Button>
                )}

                {/* <Button
                  onClick={() => {
                    setShowChatHistory(!showChatHistory);
                    setShowProfileEditor(false);
                    setShowPipeline(false);
                  }}
                  variant={showChatHistory ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-1 flex-1 sm:flex-none text-xs"
                >
                  <History className="w-3 h-3" />
                  <span className="hidden sm:inline">History</span>
                  <span className="sm:hidden">History</span>
                </Button> */}

                <Button
                  onClick={toggleProfileEditor}
                  variant={showProfileEditor ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-1 flex-1 sm:flex-none text-xs"
                >
                  <Settings className="w-3 h-3" />
                  <span className="hidden sm:inline">Profile</span>
                  <span className="sm:hidden">Profile</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/30 h-[95%]">
        {/* Main Container with full width and responsive layout */}
        <div className="h-full w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-2 h-full max-w-none 2xl:px-8 3xl:px-12">
            <div className="flex gap-6 h-full mobile:flex-col tablet:flex-row">
              {/* Chat History Section - Left Side */}
              <div className="w-80 mobile:w-full mobile:h-64 tablet:w-72 tablet:h-full desktop:w-80 large:w-80 wide:w-96 ultra:w-[28rem] flex-shrink-0 border-r mobile:border-r-0 mobile:border-b tablet:border-r tablet:border-b-0 border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-lg h-full">
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                  <ChatHistory
                    onResumeSession={handleResumeSession}
                    onNewSession={handleNewSession}
                    currentSessionId={sessionId}
                    onLoadSessionMessages={handleLoadSessionMessages}
                  />
                </div>
              </div>

              {/* Chat Section - Middle Area */}
              <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden min-w-0 h-full mobile:h-auto mobile:flex-1 tablet:h-full rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                {/* Welcome Header & Suggestions Section - Only show if user hasn't sent a message */}
                {(!isVoiceMode && !hasUserSentMessage) && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center mb-8 max-w-2xl">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {getCoachInitials(getCoachConfig().coachName || 'Bobby Hartline')}
                        </span>
                      </div>
                      <h1 className="text-3xl font-normal text-gray-800 dark:text-gray-200 mb-2">
                        Ready when you are.
                      </h1>
                      <p className="text-lg text-gray-600 dark:text-gray-400">
                        AI Sales Training Expert • Available 24/7
                      </p>
                      {getCoachConfig().phone && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                            {getCoachConfig().phone}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Input Area - Centered */}
                    <div className="w-full max-w-3xl mb-8">
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
                        <Input
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                          }}
                          placeholder="Tell me about your sales goals and challenges..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 border-0 bg-transparent text-base placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                          disabled={isRecording || isCoachSpeaking || isLoadingResponse}
                        />
                        <Button
                          onClick={toggleVoiceMode}
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                          title="Voice Chat Mode"
                        >
                          <PhoneCallIcon className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={startVoiceRecording}
                          variant="ghost"
                          size="sm"
                          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${isRecording ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                          disabled={isCoachSpeaking}
                          title={isRecording ? "Stop Recording" : "Start Voice Recording"}
                        >
                          {isRecording ? (
                            <Square className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isRecording || isCoachSpeaking}
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                      {/* Status Messages */}
                      {(isRecording || isCoachSpeaking) && (
                        <div className="text-center mt-3">
                          {isRecording && (
                            <p className="text-sm text-red-500 font-medium animate-pulse flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              Recording...
                            </p>
                          )}
                          {isCoachSpeaking && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2">
                              <Volume2 className="w-4 h-4 animate-pulse" />
                              Coach is speaking...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Suggestion Cards */}
                    <div className="w-full max-w-4xl">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {suggestions.slice(0, 8).map((suggestion, index) => {
                          const IconComponent = suggestion.icon;
                          return (
                            <button
                              key={`suggestion-${index}-${suggestion.title}`}
                              onClick={() => handleSuggestionClick(suggestion.prompt, suggestion.type)}
                              className="p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                                  <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                                    {suggestion.title}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {suggestion.description}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                {(!isVoiceMode && hasUserSentMessage) && (
                  <div id="chat-messages-container" className="flex-1 overflow-y-auto space-y-4 px-4 py-6 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent overflow-x-hidden max-w-4xl mx-auto w-full">
                    {messages.map((message) => {
                      // Show user voice messages on the left (like agent)
                      const isUserVoice = message.role === 'user' && message.message_type === 'audio';
                      const isAgent = message.role === 'assistant';
                      const isUserText = message.role === 'user' && !isUserVoice;

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-4 group ${isUserText ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isUserText && (
                            <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                              {isAgent && (getCoachConfig().avatarUrl || '').trim() !== '' ? (
                                <AvatarImage src={getCoachConfig().avatarUrl as string} alt={getCoachConfig().coachName} />
                              ) : null}
                              <AvatarFallback className="bg-blue-600 text-white text-sm">
                                {isAgent
                                  ? getCoachInitials(getCoachConfig().coachName || 'Coach')
                                  : 'You'}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className={`max-w-[70%] ${isUserText ? 'ml-auto' : ''}`}>
                            <div className={`p-4 rounded-2xl ${isAgent
                              ? message.type === 'crm_data'
                                ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                              : isUserVoice
                                ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 text-gray-900 dark:text-gray-100'
                                : 'bg-blue-600 dark:bg-blue-600 text-white'
                              }`}>
                              <MessageContent
                                content={message.content}
                                type={message.type}
                                messageId={message.id}
                                typewriterState={isAgent ? typewriterMessages[message.id] : undefined}
                              />
                            </div>
                            <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${isUserText ? 'text-right' : 'text-left'}`}>
                              {message.timestamp.toLocaleTimeString()}
                              {isUserVoice && (
                                <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                                  (Voice)
                                </span>
                              )}
                            </div>
                          </div>

                          {isUserText && (
                            <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                              <AvatarFallback className="bg-gray-600 text-white text-sm">
                                You
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })}

                    {isConnectedToLinkedIn && (
                      <Card className="p-2 bg-success/10 border-success/20">
                        <div className="flex items-center gap-2 text-success">
                          <Linkedin className="w-3 h-3" />
                          <span className="text-sm font-medium">LinkedIn Connected</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your profile information will help personalize your coaching experience
                        </p>
                      </Card>
                    )}

                    {/* Typing indicator */}
                    {isLoadingResponse && (
                      <div className="flex gap-4 justify-start">
                        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                          {(getCoachConfig().avatarUrl || '').trim() !== '' ? (
                            <AvatarImage src={getCoachConfig().avatarUrl as string} alt={getCoachConfig().coachName} />
                          ) : null}
                          <AvatarFallback className="bg-blue-600 text-white text-sm">
                            {getCoachInitials(getCoachConfig().coachName || 'Coach')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[70%]">
                          <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                              {/* Typing animation dots */}
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                {(getCoachConfig().coachName || 'Coach').split(' ')[0]} is thinking...
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Mode Interface */}
                {isVoiceMode && (
                  <div className="border-t pt-4">
                    <Button
                      onClick={toggleVoiceMode}
                      variant="outline"
                      size="sm"
                      className="mb-4 mx-auto flex items-center gap-1 text-sm border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                    >
                      <MessageCircleDashedIcon className="w-3 h-3 mr-1" />
                      Switch to Chat
                    </Button>
                    <VoiceCoach
                      coachPersonality={getCoachConfig().coachingStyle || "supportive sales coach"}
                      scenario={`sales coaching for ${getCoachConfig().industry || "general"} industry`}
                      onTranscript={(transcript) => {
                        if (transcript?.trim()) {
                          const voiceMessage: Message = {
                            id: generateMessageId(),
                            role: 'user',
                            content: transcript.trim(),
                            timestamp: new Date(),
                            message_type: 'audio'
                          };

                          setMessages(prev => {
                            // Prevent duplicates
                            const exists = prev.some(msg =>
                              msg.content === voiceMessage.content &&
                              msg.role === 'user' &&
                              Math.abs(msg.timestamp.getTime() - voiceMessage.timestamp.getTime()) < 2000
                            );

                            if (!exists) {
                              return [...prev, voiceMessage];
                            }
                            return prev;
                          });
                        }
                      }}
                    />
                  </div>
                )}

                {/* Text Input Area */}
                {!isVoiceMode && hasUserSentMessage && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 pt-4 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200 max-w-4xl pb-4 z-50 ">
                        <Input
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                          }}
                          placeholder="Tell me about your sales goals and challenges..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 border-0 bg-transparent text-base placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                          disabled={isRecording || isCoachSpeaking || isLoadingResponse}
                        />
                        <Button
                          onClick={startVoiceRecording}
                          variant="ghost"
                          size="sm"
                          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${isRecording ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                          disabled={isCoachSpeaking}
                          title={isRecording ? "Stop Recording" : "Start Voice Recording"}
                        >
                          {isRecording ? (
                            <Square className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          onClick={toggleVoiceMode}
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                          title="Voice Chat Mode"
                        >
                          <PhoneCallIcon className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isRecording || isCoachSpeaking}
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                      {/* Status Messages */}
                      {(isRecording || isCoachSpeaking) && (
                        <div className="text-center mt-3">
                          {isRecording && (
                            <p className="text-sm text-red-500 font-medium animate-pulse flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              Recording...
                            </p>
                          )}
                          {isCoachSpeaking && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2">
                              <Volume2 className="w-4 h-4 animate-pulse" />
                              Coach is speaking...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Card Section - Right Side */}
              <div className="w-80 mobile:w-full mobile:h-64 tablet:w-72 tablet:h-full desktop:w-80 large:w-80 wide:w-96 ultra:w-[28rem] flex-shrink-0 border-l mobile:border-l-0 mobile:border-t tablet:border-l tablet:border-t-0 border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-lg h-full">
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent p-4">
                  {/* Profile Editor Section */}
                  {showProfileEditor && (
                    <ProfileEditor onProfileSaved={handleProfileSaved} />
                  )}

                  {/* Pipeline Section */}
                  {showPipeline && (
                    <div className="space-y-4">
                      <Card className="shadow-lg border border-slate-200/40 dark:border-slate-700/40 bg-gradient-to-br from-white/90 to-slate-50/70 dark:from-slate-800/90 dark:to-slate-900/70 backdrop-blur-lg rounded-xl">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold">Pipeline Overview</h3>
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>

                          <div className="space-y-2">
                            <div className="p-2 bg-muted/50 rounded-lg border">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium">Active Deals</div>
                                  <div className="text-sm text-muted-foreground">Currently in pipeline</div>
                                </div>
                                <div className="text-lg font-bold text-primary">24</div>
                              </div>
                            </div>

                            <div className="p-2 bg-muted/50 rounded-lg border">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    Pipeline Value
                                  </div>
                                  <div className="text-sm text-muted-foreground">Total potential revenue</div>
                                </div>
                                <div className="text-lg font-bold text-success">$847K</div>
                              </div>
                            </div>

                            <div className="p-2 bg-muted/50 rounded-lg border">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Follow-ups Due
                                  </div>
                                  <div className="text-sm text-muted-foreground">This week</div>
                                </div>
                                <div className="text-lg font-bold text-destructive">7</div>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => {
                              // TODO: Navigate to full pipeline view
                              // View full pipeline clicked
                            }}
                          >
                            View Full Pipeline
                          </Button>
                        </div>
                      </Card>

                      {/* Quick Actions */}
                      <Card className="shadow-lg border border-slate-200/40 dark:border-slate-700/40 bg-gradient-to-br from-white/90 to-slate-50/70 dark:from-slate-800/90 dark:to-slate-900/70 backdrop-blur-lg rounded-xl">
                        <div className="p-3">
                          <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
                          <div className="grid grid-cols-1 gap-1">
                            <Button variant="outline" size="sm" className="justify-start h-8 text-xs">
                              <Phone className="w-3 h-3 mr-2" />
                              Log Call
                            </Button>
                            <Button variant="outline" size="sm" className="justify-start h-8 text-xs">
                              <Mail className="w-3 h-3 mr-2" />
                              Send Email
                            </Button>
                            <Button variant="outline" size="sm" className="justify-start h-8 text-xs">
                              <Calendar className="w-3 h-3 mr-2" />
                              Schedule Meeting
                            </Button>
                            <Button variant="outline" size="sm" className="justify-start h-8 text-xs">
                              <FileText className="w-3 h-3 mr-2" />
                              Create Note
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </main >

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
