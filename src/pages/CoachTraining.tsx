import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, ThumbsUp, ThumbsDown, Send, Play, Users, TrendingUp, Clock, Star, AlertCircle, Shield, Target, FileText, CheckCircle, XCircle, Eye, Filter, Building, User, Mail } from "lucide-react";

import { Link, useParams, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { CoachInstructionsManager } from "@/components/CoachInstructionsManager";
import { EmailComposer } from "@/components/EmailComposer";
import { CoachWelcomeManager } from "@/components/CoachWelcomeManager";
import { supabase } from "@/integrations/supabase/client";

const CoachTraining = () => {
  const { coachId } = useParams();
  const [searchParams] = useSearchParams();
  const coachName = searchParams.get('name') || 'Coach';
  const { toast } = useToast();
  
  // Coach identity used for communications
  const [coachEmail, setCoachEmail] = useState(searchParams.get('email') || '');
  const [coachPhone] = useState(searchParams.get('phone') || '');
  const [coachImageUrl] = useState(searchParams.get('image') || '');
  const [coachDescription] = useState(searchParams.get('description') || '');
  
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

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link 
                to="/coach-management" 
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Coach Management
              </Link>
              <div>
                <h1 className="text-4xl font-bold text-foreground">
                  {coachName} Training
                </h1>
                <p className="text-xl text-muted-foreground mt-2">
                  Review communications and provide training feedback
                </p>
          </div>

          {/* Filters Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Sorting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company} value={company}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {company === "all" ? "All Companies" : company}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rep/Leader</Label>
                  <Select value={selectedRep} onValueChange={setSelectedRep}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {reps.map((rep) => (
                        <SelectItem key={rep} value={rep}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {rep === "all" ? "All People" : rep}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coach</Label>
                  <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach} value={coach}>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {coach === "all" ? "All Coaches" : coach}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {(selectedCompany !== "all" || selectedRep !== "all" || selectedCoach !== "all") && (
                <div className="mt-4 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedCompany("all");
                      setSelectedRep("all");
                      setSelectedCoach("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCommunications.length} communications, {filteredDrafts.length} drafts
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          </div>

          {/* Coach Communication */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-accent" />
                Coach Communication
              </CardTitle>
              <CardDescription>
                Send instructions, accountability tasks, or emails to your AI sales coach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!coachEmail && (
                <div className="space-y-2">
                  <Label htmlFor="coachEmail">Coach Email</Label>
                  <Input
                    id="coachEmail"
                    type="email"
                    placeholder="coach@yourcompany.com"
                    value={coachEmail}
                    onChange={(e) => setCoachEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set the coach’s email to enable sending instructions and emails.
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <CoachInstructionsManager coachName={coachName} coachEmail={coachEmail} />
                <EmailComposer
                  coachName={coachName}
                  coachEmail={coachEmail}
                  coachPhone={coachPhone}
                  coachImageUrl={coachImageUrl}
                />
                <CoachWelcomeManager
                  coachName={coachName}
                  coachEmail={coachEmail}
                  coachPhone={coachPhone}
                  coachImageUrl={coachImageUrl}
                  coachDescription={coachDescription}
                />
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Instructions: send tasks for accountability or analysis</li>
                  <li>• Email: send messages as your coach to reps or prospects</li>
                  <li>• Welcome: introduce the coach and onboard new users</li>
                  <li>• Responses: AI coach processes and replies via email</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Communications</p>
                    <p className="text-2xl font-bold">247</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">4.2</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Reps</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Improvement Rate</p>
                    <p className="text-2xl font-bold">+23%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="communications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="communications">Communications Review</TabsTrigger>
              <TabsTrigger value="drafts" className="relative">
                Draft Nudges
                {draftNudges.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                    {draftNudges.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="training">Training & Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="communications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Recent Emails</CardTitle>
                  <CardDescription>
                    Emails exchanged with {coachName}{coachEmail ? ` (${coachEmail})` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingEmails ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : emailConvos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent emails found.</p>
                  ) : (
                    emailConvos.map((e) => (
                      <div key={e.id} className="border rounded p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate mr-4">{e.subject}</div>
                          <span className="text-xs text-muted-foreground">{new Date(e.sent_at).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">To: {e.recipient_email}</div>
                        <div className="text-sm mt-2 line-clamp-2">{e.message}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Communications</CardTitle>
                  <CardDescription>
                    Review and provide feedback on the coach's responses to reps and insights shared with leadership
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {filteredCommunications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant={comm.type === "call" ? "default" : comm.type === "report" ? "secondary" : comm.type === "alert" ? "destructive" : "outline"}>
                            {comm.type === "call" ? "Call" : comm.type === "email" ? "Email" : comm.type === "report" ? "Report" : "Alert"}
                          </Badge>
                          <Badge variant={comm.recipientType === "leader" ? "secondary" : "default"}>
                            {comm.recipientType === "leader" ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : (
                              <Target className="h-3 w-3 mr-1" />
                            )}
                            {comm.recipientType === "leader" ? "Leadership" : "Rep Coaching"}
                          </Badge>
                          <span className="font-medium">{comm.recipient}</span>
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {comm.company}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {comm.coach}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{comm.scenario}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{comm.timestamp}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">
                            {comm.recipientType === "leader" ? "Context/Request:" : "Rep's Message:"}
                          </h4>
                          <p className="text-sm">{comm.userMessage}</p>
                        </div>
                        
                        <div className={`p-4 rounded-lg ${comm.recipientType === "leader" ? "bg-blue-50 dark:bg-blue-950/20" : "bg-primary/5"}`}>
                          <h4 className="font-semibold mb-2">
                            {comm.recipientType === "leader" ? "Leadership Insight:" : "Coach's Response:"}
                          </h4>
                          <p className="text-sm">{comm.coachResponse}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < comm.rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">{comm.feedback}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleFeedback(comm.id, true)}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {comm.recipientType === "leader" ? "Good Insight" : "Good Response"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleFeedback(comm.id, false)}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Needs Improvement
                          </Button>
                        </div>
                      </div>
                      </div>
                    ))}

                  {filteredCommunications.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No communications found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your filters to see more results.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Draft Nudges Pending Approval
                  </CardTitle>
                  <CardDescription>
                    Review and approve AI-generated performance nudges before they're sent to reps and leaders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredDrafts.map((draft) => (
                    <div key={draft.id} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant={draft.urgency === "high" ? "destructive" : draft.urgency === "medium" ? "default" : "secondary"}>
                            {draft.urgency.toUpperCase()} PRIORITY
                          </Badge>
                          <span className="font-medium">{draft.recipient}</span>
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {draft.company}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {draft.coach}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="h-3 w-3" />
                            <span>{draft.aiConfidence}% confidence</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{draft.createdAt}</span>
                        </div>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Trigger Reason:</h4>
                        <p className="text-sm">{draft.triggerReason}</p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Draft Message:</h4>
                        <p className="text-sm leading-relaxed">{draft.draftMessage}</p>
                      </div>

                      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">AI Suggested Action:</h4>
                        <p className="text-sm">{draft.suggestedAction}</p>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Button 
                          size="sm"
                          onClick={() => handleDraftAction(draft.id, 'approve')}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Send
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedDraft(draft)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review & Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDraftAction(draft.id, 'reject')}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filteredDrafts.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No pending drafts found</h3>
                      <p className="text-muted-foreground">
                        {(selectedCompany !== "all" || selectedRep !== "all" || selectedCoach !== "all") 
                          ? "Try adjusting your filters to see more results." 
                          : "All AI-generated nudges have been reviewed. New drafts will appear here when the coach identifies performance opportunities."
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Draft Statistics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Drafts</p>
                        <p className="text-2xl font-bold">{filteredDrafts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Approval Rate</p>
                        <p className="text-2xl font-bold">87%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Response Time</p>
                        <p className="text-2xl font-bold">2.3h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="training" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Training Prompts</CardTitle>
                    <CardDescription>
                      Provide specific guidance for the coach to improve responses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="training">Training Instruction</Label>
                      <Textarea
                        id="training"
                        placeholder="Example: When handling price objections, always ask about the cost of the problem before presenting our pricing..."
                        value={trainingPrompt}
                        onChange={(e) => setTrainingPrompt(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <Button onClick={handleTraining} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Training
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>General Feedback</CardTitle>
                    <CardDescription>
                      Share overall observations about the coach's performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="feedback">Performance Feedback</Label>
                      <Textarea
                        id="feedback"
                        placeholder="The coach is doing well with rapport building but could improve on discovery questions..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <Button onClick={handleGeneralFeedback} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Training Actions</CardTitle>
                  <CardDescription>
                    Common training scenarios and improvements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <Button variant="outline" className="justify-start">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Improve Objection Handling
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Enhance Discovery Questions
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Better Rapport Building
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Stronger Closing Techniques
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Star className="h-4 w-4 mr-2" />
                      Improve Follow-up Strategy
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Play className="h-4 w-4 mr-2" />
                      Demo Best Practices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CoachTraining;