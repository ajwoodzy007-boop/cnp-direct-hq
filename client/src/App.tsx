import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import AdminDashboard from "./components/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-mono">LOADING_SENTINEL_OS...</div>;

  return (
    <Switch>
      {/* Root Path IS the Command Center */}
      <Route path="/">
        {!user ? <Redirect to="/auth" /> : <AdminDashboard />}
      </Route>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
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
