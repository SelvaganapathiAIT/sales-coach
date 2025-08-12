import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageSquare, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoachInstructionsManagerProps {
  coachName: string;
  coachEmail: string;
}

export const CoachInstructionsManager = ({ coachName, coachEmail }: CoachInstructionsManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [instructionForm, setInstructionForm] = useState({
    targetUserEmail: "",
    taskType: "accountability",
    instructions: ""
  });

  const handleSendInstruction = async () => {
    if (!instructionForm.instructions) {
      toast({
        title: "Missing instructions",
        description: "Please provide instructions for the AI coach",
        variant: "destructive",
      });
      return;
    }

    if (instructionForm.taskType === "accountability" && !instructionForm.targetUserEmail) {
      toast({
        title: "Missing target user",
        description: "Please specify a user email for accountability tasks",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('process-coach-instructions', {
        body: {
          coachEmail: coachEmail,
          fromEmail: user.email,
          subject: `${instructionForm.taskType === 'accountability' ? 'Accountability Task' : 'General Instruction'}: ${instructionForm.targetUserEmail || 'General'}`,
          instructions: instructionForm.instructions,
          targetUserEmail: instructionForm.targetUserEmail || undefined,
          taskType: instructionForm.taskType
        }
      });

      if (error) throw error;

      toast({
        title: "Instructions sent!",
        description: `Your instructions have been sent to ${coachName}. You'll receive a response via email.`,
      });

      setInstructionForm({ targetUserEmail: "", taskType: "accountability", instructions: "" });
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending instructions:', error);
      toast({
        title: "Failed to send instructions",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Send Instructions to {coachName}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Send Instructions to {coachName}</DialogTitle>
          <DialogDescription>
            Send task instructions or accountability requests to your AI sales coach via email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="taskType">Task Type</Label>
            <Select
              value={instructionForm.taskType}
              onValueChange={(value) => setInstructionForm(prev => ({ ...prev, taskType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accountability">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Accountability Report
                  </div>
                </SelectItem>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    General Instructions
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {instructionForm.taskType === "accountability" && (
            <div>
              <Label htmlFor="targetUser">Target User Email</Label>
              <Input 
                id="targetUser" 
                type="email"
                placeholder="robert@goabsolutewireless.com"
                value={instructionForm.targetUserEmail}
                onChange={(e) => setInstructionForm(prev => ({ ...prev, targetUserEmail: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                The user whose CallProof activity you want the coach to analyze
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea 
              id="instructions"
              placeholder={
                instructionForm.taskType === "accountability" 
                  ? "Please analyze Robert's CallProof activity this week and hold him accountable to his sales goals. Focus on call volume and follow-up consistency."
                  : "Please focus coaching sessions on objection handling techniques and closing strategies for the next two weeks."
              }
              rows={6}
              value={instructionForm.instructions}
              onChange={(e) => setInstructionForm(prev => ({ ...prev, instructions: e.target.value }))}
            />
          </div>

          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Your instructions will be sent to {coachEmail}</p>
              <p>• The AI coach will process your request</p>
              {instructionForm.taskType === "accountability" && (
                <p>• For accountability tasks, the coach will analyze CallProof data</p>
              )}
              <p>• You'll receive a detailed response via email</p>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSendInstruction} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Instructions
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};