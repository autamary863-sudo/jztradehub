// src/pages/PaymentSuccess.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  CheckCircle,
  Package,
  ShoppingBag,
  Truck,
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Printer,
  Download,
  Sparkles,
  Shield,
  Home,
  ArrowRight
} from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const reference = searchParams.get("reference");
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");
  const message = searchParams.get("message");

  useEffect(() => {
    if (reference || orderId) {
      verifyPayment();
    } else if (status === "failed" || message) {
      setError(message || "Payment verification failed");
      setVerifying(false);
    } else {
      setError("No payment reference found");
      setVerifying(false);
    }
  }, [reference, orderId, status, message]);

  const verifyPayment = async () => {
    try {
      setVerifying(true);
      
      // First, try to get order from database
      let order = null;
      
      if (orderId) {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            products (id, title, description, price, image_url, category, brand),
            seller_profiles (business_name, business_address),
            buyer:profiles!orders_buyer_id_fkey (id, display_name, email, phone_number)
          `)
          .eq("id", orderId)
          .single();
        
        if (!error && data) {
          order = data;
          
          // Check if payment is already marked as paid
          if (data.payment_status === "paid") {
            setSuccess(true);
            setOrderDetails(data);
            triggerConfetti();
            setVerifying(false);
            return;
          }
        }
      }
      
      // If we have a reference, verify with backend
      if (reference) {
        const response = await fetch(`http://localhost:5000/api/verify-payment?reference=${reference}&orderId=${orderId}`);
        const result = await response.json();
        
        if (result.success || result.paid) {
          setSuccess(true);
          triggerConfetti();
          
          // Fetch updated order details
          if (orderId) {
            const { data: updatedOrder } = await supabase
              .from("orders")
              .select(`
                *,
                products (id, title, description, price, image_url, category, brand),
                seller_profiles (business_name, business_address),
                buyer:profiles!orders_buyer_id_fkey (id, display_name, email, phone_number)
              `)
              .eq("id", orderId)
              .single();
            
            setOrderDetails(updatedOrder || order);
          } else {
            setOrderDetails(order);
          }
        } else {
          setError(result.message || "Payment verification failed");
        }
      } else if (order && order.payment_status === "paid") {
        setSuccess(true);
        setOrderDetails(order);
        triggerConfetti();
      } else {
        setError("Unable to verify payment. Please contact support.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Failed to verify payment. Please check your order status in the dashboard.");
    } finally {
      setVerifying(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
    });
    
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.2 } });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5, x: 0.8 } });
    }, 200);
  };

  const downloadReceipt = async () => {
    const receiptElement = document.getElementById('receipt-content');
    if (!receiptElement) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(receiptElement, { 
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`receipt_${orderDetails?.id?.slice(0, 8)}.pdf`);
      toast.success("Receipt downloaded!");
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const printReceipt = () => {
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const winPrint = window.open('', '', 'width=800,height=600');
      winPrint?.document.write(`
        <html>
          <head>
            <title>Receipt - JZTradeHub</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: white; }
              .receipt { max-width: 800px; margin: 0 auto; }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      winPrint?.document.close();
      winPrint?.print();
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifying Your Payment...</h2>
          <p className="text-muted-foreground">Please wait while we confirm your transaction</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-black/40 backdrop-blur-sm border-red-500/30">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-500 mb-2">Payment Verification Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => navigate("/buyer")} className="w-full bg-gradient-to-r from-primary to-accent">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Check My Orders
              </Button>
              <Button variant="outline" onClick={() => navigate("/marketplace")} className="w-full border-white/20 text-white hover:bg-white/10">
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success && orderDetails) {
    const deliveryFee = orderDetails.delivery_fee || 0;
    const serviceFee = orderDetails.service_fee || 0;
    const subtotal = orderDetails.total_amount - deliveryFee - serviceFee;
    const product = orderDetails.products;

    return (
      <div className="min-h-screen bg-black">
        {/* Success Header with Confetti */}
        <div className="relative bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex p-4 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground text-lg">Your order has been confirmed and payment received</p>
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Order Confirmed
              </Badge>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Shield className="w-3 h-3 mr-1" />
                Escrow Protected
              </Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Receipt Content */}
          <div id="receipt-content" className="bg-white rounded-2xl overflow-hidden shadow-2xl mb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white text-center">
              <div className="inline-flex p-3 rounded-xl bg-white/10 backdrop-blur-sm mb-3">
                <Package className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">JZTradeHub</h2>
              <p className="text-gray-400 text-sm">Premium Escrow Marketplace</p>
              <Badge className="mt-2 bg-green-600/30 text-green-400 border-green-500/30">Payment Receipt ✓</Badge>
            </div>

            <div className="p-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">{orderDetails.id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm text-gray-900">{new Date(orderDetails.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm text-gray-900">Flutterwave</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Reference</p>
                  <p className="text-xs font-mono text-gray-600 truncate">{orderDetails.payment_reference || "N/A"}</p>
                </div>
              </div>

              {/* Product Details */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 text-sm mb-2">Order Items</h3>
                <div className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product?.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.title || "Product"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-base">{product?.title || "Product"}</h4>
                    {product?.brand && <p className="text-xs text-gray-500">Brand: {product.brand}</p>}
                    {product?.category && <p className="text-xs text-gray-500">Category: {product.category}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Quantity: {orderDetails.quantity}</p>
                        <p className="text-xs text-gray-500">Unit Price: ₦{product?.price?.toLocaleString()}</p>
                      </div>
                      <p className="font-bold text-green-600 text-lg">₦{orderDetails.total_amount?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm mb-2">Payment Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      <span>₦{deliveryFee.toLocaleString()}</span>
                    </div>
                  )}
                  {serviceFee > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Service Fee (5%)</span>
                      <span>₦{serviceFee.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-900">Total Paid</span>
                    <span className="text-green-600">₦{orderDetails.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Delivery */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">Customer Details</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>{orderDetails.buyer?.display_name || "Customer"}</p>
                    <p className="text-xs">{orderDetails.buyer?.email}</p>
                    {orderDetails.buyer?.phone_number && <p className="text-xs">{orderDetails.buyer.phone_number}</p>}
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">Delivery Address</h3>
                  <p className="text-sm text-gray-600">{orderDetails.delivery_address}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Est. delivery: 3-5 business days
                    </p>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-6">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Sold by</h3>
                <p className="text-sm text-gray-600">{orderDetails.seller_profiles?.business_name || "JZTradeHub Seller"}</p>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Thank you for shopping with JZTradeHub! Your payment is protected by escrow.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Need help? Contact support@jztradehub.com
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={printReceipt} variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button onClick={downloadReceipt} disabled={isDownloading} variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
              <Download className="w-4 h-4" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </Button>
            <Button onClick={() => navigate("/buyer")} className="gap-2 bg-gradient-to-r from-primary to-accent">
              <ShoppingBag className="w-4 h-4" />
              My Orders
            </Button>
            <Button onClick={() => navigate("/marketplace")} variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
              <Package className="w-4 h-4" />
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentSuccess;