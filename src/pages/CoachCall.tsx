import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import VoiceCoach from '@/components/VoiceCoach';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CoachCall() {
  const [searchParams] = useSearchParams();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Get coach info from URL parameters
  const coachName = searchParams.get('coach') || 'Your Sales Coach';
  const coachEmail = searchParams.get('email') || '';
  const coachPhone = searchParams.get('phone') || '';
  const coachImage = searchParams.get('image') || '';

  const startCall = () => {
    setIsCallActive(true);
  };

  const endCall = () => {
    setIsCallActive(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Get coach initials for avatar fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                <AvatarImage src={coachImage} alt={coachName} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {getInitials(coachName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold text-center">
                  {coachName}
                </CardTitle>
                <p className="text-lg text-primary font-semibold">AI Sales Coach</p>
                {coachPhone && (
                  <p className="text-sm text-muted-foreground">{coachPhone}</p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isCallActive ? (
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-semibold">Ready to talk?</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a voice conversation with your AI sales coach. Get personalized guidance, practice your pitch, or discuss your sales challenges.
                  </p>
                </div>
                
                <Button 
                  onClick={startCall}
                  className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone className="w-6 h-6 mr-3" />
                  Start Call
                </Button>
                
                <div className="text-xs text-center text-muted-foreground">
                  This call uses your device's microphone and speakers
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mx-auto animate-pulse"></div>
                  <p className="text-sm font-medium text-green-600">Call Active</p>
                  <p className="text-xs text-muted-foreground">
                    Speak naturally with your coach
                  </p>
                </div>

                {/* Voice Coach Component */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <VoiceCoach />
                </div>

                {/* Call Controls */}
                <div className="flex justify-center space-x-4">
                  <Button 
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "secondary"}
                    size="lg"
                    className="w-14 h-14 rounded-full"
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                  
                  <Button 
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-primary">SalesCoaches.ai</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Available 24/7 • Optimized for Results
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}