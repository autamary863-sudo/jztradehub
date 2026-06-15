// src/components/PhoneVerification.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle, XCircle, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PhoneVerificationProps {
  userId: string;
  currentPhone?: string;
  isVerified?: boolean;
  onVerificationComplete?: () => void;
}

const PhoneVerification = ({ 
  userId, 
  currentPhone, 
  isVerified = false, 
  onVerificationComplete 
}: PhoneVerificationProps) => {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"input" | "verify">(currentPhone && !isVerified ? "verify" : "input");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      return cleaned.slice(0, 11);
    }
    return cleaned.slice(0, 13);
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { action: "send", phoneNumber: formattedPhone, userId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || "Verification code sent!");
        setStep("verify");
        setTimer(60);
        if (data.testCode) {
          toast.info(`Test Code: ${data.testCode} (Development only)`);
        }
      } else {
        setError(data.error || "Failed to send code");
        toast.error(data.error || "Failed to send code");
      }
    } catch (err: any) {
      console.error("Send code error:", err);
      setError(err.message || "Failed to send verification code");
      toast.error("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) {
      toast.info(`Please wait ${timer} seconds before resending`);
      return;
    }

    setResendLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { action: "send", phoneNumber: formatPhoneNumber(phoneNumber), userId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("New code sent!");
        setTimer(60);
        setVerificationCode("");
        if (data.testCode) {
          toast.info(`New Test Code: ${data.testCode}`);
        }
      } else {
        setError(data.error || "Failed to resend code");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { 
          action: "verify", 
          phoneNumber: formatPhoneNumber(phoneNumber), 
          code: verificationCode,
          userId 
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Phone number verified successfully!");
        onVerificationComplete?.();
        setStep("input");
      } else {
        setError(data.error || "Invalid verification code");
        toast.error(data.error || "Invalid verification code");
      }
    } catch (err: any) {
      console.error("Verify error:", err);
      setError(err.message || "Failed to verify code");
      toast.error("Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  if (isVerified) {
    return (
      <Card className="glass-strong bg-green-500/10 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">Phone Verified</p>
              <p className="text-sm text-muted-foreground">{currentPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Phone className="w-5 h-5 text-primary" />
          Phone Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "input" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(formatPhoneNumber(e.target.value));
                    setError("");
                  }}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your phone number (e.g., 08012345678)
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <Button
              onClick={handleSendCode}
              disabled={loading || !phoneNumber}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-sm">Verification code sent to</p>
              <p className="font-semibold">{formatPhoneNumber(phoneNumber)}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                disabled={loading}
                autoFocus
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            
            <Button
              onClick={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Phone Number
                </>
              )}
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || timer > 0}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                )}
                {timer > 0 ? `Resend code in ${timer}s` : "Resend Code"}
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PhoneVerification;