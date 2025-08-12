import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Send, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerProps {
  coachName: string;
  coachEmail: string;
  coachPhone?: string;
  coachImageUrl?: string;
}

export const EmailComposer = ({ coachName, coachEmail, coachPhone, coachImageUrl }: EmailComposerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: ""
  });

  const handleSendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('send-coach-email', {
        body: {
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
          coachName,
          coachEmail,
          coachPhone,
          coachImageUrl,
          userId: user?.id
        }
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: `Your message has been sent successfully`,
      });

      setEmailForm({ to: "", subject: "", message: "" });
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_email', coachEmail)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEmailHistory(data || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading email history:', error);
      toast({
        title: "Failed to load history",
        description: "Could not load email history",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Email as {coachName}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Send Email as {coachName}</DialogTitle>
              <DialogDescription>
                Send an email to someone you're coaching from your AI coach's email address.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="from">From</Label>
                <Input id="from" value={`${coachName} <${coachEmail}>`} disabled />
              </div>
              <div>
                <Label htmlFor="to">To</Label>
                <Input 
                  id="to" 
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="Email subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message"
                  placeholder="Type your coaching message here..."
                  rows={6}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>
              <Button 
                onClick={handleSendEmail} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadEmailHistory}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          Email History
        </Button>
      </div>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Emails</CardTitle>
            <CardDescription>Last 10 emails sent by {coachName}</CardDescription>
          </CardHeader>
          <CardContent>
            {emailHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails sent yet</p>
            ) : (
              <div className="space-y-2">
                {emailHistory.map((email) => (
                  <div key={email.id} className="border rounded p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">To: {email.recipient_email}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-medium text-sm mb-1">{email.subject}</div>
                    <div className="text-muted-foreground text-xs line-clamp-2">
                      {email.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};