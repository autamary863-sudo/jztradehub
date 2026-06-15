// src/pages/AdminDashboard.tsx
import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Users,
  ShoppingBag,
  Shield,
  UserPlus,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  X,
  Settings,
  Zap,
  FileText,
  AlertTriangle,
  RotateCcw,
  Truck,
  MessageCircle,
  TrendingUp,
  Tag,
  Bell,
  Eye,
  Search,
  RefreshCw,
  Wallet,
  Receipt,
  Banknote,
  Activity,
  Mail,
  Loader2,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Crown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Ban,
  Coins,
  History,
  Plus,
  UserCircle,
  Sun,
  Moon
} from "lucide-react";

// Lazy load heavy components
const FlashSalesManager = lazy(() => import("@/components/admin/FlashSalesManager"));
const CouponManager = lazy(() => import("@/components/admin/CouponManager"));
const BlogManager = lazy(() => import("@/components/admin/BlogManager"));
const DisputesManager = lazy(() => import("@/components/admin/DisputesManager"));
const ReturnsManager = lazy(() => import("@/components/admin/ReturnsManager"));
const LogisticsManager = lazy(() => import("@/components/admin/LogisticsManager"));
const ChatManager = lazy(() => import("@/components/admin/ChatManager"));
const SiteSettingsManager = lazy(() => import("@/components/admin/SiteSettingsManager"));
const ReceiptManager = lazy(() => import("@/components/admin/ReceiptManager"));
const SellerManagement = lazy(() => import("@/components/admin/SellerManagement"));
const KYCManager = lazy(() => import("@/components/admin/KYCManager"));
const WithdrawalManager = lazy(() => import("@/components/admin/WithdrawalManager"));
const UserManagement = lazy(() => import("@/components/admin/UserManagement"));
const EmailMarketing = lazy(() => import("@/components/admin/EmailMarketing"));
const AdminWalletManager = lazy(() => import("@/components/admin/AdminWalletManager"));
const NotificationManager = lazy(() => import("@/components/admin/NotificationManager"));

const TabLoader = () => (
  <div className="flex items-center justify-center py-32">
    <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchUserId, setSearchUserId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [fundWalletOpen, setFundWalletOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [banUserOpen, setBanUserOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  
  const [stats, setStats] = useState({
    totalUsers: 0, totalSellers: 0, totalBuyers: 0, totalOrders: 0,
    pendingOrders: 0, totalRevenue: 0, pendingDisputes: 0, pendingReturns: 0,
    monthlyRevenue: 0, weeklyOrders: 0, averageOrderValue: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [newProduct, setNewProduct] = useState({
    title: "", description: "", price: "", category: "", stock_quantity: "", image_url: "",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [newRoleEmail, setNewRoleEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "seller" | "buyer">("seller");
  const [submitting, setSubmitting] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  // Fetch all data immediately
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchStats(), fetchUsers(), fetchOrders()]);
      setDataReady(true);
    };
    fetchData();
  }, []);

  const fetchStats = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: ordersData } = await supabase.from("orders").select("*");
    const { data: disputes } = await supabase.from("disputes").select("*").eq("status", "pending");
    const { data: returns } = await supabase.from("return_requests").select("*").eq("status", "pending");

    const sellers = roles?.filter((r) => r.role === "seller").length || 0;
    const buyers = roles?.filter((r) => r.role === "buyer").length || 0;
    const pending = ordersData?.filter((o) => o.status === "pending").length || 0;
    const revenue = ordersData?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = ordersData?.filter(o => new Date(o.created_at) >= thirtyDaysAgo)
      .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyOrders = ordersData?.filter(o => new Date(o.created_at) >= sevenDaysAgo).length || 0;
    const averageOrderValue = ordersData?.length ? revenue / ordersData.length : 0;

    setStats({
      totalUsers: profiles?.length || 0, totalSellers: sellers, totalBuyers: buyers,
      totalOrders: ordersData?.length || 0, pendingOrders: pending, totalRevenue: revenue,
      pendingDisputes: disputes?.length || 0, pendingReturns: returns?.length || 0,
      monthlyRevenue, weeklyOrders, averageOrderValue,
    });
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, unique_user_id, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    
    if (!profiles) {
      setUsers([]);
      return;
    }
    
    const userIds = profiles.map(p => p.id);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);
    
    let emailMap = new Map();
    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      if (authUser?.user?.email) {
        emailMap.set(profile.id, authUser.user.email);
      } else {
        emailMap.set(profile.id, `${profile.id.slice(0, 8)}@user.com`);
      }
    }
    
    const usersWithData = profiles.map(profile => ({
      ...profile,
      email: emailMap.get(profile.id) || `${profile.id.slice(0, 8)}@user.com`,
      user_roles: roles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || []
    }));
    
    setUsers(usersWithData);
  };

  const fetchOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        status,
        payment_status,
        created_at,
        buyer_id,
        product_id,
        products:product_id (title)
      `)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!ordersData) {
      setOrders([]);
      return;
    }

    const buyerIds = [...new Set(ordersData.map(o => o.buyer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", buyerIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
    
    const formattedOrders = ordersData.map(order => ({
      ...order,
      buyer: { display_name: profileMap.get(order.buyer_id) || "Unknown" },
      product: order.products?.[0] || { title: "Product" }
    }));
    
    setOrders(formattedOrders);
  };

  const searchUserByJZId = async () => {
    if (!searchUserId.trim()) {
      toast.error("Please enter a User ID");
      return;
    }
    setSearchingUser(true);
    setSearchResult(null);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, unique_user_id, display_name, phone_number, avatar_url, created_at")
        .eq("unique_user_id", searchUserId.toUpperCase())
        .single();
      
      if (error || !profile) {
        toast.error(`User with ID ${searchUserId} not found`);
        return;
      }
      
      let email = "No email";
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      email = authUser?.user?.email || "No email";
      
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", profile.id);
      
      let wallet = { balance: 0, total_deposited: 0, total_withdrawn: 0 };
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance, total_deposited, total_withdrawn")
        .eq("profile_id", profile.id)
        .single();
      if (walletData) wallet = walletData;
      
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount, status, id, created_at")
        .eq("buyer_id", profile.id);
      
      const totalSpent = ordersData?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      
      setSearchResult({
        ...profile,
        email,
        roles: roles?.map(r => r.role) || [],
        wallet: wallet,
        stats: { totalOrders: ordersData?.length || 0, totalSpent },
        orders: ordersData || []
      });
      
      toast.success(`User found: ${profile.display_name || "User"}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search user");
    } finally {
      setSearchingUser(false);
    }
  };

  const viewUserDetails = async (user: any) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
    
    let wallet = { balance: 0, total_deposited: 0, total_withdrawn: 0 };
    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance, total_deposited, total_withdrawn")
      .eq("profile_id", user.id)
      .single();
    if (walletData) wallet = walletData;
    
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, products(title)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    setSelectedUser({
      ...user,
      wallet: wallet,
      orders: ordersData || [],
      roles: roles?.map(r => r.role) || []
    });
  };

  const fundUserWallet = async () => {
    if (!selectedUser || !fundAmount || parseFloat(fundAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setFunding(true);
    try {
      const amount = parseFloat(fundAmount);
      
      let { data: wallet } = await supabase
        .from("wallets")
        .select("balance, total_deposited")
        .eq("profile_id", selectedUser.id)
        .single();
      
      if (!wallet) {
        const { data: newWallet } = await supabase
          .from("wallets")
          .insert({ profile_id: selectedUser.id, balance: 0, total_deposited: 0 })
          .select()
          .single();
        wallet = newWallet;
      }
      
      const newBalance = (wallet?.balance || 0) + amount;
      const newDeposited = (wallet?.total_deposited || 0) + amount;
      
      await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          total_deposited: newDeposited,
          updated_at: new Date().toISOString()
        })
        .eq("profile_id", selectedUser.id);
      
      const reference = `ADMIN-DEPOSIT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: selectedUser.id,
          type: "deposit",
          amount: amount,
          status: "completed",
          description: `Admin deposit of ₦${amount.toLocaleString()}`,
          reference: reference
        });
      
      toast.success(`₦${amount.toLocaleString()} added to ${selectedUser.display_name}'s wallet`);
      setFundWalletOpen(false);
      setFundAmount("");
      viewUserDetails(selectedUser);
      fetchUsers();
      fetchStats();
      
    } catch (error: any) {
      console.error("Fund error:", error);
      toast.error(error.message || "Failed to fund wallet");
    } finally {
      setFunding(false);
    }
  };

  const banUser = async () => {
    if (!selectedUser || !banReason) {
      toast.error("Please provide a reason for banning");
      return;
    }
    
    setBanning(true);
    try {
      const { error } = await supabase
        .from("user_status")
        .upsert({
          user_id: selectedUser.id,
          status: "banned",
          banned_reason: banReason,
          banned_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success(`${selectedUser.display_name} has been banned`);
      setBanUserOpen(false);
      setBanReason("");
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error("Ban error:", error);
      toast.error("Failed to ban user");
    } finally {
      setBanning(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid", status: "confirmed", paid_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Payment confirmed!");
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm payment");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
      toast.success(`Order ${status}`);
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    }
  };

  const handleAddRole = async () => {
    if (!newRoleEmail) {
      toast.error("Please enter a display name");
      return;
    }
    setSubmitting(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${newRoleEmail}%`)
        .limit(1);
      if (!profiles || profiles.length === 0) {
        toast.error("User not found");
        return;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: profiles[0].id, role: newRole });
      if (error) {
        if (error.code === '23505') toast.error("User already has this role");
        else throw error;
      } else {
        toast.success(`Assigned ${newRole} role to ${profiles[0].display_name}`);
      }
      setNewRoleEmail("");
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to add role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.title || !newProduct.price) {
      toast.error("Title and price are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("products").insert({
        title: newProduct.title,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        stock_quantity: parseInt(newProduct.stock_quantity) || 0,
        image_url: newProduct.image_url,
        seller_id: user.id,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Product created successfully");
      setNewProduct({ title: "", description: "", price: "", category: "", stock_quantity: "", image_url: "" });
    } catch (error) {
      toast.error("Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewProduct({ ...newProduct, image_url: event.target.result as string });
        toast.success("Image uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.payment_status === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Package },
    { id: "users", label: "Users", icon: Users },
    { id: "sellers", label: "Sellers", icon: Store },
    { id: "withdrawals", label: "Withdrawals", icon: Banknote },
    { id: "coupons", label: "Coupons", icon: Tag },
    { id: "flash-sales", label: "Flash Sales", icon: Zap },
    { id: "disputes", label: "Disputes", icon: AlertTriangle },
    { id: "returns", label: "Returns", icon: RotateCcw },
    { id: "logistics", label: "Logistics", icon: Truck },
    { id: "chat", label: "Live Chat", icon: MessageCircle },
    { id: "kyc", label: "KYC", icon: Shield },
    { id: "wallet", label: "Wallet Mgmt", icon: Wallet },
    { id: "email", label: "Email Marketing", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "receipts", label: "Receipts", icon: Receipt },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Show empty layout while data loads (no spinner)
  if (!dataReady) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-black text-2xl">JZ</span>
            </div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 h-screen transition-all duration-500 ${sidebarCollapsed ? "w-20" : "w-72"} hidden lg:block`}>
        <div className="h-full bg-card border-r border-border/50">
          <div className="flex items-center gap-3 px-6 py-8 border-b border-border/50">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-black text-2xl">JZ</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold gradient-text">JZTradeHub</h1>
                <p className="text-[10px] text-muted-foreground uppercase">Admin Portal</p>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-180px)] px-4 py-6">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                    {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border/50">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button 
        onClick={() => setMobileMenuOpen(true)} 
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-card border border-border/50 shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-full w-72 bg-card border-r border-border/50 lg:hidden">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-bold text-xl">JZ</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold gradient-text">JZTradeHub</h1>
                  <p className="text-[10px] text-muted-foreground">Admin Portal</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg bg-muted/50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="h-[calc(100vh-120px)] px-4 py-4">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className={`transition-all duration-500 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-border/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:block p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-2xl font-bold gradient-text">
                  {navItems.find(i => i.id === activeTab)?.label || "Dashboard"}
                </h2>
                <p className="text-xs text-muted-foreground">Welcome back, Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground" />
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 space-y-6">
          {/* User Search Bar */}
          <Card>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm mb-2 block">Search by JZ User ID</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter JZ ID (e.g., JZ609072)"
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === "Enter" && searchUserByJZId()}
                      className="pl-12 py-6"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={searchUserByJZId} disabled={searchingUser} className="h-12 px-8 gap-2">
                    {searchingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    Search User
                  </Button>
                </div>
              </div>

              {searchResult && (
                <div className="mt-6 p-5 rounded-2xl bg-muted/30 border border-border/50">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {searchResult.display_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold">{searchResult.display_name || "Unnamed"}</h3>
                          <Badge className="bg-primary/10 text-primary font-mono px-3 py-1">{searchResult.unique_user_id}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{searchResult.email}</p>
                        {searchResult.phone_number && (
                          <p className="text-sm text-muted-foreground mt-1">📞 {searchResult.phone_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-muted-foreground">Wallet Balance</p>
                      <p className="text-3xl font-bold text-primary">₦{searchResult.wallet?.balance?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-xl font-bold">{searchResult.stats.totalOrders}</p></div>
                    <div><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-xl font-bold text-green-600">₦{searchResult.stats.totalSpent.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Total Deposited</p><p className="text-xl font-bold text-blue-600">₦{searchResult.wallet?.total_deposited?.toLocaleString() || 0}</p></div>
                    <div><p className="text-xs text-muted-foreground">Member Since</p><p className="text-sm">{new Date(searchResult.created_at).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedUser(searchResult); setFundWalletOpen(true); }}>
                      <Plus className="w-4 h-4 mr-1" /> Fund Wallet
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-500" onClick={() => { setSelectedUser(searchResult); setBanUserOpen(true); }}>
                      <Ban className="w-4 h-4 mr-1" /> Ban User
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => viewUserDetails(searchResult)}>
                      <Eye className="w-4 h-4 mr-1" /> View All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">₦{(stats.totalRevenue / 1000000).toFixed(1)}M</p></div><DollarSign className="w-8 h-8 text-primary float-right" /></CardContent></Card>
            <Card><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{stats.totalOrders}</p></div><ShoppingBag className="w-8 h-8 text-blue-500 float-right" /></CardContent></Card>
            <Card><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">Total Users</p><p className="text-2xl font-bold">{stats.totalUsers}</p></div><Users className="w-8 h-8 text-purple-500 float-right" /></CardContent></Card>
            <Card><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">Pending Orders</p><p className="text-2xl font-bold">{stats.pendingOrders}</p></div><Clock className="w-8 h-8 text-amber-500 float-right" /></CardContent></Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Dashboard Tab Content */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2"><Crown className="w-6 h-6 text-yellow-500" /><span className="text-muted-foreground">Admin Access</span></div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">Welcome back!</h2>
                        <p className="text-muted-foreground">Here's what's happening with your platform today.</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="text-center p-4 rounded-xl bg-muted/50"><TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" /><p className="text-2xl font-bold">{stats.weeklyOrders}</p><p className="text-xs text-muted-foreground">Weekly Orders</p></div>
                        <div className="text-center p-4 rounded-xl bg-muted/50"><Users className="w-8 h-8 text-accent mx-auto mb-2" /><p className="text-2xl font-bold">{stats.totalUsers}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /> Recent Orders</CardTitle></CardHeader><CardContent><div className="space-y-3 max-h-96 overflow-y-auto">{orders.slice(0, 8).map((order) => (<div key={order.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30"><div><p className="font-medium">{order.product?.title?.slice(0, 35) || "Product"}</p><p className="text-xs text-muted-foreground font-mono">#{order.id?.slice(0, 8)}</p></div><div className="text-right"><p className="font-bold text-primary">₦{Number(order.total_amount).toLocaleString()}</p><Badge className={order.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"}>{order.status}</Badge></div></div>))}</div></CardContent></Card>
                  <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-accent" /> Recent Users</CardTitle></CardHeader><CardContent><div className="space-y-3 max-h-96 overflow-y-auto">{users.slice(0, 8).map((user, idx) => (<div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30"><div className="flex items-center gap-3"><Avatar className="w-10 h-10"><AvatarFallback className="bg-primary/10">{user.display_name?.charAt(0) || "U"}</AvatarFallback></Avatar><div><p className="font-medium">{user.display_name || "Anonymous"}</p><p className="text-xs text-muted-foreground">{user.email}</p></div></div><Badge variant="outline">{user.user_roles?.[0]?.role || "buyer"}</Badge></div>))}</div></CardContent></Card>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <Card><CardHeader><div className="flex flex-col md:flex-row justify-between gap-4"><div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /><h3 className="font-semibold text-lg">Order Management</h3><Badge>{orders.length} total</Badge></div><div className="flex flex-wrap gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background"><option value="all">All Status</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select><Button variant="outline" size="sm" onClick={() => { fetchOrders(); fetchStats(); }}><RefreshCw className="w-4 h-4" /></Button></div></div></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Product</TableHead><TableHead>Buyer</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Payment</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredOrders.slice(0, 30).map((order) => (<TableRow key={order.id}><TableCell className="font-mono text-xs">{order.id?.slice(0, 8)}</TableCell><TableCell>{order.product?.title?.slice(0, 30) || "N/A"}</TableCell><TableCell>{order.buyer?.display_name || "Unknown"}</TableCell><TableCell className="text-right font-bold text-primary">₦{Number(order.total_amount).toLocaleString()}</TableCell><TableCell className="text-center"><Badge className={order.status === "pending" ? "bg-amber-500/10 text-amber-600" : order.status === "confirmed" ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"}>{order.status}</Badge></TableCell><TableCell className="text-center"><Badge className={order.payment_status === "paid" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}>{order.payment_status === "paid" ? "Paid" : "Pending"}</Badge></TableCell><TableCell className="text-center">{order.payment_status === "pending" && <Button size="sm" className="h-8 bg-green-600" onClick={() => handleConfirmPayment(order.id)}><CheckCircle className="w-3 h-3 mr-1" /> Confirm</Button>}</TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <Card><CardHeader><div className="flex items-center gap-2"><Package className="w-6 h-6 text-primary" /><h2 className="text-xl font-bold">Create New Product</h2></div></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-6"><div className="space-y-4"><Input placeholder="Product Title" value={newProduct.title} onChange={(e) => setNewProduct({...newProduct, title: e.target.value})} /><Input type="number" placeholder="Price (₦)" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} /><Input placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} /><Input type="number" placeholder="Stock Quantity" value={newProduct.stock_quantity} onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})} /></div><div className="space-y-4"><div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? "border-primary bg-primary/10" : "border-border"}`}>{newProduct.image_url ? <div className="relative"><img src={newProduct.image_url} className="max-h-40 mx-auto rounded-lg" /><Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setNewProduct({...newProduct, image_url: ""})}><X className="w-4 h-4" /></Button></div> : <div><Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground mb-3">Drag & drop image here</p><input type="file" accept="image/*" className="hidden" id="product-img" onChange={(e) => { const file = e.target.files?.[0]; if(file){ const reader=new FileReader(); reader.onload=(ev)=>setNewProduct({...newProduct, image_url: ev.target?.result as string}); reader.readAsDataURL(file); } }} /><Button variant="outline" onClick={() => document.getElementById("product-img")?.click()}>Browse Files</Button></div>}</div><Textarea placeholder="Product Description" rows={4} value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} /></div></div><Button onClick={handleCreateProduct} disabled={submitting} className="w-full mt-6 py-6">{submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Product"}</Button></CardContent></Card>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6"><Card><CardHeader><div className="flex items-center gap-2"><UserPlus className="w-6 h-6 text-primary" /><h2 className="text-xl font-bold">Assign User Role</h2></div></CardHeader><CardContent><div className="grid md:grid-cols-3 gap-4"><Input placeholder="User display name" value={newRoleEmail} onChange={(e) => setNewRoleEmail(e.target.value)} /><select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="border rounded-lg px-4 py-2 bg-background"><option value="seller">Seller</option><option value="buyer">Buyer</option><option value="admin">Admin</option></select><Button onClick={handleAddRole} disabled={submitting}>{submitting ? "Assigning..." : "Assign Role"}</Button></div></CardContent></Card><Card><CardHeader><div className="flex items-center gap-2"><Users className="w-6 h-6 text-accent" /><h2 className="text-xl font-bold">All Users ({users.length})</h2></div></CardHeader><CardContent><div className="space-y-3 max-h-[500px] overflow-y-auto">{users.map((user) => (<div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30"><div className="flex items-center gap-3"><Avatar className="w-10 h-10"><AvatarFallback className="bg-primary/10">{user.display_name?.charAt(0) || "U"}</AvatarFallback></Avatar><div><p className="font-medium">{user.display_name || "Anonymous"}</p><p className="text-xs text-muted-foreground">{user.email}</p></div></div><Button variant="ghost" size="sm" onClick={() => viewUserDetails(user)}><Eye className="w-4 h-4" /></Button></div>))}</div></CardContent></Card></div>
            )}

            {/* Lazy Loaded Tabs */}
            <Suspense fallback={<TabLoader />}>
              {activeTab === "sellers" && <SellerManagement />}
              {activeTab === "withdrawals" && <WithdrawalManager />}
              {activeTab === "coupons" && <CouponManager />}
              {activeTab === "flash-sales" && <FlashSalesManager />}
              {activeTab === "disputes" && <DisputesManager />}
              {activeTab === "returns" && <ReturnsManager />}
              {activeTab === "logistics" && <LogisticsManager />}
              {activeTab === "chat" && <ChatManager />}
              {activeTab === "kyc" && <KYCManager />}
              {activeTab === "wallet" && <AdminWalletManager />}
              {activeTab === "email" && <EmailMarketing />}
              {activeTab === "notifications" && <NotificationManager />}
              {activeTab === "blog" && <BlogManager />}
              {activeTab === "receipts" && <ReceiptManager />}
              {activeTab === "settings" && <SiteSettingsManager />}
            </Suspense>
          </Tabs>
        </div>
      </main>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-2xl font-bold flex items-center gap-2"><UserCircle className="w-6 h-6 text-primary" /> User Management - {selectedUser?.display_name}</DialogTitle><DialogDescription>Manage user account, wallet, orders, and more</DialogDescription></DialogHeader>{selectedUser && (<div className="space-y-6 py-4"><div className="flex flex-col md:flex-row justify-between gap-4 p-4 rounded-xl bg-primary/5"><div className="flex items-center gap-4"><Avatar className="w-16 h-16"><AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{selectedUser.display_name?.charAt(0) || "U"}</AvatarFallback></Avatar><div><h3 className="text-xl font-bold">{selectedUser.display_name}</h3><p className="text-muted-foreground">{selectedUser.email}</p><div className="flex gap-2 mt-1">{selectedUser.unique_user_id && <Badge className="bg-primary/10 text-primary font-mono">{selectedUser.unique_user_id}</Badge>}{selectedUser.roles?.map((role: string) => (<Badge key={role} variant="outline" className="capitalize">{role}</Badge>))}</div></div></div><div className="text-left md:text-right"><p className="text-sm text-muted-foreground">Wallet Balance</p><p className="text-3xl font-bold text-primary">₦{selectedUser.wallet?.balance?.toLocaleString() || 0}</p><div className="flex gap-2 mt-2"><Button size="sm" className="bg-green-600" onClick={() => setFundWalletOpen(true)}><Plus className="w-4 h-4 mr-1" /> Fund</Button><Button size="sm" variant="destructive" onClick={() => setBanUserOpen(true)}><Ban className="w-4 h-4 mr-1" /> Ban</Button></div></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="p-3 rounded-xl bg-muted/50 text-center"><p className="text-2xl font-bold">{selectedUser.orders?.length || 0}</p><p className="text-xs text-muted-foreground">Total Orders</p></div><div className="p-3 rounded-xl bg-muted/50 text-center"><p className="text-2xl font-bold text-green-600">₦{selectedUser.wallet?.total_deposited?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Total Deposited</p></div><div className="p-3 rounded-xl bg-muted/50 text-center"><p className="text-2xl font-bold text-blue-600">₦{selectedUser.wallet?.total_withdrawn?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Total Withdrawn</p></div><div className="p-3 rounded-xl bg-muted/50 text-center"><p className="text-2xl font-bold text-primary">{new Date(selectedUser.created_at).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">Member Since</p></div></div><div><h4 className="font-semibold mb-3 flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Order History ({selectedUser.orders?.length || 0})</h4><div className="space-y-2 max-h-64 overflow-y-auto">{selectedUser.orders?.length === 0 ? <p className="text-center text-muted-foreground py-4">No orders yet</p> : selectedUser.orders?.map((order: any) => (<div key={order.id} className="p-3 rounded-lg bg-muted/30"><div className="flex justify-between items-center"><div><p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p><p className="text-sm">{order.products?.title || "Product"}</p></div><div className="text-right"><p className="font-bold text-primary">₦{order.total_amount?.toLocaleString()}</p><Badge className={order.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"}>{order.status}</Badge></div></div></div>))}</div></div></div>)}<DialogFooter><Button variant="outline" onClick={() => setUserDetailsOpen(false)}>Close</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Fund Wallet Dialog */}
      <Dialog open={fundWalletOpen} onOpenChange={setFundWalletOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2"><Coins className="w-5 h-5 text-green-500" /> Fund User Wallet</DialogTitle><DialogDescription>Add funds to {selectedUser?.display_name}'s wallet</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Current Balance</p><p className="text-2xl font-bold text-primary">₦{selectedUser?.wallet?.balance?.toLocaleString() || 0}</p></div><div className="space-y-2"><Label>Amount (₦)</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span><Input type="number" placeholder="0.00" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="pl-8 py-6 text-lg" /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setFundWalletOpen(false)}>Cancel</Button><Button onClick={fundUserWallet} disabled={funding} className="bg-green-600 hover:bg-green-700">{funding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Add Funds</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banUserOpen} onOpenChange={setBanUserOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-500"><Ban className="w-5 h-5" /> Ban User</DialogTitle><DialogDescription>Permanently ban {selectedUser?.display_name} from the platform</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="p-3 rounded-lg bg-red-500/10"><p className="text-sm text-red-600">⚠️ Warning: This action cannot be undone. The user will lose all access.</p></div><div className="space-y-2"><Label>Reason for Ban *</Label><Textarea placeholder="Explain why this user is being banned..." value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} /></div></div><DialogFooter><Button variant="outline" onClick={() => setBanUserOpen(false)}>Cancel</Button><Button onClick={banUser} disabled={banning} className="bg-red-600 hover:bg-red-700">{banning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />} Ban User</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;