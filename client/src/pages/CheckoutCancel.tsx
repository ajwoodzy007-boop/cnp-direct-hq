import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <XCircleIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Checkout Cancelled</CardTitle>
          <CardDescription className="text-base">
            No worries! Your payment was not processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You can upgrade to Pro anytime to unlock AI-powered trading insights and more features.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/pricing">
              <Button variant="outline" className="w-full" data-testid="button-view-pricing">
                View Pricing
              </Button>
            </Link>
            <Link href="/">
              <Button className="w-full" data-testid="button-back-dashboard">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
