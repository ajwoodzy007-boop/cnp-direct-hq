import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// MATCH THIS PATH TO THE FILE ABOVE
import AuthPage from "@/pages/AuthPage";
import AdminDashboard from "@/components/AdminDashboard";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-primary font-mono">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 uppercase tracking-tighter">Initializing_Sentinel...</span>
      </div>
    );
  }

  if (!user) return <Redirect to="/auth" />;
  if (adminOnly && user.tier !== 'ADMIN') return <Redirect to="/" />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} adminOnly={true} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={() => (
          <div className="p-8 font-mono">
            SENTINEL_OS // SESSION_ACTIVE
            <br />
            Clearance: VERIFIED
          </div>
        )} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
