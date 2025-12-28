import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Terminal } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) return <Redirect to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-2 text-primary">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-mono tracking-tighter">SENTINEL_OS // ACCESS_CONTROL</CardTitle>
          <p className="text-sm text-muted-foreground font-mono uppercase">Establish Secure Handshake</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" id="auth-gate">
            <div className="space-y-2">
              <Label htmlFor="email-input">OPERATIVE_ID (EMAIL)</Label>
              <Input
                id="email-input"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-input">CIPHER_KEY (PASSWORD)</Label>
              <Input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 border-primary/20 focus:border-primary"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full font-mono gap-2" 
              disabled={loginMutation.isPending}
            >
              <Terminal className="h-4 w-4" />
              {loginMutation.isPending ? "CONNECTING..." : "INITIATE_SESSION"}
            </Button>
            {loginMutation.isError && (
              <p className="text-xs text-red-500 font-mono text-center mt-2 uppercase">
                Error: Authentication Handshake Failed
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
