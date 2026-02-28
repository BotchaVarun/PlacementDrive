import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ResumeEnhancer from "@/pages/ResumeEnhancer";
import JobTracker from "@/pages/JobTracker";
import MockInterviews from "@/pages/MockInterviews";
import InterviewSetup from "@/pages/interview-setup";
import InterviewLive from "@/pages/interview-live";
import InterviewResults from "@/pages/interview-results";
import JobSeekers from "@/pages/JobSeekers";

import Account from "@/pages/Account";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/enhance" component={ResumeEnhancer} />
      <Route path="/jobs" component={JobTracker} />
      <Route path="/mock" component={InterviewSetup} />
      <Route path="/mock/:id" component={InterviewLive} />
      <Route path="/mock/:id/results" component={InterviewResults} />
      <Route path="/account" component={Account} />
      <Route path="/discover" component={JobSeekers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
