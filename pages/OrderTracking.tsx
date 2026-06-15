import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  Home,
  CreditCard,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import OrderReceivedDialog from "@/components/OrderReceivedDialog";

interface Order {
  id: string;
  total_amount: number;
  quantity: number;
  status: string;
  payment_status: string;
  delivery_address: string;
  created_at: string;
  seller_id: string;
  products: {
    title: string;
    image_url: string;
    price: number;
  };
  seller_profiles?: {
    business_name: string;
  };
}

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceivedDialog, setShowReceivedDialog] = useState(false);
  
  // Use ref to track subscription
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (user && orderId) {
      fetchOrder();
      subscribeToOrder();
    }
    
    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user, orderId]);

  const subscribeToOrder = () => {
    // First unsubscribe if there's an existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    // Create a new channel
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe((status) => {
        console.log('Order subscription status:', status);
      });
    
    subscriptionRef.current = channel;
  };

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          quantity,
          status,
          payment_status,
          delivery_address,
          created_at,
          seller_id,
          products (
            title,
            image_url,
            price
          )
        `)
        .eq("id", orderId)
        .eq("buyer_id", user?.id)
        .single();

      if (error) throw error;

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from("seller_profiles")
        .select("business_name")
        .eq("user_id", data.seller_id)
        .single();

      setOrder({ ...data, seller_profiles: sellerProfile });
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Order not found");
      navigate("/buyer");
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: "pending", label: "Order Placed", icon: Package },
      { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
      { key: "shipped", label: "Shipped", icon: Truck },
      { key: "delivered", label: "Delivered", icon: Home },
      { key: "completed", label: "Completed", icon: PackageCheck },
    ];

    const statusIndex = steps.findIndex((s) => s.key === order?.status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= statusIndex,
      current: index === statusIndex,
    }));
  };

  const canConfirmReceived = order?.status === "delivered" && order?.payment_status === "paid";

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (!order) {
    return null;
  }

  const steps = getStatusSteps();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/buyer")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Orders
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Order Tracking</h1>
              <p className="text-muted-foreground font-mono text-sm">
                #{order.id.slice(0, 8)}
              </p>
            </div>
          </div>

          {/* Payment Status */}
          <Card className="glass-strong mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <span>Payment Status</span>
                </div>
                {order.payment_status === "paid" ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Awaiting Verification
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Status Timeline */}
          <Card className="glass-strong mb-6">
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-start mb-8 last:mb-0">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.completed
                              ? step.current
                                ? "bg-primary text-primary-foreground"
                                : "bg-green-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-0.5 h-12 mt-2 ${
                              step.completed && !step.current
                                ? "bg-green-500"
                                : "bg-muted"
                            }`}
                          />
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <p
                          className={`font-medium ${
                            step.current ? "text-primary" : step.completed ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        {step.current && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.key === "pending" && "Your order has been placed and is awaiting payment confirmation."}
                            {step.key === "confirmed" && "Payment confirmed! Seller is preparing your order."}
                            {step.key === "shipped" && "Your order is on its way to you."}
                            {step.key === "delivered" && "Your order has been delivered! Please confirm receipt."}
                            {step.key === "completed" && "Transaction complete! Payment has been disbursed to seller."}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Confirm Order Received Button */}
          {canConfirmReceived && (
            <Card className="glass-strong mb-6 border-green-500/30 bg-green-500/5">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg mb-1">Order Delivered!</h3>
                    <p className="text-sm text-muted-foreground">
                      Have you received your order? Confirm to complete the transaction.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    onClick={() => setShowReceivedDialog(true)}
                  >
                    <PackageCheck className="w-5 h-5 mr-2" />
                    Order Received
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Completed Banner */}
          {order.status === "completed" && (
            <Card className="glass-strong mb-6 border-green-500/30 bg-green-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    Order Completed - Thank you for your purchase!
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product */}
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {order.products?.image_url ? (
                    <img
                      src={order.products.image_url}
                      alt={order.products.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{order.products?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {order.quantity}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Seller: {order.seller_profiles?.business_name || "Unknown"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    ₦{Number(order.total_amount).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Delivery Address
                </h4>
                <p className="text-muted-foreground">{order.delivery_address}</p>
              </div>

              {/* Order Date */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Ordered on {new Date(order.created_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Received Dialog */}
      <OrderReceivedDialog
        open={showReceivedDialog}
        onOpenChange={setShowReceivedDialog}
        orderId={order.id}
        orderAmount={Number(order.total_amount)}
        sellerId={order.seller_id}
        onConfirm={fetchOrder}
      />
    </div>
  );
};

export default OrderTracking;