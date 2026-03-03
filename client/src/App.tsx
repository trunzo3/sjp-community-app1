import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import CommunityPage from "@/pages/community";
import ResourcesPage from "@/pages/resources";
import EventsPage from "@/pages/events";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import ShareStoryPage from "@/pages/share-story";
import SurveyPage from "@/pages/survey";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0D9488] mx-auto" />
          <p className="text-sm text-[#6B7280] mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-[430px] mx-auto px-4 pt-4 pb-20">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/resources" component={ResourcesPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/share-story" component={ShareStoryPage} />
          <Route path="/survey" component={SurveyPage} />
          <Route component={HomePage} />
        </Switch>
      </div>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
