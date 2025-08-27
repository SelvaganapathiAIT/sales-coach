import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Volume2, VolumeX, Loader2, User } from 'lucide-react';
import { useVoiceCoach } from '@/hooks/useVoiceCoach';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from './AuthModal';

interface VoiceCoachProps {
  coachPersonality?: string;
  scenario?: string;
  onTranscript?: (text: string) => void;
}

const VoiceCoach = ({ 
  coachPersonality = "professional sales coach", 
  scenario = "general sales coaching",
  onTranscript 
}: VoiceCoachProps) => {
  const { toast } = useToast();
  const [volume, setVolume] = useState(0.8);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const connectedRef = useRef(false);

const conversation = useVoiceCoach(
  () => {
    if (!connectedRef.current) {
      connectedRef.current = true;
      toast({
        title: "Voice Coach Connected",
        description: "Your AI sales coach is ready to help!",
        variant: "success",
        duration: 3000,
      });
    }
  },
  () => {
    connectedRef.current = false;
    toast({
      title: "Session Ended",
      description: "Voice coaching session has ended",
      variant: "info",
      duration: 3000,
    });
  },
  (message) => {
    console.log("Received message:", message);
    if (message.source === "user" && onTranscript) {
      onTranscript(message.message);
    }
  },
  (error) => {
    console.error("Voice conversation error:", error);
    toast({
      title: "Connection Error",
      description: "There was an issue with the voice connection",
      variant: "destructive",
    });
  }
);


  console.log("*******", conversation)

  // Check for existing user session
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const startConversation = async () => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      await conversation.startSession();
    } catch (error) {
      console.error('Error starting conversation:', error);
      
      // Handle different types of errors
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorName = error?.name || '';
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        toast({
          title: "Enable Microphone Access",
          description: "1. Look for the microphone 🎤 icon in your browser's address bar\n2. Click it and select 'Allow'\n3. Or go to Site Settings > Permissions > Microphone > Allow\n4. Refresh the page and try again",
          variant: "destructive",
          duration: 12000,
        });
      } else if (errorName === 'NotFoundError') {
        toast({
          title: "No Microphone Detected",
          description: "Please:\n1. Connect a microphone or headset\n2. Check your device's audio settings\n3. Make sure the microphone isn't being used by another app\n4. Try again",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Voice Setup Failed",
          description: `Error: ${errorMessage}\n\nTry these steps:\n1. Refresh the page\n2. Check microphone permissions\n3. Try a different browser`,
          variant: "destructive",
          duration: 10000,
        });
      }
    }
  };

  const endConversation = () => {
    conversation.endSession();
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    conversation.setVolume(newVolume);
  };

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">AI Voice Coach</h3>
          <p className="text-sm text-muted-foreground">
            Practice your sales skills with real-time voice feedback
          </p>
          {user && (
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>Signed in as {user.email}</span>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 
            isConnecting ? 'bg-yellow-500 animate-pulse' : 
            'bg-gray-300'
          }`} />
          <span className="text-sm">
            {isConnected ? 'Connected' : 
             isConnecting ? 'Connecting...' : 
             'Disconnected'}
          </span>
        </div>

        {/* Volume control */}
        {isConnected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Volume</span>
              <div className="flex items-center space-x-2">
                <VolumeX className="w-4 h-4" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20"
                />
                <Volume2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* Speaking indicator */}
        {conversation.isSpeaking && (
          <div className="flex items-center justify-center space-x-2 text-primary">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Coach is speaking...</span>
          </div>
        )}

        {/* Main action button */}
        <div className="flex justify-center">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              className="w-32 h-32 rounded-full bg-primary"
            >
              {isConnecting ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <Mic className="w-8 h-8" />
                  <span className="text-sm">Start</span>
                </div>
              )}
            </Button>
          ) : (
            <Button
              onClick={endConversation}
              variant="destructive"
              className="w-32 h-32 rounded-full"
            >
              <div className="flex flex-col items-center space-y-2">
                <MicOff className="w-8 h-8" />
                <span className="text-sm">End</span>
              </div>
            </Button>
          )}
        </div>

        <div className="text-xs text-center text-muted-foreground space-y-1">
          <p>
            {user 
              ? "Click to start your voice coaching session" 
              : "Sign in to start coaching and save your progress"
            }
          </p>
          <p>Your coach can open scripts, track progress, and provide tips</p>
        </div>
            
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            toast({
              title: "Ready to Start",
              description: "You can now start your coaching session!",
            });
          }}
        />
      </CardContent>
    </Card>
  );
};

export default VoiceCoach;