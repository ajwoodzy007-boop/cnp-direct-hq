import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import AdminDashboard from "./components/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse font-mono text-primary">INITIALIZING_SENTINEL_OS...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Root Path now points to the Command Center (AdminDashboard) */}
      <Route path="/">
        {!user ? <Redirect to="/auth" /> : <AdminDashboard />}
      </Route>
      
      {/* Auth Page is only for logging in */}
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>

      {/* Fallback for 404s */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
