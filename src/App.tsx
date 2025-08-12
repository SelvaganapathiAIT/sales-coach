import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import CoachSettings from "./pages/CoachSettings";
import CompanyCoach from "./pages/CompanyCoach";
import Sequences from "./pages/Sequences";
import CoachManagement from "./pages/CoachManagement";
import CoachTraining from "./pages/CoachTraining";
import VoiceCoaching from "./pages/VoiceCoaching";
import ProfileSettings from "./pages/ProfileSettings";
import CoachCall from "./pages/CoachCall";
import Header from "@/components/Header";
import Admin from "./pages/Admin";
import SalesDesk from "./pages/SalesDesk";
import { HelmetProvider } from "react-helmet-async";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => {
  console.log('App.tsx: App component rendering');
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HelmetProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/coach-settings" element={<CoachSettings />} />
            <Route path="/company-coach" element={<CompanyCoach />} />
            <Route path="/sequences" element={<Sequences />} />
            <Route path="/coach-management" element={<CoachManagement />} />
            <Route path="/coach-training/:coachId" element={<CoachTraining />} />
            <Route path="/voice-coaching" element={<VoiceCoaching />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/coach-call" element={<CoachCall />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/sales-desk" element={<SalesDesk />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
