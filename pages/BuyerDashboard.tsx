import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, Clock, CheckCircle2, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  products: {
    title: string;
    image_url: string;
  };
}

const BuyerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    completed: 0,
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastConfirmedOrderId, setLastConfirmedOrderId] = useState<string | null>(null);
  
  // Use ref to track subscription
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
      subscribeToOrderUpdates();
    }
    
    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user]);

  const subscribeToOrderUpdates = () => {
    // First unsubscribe if there's an existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    // Create a new channel
    const channel = supabase
      .channel('buyer-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user?.id}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          if (updatedOrder.payment_status === 'paid' && lastConfirmedOrderId !== updatedOrder.id) {
            setLastConfirmedOrderId(updatedOrder.id);
            setShowSuccessDialog(true);
            fetchOrders(); // Refresh orders
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
    
    subscriptionRef.current = channel;
  };

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          status,
          payment_status,
          created_at,
          products (
            title,
            image_url
          )
        `)
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersData = data || [];
      setOrders(ordersData);
      setStats({
        totalOrders: ordersData.length,
        pending: ordersData.filter(o => o.payment_status === "pending").length,
        completed: ordersData.filter(o => o.payment_status === "paid").length,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBadge = (status: string) => {
    if (status === "paid") {
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Awaiting Verification
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      shipped: "bg-purple-500/10 text-purple-600 border-purple-500/30",
      delivered: "bg-green-500/10 text-green-600 border-green-500/30",
      completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    };
    return (
      <Badge className={statusColors[status] || statusColors.pending}>
        {status}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">My Orders</h1>
            <p className="text-muted-foreground">Track your orders and purchases</p>
          </div>

          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="glass-strong">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Paid</CardTitle>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/marketplace")}>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Browse Products
                </Button>
                <Button variant="outline" onClick={() => navigate("/cart")}>
                  <Package className="w-4 h-4 mr-2" />
                  View Cart
                </Button>
              </CardContent>
            </Card>

            {/* Orders List */}
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle>My Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
                    <Button onClick={() => navigate("/marketplace")}>
                      Browse Marketplace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {order.products?.image_url ? (
                            <img
                              src={order.products.image_url}
                              alt={order.products.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{order.products?.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getStatusBadge(order.status)}
                            {getPaymentBadge(order.payment_status)}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                          <div className="font-bold text-lg">₦{order.total_amount.toLocaleString()}</div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/order/${order.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Track Order
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Success Dialog */}
      <PaymentSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
      />
    </div>
  );
};

export default BuyerDashboard;