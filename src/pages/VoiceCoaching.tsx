import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VoiceCoach from '@/components/VoiceCoach';
import { ArrowLeft, Mic, Brain, Target, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VoiceCoaching = () => {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<string[]>([]);
  const [currentScenario, setCurrentScenario] = useState('general sales coaching');

  const scenarios = [
    {
      id: 'cold-calling',
      title: 'Cold Calling',
      description: 'Practice making initial contact with prospects',
      personality: 'experienced cold calling specialist'
    },
    {
      id: 'objection-handling',
      title: 'Objection Handling',
      description: 'Learn to overcome common sales objections',
      personality: 'expert objection handler'
    },
    {
      id: 'closing',
      title: 'Closing Techniques',
      description: 'Master different ways to close deals',
      personality: 'master closer with proven techniques'
    },
    {
      id: 'discovery',
      title: 'Discovery Calls',
      description: 'Improve your fact-finding and needs assessment',
      personality: 'discovery specialist'
    }
  ];

  const selectedScenario = scenarios.find(s => s.id === currentScenario) || scenarios[0];

  const handleTranscript = (text: string) => {
    setTranscript(prev => [...prev.slice(-4), text]); // Keep last 5 transcripts
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Voice Coaching</h1>
                <p className="text-sm text-muted-foreground">Practice with your AI sales coach</p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Mic className="w-3 h-3" />
              <span>Live Session</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scenario Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Training Scenarios</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentScenario === scenario.id
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setCurrentScenario(scenario.id)}
                  >
                    <h4 className="font-medium">{scenario.title}</h4>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Session Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Session Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Responses</span>
                  <Badge variant="outline">{transcript.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Current Focus</span>
                  <Badge>{selectedScenario.title}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voice Coach Interface */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>AI Voice Coach</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoiceCoach
                  coachPersonality={selectedScenario.personality}
                  scenario={selectedScenario.description}
                  onTranscript={handleTranscript}
                />
              </CardContent>
            </Card>

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transcript.map((text, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted rounded-lg text-sm"
                      >
                        <span className="font-medium text-primary">You:</span> {text}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCoaching;