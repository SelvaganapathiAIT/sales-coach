import { Badge } from "@/components/ui/badge";
import { UserCheck, Target, MessageSquare, TrendingUp, Phone, Mail } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserCheck,
      title: "Choose Your Coach",
      description: "Select from sales legends like Jack Daly, industry-specific AI coaches, or create a custom coach trained on your company's methodology.",
      features: ["Sales Legends", "Industry Specialists", "Custom Company Coaches"]
    },
    {
      icon: Target,
      title: "Set Your Goals",
      description: "Define your sales targets, challenges, and preferred communication style during onboarding.",
      features: ["Goal Setting", "Industry Context", "Communication Preferences"]
    },
    {
      icon: MessageSquare,
      title: "Daily Coaching",
      description: "Receive personalized coaching through your preferred channel - email, SMS, or phone calls.",
      features: ["Email Coaching", "SMS Check-ins", "Voice Calls"]
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description: "Your AI coach tracks your activity and provides strategic feedback to accelerate your results.",
      features: ["Performance Analytics", "Strategic Feedback", "Goal Tracking"]
    }
  ];

  const communicationMethods = [
    {
      icon: Mail,
      title: "Email Coaching",
      description: "Daily personalized emails with coaching tips, strategies, and motivation."
    },
    {
      icon: MessageSquare,
      title: "SMS Check-ins",
      description: "Quick text reminders, accountability messages, and real-time support."
    },
    {
      icon: Phone,
      title: "Voice Calls",
      description: "Actually call your AI coach for real-time conversations and strategy sessions."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="secondary" className="text-accent-foreground">
            How It Works
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Your Personal AI Sales Coach in 4 Simple Steps
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get started with world-class sales coaching in minutes, not months.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-premium transition-all duration-300 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground">
                    {index + 1}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {step.description}
                </p>
                
                <div className="space-y-2">
                  {step.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-accent to-secondary transform -translate-y-1/2"></div>
              )}
            </div>
          ))}
        </div>

        {/* Communication Methods */}
        <div className="bg-muted/50 rounded-2xl p-8 lg:p-12">
          <div className="text-center space-y-4 mb-12">
            <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
              Coach How You Want
            </h3>
            <p className="text-lg text-muted-foreground">
              Your AI coach adapts to your preferred communication style
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {communicationMethods.map((method, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <method.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {method.title}
                </h4>
                
                <p className="text-muted-foreground text-sm">
                  {method.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;