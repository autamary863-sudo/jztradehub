// src/pages/Checkout.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShoppingCart,
  ArrowLeft,
  Shield,
  Truck,
  CreditCard,
  Package,
  MapPin,
  User,
  Loader2,
  Tag,
  X,
  Wallet,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  seller_id: string;
  category: string;
  brand: string | null;
}

interface DeliveryOption {
  id: string;
  name: string;
  fee: number;
  estimated_days: string;
  is_active: boolean;
  description?: string;
}

interface SellerProfile {
  id: string;
  user_id: string;
  business_name: string;
  delivery_options: DeliveryOption[];
}

const NIGERIAN_STATES = [
  "Lagos", "Abuja FCT", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", 
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", 
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Ogun", "Ondo", 
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const Checkout = () => {
  const { productId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quantityParam = searchParams.get("quantity");
  
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [quantity, setQuantity] = useState(quantityParam ? parseInt(quantityParam) : 1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<"flutterwave" | "wallet">("flutterwave");
  const [walletBalance, setWalletBalance] = useState(0);
  
  const [selectedState, setSelectedState] = useState("");
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption | null>(null);
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (productId) {
      fetchProductAndSeller();
    }
    if (user) {
      fetchUserProfile();
      fetchWalletBalance();
    }
  }, [productId, user]);

  const fetchProductAndSeller = async () => {
    try {
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      
      if (productData) {
        setProduct(productData);
        
        const { data: sellerData } = await supabase
          .from("seller_profiles")
          .select("id, user_id, business_name, delivery_options")
          .eq("user_id", productData.seller_id)
          .single();
        
        if (sellerData) {
          let deliveryOpts = sellerData.delivery_options;
          if (typeof deliveryOpts === 'string') {
            deliveryOpts = JSON.parse(deliveryOpts);
          }
          
          const validOptions = (deliveryOpts || []).filter((opt: DeliveryOption) => opt.is_active);
          setDeliveryOptions(validOptions);
          if (validOptions.length > 0) {
            setSelectedDeliveryOption(validOptions[0]);
          }
          setSeller(sellerData);
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone_number, email")
        .eq("id", user?.id)
        .single();
      
      if (data) {
        setFullName(data.display_name || "");
        setPhoneNumber(data.phone_number || "");
        setEmail(data.email || user?.email || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      
      const response = await fetch(`${API_URL}/api/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setWalletBalance(data.wallet?.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  const getSubtotal = () => product ? product.price * quantity : 0;
  const getDeliveryFee = () => selectedDeliveryOption?.fee || 0;
  const getServiceFee = () => getSubtotal() * 0.05;
  const getTotal = () => getSubtotal() + getDeliveryFee() + getServiceFee() - couponDiscount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    
    setIsApplyingCoupon(true);
    setCouponError("");
    
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();
      
      if (error || !data) {
        setCouponError("Invalid or expired coupon code");
        toast.error("Invalid coupon code");
        return;
      }
      
      if (data.end_date && new Date(data.end_date) < new Date()) {
        setCouponError("Coupon has expired");
        toast.error("Coupon has expired");
        return;
      }
      
      let discount = 0;
      if (data.discount_type === "percentage") {
        discount = (getTotal() * data.discount_value) / 100;
        if (data.maximum_discount && discount > data.maximum_discount) {
          discount = data.maximum_discount;
        }
      } else {
        discount = data.discount_value;
      }
      
      setCouponDiscount(discount);
      setAppliedCoupon(couponCode.toUpperCase());
      toast.success(`Coupon applied! You saved ₦${discount.toLocaleString()}`);
      setCouponCode("");
      
    } catch (error) {
      setCouponError("Failed to validate coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponDiscount(0);
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  const validateForm = () => {
    if (!selectedState) {
      toast.error("Please select your state");
      return false;
    }
    if (!selectedDeliveryOption) {
      toast.error("Please select a delivery option");
      return false;
    }
    if (!streetAddress.trim()) {
      toast.error("Please enter your street address");
      return false;
    }
    if (!phoneNumber.trim()) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!user) {
      toast.error("Please login to continue");
      navigate("/auth");
      return false;
    }
    return true;
  };

  const reduceProductStock = async (productId: string, quantity: number) => {
    if (!product) return;
    
    const newStock = product.stock_quantity - quantity;
    
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", productId);
    
    if (error) {
      console.error("Error reducing stock:", error);
    } else {
      console.log(`✅ Stock reduced: ${product.title} now has ${newStock} units left`);
    }
  };

  const handleFlutterwavePayment = async () => {
    if (!validateForm() || !product || !seller) return;
    
    // Check stock availability
    if (product.stock_quantity < quantity) {
      toast.error(`Only ${product.stock_quantity} units available in stock`);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const currentUser = user;
      if (!currentUser) {
        toast.info("Please sign in to continue");
        navigate("/auth", { state: { from: `/checkout/${productId}` } });
        return;
      }
      
      const deliveryAddress = `${streetAddress}${landmark ? `, ${landmark}` : ''}, ${selectedState}`;
      const total = getTotal();
      
      // Create order
      const orderResponse = await fetch(`${API_URL}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_id: currentUser.id,
          seller_id: product.seller_id,
          product_id: product.id,
          quantity: quantity,
          product_price: product.price,
          delivery_address: deliveryAddress,
          delivery_fee: getDeliveryFee(),
          service_fee: getServiceFee(),
          phone_number: phoneNumber,
          coupon_discount: couponDiscount,
          delivery_type: selectedDeliveryOption?.id || "standard",
          estimated_days: selectedDeliveryOption?.estimated_days,
          delivery_state: selectedState,
          payment_method: "flutterwave"
        })
      });
      
      const orderData = await orderResponse.json();
      if (!orderData.success) throw new Error(orderData.message || "Failed to create order");
      
      // Reduce product stock
      await reduceProductStock(product.id, quantity);
      
      // Initialize Flutterwave payment
      const response = await fetch('https://jztradehub-api.onrender.com/api/initialize-payment'
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          email: email || currentUser.email,
          name: fullName,
          orderId: orderData.orderId,
          phone: phoneNumber
        })
      });
      
      const paymentData = await paymentResponse.json();
      
      if (paymentData.success && paymentData.data?.checkout_url) {
        sessionStorage.setItem('pendingOrderId', orderData.orderId);
        window.location.href = paymentData.data.checkout_url;
      } else {
        await reduceProductStock(product.id, -quantity);
        throw new Error(paymentData.message || "Payment initialization failed");
      }
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to process checkout");
      setIsProcessing(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!validateForm() || !product || !seller) return;
    
    const total = getTotal();
    
    if (walletBalance < total) {
      toast.error(`Insufficient wallet balance. Available: ₦${walletBalance.toLocaleString()}`);
      return;
    }
    
    if (product.stock_quantity < quantity) {
      toast.error(`Only ${product.stock_quantity} units available in stock`);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      
      const deliveryAddress = `${streetAddress}${landmark ? `, ${landmark}` : ''}, ${selectedState}`;
      
      const orderResponse = await fetch(`${API_URL}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_id: user.id,
          seller_id: product.seller_id,
          product_id: product.id,
          quantity: quantity,
          product_price: product.price,
          delivery_address: deliveryAddress,
          delivery_fee: getDeliveryFee(),
          service_fee: getServiceFee(),
          phone_number: phoneNumber,
          coupon_discount: couponDiscount,
          delivery_type: selectedDeliveryOption?.id || "standard",
          estimated_days: selectedDeliveryOption?.estimated_days,
          delivery_state: selectedState,
          payment_method: "wallet"
        })
      });
      
      const orderData = await orderResponse.json();
      if (!orderData.success) throw new Error(orderData.message);
      
      await reduceProductStock(product.id, quantity);
      
      const paymentResponse = await fetch(`${API_URL}/api/wallet/pay-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          amount: total
        })
      });
      
      const paymentData = await paymentResponse.json();
      
      if (paymentData.success) {
        toast.success(`Payment successful! ₦${total.toLocaleString()} deducted from wallet`);
        navigate(`/payment-success?orderId=${orderData.orderId}&paymentMethod=wallet`);
      } else {
        await reduceProductStock(product.id, -quantity);
        throw new Error(paymentData.message || "Wallet payment failed");
      }
      
    } catch (error: any) {
      console.error("Wallet payment error:", error);
      toast.error(error.message || "Failed to process wallet payment");
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (paymentMethod === "wallet") {
      handleWalletPayment();
    } else {
      handleFlutterwavePayment();
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Header />
        <div className="container px-4 py-20 text-center">
          <Package className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <Button onClick={() => navigate("/marketplace")}>Browse Products</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const serviceFee = getServiceFee();
  const total = getTotal();
  const canUseWallet = walletBalance >= total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      <div className="container px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Product Card */}
              <Card className="glass-strong overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4 p-5">
                  <div className="w-full sm:w-28 h-28 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1">{product.title}</h2>
                    {product.brand && <p className="text-sm text-muted-foreground">Brand: {product.brand}</p>}
                    <p className="text-sm text-muted-foreground">Seller: {seller?.business_name || "Verified Seller"}</p>
                    {product.stock_quantity < 10 && (
                      <Badge className="mt-2 bg-red-500/10 text-red-600">
                        Only {product.stock_quantity} left in stock!
                      </Badge>
                    )}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Quantity */}
              <Card className="glass-strong">
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Package className="w-5 h-5 text-primary" /> Quantity</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</Button>
                    <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(quantity + 1, product.stock_quantity))} disabled={quantity >= product.stock_quantity}>+</Button>
                    <span className="text-sm text-muted-foreground">{product.stock_quantity} available</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Delivery Information */}
              <Card className="glass-strong">
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><MapPin className="w-5 h-5 text-primary" /> Delivery Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Select State</Label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="glass">
                        <SelectValue placeholder="Choose your state" />
                      </SelectTrigger>
                      <SelectContent className="glass-strong max-h-80">
                        {NIGERIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {deliveryOptions.length > 0 && selectedState && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Delivery Options (from {seller?.business_name})</Label>
                      <RadioGroup 
                        value={selectedDeliveryOption?.id} 
                        onValueChange={(value) => {
                          const option = deliveryOptions.find(opt => opt.id === value);
                          if (option) setSelectedDeliveryOption(option);
                        }}
                        className="space-y-2"
                      >
                        {deliveryOptions.map((option) => (
                          <div 
                            key={option.id}
                            className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                              selectedDeliveryOption?.id === option.id 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem value={option.id} id={option.id} className="absolute top-3 right-3" />
                            <Label htmlFor={option.id} className="cursor-pointer block">
                              <div className="flex items-center justify-between flex-wrap gap-2 pr-8">
                                <div>
                                  <p className="font-semibold">{option.name}</p>
                                  {option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}
                                  <p className="text-xs text-muted-foreground mt-0.5">{option.estimated_days}</p>
                                </div>
                                <p className="text-xl font-bold text-primary">₦{option.fee.toLocaleString()}</p>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label>Street Address</Label>
                    <Input placeholder="House number, street name" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="glass" />
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Landmark (Optional)</Label>
                    <Input placeholder="Nearby landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="glass" />
                  </div>
                </CardContent>
              </Card>
              
              {/* Customer Information */}
              <Card className="glass-strong">
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-primary" /> Your Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="glass" />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="glass" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Phone Number</Label>
                    <Input type="tel" placeholder="08012345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="glass" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                {/* Payment Method Tabs */}
                <Card className="glass-strong">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="w-5 h-5 text-primary" /> Payment Method</CardTitle></CardHeader>
                  <CardContent>
                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "flutterwave" | "wallet")} className="w-full">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="flutterwave" className="gap-2">
                          <CreditCard className="w-4 h-4" />
                          Card/Bank
                        </TabsTrigger>
                        <TabsTrigger value="wallet" className="gap-2" disabled={walletBalance === 0}>
                          <Wallet className="w-4 h-4" />
                          Wallet {walletBalance > 0 && `(₦${walletBalance.toLocaleString()})`}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="flutterwave" className="mt-3">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                          <CreditCard className="w-8 h-8 mx-auto text-primary mb-2" />
                          <p className="text-sm">Pay with Card, Bank Transfer, or USSD</p>
                          <p className="text-xs text-muted-foreground mt-1">Powered by Flutterwave</p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="wallet" className="mt-3">
                        <div className={`p-3 rounded-lg text-center ${canUseWallet ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                          <Wallet className={`w-8 h-8 mx-auto mb-2 ${canUseWallet ? "text-green-500" : "text-red-500"}`} />
                          <p className="text-sm font-semibold">Wallet Balance: ₦{walletBalance.toLocaleString()}</p>
                          {!canUseWallet && (
                            <p className="text-xs text-red-500 mt-1">Insufficient balance. Add funds to wallet.</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
                
                {/* Order Summary Card */}
                <Card className="glass-strong">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><ShoppingCart className="w-5 h-5 text-primary" /> Order Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal ({quantity} item)</span>
                        <span>₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>₦{deliveryFee.toLocaleString()}</span>
                      </div>
                      {selectedDeliveryOption && (
                        <div className="flex justify-between text-xs text-muted-foreground pl-2">
                          <span>{selectedDeliveryOption.name}</span>
                          <span>{selectedDeliveryOption.estimated_days}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Fee (5%)</span>
                        <span>₦{serviceFee.toLocaleString()}</span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Coupon Discount</span>
                          <span>-₦{couponDiscount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">₦{total.toLocaleString()}</span>
                    </div>
                    
                    {/* Coupon Section */}
                    <div className="pt-2">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                          <div>
                            <p className="text-sm font-semibold text-green-600">{appliedCoupon}</p>
                            <p className="text-xs text-green-600">Saved ₦{couponDiscount.toLocaleString()}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="h-8 w-8 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Coupon code" 
                            value={couponCode} 
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                            className="flex-1 glass h-9 text-sm" 
                          />
                          <Button onClick={handleApplyCoupon} disabled={isApplyingCoupon} variant="outline" size="sm">
                            {isApplyingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                      )}
                      {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                    </div>
                    
                    {/* Stock Warning */}
                    {product.stock_quantity < 5 && product.stock_quantity > 0 && (
                      <div className="p-2 rounded-lg bg-red-500/10 text-center text-xs text-red-500 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Only {product.stock_quantity} left! Order soon.</span>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleCheckout} 
                      disabled={isProcessing || !selectedState || !selectedDeliveryOption || !streetAddress || (paymentMethod === "wallet" && !canUseWallet) || product.stock_quantity === 0} 
                      className="w-full bg-gradient-to-r from-primary to-accent" 
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : product.stock_quantity === 0 ? (
                        <>
                          <Package className="w-4 h-4 mr-2" />
                          Out of Stock
                        </>
                      ) : (
                        <>
                          {paymentMethod === "wallet" ? (
                            <Wallet className="w-4 h-4 mr-2" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-2" />
                          )}
                          Pay ₦{total.toLocaleString()} with {paymentMethod === "wallet" ? "Wallet" : "Flutterwave"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
