import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Building2, CreditCard, Wallet, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";

const API_URL = import.meta.env.VITE_API_URL || "";
const getApiUrl = (path: string) => {
  return API_URL ? `${API_URL}${path}` : path;
};

interface SellerDetails {
  business_name: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
}

interface OrderReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderAmount: number;
  sellerId: string;
  onConfirm: () => void;
}

const OrderReceivedDialog = ({
  open,
  onOpenChange,
  orderId,
  orderAmount,
  sellerId,
  onConfirm,
}: OrderReceivedDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sellerDetails, setSellerDetails] = useState<SellerDetails | null>(null);

  const commission = orderAmount * 0.05;
  const disbursementAmount = orderAmount - commission;

  useEffect(() => {
    if (open && sellerId) {
      fetchSellerDetails();
    }
  }, [open, sellerId]);

  const fetchSellerDetails = async () => {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("business_name, bank_name, account_number, account_name")
      .eq("user_id", sellerId)
      .single();

    if (!error && data) {
      setSellerDetails(data);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#22c55e', '#4ade80'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#22c55e', '#4ade80'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Update order status to completed
      const { error } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", orderId);

      if (error) throw error;

      const emailUrl = API_URL ? `${API_URL}/api/send-order-email` : "/api/send-order-email";
      console.log("Sending order completion email to:", emailUrl, "orderId:", orderId);

      const emailResponse = await fetch(emailUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, type: "order_completed" }),
      });

      const emailResult = await emailResponse.json();
      if (!emailResponse.ok || !emailResult.success) {
        throw new Error(emailResult.error || "Email notification failed");
      }

      setSuccess(true);
      triggerConfetti();
      toast.success("Order marked as received!");
      onConfirm();

      // Close after animation
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error confirming order:", error);
      toast.error("Failed to confirm order");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuccess(false);
      onOpenChange(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-full bg-green-500/20 mb-4">
              <PartyPopper className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Completed!</h2>
            <p className="text-muted-foreground">
              Thank you for confirming receipt. The seller will receive their payment shortly.
            </p>
            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Disbursement to seller: ₦{disbursementAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Confirm Order Received
          </DialogTitle>
          <DialogDescription>
            By confirming, you acknowledge that you have received your order in good condition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Disbursement Info */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="font-semibold">Disbursement to Seller</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Amount:</span>
                <span className="font-medium">₦{orderAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Platform Commission (5%):</span>
                <span>-₦{commission.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400">
                  <span>Seller Receives:</span>
                  <span>₦{disbursementAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seller Account Details */}
          {sellerDetails && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Seller Account Details</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Name:</span>
                  <span className="font-medium">{sellerDetails.business_name}</span>
                </div>
                {sellerDetails.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{sellerDetails.bank_name}</span>
                  </div>
                )}
                {sellerDetails.account_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="font-medium">{sellerDetails.account_name}</span>
                  </div>
                )}
                {sellerDetails.account_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-medium font-mono">{sellerDetails.account_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Important:</strong> Only confirm if you have received and inspected your order. 
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {loading ? "Confirming..." : "Confirm Received"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderReceivedDialog;
