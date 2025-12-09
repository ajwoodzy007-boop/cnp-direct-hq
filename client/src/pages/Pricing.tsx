import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, TrendingUp, Zap, Crown, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  prices: Price[];
  metadata?: Record<string, string>;
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/stripe/products");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function createCheckout(priceId: string): Promise<string> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.url;
}

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stripe-products"],
    queryFn: fetchProducts,
  });

  const checkoutMutation = useMutation({
    mutationFn: createCheckout,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  const proProduct = products.find((p) => p.metadata?.tier === "pro");
  const selectedPrice = proProduct?.prices.find(
    (p) => p.recurring?.interval === billingInterval
  );

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const freeFeatures = [
    "Market Scanner (top 10 stocks)",
    "Basic Price Charts",
    "News Feed",
    "5 Predictions per day",
    "Basic Performance Stats",
  ];

  const proFeatures = [
    "Everything in Free",
    "AI Trading Playbook",
    "Unlimited Predictions",
    "Advanced Technical Indicators",
    "Priority Market Alerts",
    "Export Trading History",
    "Priority Support",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Link href="/" className="text-primary hover:underline mb-4 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Crown className="h-10 w-10 text-yellow-500" />
            Upgrade to Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock AI-powered trading insights and take your trading to the next level
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === "month"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-billing-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === "year"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-billing-yearly"
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">
                Save 35%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Free
              </CardTitle>
              <CardDescription>Get started with basic trading tools</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full mt-6" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Pro
              </CardTitle>
              <CardDescription>Unlock AI-powered trading insights</CardDescription>
              <div className="mt-4">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : selectedPrice ? (
                  <>
                    <span className="text-4xl font-bold">
                      {formatPrice(selectedPrice.unit_amount)}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === "month" ? "month" : "year"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold">
                      {billingInterval === "month" ? "$19" : "$149"}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === "month" ? "month" : "year"}
                    </span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                onClick={() => selectedPrice && checkoutMutation.mutate(selectedPrice.id)}
                disabled={!selectedPrice || checkoutMutation.isPending}
                data-testid="button-upgrade-pro"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Cancel anytime. No questions asked.</p>
          <p className="mt-1">Secure payment powered by Stripe</p>
        </div>
      </div>
    </div>
  );
}
