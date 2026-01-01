import React, { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
// @ts-ignore
import { useForm } from "react-hook-form";
// @ts-ignore
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "../../../shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  const loginForm = useForm<any>({
    defaultValues: { email: "", password: "" },
  });

  if (user) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 font-sans">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-cyan-500 uppercase tracking-tighter">
              Sentinel Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form 
                onSubmit={loginForm.handleSubmit((data: any) => loginMutation.mutate(data))} 
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 text-xs font-bold uppercase">Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="operator@sentinel.hq" className="bg-slate-950 border-slate-800 text-cyan-50 focus:border-cyan-500 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 text-xs font-bold uppercase">Security Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="••••••••" className="bg-slate-950 border-slate-800 text-cyan-50 focus:border-cyan-500 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest py-6 mt-4"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "Authorize Entry"}
                </Button>
              </form>
            </Form>
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] leading-relaxed">
                Vault Status: <span className="text-emerald-500">Encrypted</span><br />
                Unauthorized access will be logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900/50 border-l border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <h1 className="text-7xl font-black text-slate-100 leading-[0.9] mb-6 relative text-left">
          QUANTUM<br /><span className="text-cyan-500 italic">INTELLIGENCE.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-sm font-medium leading-relaxed relative border-l-2 border-cyan-900 pl-6 text-left">
          System operational. Accessing high-frequency market radar and historical data vaults.
        </p>
      </div>
    </div>
  );
}