import { Card, CardContent } from "@/components/ui/card";
// EXPLICIT IMPORT PATH FOR PRODUCTION STABILITY
import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4 border-primary/20 bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-tighter">404_PAGE_NOT_FOUND</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 font-mono uppercase">
            Handshake failed: The requested sector does not exist or has been decommissioned.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
