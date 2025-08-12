import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, User, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SendRobertWelcome = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendPersonalizedWelcome = async () => {
    console.log('Button clicked - starting email send process');
    setIsLoading(true);
    
    try {
      console.log('About to call simple test email function...');
      const { data, error } = await supabase.functions.invoke('simple-test-email');

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Email send response:', data);

      toast({
        title: "Welcome email sent to Robert! 🎯",
        description: "Personalized welcome email sent to robert@goabsolutewireless.com",
      });

    } catch (error) {
      console.error('Error sending personalized welcome:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Failed to send email",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Robert His Welcome Email
        </CardTitle>
        <CardDescription>
          Send a personalized welcome email to Robert at Go Absolute Wireless
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Robert</p>
            <p className="text-sm text-muted-foreground">robert@goabsolutewireless.com</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Building className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium">Go Absolute Wireless</p>
            <p className="text-sm text-muted-foreground">Wireless solutions business</p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-900 mb-1">Email will include:</p>
          <ul className="text-blue-700 space-y-1">
            <li>• Personal greeting from Bobby Hartline</li>
            <li>• Context about his wireless business</li>
            <li>• CallProof integration insights</li>
            <li>• Coaching focus areas for his industry</li>
            <li>• Direct link to start coaching</li>
          </ul>
        </div>

        <Button 
          onClick={() => {
            console.log('Button clicked!');
            sendPersonalizedWelcome();
          }} 
          disabled={isLoading}
          className="w-full"
          type="button"
        >
          {isLoading ? (
            "Sending..."
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Personalized Welcome Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};