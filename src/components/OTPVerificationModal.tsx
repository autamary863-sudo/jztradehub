// src/components/OTPVerificationModal.tsx
import { useState, useEffect } from "react";
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
import { Loader2, Shield, Clock, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OTPVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "withdrawal" | "transfer";
  amount: number;
  recipientName?: string;
  recipientId?: string;
  onVerified: () => Promise<void>;
}

const OTPVerificationModal = ({
  open,
  onOpenChange,
  type,
  amount,
  recipientName,
  recipientId,
  onVerified,
}: OTPVerificationModalProps) => {
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [testOtp, setTestOtp] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const sendOTP = async () => {
    setSendingOtp(true);
    setError("");
    setTestOtp(null);

    try {
      const { data, error } = await supabase.functions.invoke("twilio-otp", {
        body: { action: "send", type, amount },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || "Verification code sent!");
        setTimer(60);
        if (data.testOtp) {
          setTestOtp(data.testOtp);
          toast.info(`Test OTP: ${data.testOtp} (Development mode)`);
        }
      } else {
        setError(data.error || "Failed to send OTP");
        toast.error(data.error || "Failed to send OTP");
      }
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setError(err.message || "Failed to send verification code");
      toast.error("Failed to send verification code");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("twilio-otp", {
        body: { action: "verify", type, otpCode },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("OTP verified! Processing your request...");
        await onVerified();
        onOpenChange(false);
        setOtpCode("");
      } else {
        setError(data.error || "Invalid verification code");
        toast.error(data.error || "Invalid verification code");
      }
    } catch (err: any) {
      console.error("Verify error:", err);
      setError(err.message || "Verification failed");
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      sendOTP();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-primary" />
            {type === "withdrawal" ? "Withdrawal Verification" : "Transfer Verification"}
          </DialogTitle>
          <DialogDescription>
            Enter the OTP sent to your registered phone number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Transaction Summary */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">Transaction Details</p>
            <p className="text-2xl font-bold text-primary">₦{amount.toLocaleString()}</p>
            {type === "transfer" && recipientName && (
              <p className="text-sm mt-2">
                To: <span className="font-semibold">{recipientName}</span>
              </p>
            )}
          </div>

          {/* Test OTP Display */}
          {testOtp && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Test Mode OTP</p>
              <p className="text-3xl font-mono font-bold tracking-wider">{testOtp}</p>
              <p className="text-xs text-muted-foreground mt-1">Use this code for testing</p>
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-2">
            <Label>Verification Code</Label>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-widest font-mono py-6"
              maxLength={6}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Timer and Resend */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={sendOTP}
              disabled={sendingOtp || timer > 0}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {sendingOtp ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
            </button>
            <p className="text-xs text-muted-foreground">Code expires in 10 minutes</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm p-3 rounded-lg bg-red-500/10">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Never share this OTP with anyone. JZTradeHub will never ask for it.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || otpCode.length !== 6}
            className="flex-1 bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Verify & {type === "withdrawal" ? "Withdraw" : "Transfer"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTPVerificationModal;