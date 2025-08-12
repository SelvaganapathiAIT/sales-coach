import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Send, Mail, Users, Plus, X, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoachWelcomeManagerProps {
  coachName: string;
  coachEmail: string;
  coachPhone?: string;
  coachImageUrl?: string;
  coachDescription: string;
}

export const CoachWelcomeManager = ({ 
  coachName, 
  coachEmail, 
  coachPhone, 
  coachImageUrl, 
  coachDescription 
}: CoachWelcomeManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [targetEmails, setTargetEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (email && isValidEmail(email) && !targetEmails.includes(email)) {
      setTargetEmails(prev => [...prev, email]);
      setNewEmail("");
    } else if (targetEmails.includes(email)) {
      toast({
        title: "Email already added",
        description: "This email is already in the list",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setTargetEmails(prev => prev.filter(email => email !== emailToRemove));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const sendWelcomeEmails = async () => {
    if (targetEmails.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-coach-welcome', {
        body: {
          coachName,
          coachEmail,
          coachPhone,
          coachImageUrl,
          coachDescription,
          targetUsers: targetEmails,
          isActivation: true
        }
      });

      if (error) throw error;

      toast({
        title: "Welcome emails sent!",
        description: `Successfully sent welcome emails to ${data.totalSent} recipients`,
      });

      setTargetEmails([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending welcome emails:', error);
      toast({
        title: "Failed to send emails",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Send Welcome Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Send Coach Welcome Emails</DialogTitle>
          <DialogDescription>
            Send welcome emails to introduce {coachName} to your team members or prospects.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Coach Preview */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {coachImageUrl ? (
                  <img 
                    src={coachImageUrl} 
                    alt={coachName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">
                    {coachName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{coachName}</p>
                  <p className="text-sm text-muted-foreground">{coachEmail}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {coachDescription}
              </p>
            </CardContent>
          </Card>

          {/* Email Recipients */}
          <div className="space-y-4">
            <Label>Email Recipients</Label>
            
            {/* Add Email Input */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={addEmail}
                size="sm"
                disabled={!newEmail.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Email List */}
            {targetEmails.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Recipients ({targetEmails.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {targetEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="text-xs">
                      {email}
                      <button
                        onClick={() => removeEmail(email)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Common Emails */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Add:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "robert@goabsolutewireless.com",
                  "sarah@techcorp.com", 
                  "mike@salesboost.com"
                ].map((email) => (
                  <Button
                    key={email}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!targetEmails.includes(email)) {
                        setTargetEmails(prev => [...prev, email]);
                      }
                    }}
                    disabled={targetEmails.includes(email)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {email}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Email Content Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Welcome Email Includes:</p>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• Introduction to {coachName} and their expertise</li>
                    <li>• What to expect from AI sales coaching</li>
                    <li>• Getting started guide and next steps</li>
                    <li>• Direct link to start their first coaching session</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send Button */}
          <Button 
            onClick={sendWelcomeEmails} 
            disabled={isLoading || targetEmails.length === 0}
            className="w-full"
          >
            {isLoading ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Welcome Emails ({targetEmails.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};