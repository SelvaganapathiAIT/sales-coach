import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import Hero from "@/components/Hero";
import CoachDirectory from "@/components/CoachDirectory";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import Onboarding from "./Onboarding";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for authenticated users
  if (isAuthenticated) {
    return <Onboarding />;
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen w-full bg-background">
      <Hero />
      <CoachDirectory />
      <HowItWorks />
      <Footer />
    </div>
  );
};

export default Index;