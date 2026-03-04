import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { AiGuide } from "@/components/ai-guide";
import { useIsMobile } from "@/hooks/use-mobile";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import CommunityPage from "@/pages/community";
import ResourcesPage from "@/pages/resources";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import ShareStoryPage from "@/pages/share-story";
import SurveyPage from "@/pages/survey";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF9]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#34737A] mx-auto" />
          <p className="text-sm text-[#868180] mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#FFFBF9]">
      {!isMobile && <DesktopSidebar />}
      <div className={isMobile ? "max-w-[430px] mx-auto px-4 pt-4 pb-20" : "ml-[240px] px-6 pt-6 pb-8 max-w-[900px]"}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/resources" component={ResourcesPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/events/:id" component={EventDetailPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/share-story" component={ShareStoryPage} />
          <Route path="/survey" component={SurveyPage} />
          <Route component={HomePage} />
        </Switch>
      </div>
      {isMobile && <BottomNav />}
      <AiGuide />
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
