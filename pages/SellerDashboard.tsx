import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SellerWithdrawal from "@/components/SellerWithdrawal";
import KYCVerification from "@/components/seller/KYCVerification";
import {
  Store,
  Package,
  DollarSign,
  TrendingUp,
  Plus,
  Building2,
  ArrowLeft,
  Truck,
  CheckCircle,
  Edit,
  Trash2,
  Save,
  X,
  Clock,
  Zap,
  Shield,
  Eye,
  Star,
  Wallet,
  Users,
  ShoppingBag,
  Calendar,
  FileText,
  Activity,
  BarChart3,
  RefreshCw,
  Search,
  CreditCard,
  AlertCircle,
  MessageCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface DeliveryOption {
  id: string;
  name: string;
  fee: number;
  estimated_days: string;
  is_active: boolean;
  description?: string;
}

interface Order {
  id: string;
  total_amount: number;
  quantity: number;
  status: string;
  payment_status: string;
  delivery_address: string;
  created_at: string;
  product_id: string;
  buyer_id: string;
  products?: {
    title: string;
    image_url: string;
    price: number;
  };
  buyer?: {
    display_name: string;
    avatar_url: string;
  };
}

interface Product {
  id: string;
  title: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  category: string;
  is_active: boolean;
}

interface SellerStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageRating: number;
  totalCustomers: number;
  monthlyRevenue: number;
  weeklySales: number;
  conversionRate: number;
}

const API_URL = "http://localhost:5000";

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [isSettingUpBusiness, setIsSettingUpBusiness] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageRating: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    weeklySales: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([
    { id: "standard", name: "Standard Delivery", fee: 1500, estimated_days: "3-5 business days", is_active: true, description: "Regular delivery via our logistics partners" },
    { id: "express", name: "Express Delivery", fee: 3000, estimated_days: "1-2 business days", is_active: true, description: "Fast delivery for urgent orders" },
  ]);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [tempDeliveryOption, setTempDeliveryOption] = useState<DeliveryOption | null>(null);
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [newDeliveryOption, setNewDeliveryOption] = useState<DeliveryOption>({
    id: `delivery_${Date.now()}`,
    name: "",
    fee: 0,
    estimated_days: "",
    is_active: true,
    description: "",
  });
  
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessDescription: "",
    businessAddress: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  // Refs for subscriptions
  const ordersChannelRef = useRef<any>(null);

  // Send order notification function
  const sendOrderNotification = async (orderId: string, type: string) => {
    try {
      await fetch(`${API_URL}/api/send-order-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, type })
      });
      console.log(`📧 Order notification sent: ${type}`);
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
      setupRealtimeSubscriptions();
    }
    
    return () => {
      // Cleanup subscriptions
      if (ordersChannelRef.current) {
        supabase.removeChannel(ordersChannelRef.current);
      }
    };
  }, [user]);

  const setupRealtimeSubscriptions = () => {
    // First remove existing channel if any
    if (ordersChannelRef.current) {
      supabase.removeChannel(ordersChannelRef.current);
    }
    
    // Create and subscribe to new channel
    const channel = supabase.channel('seller-dashboard');
    
    channel
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `seller_id=eq.${user?.id}` }, 
        () => {
          fetchAllData();
          toast.success("🎉 New order received!");
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `seller_id=eq.${user?.id}` }, 
        () => {
          fetchAllData();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
    
    ordersChannelRef.current = channel;
  };

  const fetchAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSellerProfile(),
      fetchOrders(),
      fetchProducts(),
      fetchStats(),
      fetchDeliveryOptions()
    ]);
    setRefreshing(false);
    setLoading(false);
  };

  const fetchSellerProfile = async () => {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      setSellerProfile(data);
      setBusinessData({
        businessName: data.business_name,
        businessDescription: data.business_description || "",
        businessAddress: data.business_address || "",
        bankName: data.bank_name || "",
        accountNumber: data.account_number || "",
        accountName: data.account_name || "",
      });
    } else {
      setIsSettingUpBusiness(true);
    }
  };

  const fetchDeliveryOptions = async () => {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("delivery_options")
      .eq("user_id", user?.id)
      .single();

    if (!error && data?.delivery_options) {
      let options = data.delivery_options;
      if (typeof options === 'string') options = JSON.parse(options);
      if (options && options.length > 0) setDeliveryOptions(options);
    }
  };

  const fetchOrders = async () => {
    try {
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }
      
      // Fetch products separately
      const productIds = [...new Set(ordersData.map(o => o.product_id))];
      const { data: productsData } = await supabase
        .from("products")
        .select("id, title, image_url, price")
        .in("id", productIds);
      
      const productMap = new Map(productsData?.map(p => [p.id, p]) || []);
      
      // Fetch buyers separately
      const buyerIds = [...new Set(ordersData.map(o => o.buyer_id))];
      const { data: buyersData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", buyerIds);
      
      const buyerMap = new Map(buyersData?.map(b => [b.id, b]) || []);
      
      // Combine data
      const ordersWithDetails = ordersData.map(order => ({
        ...order,
        products: productMap.get(order.product_id),
        buyer: buyerMap.get(order.buyer_id)
      }));
      
      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) setProducts(data);
  };

  const fetchStats = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user?.id);

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user?.id);

    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("seller_id", user?.id);

    const totalRevenue = ordersData?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
    const pendingOrders = ordersData?.filter(o => o.status === "pending" && o.payment_status === "paid").length || 0;
    const completedOrders = ordersData?.filter(o => o.status === "completed").length || 0;
    const averageRating = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const uniqueBuyers = new Set(ordersData?.map(o => o.buyer_id)).size;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = ordersData?.filter(o => new Date(o.created_at) >= thirtyDaysAgo)
      .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklySales = ordersData?.filter(o => new Date(o.created_at) >= sevenDaysAgo).length || 0;

    setStats({
      totalProducts: productsData?.length || 0,
      totalOrders: ordersData?.length || 0,
      totalRevenue,
      pendingOrders,
      completedOrders,
      averageRating,
      totalCustomers: uniqueBuyers,
      monthlyRevenue,
      weeklySales,
      conversionRate: ordersData?.length ? (completedOrders / ordersData.length) * 100 : 0,
    });
  };

  const saveDeliveryOptions = async () => {
    const { error } = await supabase
      .from("seller_profiles")
      .update({ delivery_options: deliveryOptions })
      .eq("user_id", user?.id);

    if (error) {
      toast.error("Failed to save delivery options");
    } else {
      toast.success("Delivery options saved!");
    }
  };

  const handleSaveBusinessInfo = async () => {
    if (!businessData.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    try {
      if (sellerProfile) {
        const { error } = await supabase
          .from("seller_profiles")
          .update({
            business_name: businessData.businessName,
            business_description: businessData.businessDescription,
            business_address: businessData.businessAddress,
            bank_name: businessData.bankName,
            account_number: businessData.accountNumber,
            account_name: businessData.accountName,
          })
          .eq("user_id", user?.id);

        if (error) throw error;
        toast.success("Business info updated!");
      } else {
        const { error } = await supabase.from("seller_profiles").insert({
          user_id: user?.id,
          business_name: businessData.businessName,
          business_description: businessData.businessDescription,
          business_address: businessData.businessAddress,
          bank_name: businessData.bankName,
          account_number: businessData.accountNumber,
          account_name: businessData.accountName,
          delivery_options: deliveryOptions,
        });

        if (error) throw error;
        toast.success("Business profile created!");
        setIsSettingUpBusiness(false);
      }

      fetchSellerProfile();
      saveDeliveryOptions();
    } catch (error: any) {
      toast.error(error.message || "Failed to save business info");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success(`Order marked as ${status}`);
      
      // Send notification based on status
      const notificationType = 
        status === 'confirmed' ? 'order_confirmed' :
        status === 'shipped' ? 'order_shipped' :
        status === 'delivered' ? 'order_delivered' :
        status === 'cancelled' ? 'order_cancelled' : null;
      
      if (notificationType) {
        await sendOrderNotification(orderId, notificationType);
      }
      
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast.error("Failed to update order status");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      fetchProducts();
      fetchStats();
    }
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", productId);

    if (error) {
      toast.error("Failed to update product status");
    } else {
      toast.success(`Product ${!currentStatus ? "activated" : "deactivated"}`);
      fetchProducts();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      shipped: "bg-purple-500/10 text-purple-600 border-purple-500/30",
      delivered: "bg-green-500/10 text-green-600 border-green-500/30",
      completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
    };
    return colors[status] || colors.pending;
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.products?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.buyer?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (isSettingUpBusiness || !sellerProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Header />
        <div className="container px-4 py-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <Card className="glass-strong p-8 max-w-2xl mx-auto animate-scale-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Set Up Your Business</h1>
              <p className="text-muted-foreground">Tell us about your business to start selling</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  placeholder="Your Business Name"
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea
                  value={businessData.businessDescription}
                  onChange={(e) => setBusinessData({ ...businessData, businessDescription: e.target.value })}
                  placeholder="Describe what you sell..."
                  className="glass min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Address</Label>
                <Textarea
                  value={businessData.businessAddress}
                  onChange={(e) => setBusinessData({ ...businessData, businessAddress: e.target.value })}
                  placeholder="Your business address..."
                  className="glass"
                />
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-3">Bank Account Details</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Bank Name"
                    value={businessData.bankName}
                    onChange={(e) => setBusinessData({ ...businessData, bankName: e.target.value })}
                    className="glass"
                  />
                  <Input
                    placeholder="Account Number"
                    value={businessData.accountNumber}
                    onChange={(e) => setBusinessData({ ...businessData, accountNumber: e.target.value })}
                    className="glass"
                  />
                  <Input
                    placeholder="Account Name"
                    value={businessData.accountName}
                    onChange={(e) => setBusinessData({ ...businessData, accountName: e.target.value })}
                    className="glass"
                  />
                </div>
              </div>
              <Button onClick={handleSaveBusinessInfo} size="lg" className="w-full bg-gradient-to-r from-primary to-accent">
                Create Business Profile
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      
      <div className="container px-4 py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">{sellerProfile.business_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-green-500/10 text-green-600">Active Seller</Badge>
                <Badge className="bg-primary/10 text-primary">Verified</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/products")} className="gap-2 bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
            <Button variant="outline" onClick={() => navigate("/marketplace")} className="gap-2">
              <Eye className="w-4 h-4" />
              View Store
            </Button>
            <Button variant="outline" onClick={() => { fetchAllData(); }} disabled={refreshing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-strong hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-primary">₦{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="glass-strong hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-xl font-bold text-accent">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-accent/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-strong hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Products</p>
                    <p className="text-xl font-bold text-secondary">{stats.totalProducts}</p>
                  </div>
                  <Package className="w-8 h-8 text-secondary/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="glass-strong hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Customers</p>
                    <p className="text-xl font-bold text-blue-500">{stats.totalCustomers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-strong hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-yellow-500">{stats.averageRating.toFixed(1)}</span>
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    </div>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glass-strong hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold text-amber-500">{stats.pendingOrders}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-strong flex-wrap h-auto gap-1 p-1 sticky top-20 z-10">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders
              {stats.pendingOrders > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5">{stats.pendingOrders}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2">
              <Wallet className="w-4 h-4" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              <Truck className="w-4 h-4" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-2">
              <Shield className="w-4 h-4" />
              KYC
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-2">
              <Building2 className="w-4 h-4" />
              Business
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="glass-strong bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Welcome back, {sellerProfile.business_name}!</h2>
                    <p className="text-muted-foreground">Here's what's happening with your store today.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-primary">₦{stats.monthlyRevenue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500/30" />
                  </div>
                  <Progress value={(stats.monthlyRevenue / (stats.totalRevenue || 1)) * 100} className="h-1 mt-2" />
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Weekly Sales</p>
                      <p className="text-2xl font-bold text-accent">{stats.weeklySales}</p>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-accent/30" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">+{Math.round((stats.weeklySales / (stats.totalOrders || 1)) * 100)}% of total orders</p>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold text-secondary">{stats.conversionRate.toFixed(1)}%</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-secondary/30" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-strong">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Recent Orders
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                    View All <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                            {order.products?.image_url ? (
                              <img src={order.products.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 m-2.5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{order.products?.title?.slice(0, 30)}</p>
                            <p className="text-xs text-muted-foreground">₦{order.total_amount.toLocaleString()}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="glass-strong">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    All Orders ({orders.length})
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="border rounded-xl p-4 hover:bg-accent/5 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
                              {order.products?.image_url ? (
                                <img src={order.products.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 m-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{order.products?.title || "Product"}</p>
                              <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                                {order.payment_status === "paid" && (
                                  <Badge className="bg-green-500/10 text-green-600">💰 Paid</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="font-bold text-lg">₦{order.total_amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{order.buyer?.display_name || "Customer"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {order.payment_status === "paid" && (
                          <div className="flex gap-2 mt-4 pt-3 border-t">
                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Confirm Order
                              </Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button size="sm" className="bg-purple-600" onClick={() => handleUpdateOrderStatus(order.id, "shipped")}>
                                <Truck className="w-4 h-4 mr-1" />
                                Mark as Shipped
                              </Button>
                            )}
                            {order.status === "shipped" && (
                              <Button size="sm" className="bg-green-600" onClick={() => handleUpdateOrderStatus(order.id, "delivered")}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark as Delivered
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="glass-strong">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    My Products ({products.length})
                  </CardTitle>
                  <Button onClick={() => navigate("/products")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No products yet</p>
                    <Button className="mt-4" onClick={() => navigate("/products")}>
                      Add Your First Product
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all">
                        <div className="relative h-40 bg-muted">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          {!product.is_active && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Badge variant="destructive">Inactive</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-1 line-clamp-1">{product.title}</h3>
                          <p className="text-2xl font-bold text-primary">₦{product.price.toLocaleString()}</p>
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant="outline">Stock: {product.stock_quantity}</Badge>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/products/edit/${product.id}`)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant={product.is_active ? "outline" : "default"}
                                onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                              >
                                {product.is_active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteProduct(product.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <SellerWithdrawal />
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery">
            <Card className="glass-strong">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Delivery Options
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Set delivery methods and fees for your products</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveDeliveryOptions}>
                      <Save className="w-4 h-4 mr-2" />
                      Save All
                    </Button>
                    <Button size="sm" onClick={() => setShowAddDelivery(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveryOptions.map((option) => (
                    <div key={option.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border hover:border-primary/30 transition-all">
                      {editingDeliveryId === option.id ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <Input value={tempDeliveryOption?.name} onChange={(e) => setTempDeliveryOption(prev => prev ? { ...prev, name: e.target.value } : null)} placeholder="Name" />
                          <Input type="number" value={tempDeliveryOption?.fee} onChange={(e) => setTempDeliveryOption(prev => prev ? { ...prev, fee: parseInt(e.target.value) || 0 } : null)} placeholder="Fee (₦)" />
                          <Input value={tempDeliveryOption?.estimated_days} onChange={(e) => setTempDeliveryOption(prev => prev ? { ...prev, estimated_days: e.target.value } : null)} placeholder="Est. time" />
                          <div className="flex items-center gap-2">
                            <Switch checked={tempDeliveryOption?.is_active} onCheckedChange={(checked) => setTempDeliveryOption(prev => prev ? { ...prev, is_active: checked } : null)} />
                            <span className="text-xs">Active</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-lg">{option.name}</span>
                            <Badge variant={option.is_active ? "default" : "secondary"}>{option.is_active ? "Active" : "Inactive"}</Badge>
                            <span className="text-primary font-bold">₦{option.fee.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">• {option.estimated_days}</span>
                          </div>
                          {option.description && <p className="text-xs text-muted-foreground mt-1">{option.description}</p>}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        {editingDeliveryId === option.id ? (
                          <>
                            <Button size="sm" onClick={() => { setDeliveryOptions(prev => prev.map(opt => opt.id === tempDeliveryOption?.id ? tempDeliveryOption : opt)); setEditingDeliveryId(null); setTempDeliveryOption(null); toast.success("Updated"); }}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingDeliveryId(null); setTempDeliveryOption(null); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setDeliveryOptions(prev => prev.map(opt => opt.id === option.id ? { ...opt, is_active: !opt.is_active } : opt))}>
                              {option.is_active ? <X className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingDeliveryId(option.id); setTempDeliveryOption({ ...option }); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDeliveryOptions(prev => prev.filter(opt => opt.id !== option.id)); toast.success("Removed"); }} disabled={deliveryOptions.length <= 1}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Verification Tab */}
          <TabsContent value="kyc">
            <KYCVerification />
          </TabsContent>

          {/* Business Info Tab */}
          <TabsContent value="business">
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input value={businessData.businessName} onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Description</Label>
                      <Textarea value={businessData.businessDescription} onChange={(e) => setBusinessData({ ...businessData, businessDescription: e.target.value })} rows={4} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Textarea value={businessData.businessAddress} onChange={(e) => setBusinessData({ ...businessData, businessAddress: e.target.value })} className="glass" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border">
                      <h3 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Bank Account Details</h3>
                      <div className="space-y-3">
                        <Input placeholder="Bank Name" value={businessData.bankName} onChange={(e) => setBusinessData({ ...businessData, bankName: e.target.value })} className="glass" />
                        <Input placeholder="Account Number" value={businessData.accountNumber} onChange={(e) => setBusinessData({ ...businessData, accountNumber: e.target.value })} className="glass" />
                        <Input placeholder="Account Name" value={businessData.accountName} onChange={(e) => setBusinessData({ ...businessData, accountName: e.target.value })} className="glass" />
                      </div>
                    </div>
                    <Button onClick={handleSaveBusinessInfo} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Delivery Option Dialog */}
      <Dialog open={showAddDelivery} onOpenChange={setShowAddDelivery}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Add Delivery Option</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Option Name" value={newDeliveryOption.name} onChange={(e) => setNewDeliveryOption(prev => ({ ...prev, name: e.target.value }))} />
            <Input type="number" placeholder="Delivery Fee (₦)" value={newDeliveryOption.fee || ""} onChange={(e) => setNewDeliveryOption(prev => ({ ...prev, fee: parseInt(e.target.value) || 0 }))} />
            <Input placeholder="Estimated Delivery (e.g., 3-5 days)" value={newDeliveryOption.estimated_days} onChange={(e) => setNewDeliveryOption(prev => ({ ...prev, estimated_days: e.target.value }))} />
            <Textarea placeholder="Description (Optional)" value={newDeliveryOption.description} onChange={(e) => setNewDeliveryOption(prev => ({ ...prev, description: e.target.value }))} />
            <div className="flex items-center gap-2">
              <Switch checked={newDeliveryOption.is_active} onCheckedChange={(checked) => setNewDeliveryOption(prev => ({ ...prev, is_active: checked }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDelivery(false)}>Cancel</Button>
            <Button onClick={() => { setDeliveryOptions(prev => [...prev, { ...newDeliveryOption, id: `delivery_${Date.now()}` }]); setShowAddDelivery(false); setNewDeliveryOption({ id: "", name: "", fee: 0, estimated_days: "", is_active: true, description: "" }); toast.success("Added"); }}>
              Add Option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboard;