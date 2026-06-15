// src/components/PaymentFallback.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CreditCard,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Shield,
  Zap
} from "lucide-react";

interface PaymentFallbackProps {
  errorType: "failed" | "cancelled" | "timeout" | "network";
  errorMessage?: string;
  amount?: number;
  onRetry: () => void;
  onBack: () => void;
  onContactSupport?: () => void;
}

const PaymentFallback = ({
  errorType,
  errorMessage,
  amount,
  onRetry,
  onBack,
  onContactSupport,
}: PaymentFallbackProps) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  const getErrorConfig = () => {
    switch (errorType) {
      case "failed":
        return {
          title: "Payment Failed",
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
          color: "red",
          bgGradient: "from-red-500/10 to-red-600/5",
          buttonGradient: "from-red-500 to-red-600",
          defaultMessage: "Your payment could not be processed. Please check your card details and try again.",
          tips: [
            "Check if you have sufficient funds",
            "Verify your card details are correct",
            "Try a different payment method",
            "Contact your bank if the issue persists"
          ]
        };
      case "cancelled":
        return {
          title: "Payment Cancelled",
          icon: <AlertCircle className="w-12 h-12 text-yellow-500" />,
          color: "yellow",
          bgGradient: "from-yellow-500/10 to-yellow-600/5",
          buttonGradient: "from-yellow-500 to-yellow-600",
          defaultMessage: "You cancelled the payment. No charges were made to your account.",
          tips: [
            "You can try again whenever you're ready",
            "Check our FAQ for payment methods",
            "Contact support if you need assistance"
          ]
        };
      case "timeout":
        return {
          title: "Payment Timeout",
          icon: <AlertCircle className="w-12 h-12 text-orange-500" />,
          color: "orange",
          bgGradient: "from-orange-500/10 to-orange-600/5",
          buttonGradient: "from-orange-500 to-orange-600",
          defaultMessage: "The payment took too long to complete. Please try again.",
          tips: [
            "Check your internet connection",
            "Try using a different browser",
            "Use a different payment method"
          ]
        };
      case "network":
        return {
          title: "Network Error",
          icon: <AlertCircle className="w-12 h-12 text-blue-500" />,
          color: "blue",
          bgGradient: "from-blue-500/10 to-blue-600/5",
          buttonGradient: "from-blue-500 to-blue-600",
          defaultMessage: "Unable to connect to payment gateway. Please check your internet connection.",
          tips: [
            "Check your internet connection",
            "Refresh the page and try again",
            "Try using a different network"
          ]
        };
      default:
        return {
          title: "Payment Error",
          icon: <AlertCircle className="w-12 h-12 text-gray-500" />,
          color: "gray",
          bgGradient: "from-gray-500/10 to-gray-600/5",
          buttonGradient: "from-gray-500 to-gray-600",
          defaultMessage: "Something went wrong. Please try again.",
          tips: ["Try again later", "Contact support if the issue persists"]
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className={`max-w-lg w-full bg-gradient-to-br ${config.bgGradient} border-${config.color}-500/30 shadow-2xl overflow-hidden`}>
        {/* Header Decoration */}
        <div className={`h-2 bg-gradient-to-r ${config.buttonGradient}`} />
        
        <CardContent className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full bg-${config.color}-500/10 animate-pulse`}>
              {config.icon}
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-center mb-2">{config.title}</h2>
          
          {/* Amount (if provided) */}
          {amount && (
            <p className="text-center text-muted-foreground mb-4">
              Attempted amount: <span className="font-bold text-primary">₦{amount.toLocaleString()}</span>
            </p>
          )}
          
          {/* Error Message */}
          <Alert className={`mb-6 border-${config.color}-500/30 bg-${config.color}-500/10`}>
            <AlertCircle className={`h-4 w-4 text-${config.color}-500`} />
            <AlertTitle className={`text-${config.color}-600 font-semibold`}>Error Details</AlertTitle>
            <AlertDescription className="text-sm">
              {errorMessage || config.defaultMessage}
            </AlertDescription>
          </Alert>
          
          {/* Helpful Tips */}
          <div className="bg-background/50 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Helpful Tips:
            </p>
            <ul className="space-y-2">
              {config.tips.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Shield className="w-3 h-3 mt-1 text-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`w-full bg-gradient-to-r ${config.buttonGradient} hover:shadow-lg transition-all duration-300`}
              size="lg"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Checkout
            </Button>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onContactSupport}
                className="flex-1 text-muted-foreground"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Contact Support
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("/faq", "_blank")}
                className="flex-1 text-muted-foreground"
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Help Center
              </Button>
            </div>
          </div>
          
          {/* Security Note */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Your payment information is secure and encrypted
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { PaymentFallback, PaymentStatusDialog };