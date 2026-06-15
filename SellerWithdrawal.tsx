import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Banknote, 
  CheckCircle, 
  Clock, 
  XCircle,
  Loader2,
  History,
  RefreshCw,
  Send,
  Shield,
  AlertCircle
} from "lucide-react";

interface Bank {
  name: string;
  code: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_notes: string | null;
  reference: string;
  created_at: string;
  processed_at: string | null;
}

interface EarningsData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  pending_withdrawals: number;
}

// Complete Nigerian Banks List including all Microfinance Banks
const NIGERIAN_BANKS: Bank[] = [
  // Commercial Banks
  { name: "Access Bank", code: "044" },
  { name: "Access Bank (Diamond)", code: "063" },
  { name: "ALAT by Wema", code: "035" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Globus Bank", code: "103" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Parallex Bank", code: "104" },
  { name: "Polaris Bank", code: "076" },
  { name: "Premium Trust Bank", code: "090279" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "068" },
  { name: "Standard Chartered Bank", code: "021" },
  { name: "Sterling Bank", code: "232" },
  { name: "Suntrust Bank", code: "100" },
  { name: "Taj Bank", code: "302" },
  { name: "Titan Trust Bank", code: "090287" },
  { name: "Union Bank", code: "032" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
  
  // Microfinance Banks
  { name: "AB Microfinance Bank", code: "090274" },
  { name: "Accion Microfinance Bank", code: "090134" },
  { name: "Addosser Microfinance Bank", code: "090260" },
  { name: "Advans Microfinance Bank", code: "090302" },
  { name: "Airtel Payment Service Bank", code: "120001" },
  { name: "All Workers Microfinance Bank", code: "090254" },
  { name: "Alpha Kapital Microfinance Bank", code: "090272" },
  { name: "Aso Savings and Loans", code: "090156" },
  { name: "Bainescredit Microfinance Bank", code: "090273" },
  { name: "Bancorp Microfinance Bank", code: "090275" },
  { name: "Bosak Microfinance Bank", code: "090269" },
  { name: "Brightway Microfinance Bank", code: "090262" },
  { name: "Capitalfield Microfinance Bank", code: "090278" },
  { name: "Cellulant", code: "090272" },
  { name: "Chikum Microfinance Bank", code: "090261" },
  { name: "Citi Microfinance Bank", code: "090287" },
  { name: "Consumer Microfinance Bank", code: "090270" },
  { name: "Corestep Microfinance Bank", code: "090271" },
  { name: "Covenant Microfinance Bank", code: "090270" },
  { name: "Crowdyvest Microfinance Bank", code: "090276" },
  { name: "E-Barcs Microfinance Bank", code: "090257" },
  { name: "Edyk Microfinance Bank", code: "090280" },
  { name: "Eko Microfinance Bank", code: "090259" },
  { name: "Empower Microfinance Bank", code: "090281" },
  { name: "Enterprise Bank", code: "090265" },
  { name: "Esan Microfinance Bank", code: "090284" },
  { name: "Eyowo", code: "090288" },
  { name: "Fairmoney Microfinance Bank", code: "090293" },
  { name: "Fina Trust Microfinance Bank", code: "090264" },
  { name: "First Royal Microfinance Bank", code: "090282" },
  { name: "FirstTrust Microfinance Bank", code: "090263" },
  { name: "Fortis Microfinance Bank", code: "090258" },
  { name: "Gashua Microfinance Bank", code: "090286" },
  { name: "Giant Stride Microfinance Bank", code: "090285" },
  { name: "Grooming Microfinance Bank", code: "090277" },
  { name: "Haggai Microfinance Bank", code: "090279" },
  { name: "Hasal Microfinance Bank", code: "090266" },
  { name: "Hope Microfinance Bank", code: "090268" },
  { name: "I&M Bank", code: "090268" },
  { name: "IBILE Microfinance Bank", code: "090267" },
  { name: "Infinity Microfinance Bank", code: "090269" },
  { name: "Kadpoly Microfinance Bank", code: "090278" },
  { name: "Kuda Bank", code: "090267" },
  { name: "Lapo Microfinance Bank", code: "090264" },
  { name: "Mint Microfinance Bank", code: "090272" },
  { name: "Mkobo Microfinance Bank", code: "090283" },
  { name: "Moniepoint Microfinance Bank", code: "090318" },
  { name: "Mutual Trust Microfinance Bank", code: "090265" },
  { name: "NIRSAL Microfinance Bank", code: "090266" },
  { name: "Novus Microfinance Bank", code: "090271" },
  { name: "Ojokoro Microfinance Bank", code: "090279" },
  { name: "Omni Microfinance Bank", code: "090256" },
  { name: "Opay Microfinance Bank", code: "090319" },
  { name: "Paga Microfinance Bank", code: "090275" },
  { name: "Page Financials", code: "090273" },
  { name: "PalmPay Microfinance Bank", code: "090320" },
  { name: "Parallex Microfinance Bank", code: "090255" },
  { name: "Parkway Microfinance Bank", code: "090276" },
  { name: "Paycom Microfinance Bank", code: "090270" },
  { name: "Personal Trust Microfinance Bank", code: "090271" },
  { name: "Precise Microfinance Bank", code: "090277" },
  { name: "Quickteller Microfinance Bank", code: "090274" },
  { name: "Rahama Microfinance Bank", code: "090281" },
  { name: "Regent Microfinance Bank", code: "090283" },
  { name: "Reliance Microfinance Bank", code: "090269" },
  { name: "Remita Microfinance Bank", code: "090275" },
  { name: "Renmoney Microfinance Bank", code: "090262" },
  { name: "Rephidim Microfinance Bank", code: "090285" },
  { name: "Safe Haven Microfinance Bank", code: "090284" },
  { name: "Seed Capital Microfinance Bank", code: "090273" },
  { name: "Sparkle Microfinance Bank", code: "090281" },
  { name: "Sulspap Microfinance Bank", code: "090282" },
  { name: "Tangerine Microfinance Bank", code: "090265" },
  { name: "TCF Microfinance Bank", code: "090268" },
  { name: "Teamapt Microfinance Bank", code: "090270" },
  { name: "Trust Microfinance Bank", code: "090275" },
  { name: "Trustfund Microfinance Bank", code: "090278" },
  { name: "Unical Microfinance Bank", code: "090279" },
  { name: "VFD Microfinance Bank", code: "090352" },
  { name: "Wema Bank (ALAT)", code: "035" },
  { name: "Zenith Microfinance Bank", code: "090280" }
];

const SellerWithdrawal = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({
    balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    pending_withdrawals: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    bank_name: "",
    account_number: "",
    account_name: "",
  });
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      fetchEarnings();
      fetchWithdrawalHistory();
    }
  }, [user]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      
      // Get wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from("seller_wallets")
        .select("balance, total_earned, total_withdrawn")
        .eq("seller_id", user?.id)
        .single();
      
      if (walletError && walletError.code !== 'PGRST116') {
        console.error("Wallet fetch error:", walletError);
      }
      
      // Get pending withdrawals
      const { data: pendingWithdrawals, error: pendingError } = await supabase
        .from("withdrawal_requests")
        .select("amount")
        .eq("seller_id", user?.id)
        .eq("status", "pending");
      
      if (pendingError) console.error("Pending withdrawals error:", pendingError);
      
      const pendingTotal = pendingWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
      
      setEarnings({
        balance: wallet?.balance || 0,
        total_earned: wallet?.total_earned || 0,
        total_withdrawn: wallet?.total_withdrawn || 0,
        pending_withdrawals: pendingTotal
      });
      
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setWithdrawalHistory(data || []);
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchEarnings(), fetchWithdrawalHistory()]);
    setRefreshing(false);
    toast.success("Balance refreshed!");
  };

  const submitWithdrawalRequest = async () => {
    if (!formData.amount || !formData.bank_name || !formData.account_number || !formData.account_name) {
      toast.error("Please fill all fields");
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum < 1000) {
      toast.error("Minimum withdrawal amount is ₦1,000");
      return;
    }

    if (amountNum > earnings.balance - earnings.pending_withdrawals) {
      toast.error(`Insufficient balance. Available: ₦{(earnings.balance - earnings.pending_withdrawals).toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      const reference = `WD-${Date.now()}-${user?.id?.slice(0, 8)}`;
      
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          seller_id: user?.id,
          amount: amountNum,
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          account_name: formData.account_name,
          reference: reference,
          status: "pending"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`Withdrawal request submitted! Amount: ₦${amountNum.toLocaleString()}`);
      setWithdrawalOpen(false);
      resetForm();
      fetchEarnings();
      fetchWithdrawalHistory();
      
    } catch (error: any) {
      console.error("Withdrawal submission error:", error);
      toast.error(error.message || "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      bank_name: "",
      account_number: "",
      account_name: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "processing":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "declined":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const availableBalance = earnings.balance - earnings.pending_withdrawals;

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading your balance...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-strong bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-primary">₦{availableBalance.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/20">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-yellow-600">₦{earnings.pending_withdrawals.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">₦{earnings.total_earned.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                <p className="text-2xl font-bold text-blue-600">₦{earnings.total_withdrawn.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-500/10">
                <Banknote className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button 
          variant="outline" 
          onClick={refreshData} 
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Balance
        </Button>
        <Button 
          onClick={() => setWithdrawalOpen(true)} 
          disabled={availableBalance < 1000}
          className="gap-2 bg-gradient-to-r from-primary to-accent"
        >
          <Send className="w-4 h-4" />
          Request Withdrawal
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-strong w-full">
          <TabsTrigger value="overview" className="flex-1 gap-2">
            <Wallet className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-2">
            <History className="w-4 h-4" />
            Withdrawal History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Withdrawal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="font-semibold mb-2">How Withdrawals Work</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• <strong>Step 1:</strong> Enter your bank details and amount</li>
                  <li>• <strong>Step 2:</strong> Submit withdrawal request</li>
                  <li>• <strong>Step 3:</strong> Admin reviews your request (24-48 hours)</li>
                  <li>• <strong>Step 4:</strong> Once approved, funds sent to your bank</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Requirements
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Minimum withdrawal: ₦1,000</li>
                  <li>• Valid bank account required</li>
                  <li>• No fees for withdrawal requests</li>
                </ul>
              </div>
              {availableBalance < 1000 && (
                <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <p className="text-sm text-yellow-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Your available balance is below the minimum withdrawal amount (₦1,000)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Withdrawal History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawalHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No withdrawal requests yet</p>
                  <p className="text-sm mt-1">Request a withdrawal to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawalHistory.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Banknote className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">₦{request.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.bank_name} - {request.account_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(request.created_at).toLocaleDateString()}
                          </p>
                          {request.processed_at && (
                            <p className="text-xs text-muted-foreground">
                              Processed: {new Date(request.processed_at).toLocaleDateString()}
                            </p>
                          )}
                          {request.admin_notes && request.status === "declined" && (
                            <p className="text-xs text-red-500 mt-1">
                              Reason: {request.admin_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Request Dialog - Simplified without verification */}
      <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">₦{availableBalance.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <Label>Amount (₦) *</Label>
              <Input
                type="number"
                placeholder="Enter amount to withdraw"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                Minimum: ₦1,000 | Maximum: ₦{availableBalance.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Bank *</Label>
              <Select
                value={formData.bank_name}
                onValueChange={(value) => {
                  setFormData({ ...formData, bank_name: value });
                }}
              >
                <SelectTrigger className="glass">
                  <SelectValue placeholder="Choose your bank" />
                </SelectTrigger>
                <SelectContent className="glass-strong max-h-80">
                  {NIGERIAN_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.name}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Number *</Label>
              <Input
                type="text"
                placeholder="Enter your 10-digit account number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                maxLength={10}
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                type="text"
                placeholder="Enter the account holder name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="glass"
              />
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Please double-check your bank details. Incorrect details may delay your withdrawal.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitWithdrawalRequest} 
              disabled={submitting || !formData.amount || !formData.bank_name || !formData.account_number || !formData.account_name || parseFloat(formData.amount) > availableBalance}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerWithdrawal;