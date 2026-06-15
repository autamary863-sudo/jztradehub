import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Store, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { z } from "zod";

const businessProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(200),
  businessDescription: z.string().max(2000).optional(),
  businessAddress: z.string().max(500).optional(),
  bankName: z.string().trim().min(2, "Bank name is required").max(100),
  accountNumber: z.string().trim().min(10, "Account number must be at least 10 digits").max(20),
  accountName: z.string().trim().min(2, "Account name is required").max(100),
});

const BecomeSellerPage = () => {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    businessAddress: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (roles.includes("seller")) {
    navigate("/seller");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    try {
      businessProfileSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      // Create seller profile
      const { error: profileError } = await supabase
        .from("seller_profiles")
        .insert({
          user_id: user.id,
          business_name: formData.businessName.trim(),
          business_description: formData.businessDescription.trim(),
          business_address: formData.businessAddress.trim(),
          bank_name: formData.bankName.trim(),
          account_number: formData.accountNumber.trim(),
          account_name: formData.accountName.trim(),
        });

      if (profileError) throw profileError;

      // Add seller role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "seller",
        });

      if (roleError) {
        // Provide specific error message for user role issues
        if (roleError.code === '23505') {
          throw new Error("You already have a seller role.");
        } else if (roleError.message.includes('permission')) {
          throw new Error("Permission denied. Please contact support to become a seller.");
        } else {
          throw new Error(`Failed to assign seller role: ${roleError.message}`);
        }
      }

      toast.success("Welcome to JZTradeHub! Your seller account is ready.");
      navigate("/seller");
    } catch (error: any) {
      console.error("Error creating seller account:", error);
      toast.error(error.message || "Failed to create seller account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
              <Store className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Become a Seller</h1>
            <p className="text-muted-foreground text-lg">
              Join thousands of sellers on our trusted marketplace
            </p>
          </div>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Set Up Your Business</CardTitle>
              <CardDescription>
                Tell us about your business to get started. You can update this information later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">
                    Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Enter your business name"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    required
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description</Label>
                  <Textarea
                    id="businessDescription"
                    placeholder="Tell buyers about your business..."
                    value={formData.businessDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, businessDescription: e.target.value })
                    }
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.businessDescription.length}/2000 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    placeholder="Enter your business address"
                    value={formData.businessAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, businessAddress: e.target.value })
                    }
                    maxLength={500}
                  />
                </div>

                <div className="glass p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-sm">Bank Account Details</h4>
                  <p className="text-xs text-muted-foreground">
                    Add your bank details to receive payments when orders are delivered
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankName">
                      Bank Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bankName"
                      placeholder="e.g., Access Bank, GTBank"
                      value={formData.bankName}
                      onChange={(e) =>
                        setFormData({ ...formData, bankName: e.target.value })
                      }
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">
                      Account Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="accountNumber"
                      placeholder="Enter your account number"
                      value={formData.accountNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, accountNumber: e.target.value })
                      }
                      required
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">
                      Account Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="accountName"
                      placeholder="Account holder name"
                      value={formData.accountName}
                      onChange={(e) =>
                        setFormData({ ...formData, accountName: e.target.value })
                      }
                      required
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="glass p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">Benefits of Selling on JZTradeHub</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Only 5% commission per sale</li>
                    <li>• Secure escrow payment protection</li>
                    <li>• Access to thousands of buyers</li>
                    <li>• Free product listings</li>
                    <li>• Fast payment release after delivery</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Your Account...
                    </>
                  ) : (
                    <>
                      Create Seller Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BecomeSellerPage;