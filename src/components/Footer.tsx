import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Linkedin, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground w-full">
      <div className="w-full px-4 py-16 mx-auto max-w-none 2xl:px-8 3xl:px-12">
        <div className="grid lg:grid-cols-4 wide:grid-cols-4 ultra:grid-cols-6 gap-8 wide:gap-12 ultra:gap-16">
          {/* Brand */}
          <div className="space-y-4 ultra:col-span-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg"></div>
              <h3 className="text-xl font-bold">SalesCoaches.ai</h3>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Turn sales legends into your personal AI coach. Available 24/7 via email, text, or phone calls.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Coaches */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Coaches</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Sales Legends
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Jack Daly
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Industry Specialists
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Autoglass Sales
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Industrial Gas
              </a>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Company</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                About Us
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                How It Works
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Pricing
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Blog
              </a>
              <a href="#" className="block text-primary-foreground/80 hover:text-accent transition-colors">
                Careers
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Get Started</h4>
            <div className="space-y-3">
              <Button variant="success" className="w-full">
                Start Free Trial
              </Button>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-primary-foreground/80">
                  <Phone className="w-4 h-4" />
                  <span>1-800-SALES-AI</span>
                </div>
                <div className="flex items-center space-x-2 text-primary-foreground/80">
                  <Mail className="w-4 h-4" />
                  <span>hello@salescoaches.ai</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-accent-foreground">
                CallProof Integration
              </Badge>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-primary-foreground/60">
            © 2024 SalesCoaches.ai. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;