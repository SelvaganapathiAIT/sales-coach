import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "./AuthModal";

interface TryCoachModalProps {
  children: React.ReactNode;
}

const TryCoachModal = ({ children }: TryCoachModalProps) => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  const handleTryCoach = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/onboarding');
    } else {
      setAuthOpen(true);
    }
  };

  return (
    <div onClick={handleTryCoach}>
      {children}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => navigate('/onboarding')}
        defaultMode="signup"
      />
    </div>
  );
};

export default TryCoachModal;