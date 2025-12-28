import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// PAGE IMPORTS
import AuthPage from "@/pages/AuthPage";
import AdminDashboard from "@/components/AdminDashboard";
import NotFound from "@/pages/not-found";

// COMPONENT PROTECTION LOGIC
function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) return <Redirect to="/auth" />;

  // Redirect to home if admin clearance is required but not met
  if (adminOnly && user.tier !== 'ADMIN') return <Redirect to="/" />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* PUBLIC AUTH GATE */}
      <Route path="/auth" component={AuthPage} />

      {/* PROTECTED ADMIN TERMINAL */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} adminOnly={true} />
      </Route>

      {/* MAIN TERMINAL / LANDING */}
      <Route path="/">
        <ProtectedRoute component={() => (
          <div className="p-8 font-mono">
            SENTINEL_OS // SESSION_ACTIVE
            <br />
            Welcome, Operative.
          </div>
        )} />
      </Route>

      {/* FALLBACK */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
