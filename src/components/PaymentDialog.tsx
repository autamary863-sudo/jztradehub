import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Building2, CreditCard, User, Clock, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onPaymentComplete: () => void;
}

const PaymentDialog = ({ open, onOpenChange, amount, onPaymentComplete }: PaymentDialogProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);
  const [transferMade, setTransferMade] = useState(false);

  // Calculate total with 5% service fee included
  const totalAmount = Math.round(amount * 1.05);

  const accountDetails = {
    accountName: "JOSHUA BAWAINIMAT MOSES",
    bankName: "MONIEPOINT",
    accountNumber: "8037639806",
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTransferMade = () => {
    setTransferMade(true);
  };

  const handleContinue = () => {
    setTransferMade(false);
    onPaymentComplete();
    navigate("/buyer");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTransferMade(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!transferMade ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-full bg-primary/10">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                Complete Your Payment
              </DialogTitle>
              <DialogDescription>
                Transfer the exact amount to the account below to complete your order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Amount to pay */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-primary">₦{totalAmount.toLocaleString()}</p>
              </div>

              {/* Account Details */}
              <div className="space-y-3">
                {/* Account Name */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-semibold">{accountDetails.accountName}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(accountDetails.accountName, "Account Name")}
                      className="h-8 w-8 p-0"
                    >
                      {copied === "Account Name" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Bank Name */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Name</p>
                        <p className="font-semibold">{accountDetails.bankName}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(accountDetails.bankName, "Bank Name")}
                      className="h-8 w-8 p-0"
                    >
                      {copied === "Bank Name" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Account Number */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="font-semibold text-lg tracking-wider">{accountDetails.accountNumber}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(accountDetails.accountNumber, "Account Number")}
                      className="h-8 w-8 p-0"
                    >
                      {copied === "Account Number" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Important:</strong> After making the transfer, your payment will be verified by our admin team. You'll receive a confirmation once verified.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleTransferMade} className="w-full" size="lg">
                <CheckCircle className="w-4 h-4 mr-2" />
                I've Made the Transfer
              </Button>
              <Button variant="ghost" onClick={() => handleClose(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto p-4 rounded-full bg-gradient-to-br from-green-500/20 to-primary/20 mb-4 animate-pulse">
                <PartyPopper className="w-12 h-12 text-primary" />
              </div>
              <DialogTitle className="text-2xl text-center">Thank You!</DialogTitle>
              <DialogDescription className="text-center text-base">
                Your order has been placed successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Awaiting confirmation message */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">Awaiting Payment Confirmation</h3>
                <p className="text-sm text-muted-foreground">
                  Our team is verifying your payment. You'll receive a notification once your payment has been confirmed.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  You can track your order status in your dashboard. We'll notify you once your payment is verified.
                </p>
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full" size="lg">
              Go to My Orders
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;