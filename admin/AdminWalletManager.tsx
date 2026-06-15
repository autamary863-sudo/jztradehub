import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Wallet, Search, Users, DollarSign, TrendingUp, TrendingDown, 
  Eye, CheckCircle, XCircle, Clock, Loader2, RefreshCw, 
  Plus, Minus, Send, Download, Filter, Calendar, AlertCircle,
  Building2, CreditCard, Ban, UserCheck, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000";

interface User {
  id: string;
  display_name: string;
  email: string;
  phone_number: string;
}

interface Wallet {
  id: string;
  profile_id: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  profile_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  reference: string;
  description: string;
  created_at: string;
  completed_at: string;
  admin_notes?: string;
  admin_id?: string;
}

interface WithdrawalRequest {
  id: string;
  profile_id: string;
  amount: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  reference: string;
  status: string;
  admin_notes: string;
  created_at: string;
  processed_at: string;
  user?: User;
}

const AdminWalletManager = () => {
  const { user, token, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  
  // Dialog states
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"deposit" | "withdraw">("deposit");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  
  const [processWithdrawalOpen, setProcessWithdrawalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [processAction, setProcessAction] = useState<"approve" | "reject">("approve");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: 0
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchWithdrawalRequests(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawalRequests(data.withdrawals);
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/wallet-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUserWallet = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-wallet/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        setUserTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching user wallet:", error);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount || parseFloat(adjustAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/adjust-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(adjustAmount),
          type: adjustType,
          reason: adjustReason,
          adminId: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully ${adjustType === "deposit" ? "added" : "deducted"} ₦${parseFloat(adjustAmount).toLocaleString()}`);
        setAdjustBalanceOpen(false);
        setAdjustAmount("");
        setAdjustReason("");
        fetchUserWallet(selectedUser.id);
        fetchStats();
      } else {
        toast.error(data.message || "Failed to adjust balance");
      }
    } catch (error) {
      toast.error("Failed to adjust balance");
    } finally {
      setAdjusting(false);
    }
  };

  const handleProcessWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/process-withdrawal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: processAction,
          adminNotes: adminNotes,
          adminId: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Withdrawal ${processAction === "approve" ? "approved" : "rejected"} successfully`);
        setProcessWithdrawalOpen(false);
        setSelectedWithdrawal(null);
        setAdminNotes("");
        fetchWithdrawalRequests();
        fetchStats();
        if (selectedUser) {
          fetchUserWallet(selectedUser.id);
        }
      } else {
        toast.error(data.message || "Failed to process withdrawal");
      }
    } catch (error) {
      toast.error("Failed to process withdrawal");
    } finally {
      setProcessing(false);
    }
  };

  const viewUserDetails = async (user: User) => {
    setSelectedUser(user);
    await fetchUserWallet(user.id);
    setViewUserOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-green-600">₦{stats.totalBalance.toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deposited</p>
                <p className="text-2xl font-bold text-blue-600">₦{stats.totalDeposited.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                <p className="text-2xl font-bold text-red-600">₦{stats.totalWithdrawn.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingWithdrawals}</p>
                <p className="text-xs">₦{stats.pendingWithdrawalAmount.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-strong w-full">
          <TabsTrigger value="users" className="flex-1 gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex-1 gap-2">
            <Download className="w-4 h-4" />
            Withdrawals ({stats.pendingWithdrawals})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 gap-2">
            <Eye className="w-4 h-4" />
            All Transactions
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="glass-strong">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Wallets
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-right py-3 px-4">Balance</th>
                        <th className="text-right py-3 px-4">Total Deposited</th>
                        <th className="text-right py-3 px-4">Total Withdrawn</th>
                        <th className="text-center py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{u.display_name || "N/A"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                          <td className="py-3 px-4 text-right font-bold text-primary">₦0</td>
                          <td className="py-3 px-4 text-right text-green-600">₦0</td>
                          <td className="py-3 px-4 text-right text-red-600">₦0</td>
                          <td className="py-3 px-4 text-center">
                            <Button size="sm" variant="outline" onClick={() => viewUserDetails(u)}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Withdrawal Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawalRequests.filter(w => w.status === "pending").length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No pending withdrawal requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawalRequests.filter(w => w.status === "pending").map((req) => (
                    <div key={req.id} className="p-4 rounded-xl border border-border/50 bg-yellow-500/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{req.user?.display_name || "User"}</p>
                          <p className="text-sm text-muted-foreground">{req.user?.email}</p>
                          <p className="text-sm mt-1">
                            {req.bank_name} - {req.account_number}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested: {new Date(req.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">₦{req.amount.toLocaleString()}</p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500/10"
                              onClick={() => {
                                setSelectedWithdrawal(req);
                                setProcessAction("reject");
                                setProcessWithdrawalOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedWithdrawal(req);
                                setProcessAction("approve");
                                setProcessWithdrawalOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                All Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Transaction history will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View User Dialog */}
      <Dialog open={viewUserOpen} onOpenChange={setViewUserOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto glass-strong">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">User Wallet Management</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{selectedUser.display_name || "User"}</h3>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                    <p className="text-sm text-muted-foreground mt-1">ID: {selectedUser.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-3xl font-bold text-primary">₦{wallet?.balance?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setAdjustType("deposit");
                    setAdjustBalanceOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                  onClick={() => {
                    setAdjustType("withdraw");
                    setAdjustBalanceOpen(true);
                  }}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Deduct Funds
                </Button>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <p className="text-sm text-muted-foreground">Total Deposited</p>
                  <p className="text-xl font-bold text-green-600">₦{wallet?.total_deposited?.toLocaleString() || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                  <p className="text-xl font-bold text-red-600">₦{wallet?.total_withdrawn?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="font-semibold mb-3">Transaction History</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No transactions</p>
                  ) : (
                    userTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                          {tx.admin_notes && <p className="text-xs text-muted-foreground mt-1">Note: {tx.admin_notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {tx.amount > 0 ? "+" : ""}₦{Math.abs(tx.amount).toLocaleString()}
                          </p>
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog open={adjustBalanceOpen} onOpenChange={setAdjustBalanceOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {adjustType === "deposit" ? "Add Funds" : "Deduct Funds"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="font-medium">{selectedUser?.display_name || selectedUser?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason / Note</Label>
              <Textarea
                placeholder="Why are you making this adjustment?"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                This action will be logged and visible to the user
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustBalanceOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAdjustBalance}
              disabled={adjusting || !adjustAmount}
              className={adjustType === "deposit" ? "bg-green-600" : "bg-red-600"}
            >
              {adjusting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {adjustType === "deposit" ? "Add Funds" : "Deduct Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Withdrawal Dialog */}
      <Dialog open={processWithdrawalOpen} onOpenChange={setProcessWithdrawalOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {processAction === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">{selectedWithdrawal.user?.display_name}</p>
                <p className="text-sm text-muted-foreground">{selectedWithdrawal.user?.email}</p>
                <p className="text-sm mt-2">{selectedWithdrawal.bank_name} - {selectedWithdrawal.account_number}</p>
                <p className="text-sm">Account Name: {selectedWithdrawal.account_name}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">₦{selectedWithdrawal.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder={processAction === "approve" ? "Add any notes about this approval..." : "Reason for rejection..."}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessWithdrawalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleProcessWithdrawal}
              disabled={processing}
              className={processAction === "approve" ? "bg-green-600" : "bg-red-600"}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {processAction === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWalletManager;