import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import MainDashboard from "./pages/MainDashboard";
import AdminDashboard from "./components/AdminDashboard";
import AdminPredictions from "./components/AdminPredictions";
import AdminUsers from "./components/AdminUsers";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/not-found";
import TheVault from "./pages/TheVault";
import { isAdmin } from "./lib/permissions";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-mono">LOADING_SENTINEL_OS...</div>;

  return (
    <Switch>
      {/* Root Path - Main Dashboard (Command Center/Oracle) */}
      <Route path="/">
        {!user ? <Redirect to="/auth" /> : <MainDashboard />}
      </Route>
      
      {/* Admin Routes - Only accessible to admins */}
      <Route path="/admin">
        {!user ? <Redirect to="/auth" /> : isAdmin(user) ? <AdminDashboard /> : <Redirect to="/" />}
      </Route>
      <Route path="/admin/predictions">
        {!user ? <Redirect to="/auth" /> : isAdmin(user) ? <AdminPredictions /> : <Redirect to="/" />}
      </Route>
      <Route path="/admin/users">
        {!user ? <Redirect to="/auth" /> : isAdmin(user) ? <AdminUsers /> : <Redirect to="/" />}
      </Route>
      
      {/* Vault Route - Historical Proof Logs */}
      <Route path="/the-vault">
        {!user ? <Redirect to="/auth" /> : <TheVault />}
      </Route>

      {/* Auth Route */}
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
