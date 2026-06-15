// src/components/PhoneInput.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onVerified: (phone: string) => void;
}

const PhoneInput = ({ value, onChange, onVerified }: PhoneInputProps) => {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");

  const formatPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      return cleaned.slice(0, 11);
    }
    return cleaned.slice(0, 13);
  };

  const handleSendCode = () => {
    if (!value || value.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    // Mock OTP for demo - in production, call your edge function
    toast.success(`Code sent to ${value}`);
    setStep("verify");
  };

  const handleVerify = () => {
    if (!code || code.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    // Mock verification - in production, call your edge function
    if (code === "123456") {
      setVerified(true);
      onVerified(value);
      toast.success("Phone verified!");
    } else {
      toast.error("Invalid code. Try 123456 for test.");
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Phone verified: {value}</span>
      </div>
    );
  }

  if (step === "input") {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="08012345678"
            value={value}
            onChange={(e) => onChange(formatPhone(e.target.value))}
            className="pl-10"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleSendCode}>
          Send Verification Code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        placeholder="Enter 6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="text-center text-xl tracking-widest"
        maxLength={6}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleVerify} disabled={verifying}>
          Verify
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setStep("input")}>
          Change Number
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Test code: 123456</p>
    </div>
  );
};

export default PhoneInput;