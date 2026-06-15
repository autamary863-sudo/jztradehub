// src/pages/UserProfile.tsx
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BillPayment from "@/components/BillPayment";
import ReferralSystem from "@/components/ReferralSystem";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Package,
  Star,
  Settings,
  Shield,
  LogOut,
  Edit,
  Save,
  X,
  DollarSign,
  Camera,
  Loader2,
  Zap,
  Gift,
  Copy,
  IdCard
} from "lucide-react";

interface UserProfile {
  id: string;
  unique_user_id: string | null;
  display_name: string;
  phone_number: string;
  avatar_url: string;
  created_at: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  product_id: string;
  product?: {
    title: string;
    image_url: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  product_id: string;
  product?: {
    title: string;
  };
}

const UserProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "orders";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    phone_number: "",
  });
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    totalReviews: 0,
    averageRating: 0,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      Promise.all([fetchOrders(), fetchReviews()]).then(() => {
        setLoading(false);
      });
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, unique_user_id, display_name, phone_number, avatar_url, created_at")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        display_name: data?.display_name || "",
        phone_number: data?.phone_number || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, status, payment_status, created_at, product_id")
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const totalSpent = data?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      setStats(prev => ({ ...prev, totalOrders: data?.length || 0, totalSpent }));
      
      if (data && data.length > 0) {
        const productIds = [...new Set(data.map(o => o.product_id))];
        const { data: products } = await supabase
          .from("products")
          .select("id, title, image_url")
          .in("id", productIds);
        
        const productMap = new Map(products?.map(p => [p.id, p]) || []);
        const ordersWithProducts = data.map(order => ({
          ...order,
          product: productMap.get(order.product_id)
        }));
        setOrders(ordersWithProducts);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const averageRating = data?.length 
        ? data.reduce((sum, r) => sum + r.rating, 0) / data.length 
        : 0;
      setStats(prev => ({ ...prev, totalReviews: data?.length || 0, averageRating }));
      
      if (data && data.length > 0) {
        const productIds = [...new Set(data.map(r => r.product_id))];
        const { data: products } = await supabase
          .from("products")
          .select("id, title")
          .in("id", productIds);
        
        const productMap = new Map(products?.map(p => [p.id, p]) || []);
        const reviewsWithProducts = data.map(review => ({
          ...review,
          product: productMap.get(review.product_id)
        }));
        setReviews(reviewsWithProducts);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editForm.display_name,
          phone_number: editForm.phone_number,
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const copyUserId = () => {
    if (profile?.unique_user_id) {
      navigator.clipboard.writeText(profile.unique_user_id);
      toast.success("User ID copied to clipboard!");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const { error } = await supabase
            .from("profiles")
            .update({ avatar_url: event.target.result })
            .eq("id", user?.id);

          if (error) throw error;
          toast.success("Avatar updated!");
          fetchProfile();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      confirmed: "bg-blue-500/10 text-blue-600",
      shipped: "bg-purple-500/10 text-purple-600",
      delivered: "bg-green-500/10 text-green-600",
      completed: "bg-emerald-500/10 text-emerald-600",
    };
    return colors[status] || "bg-gray-500/10 text-gray-600";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Header />
        <div className="container px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="glass-strong rounded-2xl p-6 mb-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const userEmail = user?.email || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      
      <div className="container px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <div className="glass-strong rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-2xl">
                      {profile?.display_name?.charAt(0) || userEmail?.charAt(0) || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                  <h1 className="text-2xl font-bold">{profile?.display_name || "User"}</h1>
                </div>
                
                {/* Unique User ID */}
                {profile?.unique_user_id && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
                    <IdCard className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-mono font-bold text-primary">
                      {profile.unique_user_id}
                    </span>
                    <button
                      onClick={copyUserId}
                      className="text-primary/70 hover:text-primary transition-colors"
                      title="Copy User ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {userEmail}
                  </span>
                  {profile?.phone_number && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {profile.phone_number}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile?.created_at || "").toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateProfile} className="gap-2">
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="outline" className="gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
                <Button onClick={handleSignOut} variant="ghost" className="gap-2 text-destructive">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Edit Form */}
            {editing && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={editForm.display_name}
                      onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                      placeholder="Your display name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass-strong">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{loadingOrders ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalOrders}</p>
                  </div>
                  <Package className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">₦{stats.totalSpent.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="text-2xl font-bold">{loadingReviews ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalReviews}</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                  </div>
                  <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass-strong flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="orders" className="gap-2">
                <Package className="w-4 h-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <Star className="w-4 h-4" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="bills" className="gap-2">
                <Zap className="w-4 h-4" />
                Bill Payments
              </TabsTrigger>
              <TabsTrigger value="referrals" className="gap-2">
                <Gift className="w-4 h-4" />
                Refer & Earn
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    My Orders ({orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4 p-4">
                          <Skeleton className="w-16 h-16 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders yet</p>
                      <Button className="mt-4" onClick={() => navigate("/marketplace")}>
                        Start Shopping
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                              {order.product?.image_url ? (
                                <img src={order.product.image_url} alt={order.product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold">{order.product?.title || "Product"}</h4>
                              <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                                <Badge className={order.payment_status === "paid" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}>
                                  {order.payment_status === "paid" ? "Paid" : "Pending"}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">₦{order.total_amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                              <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate(`/order/${order.id}`)}>
                                Track Order
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    My Reviews ({reviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingReviews ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No reviews yet</p>
                      <Button className="mt-4" onClick={() => navigate("/marketplace")}>
                        Shop & Review
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{review.product?.title || "Product"}</h4>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bills Tab */}
            <TabsContent value="bills">
              <BillPayment />
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <ReferralSystem />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <Card className="glass-strong">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Account Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Shield className="w-4 h-4" />
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Mail className="w-4 h-4" />
                      Change Email Address
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UserProfile;