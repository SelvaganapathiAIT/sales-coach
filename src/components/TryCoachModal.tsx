import React, { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "./AuthModal";

interface TryCoachModalProps {
  children: ReactNode;
  redirectTo: string;
}

const TryCoachModal = ({ children, redirectTo }: TryCoachModalProps) => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  const handleClick = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      navigate(redirectTo);
    } else {
      setAuthOpen(true);
    }
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => navigate(redirectTo)}
        defaultMode="signin"
      />
    </>
  );
};

export default TryCoachModal;
