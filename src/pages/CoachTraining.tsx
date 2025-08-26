import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { CoachInstructionsManager } from "@/components/CoachInstructionsManager";
import { supabase } from "@/integrations/supabase/client";
import { TrainingDataManager } from "@/components/TrainingDataManager";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { ConversationThread, ConversationMessage } from "@/components/ConversationThread";
import { Textarea } from "@/components/ui/textarea";
import { HomeIcon } from "lucide-react";


const CoachTraining = () => {
  const { coachId } = useParams();
  const [searchParams] = useSearchParams();
  const coachName = searchParams.get('name') || 'Coach';
  const { toast } = useToast();

  // Coach identity used for communications
  const [coachEmail, setCoachEmail] = useState(searchParams.get('email') || '');
  const [coachData, setCoachData] = useState<any>(null);
  useEffect(() => {
    if (!coachId) return;

    const fetchCoachData = async () => {
      try {
        // Fetch coach
        const { data: coach, error: coachError } = await supabase
          .from("coaches")
          .select("*")
          .eq("id", coachId)
          .single();

        if (coachError) throw coachError;

        // Start with base coach data
        let enrichedCoach = { ...coach };

        if (coach?.id) {
          // Fetch assistant info
          const { data: assistant, error: assistantError } = await supabase
            .from("coach_assistants")
            .select("*")
            .eq("coach_id", coach.id)
            .maybeSingle(); // safer than .single()

          if (assistantError) throw assistantError;

          if (assistant) {
            enrichedCoach = {
              ...enrichedCoach,
              system_prompt: assistant.system_prompt,
              first_message: assistant.first_message,
              agent_language: assistant.agent_language,
              llm_model: assistant.llm_model,
              temperature: assistant.temperature,
            };
          }

          console.log("Fetched coach assistants:", assistant);
        }

        setCoachData(enrichedCoach);
      } catch (err) {
        console.error("❌ Error fetching coach:", err);
      }
    };

    fetchCoachData();
  }, [coachId]);



  // Autofill coach email from app settings if not provided
  useEffect(() => {
    if (coachEmail) return;
    (async () => {
      try {
        const { data } = await ((supabase.from as any)('app_settings')
          .select('value')
          .eq('key', 'default_home_coach')
          .maybeSingle());
        if (data?.value?.email) setCoachEmail(data.value.email);
      } catch (e) {
        console.warn('Failed to load default coach email', e);
      }
    })();
  }, [coachEmail]);

  const [feedbackText, setFeedbackText] = useState("");
  const [trainingPrompt, setTrainingPrompt] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<any>(null);

  // Filter states
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedRep, setSelectedRep] = useState("all");
  const [selectedCoach, setSelectedCoach] = useState("all");

  // Real communications from Supabase (emails)
  const [emailConvos, setEmailConvos] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadEmails = async () => {
      setLoadingEmails(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setEmailConvos([]); setIsAdmin(false); return; }

        // Check if admin
        const { data: adminFlag } = await (supabase.rpc as any)('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        const admin = !!adminFlag;
        setIsAdmin(admin);

        let query: any = supabase
          .from('email_conversations')
          .select('id, sent_at, recipient_email, subject, message, coach_email')
          .order('sent_at', { ascending: false })
          .limit(20);

        if (admin) {
          if (coachEmail) query = query.eq('coach_email', coachEmail);
        } else {
          query = query.eq('user_id', user.id);
          if (coachEmail) query = query.eq('coach_email', coachEmail);
        }

        const { data, error } = await query;
        if (error) throw error;
        setEmailConvos(data || []);
      } catch (e) {
        console.error('Failed to load emails', e);
      } finally {
        setLoadingEmails(false);
      }
    };
    loadEmails();
  }, [coachEmail]);

  // Mock data for coach communications
  const communications = [
    {
      id: 1,
      timestamp: "2024-01-15 10:30 AM",
      type: "call",
      recipient: "Sarah Johnson",
      recipientType: "rep",
      company: "TechCorp Inc",
      coach: "Jack Daly Sales Coach",
      scenario: "Cold Call - Tech Startup Coaching",
      coachResponse: "Great opening! I noticed you built rapport quickly by mentioning their recent funding announcement. For the next call, try asking more discovery questions about their current sales process before presenting our solution. Your conversion rate on similar calls could improve by 15% with better discovery.",
      userMessage: "Hi, this is Sarah from SalesBoost. I saw your company just raised Series A funding - congratulations! I'd love to discuss how we've helped other fast-growing startups scale their sales operations.",
      rating: 4,
      feedback: "Good rapport building, could improve discovery"
    },
    {
      id: 2,
      timestamp: "2024-01-15 2:15 PM",
      type: "report",
      recipient: "David Wilson - VP Sales",
      recipientType: "leader",
      company: "TechCorp Inc",
      coach: "Jack Daly Sales Coach",
      scenario: "Weekly Performance Report",
      coachResponse: "This week's team performance shows strong improvement in discovery questions (+22%) and objection handling (+18%). Sarah Johnson and Mike Chen are leading the team in conversion rates. I recommend focusing next week's training on closing techniques, as our data shows a 12% drop-off in final stage conversions. Alex Rodriguez would benefit from additional objection handling practice.",
      userMessage: "Weekly coaching report requested for sales team performance analysis",
      rating: 5,
      feedback: "Comprehensive leadership insights"
    },
    {
      id: 3,
      timestamp: "2024-01-14 4:45 PM",
      type: "email",
      recipient: "Mike Chen",
      recipientType: "rep",
      company: "SalesBoost LLC",
      coach: "Enterprise Sales Coach",
      scenario: "Follow-up Strategy - Enterprise Deal",
      coachResponse: "Your follow-up timing is perfect, and I like how you referenced the specific pain points discussed in the demo. Consider adding a case study of a similar enterprise client to strengthen your credibility. Also, try to include a specific next step with a timeline in your follow-ups.",
      userMessage: "Hi John, Following up on our demo yesterday. I know you mentioned concerns about implementation timelines for your 500+ person sales team. I'd like to share how we helped TechCorp (similar size) achieve a 40% productivity increase within 90 days.",
      rating: 5,
      feedback: "Excellent follow-up strategy"
    },
    {
      id: 4,
      timestamp: "2024-01-14 9:20 AM",
      type: "alert",
      recipient: "Jennifer Martinez - Sales Director",
      recipientType: "leader",
      company: "GrowthTech Solutions",
      coach: "Inbound Sales Coach",
      scenario: "Team Performance Alert",
      coachResponse: "Alert: I've detected a 25% decrease in prospecting activities across the team this week. This typically leads to pipeline issues in 3-4 weeks. Recommend immediate action: schedule team prospecting session, review activity goals with underperforming reps (Alex R., Tom K.), and consider implementing daily prospecting sprints.",
      userMessage: "Automated performance monitoring triggered alert",
      rating: 4,
      feedback: "Proactive leadership alerting"
    },
    {
      id: 5,
      timestamp: "2024-01-13 3:30 PM",
      type: "call",
      recipient: "Alex Rodriguez",
      recipientType: "rep",
      company: "TechCorp Inc",
      coach: "Jack Daly Sales Coach",
      scenario: "Objection Handling - Price Concern",
      coachResponse: "You handled the price objection well by focusing on ROI. Next time, try breaking down the cost per user per day to make it feel smaller, and ask about their current cost of missed opportunities. Also, anchor with a higher price point first, then present your actual pricing.",
      userMessage: "I understand budget is a concern. Let me put this in perspective - our solution costs less than a cup of coffee per rep per day, but the average client sees a 25% increase in closed deals within the first quarter.",
      rating: 3,
      feedback: "Good approach, needs better anchoring technique"
    }
  ];

  // Mock data for draft nudges waiting for approval
  const draftNudges = [
    {
      id: 1,
      recipient: "Sarah Johnson",
      company: "TechCorp Inc",
      coach: "Jack Daly Sales Coach",
      createdAt: "2024-01-15 11:45 AM",
      triggerReason: "Missed daily call quota (3/8 calls completed)",
      urgency: "medium",
      draftMessage: "Hi Sarah! I noticed you're at 3 calls today with 5 hours left. Your average of 8 calls per day puts you in the top 20% of our team. A quick 30-minute power hour could easily get you to 6-7 calls. Want to try a focused calling session? I can share the exact script that helped Mike close 2 deals yesterday.",
      suggestedAction: "Motivational nudge with specific script offer",
      aiConfidence: 85
    },
    {
      id: 2,
      recipient: "Alex Rodriguez",
      company: "TechCorp Inc",
      coach: "Jack Daly Sales Coach",
      createdAt: "2024-01-15 1:20 PM",
      triggerReason: "Low conversion rate on last 5 prospects (0% close rate)",
      urgency: "high",
      draftMessage: "Hey Alex, I've been analyzing your recent calls and noticed something important. Your discovery questions are excellent, but I'm seeing prospects go cold after objection handling. I found a technique that increased Mike Chen's close rate by 40% in similar situations. Want to hop on a quick 10-minute call to review the pattern I'm seeing?",
      suggestedAction: "Skill coaching intervention",
      aiConfidence: 92
    },
    {
      id: 3,
      recipient: "Mike Chen",
      company: "SalesBoost LLC",
      coach: "Enterprise Sales Coach",
      createdAt: "2024-01-15 3:30 PM",
      triggerReason: "Positive momentum - 3 consecutive successful calls",
      urgency: "low",
      draftMessage: "Mike! 🔥 Three successful calls in a row - you're on fire today! Your objection handling on that last call was textbook perfect. This momentum is exactly what separates top performers. How about we capture this winning streak and aim for 2 more quality conversations before end of day?",
      suggestedAction: "Momentum reinforcement",
      aiConfidence: 78
    },
    {
      id: 4,
      recipient: "Jennifer Martinez - Sales Director",
      company: "GrowthTech Solutions",
      coach: "Inbound Sales Coach",
      createdAt: "2024-01-15 4:00 PM",
      triggerReason: "Team performance dip detected (20% below weekly target)",
      urgency: "high",
      draftMessage: "Jennifer, quick heads up: I'm tracking a 20% dip in team activity today. Primary factors: Sarah and Tom are below call targets, Alex needs objection handling support. Recommendation: 15-minute team huddle focusing on energy/motivation, plus I can provide Alex with personalized coaching. This pattern typically rebounds within 24hrs with intervention.",
      suggestedAction: "Leadership alert with action plan",
      aiConfidence: 94
    }
  ];

  // Filter options
  const companies = ["all", "TechCorp Inc", "SalesBoost LLC", "GrowthTech Solutions"];
  const reps = ["all", "Sarah Johnson", "Mike Chen", "Alex Rodriguez", "David Wilson - VP Sales", "Jennifer Martinez - Sales Director"];
  const coaches = ["all", "Jack Daly Sales Coach", "Enterprise Sales Coach", "Inbound Sales Coach"];

  // Filter functions
  const filteredCommunications = communications.filter(comm => {
    if (selectedCompany !== "all" && comm.company !== selectedCompany) return false;
    if (selectedRep !== "all" && comm.recipient !== selectedRep) return false;
    if (selectedCoach !== "all" && comm.coach !== selectedCoach) return false;
    return true;
  });

  const filteredDrafts = draftNudges.filter(draft => {
    if (selectedCompany !== "all" && draft.company !== selectedCompany) return false;
    if (selectedRep !== "all" && draft.recipient !== selectedRep) return false;
    if (selectedCoach !== "all" && draft.coach !== selectedCoach) return false;
    return true;
  });

  const handleFeedback = (commId: number, isPositive: boolean) => {
    toast({
      title: isPositive ? "Positive Feedback Recorded" : "Improvement Note Recorded",
      description: "The coach AI will learn from this feedback to improve future responses.",
    });
  };

  const handleTraining = () => {
    if (!trainingPrompt.trim()) return;

    toast({
      title: "Training Prompt Submitted",
      description: "The coach AI will incorporate this guidance into future responses.",
    });
    setTrainingPrompt("");
  };

  const handleGeneralFeedback = () => {
    if (!feedbackText.trim()) return;

    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback. This will help improve the coach's performance.",
    });
    setFeedbackText("");
  };

  const handleDraftAction = (draftId: number, action: 'approve' | 'reject', feedback?: string) => {
    const draft = draftNudges.find(d => d.id === draftId);
    if (action === 'approve') {
      toast({
        title: "Draft Approved",
        description: `Message to ${draft?.recipient} has been approved and will be sent.`,
      });
    } else {
      toast({
        title: "Draft Rejected",
        description: `Message to ${draft?.recipient} was rejected. The AI will learn from this feedback.`,
      });
    }
    setSelectedDraft(null);
  };

  // Simplified training layout helpers
  const [instructionText, setInstructionText] = useState("");
  const [sending, setSending] = useState(false);
  // Comments handled within ConversationThread component

  const { supported, listening, transcript, start, stop, reset } = useSpeechRecognition();

  const sendInstruction = async () => {
    const base = (instructionText + (transcript ? (instructionText ? "\n\nVoice: " : "") + transcript : "")).trim();
    if (!base) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Sending instruction:", { coachName, base, userId: user?.id, systemPrompt: coachData?.system_prompt, elevenlabsAgentId: coachData?.agent_id });
      await supabase.functions.invoke('update-agent-instructions', {
        body: {
          coachName,
          customInstructions: base,
          firstMessage: coachData?.first_message || null,
          agentLanguage: coachData?.agent_language || null,
          llmModel: coachData?.llm_model || null,
          temperature: coachData?.temperature || null,
          userId: user?.id || null,
          systemPrompt: coachData?.system_prompt || null,
          elevenlabsAgentId: coachData?.agent_id || null,
        }
      });
      toast({ title: 'Instruction sent', description: 'Your guidance will be applied to the coach.' });
      setInstructionText("");
      reset();
    } catch (e: any) {
      console.error('sendInstruction error', e);
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const submitCommentText = async (c: any, text: string) => {
    try {
      const payload = `When sending messages like "${c.subject}" to ${c.recipient_email}, improve by: ${text}`;
      await supabase.functions.invoke('update-agent-instructions', { body: { coachName, customInstructions: payload } });
      toast({ title: 'Feedback sent', description: 'Thanks! The coach will learn from this.' });
    } catch (e: any) {
      console.error('submitComment error', e);
      toast({ title: 'Failed to send feedback', description: e.message, variant: 'destructive' });
    }
  };

  const sampleMessages: ConversationMessage[] = [
    {
      id: 'm1',
      sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      coach_email: coachEmail || 'coach@sample.com',
      recipient_email: 'me@example.com',
      subject: '',
      message: 'Hey, it’s Bobby. Quick check-in: how did the discovery call go?'
    },
    {
      id: 'm2',
      sent_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      coach_email: coachEmail || 'coach@sample.com',
      recipient_email: coachEmail || 'coach@sample.com',
      subject: '',
      message: 'Went well! Prospect was engaged, but timeline is tight.'
    },
    {
      id: 'm3',
      sent_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      coach_email: coachEmail || 'coach@sample.com',
      recipient_email: 'me@example.com',
      subject: '',
      message: 'Good. Follow up with a concise recap and a next-step ask for a 20‑min technical review.'
    },
    {
      id: 'm4',
      sent_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      coach_email: coachEmail || 'coach@sample.com',
      recipient_email: coachEmail || 'coach@sample.com',
      subject: '',
      message: 'Got it. I’ll propose Thursday 10am and include a brief ROI bullet list.'
    },
    {
      id: 'm5',
      sent_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      coach_email: coachEmail || 'coach@sample.com',
      recipient_email: 'me@example.com',
      subject: '',
      message: 'Perfect. Keep it tight and action-led. Send me the draft before you hit send.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
            <Link to="/" className="flex items-center gap-1 hover:underline">
              <HomeIcon className="h-4 w-4" /> Home
            </Link>
            <span className="mx-2">/</span>

            <Link to="/coach-management" className="hover:underline">
              Coach
            </Link>
            <span className="mx-2">/</span>

            <span className="text-foreground font-medium">
              Training
            </span>
          </nav>
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{coachName} – Coach Training</h1>
              <p className="text-muted-foreground">Simplify instructions, manage training data, and review conversations.</p>
            </div>
            {/* Breadcrumb */}

          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT: Instructions + Training Data */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instruct the Coach</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-3">
                    <Textarea
                      placeholder="Type instructions or use voice. Ex: 'Prioritize discovery questions before pitching. Use concise, action-led emails.'"
                      value={instructionText}
                      onChange={(e) => setInstructionText(e.target.value)}
                      className="md:flex-1"
                    />
                    <div className="flex items-center gap-2 md:self-end">
                      <Button
                        type="button"
                        variant={listening ? "secondary" : "outline"}
                        onClick={() => (listening ? stop() : start())}
                      >
                        {listening ? "Stop Voice" : "Use Voice"}
                      </Button>
                      <Button onClick={sendInstruction} disabled={sending || (!instructionText.trim() && !transcript.trim())}>
                        {sending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                  {supported ? (
                    transcript && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Voice transcript: <span className="text-foreground">{transcript}</span>
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-muted-foreground mt-2">Voice input not supported in this browser.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Instructions for the Coach</CardTitle>
                </CardHeader>
                <CardContent>
                  <CoachInstructionsManager coachName={coachName} coachEmail={coachEmail} />
                </CardContent>
              </Card>

              <TrainingDataManager />
            </div>

            {/* RIGHT: Conversations feed with inline comments */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Coach ↔ Users Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <ConversationThread
                      messages={sampleMessages}
                      coachEmail={coachEmail || 'coach@sample.com'}
                      onSendComment={submitCommentText}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>


      <Footer />
    </div>
  );
};

export default CoachTraining;