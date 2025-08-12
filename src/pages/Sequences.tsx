import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, BookOpen, ArrowRight, Clock, Users } from "lucide-react";

const Sequences = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Sales Sequences
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamlined sequences for onboarding new reps and building effective sales playbooks
            </p>
          </div>

          <Tabs defaultValue="onboarding" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="onboarding" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New Hire Onboarding
              </TabsTrigger>
              <TabsTrigger value="playbook" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Sales Playbook Builder
              </TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    New Rep Onboarding Sequence
                  </CardTitle>
                  <CardDescription>
                    Complete onboarding process to set up new sales reps with their dedicated coach
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                        <h3 className="font-semibold">Initial Assessment</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Evaluate rep's current skills and experience level</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                        <h3 className="font-semibold">Coach Matching</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Pair rep with the most suitable coach based on expertise</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                        <h3 className="font-semibold">Goal Setting</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Establish clear objectives and success metrics</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                        <h3 className="font-semibold">Training Schedule</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Create personalized training timeline and milestones</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">5</div>
                        <h3 className="font-semibold">Progress Tracking</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Monitor development and adjust coaching approach</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">6</div>
                        <h3 className="font-semibold">Certification</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Complete onboarding with performance validation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Duration: 2-4 weeks
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Success Rate: 94%
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    Start Onboarding Sequence
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="playbook" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Sales Playbook Builder Sequence
                  </CardTitle>
                  <CardDescription>
                    Create comprehensive sales playbooks that coaches can use to help clients execute effectively
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                        <h3 className="font-semibold">Market Analysis</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Research target market, competitors, and opportunities</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                        <h3 className="font-semibold">Buyer Personas</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Define ideal customer profiles and decision-making processes</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                        <h3 className="font-semibold">Sales Process Design</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Map out optimal sales funnel and touchpoints</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                        <h3 className="font-semibold">Objection Handling</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Develop responses to common objections and concerns</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">5</div>
                        <h3 className="font-semibold">Scripts & Templates</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Create proven scripts for calls, emails, and presentations</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">6</div>
                        <h3 className="font-semibold">Performance Metrics</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Define KPIs and measurement frameworks</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">7</div>
                        <h3 className="font-semibold">Training Materials</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Develop coaching resources and training modules</p>
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">8</div>
                        <h3 className="font-semibold">Implementation</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Deploy playbook with coaching support</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Duration: 4-6 weeks
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      ROI Increase: 150%+
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    Build Sales Playbook
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
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

export default Sequences;