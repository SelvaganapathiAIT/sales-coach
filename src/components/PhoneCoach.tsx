import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Phone, Loader2, Copy, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PhoneCoach = () => {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback demo number for display
  const demoPhoneNumber = "+1 (555) COACH-AI"; // +1 (555) 262-2424

  const getPhoneNumber = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-phone');
      
      if (error) {
        throw new Error(error.message);
      }

      if (data?.phone_number) {
        setPhoneNumber(data.phone_number);
        toast({
          title: "Phone Number Ready!",
          description: "You can now call Bobby Hartline directly",
        });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No phone number received');
      }
    } catch (error) {
      console.error('Error getting phone number:', error);
      setError(error instanceof Error ? error.message : 'Failed to get phone number');
      // Don't show error toast, just display the demo number
    } finally {
      setIsLoading(false);
    }
  };

  const copyPhoneNumber = () => {
    const numberToCopy = phoneNumber || "+15552622424";
    navigator.clipboard.writeText(numberToCopy);
    toast({
      title: "Copied!",
      description: "Phone number copied to clipboard",
    });
  };

  const formatPhoneNumber = (phone: string) => {
    // Format the phone number for display (assuming US format)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.slice(1);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return phone;
  };

  useEffect(() => {
    // Auto-fetch phone number on component mount
    getPhoneNumber();
  }, []);

  const displayNumber = phoneNumber || demoPhoneNumber;
  const callableNumber = phoneNumber || "+15552622424";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Phone className="w-5 h-5" />
          <span>Call Bobby Hartline</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Call Bobby directly at:
            </p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl font-mono font-semibold text-primary">
                {displayNumber}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPhoneNumber}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            
            {error && !phoneNumber && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Demo number shown - Live integration pending</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {phoneNumber ? (
              <p className="text-sm text-muted-foreground">
                Available 24/7 • Powered by ElevenLabs AI
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Available 24/7 • AI Phone Integration Coming Soon
              </p>
            )}
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to ElevenLabs...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PhoneCoach;