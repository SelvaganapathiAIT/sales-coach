import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, Trophy, Building, Mic } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import TryCoachModal from "./TryCoachModal";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-background via-muted/30 to-background py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <Star className="w-4 h-4 text-accent mr-2" />
                <span className="text-sm font-medium text-accent-foreground">
                  Trusted by 500+ Sales Professionals
                </span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Turn Sales Legends Into Your Personal{" "}
                <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  AI Coach
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Get on-demand coaching from top sales experts, industry-specific AI sales managers, or create custom AI coaches trained on your company's best practices. 
                Available 24/7 via email, text, or phone calls.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 relative z-20">
              <TryCoachModal>
                <Button variant="premium" size="lg" className="group">
                  Try a Coach Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </TryCoachModal>
              <Link to="/company-coach">
                <Button variant="secondary" size="lg" className="group w-full sm:w-auto">
                  <Building className="w-5 h-5 mr-2" />
                  Build Company Coach
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-accent" />
                <span className="text-sm text-muted-foreground">Sales Legends</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-accent" />
                <span className="text-sm text-muted-foreground">Custom Company Coaches</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-accent" />
                <span className="text-sm text-muted-foreground">24/7 Available</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-premium">
              <img 
                src={heroImage} 
                alt="Professional sales coaching" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-background border border-border rounded-lg p-4 shadow-card z-10">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Jack Daly Available</span>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -right-4 bg-background border border-border rounded-lg p-4 shadow-card z-10">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">94%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;