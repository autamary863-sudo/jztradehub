import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, 
  Shield, 
  UserPlus, 
  UserCheck, 
  Ban,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye,
  Mail,
  Search,
  XCircle,
  AlertTriangle,
  Activity,
  Building2,
  ShoppingBag,
  DollarSign,
  Star
} from "lucide-react";

interface User {
  id: string;
  email: string;
  display_name: string;
  phone_number: string;
  avatar_url: string;
  created_at: string;
  user_roles: { role: string }[];
  user_status?: {
    status: string;
    banned_reason: string;
    banned_at: string;
  };
  stats?: {
    total_orders: number;
    total_spent: number;
    total_reviews: number;
    average_rating: number;
    total_products: number;
    total_sales: number;
  };
}

interface UserOrder {
  id: string;
  total_amount: number;
  quantity: number;
  status: string;
  payment_status: string;
  delivery_address: string;
  created_at: string;
  products?: {
    title: string;
    image_url: string;
    price: number;
  };
}

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "seller" | "buyer">("buyer");
  const [banReason, setBanReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;
      
      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      const userIds = profiles.map(p => p.id);
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      
      if (rolesError) throw rolesError;
      
      const { data: userStatus } = await supabase
        .from("user_status")
        .select("*")
        .in("user_id", userIds);
      
      const statusMap = new Map(userStatus?.map(s => [s.user_id, s]) || []);
      
      const rolesByUser = new Map();
      roles?.forEach(role => {
        if (!rolesByUser.has(role.user_id)) rolesByUser.set(role.user_id, []);
        rolesByUser.get(role.user_id).push({ role: role.role });
      });
      
      const usersWithData = await Promise.all(profiles.map(async (profile) => {
        const userRoles = rolesByUser.get(profile.id) || [{ role: "buyer" }];
        const userStatusData = statusMap.get(profile.id);
        
        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("buyer_id", profile.id);
        
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("buyer_id", profile.id);
        
        const { data: products } = await supabase
          .from("products")
          .select("id")
          .eq("seller_id", profile.id);
        
        const { data: sales } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("seller_id", profile.id);
        
        const totalSpent = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        const averageRating = reviews?.length 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;
        const totalSales = sales?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        
        return {
          ...profile,
          user_roles: userRoles,
          user_status: userStatusData,
          stats: {
            total_orders: orders?.length || 0,
            total_spent: totalSpent,
            total_reviews: reviews?.length || 0,
            average_rating: averageRating,
            total_products: products?.length || 0,
            total_sales: totalSales,
          }
        };
      }));
      
      setUsers(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async (userId: string) => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (title, image_url, price)
        `)
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setUserOrders(orders || []);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      toast.error("Failed to load user orders");
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled"
        })
        .eq("id", selectedOrder.id);
      
      if (error) throw error;
      
      toast.success(`Order ${selectedOrder.id.slice(0, 8)} cancelled successfully`);
      setCancelOrderDialogOpen(false);
      setSelectedOrder(null);
      setCancelReason("");
      if (selectedUser) {
        fetchUserOrders(selectedUser.id);
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error(error.message || "Failed to cancel order");
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    try {
      const hasRole = selectedUser.user_roles.some(r => r.role === selectedRole);
      
      if (hasRole) {
        toast.error(`User already has ${selectedRole} role`);
        setProcessing(false);
        return;
      }
      
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: selectedRole,
        });
      
      if (error) throw error;
      
      toast.success(`${selectedRole} role assigned to ${selectedUser.display_name}`);
      setRoleDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast.error(error.message || "Failed to assign role");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (role === "admin" && currentUser?.id === userId) {
      toast.error("You cannot remove your own admin role");
      return;
    }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      
      if (error) throw error;
      
      toast.success(`${role} role removed`);
      fetchUsers();
      
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast.error(error.message || "Failed to remove role");
    } finally {
      setProcessing(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("user_status")
        .upsert({
          user_id: selectedUser.id,
          status: "banned",
          banned_reason: banReason,
          banned_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      toast.success(`${selectedUser.display_name} has been banned`);
      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason("");
      fetchUsers();
      
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast.error(error.message || "Failed to ban user");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnbanUser = async (user: User) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("user_status")
        .upsert({
          user_id: user.id,
          status: "active",
          banned_reason: null,
          banned_at: null,
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      toast.success(`${user.display_name} has been unbanned`);
      fetchUsers();
      
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      toast.error(error.message || "Failed to unban user");
    } finally {
      setProcessing(false);
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const openBanDialog = (user: User) => {
    setSelectedUser(user);
    setBanReason("");
    setBanDialogOpen(true);
  };

  const viewUserDetails = async (user: User) => {
    setSelectedUser(user);
    await fetchUserOrders(user.id);
    setViewDialogOpen(true);
  };

  const viewUserOrders = async (user: User) => {
    setSelectedUser(user);
    await fetchUserOrders(user.id);
    setOrdersDialogOpen(true);
  };

  const openCancelOrderDialog = (order: UserOrder) => {
    setSelectedOrder(order);
    setCancelReason("");
    setCancelOrderDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500/10 text-red-600 border-red-500/30",
      seller: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      buyer: "bg-green-500/10 text-green-600 border-green-500/30",
    };
    return (
      <Badge className={colors[role] || "bg-gray-500/10 text-gray-600"}>
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (user: User) => {
    const status = user.user_status?.status || "active";
    if (status === "banned") {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><Ban className="w-3 h-3 mr-1" /> Banned</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
  };

  const getOrderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      confirmed: "bg-blue-500/10 text-blue-600",
      shipped: "bg-purple-500/10 text-purple-600",
      delivered: "bg-green-500/10 text-green-600",
      completed: "bg-emerald-500/10 text-emerald-600",
      cancelled: "bg-red-500/10 text-red-600",
    };
    return <Badge className={colors[status] || "bg-gray-500/10"}>{status}</Badge>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.user_roles.some(r => r.role === filterRole);
    
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.user_roles.some(r => r.role === "admin")).length,
    sellers: users.filter(u => u.user_roles.some(r => r.role === "seller")).length,
    buyers: users.filter(u => u.user_roles.some(r => r.role === "buyer")).length,
    banned: users.filter(u => u.user_status?.status === "banned").length,
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="w-6 h-6 text-primary" />
                User Management ({stats.total} Users)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user accounts, roles, ban users, and view orders
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchUsers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary/5 text-center">
              <p className="text-xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 text-center">
              <p className="text-xl font-bold text-red-600">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-center">
              <p className="text-xl font-bold text-blue-600">{stats.sellers}</p>
              <p className="text-xs text-muted-foreground">Sellers</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 text-center">
              <p className="text-xl font-bold text-green-600">{stats.buyers}</p>
              <p className="text-xs text-muted-foreground">Buyers</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 text-center">
              <p className="text-xl font-bold text-red-600">{stats.banned}</p>
              <p className="text-xs text-muted-foreground">Banned</p>
            </div>
          </div>

          {/* Users Table */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {user.display_name?.charAt(0) || user.email?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.display_name || "Unnamed"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.user_roles.map((role) => (
                            <div key={role.role} className="flex items-center gap-1">
                              {getRoleBadge(role.role)}
                              {role.role !== "admin" && currentUser?.id !== user.id && (
                                <button
                                  onClick={() => handleRemoveRole(user.id, role.role)}
                                  className="text-red-500 hover:text-red-700"
                                  title={`Remove ${role.role} role`}
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => openRoleDialog(user)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Add Role
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{user.stats?.total_orders || 0}</TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => viewUserDetails(user)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => viewUserOrders(user)}>
                            <ShoppingBag className="w-4 h-4" />
                          </Button>
                          {user.user_status?.status !== "banned" ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-600"
                              onClick={() => openBanDialog(user)}
                            >
                              <Ban className="w-4 h-4" />
                              Ban
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-600"
                              onClick={() => handleUnbanUser(user)}
                            >
                              <UserCheck className="w-4 h-4" />
                              Unban
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Assign Role to User</DialogTitle>
            <DialogDescription>
              Select a role to assign to {selectedUser?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedUser.display_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <div className="flex gap-1 mt-2">
                  Current Roles: {selectedUser.user_roles.map(r => getRoleBadge(r.role))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignRole} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Ban User</DialogTitle>
            <DialogDescription>
              Banned users cannot access their account or make purchases.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedUser.display_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Ban Reason *</Label>
                <Textarea
                  placeholder="Explain why this user is being banned..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  This action will permanently ban this user. They will not be able to log in.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBanUser} disabled={processing || !banReason} className="bg-red-600 hover:bg-red-700">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="glass-strong max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">User Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {selectedUser.display_name?.charAt(0) || selectedUser.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedUser.display_name || "Unnamed"}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUser.user_roles.map((role) => getRoleBadge(role.role))}
                    {getStatusBadge(selectedUser)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Member since</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="glass-strong w-full">
                  <TabsTrigger value="info" className="flex-1 gap-2"><UserCheck className="w-4 h-4" /> Information</TabsTrigger>
                  <TabsTrigger value="stats" className="flex-1 gap-2"><Activity className="w-4 h-4" /> Statistics</TabsTrigger>
                  <TabsTrigger value="orders" className="flex-1 gap-2"><ShoppingBag className="w-4 h-4" /> Orders ({userOrders.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Mail className="w-4 h-4" /> Contact</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{selectedUser.email}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">User ID:</span><span className="font-mono text-xs">{selectedUser.id}</span></div>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Roles</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.user_roles.map((role) => getRoleBadge(role.role))}
                      </div>
                    </div>
                    {selectedUser.user_status?.banned_reason && (
                      <div className="p-4 rounded-lg bg-red-500/10">
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><Ban className="w-4 h-4" /> Ban Information</h4>
                        <p className="text-sm">Reason: {selectedUser.user_status.banned_reason}</p>
                        <p className="text-sm">Banned at: {selectedUser.user_status.banned_at ? new Date(selectedUser.user_status.banned_at).toLocaleString() : "Unknown"}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="stats">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-primary/5 text-center">
                      <p className="text-2xl font-bold text-primary">{selectedUser.stats?.total_orders || 0}</p>
                      <p className="text-xs text-muted-foreground">Orders</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-2xl font-bold text-green-600">₦{(selectedUser.stats?.total_spent || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{selectedUser.stats?.total_reviews || 0}</p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-500/10 text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedUser.stats?.average_rating.toFixed(1) || 0}</p>
                      <p className="text-xs text-muted-foreground">Avg Rating</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="orders">
                  {userOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No orders found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userOrders.map((order) => (
                        <div key={order.id} className="p-4 rounded-lg border border-white/10 hover:bg-white/5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-sm">Order #{order.id.slice(0, 8)}</p>
                              <p className="text-sm">₦{order.total_amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getOrderStatusBadge(order.status)}
                              {order.status !== "cancelled" && (
                                <Button size="sm" variant="destructive" onClick={() => openCancelOrderDialog(order)}>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Cancel Order
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Orders Dialog */}
      <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
        <DialogContent className="glass-strong max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedUser?.display_name}'s Orders ({userOrders.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {userOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No orders found</p>
              </div>
            ) : (
              userOrders.map((order) => (
                <div key={order.id} className="p-4 rounded-lg border border-white/10 hover:bg-white/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-mono font-semibold">#{order.id.slice(0, 8)}</p>
                        {getOrderStatusBadge(order.status)}
                        <Badge className={order.payment_status === "paid" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}>
                          {order.payment_status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2">{order.products?.title || "Product"}</p>
                      <p className="text-xs text-muted-foreground">Quantity: {order.quantity}</p>
                      <p className="text-xs text-muted-foreground">Delivery: {order.delivery_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">₦{order.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                      {order.status !== "cancelled" && (
                        <Button size="sm" variant="destructive" className="mt-2" onClick={() => openCancelOrderDialog(order)}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrdersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelOrderDialogOpen} onOpenChange={setCancelOrderDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order #{selectedOrder?.id.slice(0, 8)}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium">Order Details</p>
              <p className="text-sm">Amount: ₦{selectedOrder?.total_amount.toLocaleString()}</p>
              <p className="text-sm">Date: {selectedOrder && new Date(selectedOrder.created_at).toLocaleString()}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Cancellation Reason *</Label>
              <Textarea
                placeholder="Explain why this order is being cancelled..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                This action cannot be undone. The user will be notified.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOrderDialogOpen(false)}>Keep Order</Button>
            <Button variant="destructive" onClick={handleCancelOrder} disabled={processing || !cancelReason}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;