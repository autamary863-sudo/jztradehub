// src/components/auth/AuthForm.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Loader2, ArrowLeft, Gift, Phone, Mail, Lock, User, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";

// Helper functions
const signUp = async (email: string, password: string, displayName: string, phoneNumber?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        display_name: displayName,
        phone_number: phoneNumber || null,
      },
    },
  });

  return { data, error };
};

const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

const applyReferralCode = async (userId: string, code: string) => {
  try {
    console.log("🔍 Looking for referrer with code:", code.toUpperCase());
    
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("id, display_name, referral_code")
      .eq("referral_code", code.toUpperCase())
      .single();

    if (referrerError) {
      console.error("❌ Referrer lookup error:", referrerError);
      return { success: false, error: "Invalid referral code", referrer: null };
    }

    if (!referrer) {
      console.error("❌ No referrer found with code:", code);
      return { success: false, error: "Referral code not found", referrer: null };
    }

    console.log("✅ Found referrer:", referrer.display_name, referrer.id);

    // Update the new user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", userId);

    if (updateError) {
      console.error("❌ Failed to update profile:", updateError);
      return { success: false, error: updateError.message, referrer: null };
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referee_id: userId,
        referral_code: code.toUpperCase(),
        status: "pending"
      });

    if (referralError) {
      console.error("❌ Failed to create referral record:", referralError);
      return { success: false, error: referralError.message, referrer: null };
    }

    console.log("✅ Referral record created!");
    return { success: true, referrer, error: null };

  } catch (error) {
    console.error("❌ Error applying referral code:", error);
    return { success: false, error: "Failed to apply referral code", referrer: null };
  }
};

const generateReferralCode = (userId: string, displayName: string) => {
  const prefix = displayName?.slice(0, 4).toUpperCase().replace(/\s/g, '') || userId.slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

const ensureReferralCode = async (userId: string, displayName: string) => {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .single();

    if (existing?.referral_code) {
      return existing.referral_code;
    }

    const newCode = generateReferralCode(userId, displayName);
    
    const { error } = await supabase
      .from("profiles")
      .update({ referral_code: newCode })
      .eq("id", userId);

    if (error) {
      console.error("Failed to set referral code:", error);
      return null;
    }

    return newCode;
  } catch (error) {
    console.error("Error generating referral code:", error);
    return null;
  }
};

const AuthForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isGoogleInitialized, setIsGoogleInitialized] = useState(false);
  const [urlReferralCode, setUrlReferralCode] = useState<string | null>(null);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [validReferral, setValidReferral] = useState<{ valid: boolean; message: string; referrerName?: string } | null>(null);
  
  const rawFrom = (location.state as { from?: string })?.from;
  const from = rawFrom && rawFrom !== "/auth" ? rawFrom : "/";
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    phoneNumber: "",
    referralCode: "",
  });

  // Check for referral code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setUrlReferralCode(refCode);
      setFormData(prev => ({ ...prev, referralCode: refCode }));
      validateReferralCode(refCode);
    }
  }, []);

  // Validate referral code against database
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setValidReferral(null);
      return;
    }
    
    setIsValidatingReferral(true);
    setValidReferral(null);
    
    try {
      console.log("🔍 Validating referral code:", code.toUpperCase());
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, referral_code")
        .eq("referral_code", code.toUpperCase())
        .maybeSingle();

      console.log("Validation result:", { data, error });

      if (error) {
        console.error("Validation error:", error);
        setValidReferral({ 
          valid: false, 
          message: "Error validating referral code. Please try again." 
        });
      } else if (!data) {
        setValidReferral({ 
          valid: false, 
          message: "Invalid referral code. Please check and try again." 
        });
      } else {
        setValidReferral({ 
          valid: true, 
          message: `✅ You were referred by ${data.display_name || 'a friend'}! You'll both earn ₦1,000 when you make your first purchase.`,
          referrerName: data.display_name
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidReferral({ 
        valid: false, 
        message: "Could not validate referral code. Please try again." 
      });
    } finally {
      setIsValidatingReferral(false);
    }
  };

  // Handle referral code input change
  const handleReferralCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, referralCode: code }));
    
    if (code.length >= 4) {
      await validateReferralCode(code);
    } else {
      setValidReferral(null);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const timer = setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Signed in successfully!");
        }
      } else {
        // Validate required fields
        if (!formData.displayName) {
          toast.error("Please enter your display name");
          setIsLoading(false);
          return;
        }
        if (!formData.email) {
          toast.error("Please enter your email");
          setIsLoading(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }

        const { data, error } = await signUp(
          formData.email,
          formData.password,
          formData.displayName,
          formData.phoneNumber
        );
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered");
          } else {
            toast.error(error.message);
          }
        } else if (data?.user) {
          // Apply referral code if provided and valid
          const referralToApply = formData.referralCode || urlReferralCode;
          
          if (referralToApply && validReferral?.valid) {
            console.log("🎯 Applying referral code:", referralToApply);
            const result = await applyReferralCode(data.user.id, referralToApply);
            if (result.success && result.referrer) {
              toast.success(`🎉 Referred by ${result.referrer.display_name}! You'll both earn ₦1,000 on first purchase.`);
            } else if (result.error) {
              console.error("Referral error:", result.error);
              toast.error("Could not apply referral code. Please contact support.");
            }
          }
          
          // Ensure user has their own referral code
          const userReferralCode = await ensureReferralCode(data.user.id, formData.displayName);
          if (userReferralCode) {
            console.log("📢 Your referral code:", userReferralCode);
            // Store in session storage for later use
            sessionStorage.setItem('myReferralCode', userReferralCode);
          }
          
          toast.success("Account created successfully! Please check your email to verify your account.");
          
          // Clear form
          setFormData({
            email: "",
            password: "",
            displayName: "",
            phoneNumber: "",
            referralCode: "",
          });
          setValidReferral(null);
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    if (user || isGoogleInitialized) return;
    
    const clientId = "687746098435-johcljfhraeds3qlju0n7sgkh5n56c9t.apps.googleusercontent.com";
    
    const handleGoogleResponse = async (response: any) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });
        
        if (error) {
          console.error("Google sign-in error:", error);
          toast.error(error.message || "Google sign-in failed");
        } else if (data?.user) {
          // Apply referral code after Google signup
          const referralToApply = formData.referralCode || urlReferralCode;
          if (referralToApply && validReferral?.valid && data.user?.id) {
            await applyReferralCode(data.user.id, referralToApply);
          }
          // Ensure user has referral code
          const displayName = data.user.user_metadata?.display_name || formData.displayName || data.user.email?.split('@')[0];
          if (displayName) {
            await ensureReferralCode(data.user.id, displayName);
          }
          toast.success("Signed in successfully!");
        }
      } catch (err) {
        console.error("Unexpected Google sign-in error:", err);
        toast.error("Google sign-in failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id && googleButtonRef.current && !isGoogleInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          context: isLogin ? "signin" : "signup",
          ux_mode: "popup",
        });
        
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { 
            theme: "outline", 
            size: "large",
            width: "100%",
            text: isLogin ? "signin_with" : "signup_with",
            shape: "rectangular",
            logo_alignment: "center"
          }
        );
        
        setIsGoogleInitialized(true);
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogle);
          renderGoogleButton();
        }
      }, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(checkGoogle);
        console.warn("Google Sign-In script failed to load");
      }, 10000);
      
      return () => {
        clearInterval(checkGoogle);
        clearTimeout(timeout);
      };
    }
  }, [isLogin, user, isGoogleInitialized, formData.referralCode, urlReferralCode, validReferral]);

  if (authLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="glass-strong w-full max-w-md p-6 md:p-8 animate-scale-in">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your JZTradeHub account" : "Join the JZTradeHub marketplace"}
          </p>
        </div>

        {/* Referral Banner - Show when valid code is entered */}
        {!isLogin && validReferral && validReferral.valid && (
          <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-green-600">Referral Code Applied! 🎉</span>
            </div>
            <p className="text-xs text-green-600">{validReferral.message}</p>
          </div>
        )}

        {!isLogin && validReferral && !validReferral.valid && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-red-500">{validReferral.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  disabled={isLoading}
                  className="glass"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="08012345678"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  disabled={isLoading}
                  className="glass"
                />
                <p className="text-xs text-muted-foreground">
                  Required for delivery updates and account recovery. We respect your privacy and won't spam you.
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
              className="glass"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password *
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isLoading}
              className="glass"
              required
            />
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}
            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          {/* Referral Code Input - Only shown on Sign Up */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                Referral Code
              </Label>
              <div className="relative">
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code (e.g., USER123456)"
                  value={formData.referralCode}
                  onChange={handleReferralCodeChange}
                  disabled={isLoading || isValidatingReferral}
                  className={`glass pr-20 ${
                    validReferral?.valid ? 'border-green-500 ring-1 ring-green-500' : 
                    validReferral?.valid === false ? 'border-red-500' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidatingReferral && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {validReferral?.valid && !isValidatingReferral && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {validReferral?.valid === false && !isValidatingReferral && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Have a referral code from a friend? Enter it here to earn ₦1,000 on your first purchase!
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>{isLogin ? "Sign In" : "Create Account"}</>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div 
          id="googleSignInButton" 
          ref={googleButtonRef}
          className="w-full flex justify-center min-h-[44px]"
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ email: "", password: "", displayName: "", phoneNumber: "", referralCode: "" });
              setValidReferral(null);
              setIsGoogleInitialized(false);
            }}
            className="text-sm text-primary hover:underline"
            disabled={isLoading}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Footer */}
        {!isLogin && (
          <div className="mt-6 pt-4 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Secure Escrow
              </span>
              <span className="flex items-center gap-1">
                <Gift className="w-3 h-3" />
                Earn ₦1,000 per referral
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuthForm;