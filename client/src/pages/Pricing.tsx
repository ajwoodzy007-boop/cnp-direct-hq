import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, SparklesIcon, ArrowTrendingUpIcon, BoltIcon, StarIcon } from "@heroicons/react/24/outline";
import { Link } from "wouter";

export default function Pricing() {
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
            <StarIcon className="h-10 w-10 text-yellow-500" />
            Upgrade to Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock AI-powered trading insights and take your trading to the next level
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5" />
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
                    <CheckIcon className="h-4 w-4 text-green-500" />
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
                <SparklesIcon className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BoltIcon className="h-5 w-5 text-yellow-500" />
                Pro
              </CardTitle>
              <CardDescription>Unlock AI-powered trading insights</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                disabled
                data-testid="button-upgrade-pro"
              >
                <StarIcon className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Premium subscriptions coming soon.</p>
          <p className="mt-1">Use a beta pass to unlock Pro features.</p>
        </div>
      </div>
    </div>
  );
}
