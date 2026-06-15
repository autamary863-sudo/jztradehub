// src/pages/PaymentSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  CheckCircle,
  Package,
  ShoppingBag,
  Truck,
  MapPin,
  User,
  Mail,
  CreditCard,
  Shield,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | 'failed' | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [buyer, setBuyer] = useState<any>(null);

  const reference = searchParams.get("reference");
  const orderId = searchParams.get("orderId");
  const urlStatus = searchParams.get("status");

  useEffect(() => {
    if (urlStatus === 'cancelled') {
      setPaymentStatus('cancelled');
      setLoading(false);
      return;
    }
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      let url = `${API_URL}/api/verify-payment?`;
      if (reference) url += `reference=${reference}&`;
      if (orderId) url += `orderId=${orderId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("Verification result:", data);
      
      if (data.cancelled === true) {
        setPaymentStatus('cancelled');
        setLoading(false);
        return;
      }
      
      if (data.paid === true) {
        // Trigger confetti
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        setTimeout(() => {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.2 } });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.8 } });
        }, 200);
        
        setPaymentStatus('success');
        
        const realOrderId = orderId || data.orderId;
        
        if (realOrderId) {
          // Fetch order
          const { data: orderData } = await supabase
            .from("orders")
            .select("*")
            .eq("id", realOrderId)
            .single();
          
          if (orderData) {
            setOrder(orderData);
            
            // Fetch product
            if (orderData.product_id) {
              const { data: productData } = await supabase
                .from("products")
                .select("*")
                .eq("id", orderData.product_id)
                .single();
              if (productData) setProduct(productData);
            }
            
            // Fetch buyer
            if (orderData.buyer_id) {
              const { data: buyerData } = await supabase
                .from("profiles")
                .select("display_name, email, phone_number")
                .eq("id", orderData.buyer_id)
                .single();
              if (buyerData) setBuyer(buyerData);
            }
          }
        }
        setLoading(false);
        return;
      }
      
      if (data.failed === true) {
        setPaymentStatus('failed');
        setLoading(false);
        return;
      }
      
      setPaymentStatus('failed');
      setLoading(false);
      
    } catch (err) {
      console.error("Verification error:", err);
      setPaymentStatus('failed');
      setLoading(false);
    }
  };

  // Animated Tick Component
  const AnimatedTick = () => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
      setTimeout(() => setIsVisible(true), 100);
    }, []);
    
    return (
      <div className="relative w-32 h-32 mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full shadow-2xl animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full shadow-2xl animate-ping opacity-50" />
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 transform ${isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16 text-white">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  // Cancelled State
  if (paymentStatus === 'cancelled') {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
              <p className="text-muted-foreground mb-6">No charges were made.</p>
              <Button onClick={() => navigate(-1)} className="w-full">Try Again</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Failed State
  if (paymentStatus === 'failed') {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2 text-red-600">Payment Failed</h1>
              <p className="text-muted-foreground mb-6">Please try again.</p>
              <Button onClick={() => navigate(-1)} className="w-full">Try Again</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Success State
  if (paymentStatus === 'success') {
    // Fallback if no order data
    if (!order) {
      return (
        <>
          <Header />
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
                <p className="text-muted-foreground mb-6">Your order has been confirmed.</p>
                <div className="space-y-3">
                  <Button onClick={() => navigate("/buyer")} className="w-full">View My Orders</Button>
                  <Button variant="outline" onClick={() => navigate("/marketplace")} className="w-full">Continue Shopping</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <Footer />
        </>
      );
    }

    // Full success page with order details
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
          <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 py-12">
            <div className="container mx-auto px-4 text-center">
              <AnimatedTick />
              <h1 className="text-3xl md:text-4xl font-bold mb-2 mt-6">Payment Successful!</h1>
              <p className="text-muted-foreground">Your order has been confirmed</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge className="bg-green-500/20 text-green-600">Order Confirmed</Badge>
                <Badge className="bg-primary/20 text-primary">Escrow Protected</Badge>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Order ID</p>
                    <p className="font-mono text-sm font-semibold">{order.id?.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="text-sm">Flutterwave</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">₦{order.total_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {product && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground m-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{product.title}</h3>
                      <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
                      <p className="text-lg font-bold text-primary">₦{product.price?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Customer Details</h3>
                  </div>
                  <p className="text-sm">{buyer?.display_name || "Customer"}</p>
                  <p className="text-sm text-muted-foreground">{buyer?.email}</p>
                  <p className="text-sm text-muted-foreground">{order.phone_number}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Delivery Address</h3>
                  </div>
                  <p className="text-sm">{order.delivery_address}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => navigate("/buyer")} className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                My Orders
              </Button>
              <Button onClick={() => navigate("/marketplace")} variant="outline" className="gap-2">
                <Package className="w-4 h-4" />
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return null;
};

export default PaymentSuccess;