import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, PartyPopper, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderAmount: number;
  onConfirm: (orderId: string, amount: string, transactionDate: string) => Promise<void>;
}

const PaymentConfirmDialog = ({
  open,
  onOpenChange,
  orderId,
  orderAmount,
  onConfirm,
}: PaymentConfirmDialogProps) => {
  const [amount, setAmount] = useState(orderAmount.toString());
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(orderId, amount, transactionDate);
      setSuccess(true);
      triggerConfetti();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (success) {
      setSuccess(false);
      setAmount(orderAmount.toString());
      setTransactionDate(new Date().toISOString().split("T")[0]);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-scale-in">
              <PartyPopper className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">
              Congratulations!
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Payment has been confirmed successfully. All parties have been notified.
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Confirm Payment
              </DialogTitle>
              <DialogDescription>
                Enter the payment details to confirm this transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount Received (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-lg font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionDate">Transaction Date</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Order ID: <span className="font-mono">{orderId.slice(0, 8)}...</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Expected Amount: <span className="font-semibold">₦{orderAmount.toLocaleString()}</span>
                </p>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={loading || !amount}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentConfirmDialog;
