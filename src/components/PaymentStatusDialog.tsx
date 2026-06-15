// src/components/PaymentStatusDialog.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import confetti from "canvas-confetti";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ShoppingBag,
  RefreshCw,
  Home,
  CreditCard,
  ArrowRight,
  Sparkles,
  PartyPopper
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "success" | "failed" | "cancelled" | "pending";
  amount?: number;
  orderId?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

const PaymentStatusDialog = ({
  open,
  onOpenChange,
  status,
  amount,
  orderId,
  errorMessage,
  onRetry,
}: PaymentStatusDialogProps) => {
  const navigate = useNavigate();

  // Trigger confetti on success
  useEffect(() => {
    if (status === "success" && open) {
      const duration = 3000;
      const end = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#22c55e', '#3b82f6', '#8b5cf6']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#22c55e', '#3b82f6', '#8b5cf6']
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [status, open]);

  // Success Dialog
  if (status === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="relative">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent" />
            
            <div className="relative p-6 text-center">
              {/* Success Animation */}
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl">
                  <PartyPopper className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>
              
              <DialogTitle className="text-2xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Payment Successful! 🎉
              </DialogTitle>
              
              <DialogDescription className="text-center mb-6">
                Your payment has been processed successfully.
                {amount && (
                  <div className="mt-3 p-3 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600">₦{amount.toLocaleString()}</p>
                  </div>
                )}
                {orderId && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Order ID: {orderId.slice(0, 8)}...
                  </p>
                )}
              </DialogDescription>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/buyer");
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View My Orders
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/marketplace");
                  }}
                  className="w-full"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Failed Dialog
  if (status === "failed") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative p-6 text-center">
            {/* Failed Icon */}
            <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <DialogTitle className="text-2xl font-bold mb-2 text-red-600">
              Payment Failed
            </DialogTitle>
            
            <DialogDescription className="text-center mb-6">
              {errorMessage || "Your payment could not be processed. Please try again."}
            </DialogDescription>
            
            <div className="bg-red-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">Common issues:</p>
                  <ul className="text-xs text-red-600/80 mt-1 space-y-1">
                    <li>• Insufficient funds in your account</li>
                    <li>• Incorrect card details</li>
                    <li>• Bank declined the transaction</li>
                    <li>• Network timeout</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onRetry?.();
                }}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/marketplace");
                }}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Cancelled Dialog
  if (status === "cancelled") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative p-6 text-center">
            {/* Cancelled Icon */}
            <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-yellow-500" />
            </div>
            
            <DialogTitle className="text-2xl font-bold mb-2 text-yellow-600">
              Payment Cancelled
            </DialogTitle>
            
            <DialogDescription className="text-center mb-6">
              You cancelled the payment process. No money was deducted from your account.
            </DialogDescription>
            
            <div className="bg-yellow-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-yellow-500" />
                <p className="text-sm text-yellow-600">
                  Your order has not been placed. You can try again whenever you're ready.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onRetry?.();
                }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/marketplace");
                }}
                className="w-full"
              >
                Browse More Products
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Pending Dialog
  if (status === "pending") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative p-6 text-center">
            {/* Pending Animation */}
            <div className="mx-auto w-20 h-20 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
              </div>
            </div>
            
            <DialogTitle className="text-2xl font-bold mb-2 text-blue-600">
              Payment Processing
            </DialogTitle>
            
            <DialogDescription className="text-center mb-6">
              Your payment is being processed. This may take a few moments.
            </DialogDescription>
            
            <div className="bg-blue-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-600">
                  Please don't close this window. We'll notify you once your payment is confirmed.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  onOpenChange(false);
                }}
                variant="outline"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
};

export default PaymentStatusDialog;