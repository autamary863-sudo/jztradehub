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
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Clock, 
  Loader2,
  RefreshCw,
  Eye,
  Building2,
  Search,
  UserCheck,
  UserX,
  AlertOctagon,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Package,
  ShoppingBag
} from "lucide-react";

interface Seller {
  id: string;
  display_name: string;
  email: string;
  phone_number: string;
  created_at: string;
  seller_profile?: {
    business_name: string;
    business_description: string;
    business_address: string;
    bank_name: string;
    account_number: string;
    account_name: string;
  };
  verification?: {
    verification_status: string;
    verification_level: string;
    suspension_reason: string;
    suspension_end_date: string;
    banned_reason: string;
    notes: string;
  };
  stats?: {
    total_orders: number;
    total_revenue: number;
    total_products: number;
    total_customers: number;
  };
}

const SellerManagement = () => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"suspend" | "unsuspend" | "ban" | "verify">("verify");
  const [actionReason, setActionReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [verificationLevel, setVerificationLevel] = useState("full");
  const [activeTab, setActiveTab] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      // Get all users with seller role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "seller");
      
      if (rolesError) throw rolesError;
      
      const sellerIds = roles?.map(r => r.user_id) || [];
      
      if (sellerIds.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }
      
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email, phone_number, created_at")
        .in("id", sellerIds);
      
      if (profilesError) throw profilesError;
      
      // Get seller profiles
      const { data: sellerProfiles, error: sellerProfilesError } = await supabase
        .from("seller_profiles")
        .select("*")
        .in("user_id", sellerIds);
      
      if (sellerProfilesError) throw sellerProfilesError;
      
      // Get seller verification
      const { data: verifications, error: verifError } = await supabase
        .from("seller_verification")
        .select("*")
        .in("user_id", sellerIds);
      
      if (verifError) throw verifError;
      
      // Create maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const sellerProfileMap = new Map(sellerProfiles?.map(sp => [sp.user_id, sp]) || []);
      const verificationMap = new Map(verifications?.map(v => [v.user_id, v]) || []);
      
      // Get stats for each seller
      const sellersWithData = await Promise.all(sellerIds.map(async (sellerId) => {
        const profile = profileMap.get(sellerId);
        const sellerProfile = sellerProfileMap.get(sellerId);
        const verification = verificationMap.get(sellerId);
        
        if (!profile) return null;
        
        // Get order count and revenue
        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("seller_id", sellerId);
        
        // Get product count
        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .eq("seller_id", sellerId);
        
        // Get unique customers
        const { data: uniqueCustomers } = await supabase
          .from("orders")
          .select("buyer_id")
          .eq("seller_id", sellerId);
        
        const uniqueBuyers = new Set(uniqueCustomers?.map(o => o.buyer_id)).size;
        const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        
        return {
          ...profile,
          seller_profile: sellerProfile,
          verification: verification,
          stats: {
            total_orders: orders?.length || 0,
            total_revenue: totalRevenue,
            total_products: productCount || 0,
            total_customers: uniqueBuyers,
          }
        };
      }));
      
      setSellers(sellersWithData.filter(s => s !== null) as Seller[]);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedSeller) return;
    
    setProcessing(true);
    try {
      const updates: any = {};
      
      switch (actionType) {
        case "suspend":
          updates.verification_status = "suspended";
          updates.suspension_reason = actionReason;
          updates.suspension_end_date = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000).toISOString();
          break;
        case "unsuspend":
          updates.verification_status = "pending";
          updates.suspension_reason = null;
          updates.suspension_end_date = null;
          break;
        case "ban":
          updates.verification_status = "banned";
          updates.banned_reason = actionReason;
          updates.banned_date = new Date().toISOString();
          updates.banned_by = user?.id;
          break;
        case "verify":
          updates.verification_status = "verified";
          updates.verification_level = verificationLevel;
          updates.verification_date = new Date().toISOString();
          break;
      }
      
      const { error } = await supabase
        .from("seller_verification")
        .upsert({
          user_id: selectedSeller.id,
          ...updates,
        });
      
      if (error) throw error;
      
      toast.success(`Seller ${actionType}d successfully`);
      setActionDialogOpen(false);
      setSelectedSeller(null);
      setActionReason("");
      fetchSellers();
      
    } catch (error: any) {
      console.error("Error performing action:", error);
      toast.error(error.message || "Failed to perform action");
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (seller: Seller, action: typeof actionType) => {
    setSelectedSeller(seller);
    setActionType(action);
    setActionReason("");
    setActionDialogOpen(true);
  };

  const viewSellerDetails = (seller: Seller) => {
    setSelectedSeller(seller);
    setViewDialogOpen(true);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      case "banned":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><Ban className="w-3 h-3 mr-1" /> Banned</Badge>;
      default:
        return <Badge variant="secondary">Unverified</Badge>;
    }
  };

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = 
      seller.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.seller_profile?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "verified") return matchesSearch && seller.verification?.verification_status === "verified";
    if (activeTab === "pending") return matchesSearch && seller.verification?.verification_status === "pending";
    if (activeTab === "suspended") return matchesSearch && seller.verification?.verification_status === "suspended";
    if (activeTab === "banned") return matchesSearch && seller.verification?.verification_status === "banned";
    if (activeTab === "unverified") return matchesSearch && !seller.verification?.verification_status;
    
    return matchesSearch;
  });

  const stats = {
    total: sellers.length,
    verified: sellers.filter(s => s.verification?.verification_status === "verified").length,
    pending: sellers.filter(s => s.verification?.verification_status === "pending").length,
    suspended: sellers.filter(s => s.verification?.verification_status === "suspended").length,
    banned: sellers.filter(s => s.verification?.verification_status === "banned").length,
    unverified: sellers.filter(s => !s.verification?.verification_status).length,
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
            <p className="mt-4 text-muted-foreground">Loading sellers...</p>
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
                <Building2 className="w-6 h-6 text-primary" />
                Seller Management ({stats.total} Sellers)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage seller accounts, KYC verification, and account status
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sellers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchSellers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary/5 text-center cursor-pointer hover:bg-primary/10 transition-all" onClick={() => setActiveTab("all")}>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 text-center cursor-pointer hover:bg-green-500/20 transition-all" onClick={() => setActiveTab("verified")}>
              <p className="text-xl font-bold text-green-600">{stats.verified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 text-center cursor-pointer hover:bg-yellow-500/20 transition-all" onClick={() => setActiveTab("pending")}>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 text-center cursor-pointer hover:bg-orange-500/20 transition-all" onClick={() => setActiveTab("suspended")}>
              <p className="text-xl font-bold text-orange-600">{stats.suspended}</p>
              <p className="text-xs text-muted-foreground">Suspended</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 text-center cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => setActiveTab("banned")}>
              <p className="text-xl font-bold text-red-600">{stats.banned}</p>
              <p className="text-xs text-muted-foreground">Banned</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-500/10 text-center cursor-pointer hover:bg-gray-500/20 transition-all" onClick={() => setActiveTab("unverified")}>
              <p className="text-xl font-bold text-gray-600">{stats.unverified}</p>
              <p className="text-xs text-muted-foreground">Unverified</p>
            </div>
          </div>

          {/* Sellers Table */}
          {filteredSellers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No sellers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Seller</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.map((seller) => (
                    <TableRow key={seller.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {seller.display_name?.charAt(0) || seller.email?.charAt(0) || "S"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{seller.display_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{seller.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{seller.seller_profile?.business_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{seller.seller_profile?.bank_name || "No bank"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{seller.stats?.total_orders || 0}</TableCell>
                      <TableCell className="font-medium text-primary">₦{(seller.stats?.total_revenue || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{seller.stats?.total_products || 0}</TableCell>
                      <TableCell>{getVerificationBadge(seller.verification?.verification_status || "unverified")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => viewSellerDetails(seller)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {seller.verification?.verification_status !== "verified" && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openActionDialog(seller, "verify")}>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                          )}
                          {seller.verification?.verification_status !== "suspended" && seller.verification?.verification_status !== "banned" && (
                            <>
                              <Button size="sm" variant="outline" className="text-orange-600 border-orange-600" onClick={() => openActionDialog(seller, "suspend")}>
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Suspend
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-600" onClick={() => openActionDialog(seller, "ban")}>
                                <Ban className="w-4 h-4 mr-1" />
                                Ban
                              </Button>
                            </>
                          )}
                          {seller.verification?.verification_status === "suspended" && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600" onClick={() => openActionDialog(seller, "unsuspend")}>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Unsuspend
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

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {actionType === "verify" && "Verify Seller Account"}
              {actionType === "suspend" && "Suspend Seller Account"}
              {actionType === "unsuspend" && "Unsuspend Seller Account"}
              {actionType === "ban" && "Ban Seller Account"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "verify" && "This will mark the seller as verified and fully approved."}
              {actionType === "suspend" && "Suspended sellers cannot list products or process orders."}
              {actionType === "unsuspend" && "This will restore the seller's account access."}
              {actionType === "ban" && "Banned sellers are permanently removed from the platform."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSeller && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedSeller.display_name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{selectedSeller.email}</p>
                <p className="text-sm">{selectedSeller.seller_profile?.business_name}</p>
              </div>
              
              {actionType === "suspend" && (
                <>
                  <div className="space-y-2">
                    <Label>Suspension Duration</Label>
                    <Select value={suspensionDays.toString()} onValueChange={(v) => setSuspensionDays(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Suspension Reason *</Label>
                    <Textarea
                      placeholder="Explain why this seller is being suspended..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
              
              {actionType === "ban" && (
                <div className="space-y-2">
                  <Label>Ban Reason *</Label>
                  <Textarea
                    placeholder="Explain why this seller is being banned..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
              
              {actionType === "verify" && (
                <div className="space-y-2">
                  <Label>Verification Level</Label>
                  <Select value={verificationLevel} onValueChange={setVerificationLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Email & Phone)</SelectItem>
                      <SelectItem value="advanced">Advanced (ID Verified)</SelectItem>
                      <SelectItem value="full">Full (Business Verified)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  This action will be logged and visible to other admins.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAction} 
              disabled={processing || ((actionType === "suspend" || actionType === "ban") && !actionReason)}
              className={
                actionType === "verify" ? "bg-green-600 hover:bg-green-700" :
                actionType === "suspend" ? "bg-orange-600 hover:bg-orange-700" :
                actionType === "ban" ? "bg-red-600 hover:bg-red-700" :
                "bg-blue-600 hover:bg-blue-700"
              }
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionType === "verify" && "Verify Seller"}
              {actionType === "suspend" && "Suspend Seller"}
              {actionType === "unsuspend" && "Unsuspend Seller"}
              {actionType === "ban" && "Ban Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Seller Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="glass-strong max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Seller Details</DialogTitle>
          </DialogHeader>
          
          {selectedSeller && (
            <div className="space-y-6 py-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {selectedSeller.display_name?.charAt(0) || selectedSeller.email?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedSeller.display_name || "Unnamed"}</h3>
                  <p className="text-muted-foreground">{selectedSeller.email}</p>
                  <div className="flex gap-2 mt-2">
                    {getVerificationBadge(selectedSeller.verification?.verification_status || "unverified")}
                  </div>
                </div>
              </div>
              
              {/* Business Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Business Name</Label>
                  <p className="font-medium mt-1">{selectedSeller.seller_profile?.business_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Business Description</Label>
                  <p className="text-sm mt-1">{selectedSeller.seller_profile?.business_description || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Business Address</Label>
                  <p className="mt-1">{selectedSeller.seller_profile?.business_address || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bank Name</Label>
                  <p className="mt-1">{selectedSeller.seller_profile?.bank_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Number</Label>
                  <p className="mt-1 font-mono">{selectedSeller.seller_profile?.account_number || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Name</Label>
                  <p className="mt-1">{selectedSeller.seller_profile?.account_name || "—"}</p>
                </div>
              </div>
              
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div className="p-3 rounded-lg bg-primary/5 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedSeller.stats?.total_orders || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <p className="text-2xl font-bold text-green-600">₦{(selectedSeller.stats?.total_revenue || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedSeller.stats?.total_products || 0}</p>
                  <p className="text-xs text-muted-foreground">Products Listed</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{selectedSeller.stats?.total_customers || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Customers</p>
                </div>
              </div>
              
              {/* Verification Info */}
              {selectedSeller.verification && (
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Verification Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-2 font-medium capitalize">{selectedSeller.verification.verification_status}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level:</span>
                      <span className="ml-2 font-medium capitalize">{selectedSeller.verification.verification_level || "basic"}</span>
                    </div>
                    {selectedSeller.verification.suspension_reason && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Suspension Reason:</span>
                        <p className="mt-1 text-orange-600">{selectedSeller.verification.suspension_reason}</p>
                      </div>
                    )}
                    {selectedSeller.verification.banned_reason && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Ban Reason:</span>
                        <p className="mt-1 text-red-600">{selectedSeller.verification.banned_reason}</p>
                      </div>
                    )}
                    {selectedSeller.verification.notes && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Admin Notes:</span>
                        <p className="mt-1">{selectedSeller.verification.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SellerManagement;