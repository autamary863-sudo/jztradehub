// src/pages/Wallet.tsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  History,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  Banknote,
  Shield,
  TrendingUp,
  TrendingDown,
  Copy,
  RefreshCw,
  CreditCard,
  Clock,
  Building2,
  User,
  Search,
  Gift,
  Lock,
  Zap
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const API_URL = "http://localhost:5000";

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

const triggerConfetti = () => {
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981'] });
};

const WalletPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [balance, setBalance] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [verifyingDeposit, setVerifyingDeposit] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [recipient, setRecipient] = useState<any>(null);
  
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successAmount, setSuccessAmount] = useState(0);
  const [successType, setSuccessType] = useState<"deposit" | "withdraw" | "transfer">("deposit");

  const quickAmounts = [1000, 5000, 10000, 20000, 50000];
  const banks = ["Access Bank", "GTBank", "First Bank", "UBA", "Zenith Bank", "Ecobank", "Fidelity Bank", "Wema Bank", "Kuda Bank", "Moniepoint", "Opay", "PalmPay"];

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchTransactions();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const status = params.get("status");
    
    if (reference && status === "successful") {
      verifyDeposit(reference);
    } else if (reference && status === "cancelled") {
      toast.error("Deposit was cancelled");
      window.history.replaceState({}, "", "/wallet");
    }
  }, []);

  const fetchWalletData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const res = await fetch(`${API_URL}/api/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setBalance(data.wallet?.balance || 0);
        setTotalDeposited(data.wallet?.total_deposited || 0);
        setTotalWithdrawn(data.wallet?.total_withdrawn || 0);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const res = await fetch(`${API_URL}/api/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const verifyDeposit = async (reference: string) => {
    setVerifyingDeposit(true);
    toast.loading("Verifying your deposit...", { id: "verify" });
    
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/wallet/deposit/verify?reference=${reference}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      const data = await response.json();
      toast.dismiss("verify");
      
      if (data.success) {
        setSuccessAmount(data.amount);
        setSuccessType("deposit");
        setSuccessMsg(`₦${data.amount?.toLocaleString()} added to your wallet!`);
        setShowSuccess(true);
        triggerConfetti();
        await Promise.all([fetchWalletData(), fetchTransactions()]);
        toast.success(`₦${data.amount?.toLocaleString()} added successfully!`);
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.dismiss("verify");
      toast.error("Failed to verify deposit");
    } finally {
      setVerifyingDeposit(false);
      window.history.replaceState({}, "", "/wallet");
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amount) || amount < 100) {
      toast.error("Minimum deposit is ₦100");
      return;
    }
    
    setDepositing(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please login again");
        navigate("/auth");
        return;
      }
      
      console.log("Initiating deposit:", { amount, token: token.substring(0, 20) + "..." });
      
      const response = await fetch(`${API_URL}/api/wallet/deposit/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount, 
          email: user?.email,
          name: user?.user_metadata?.display_name || user?.email?.split('@')[0]
        })
      });
      
      const data = await response.json();
      console.log("Deposit response:", data);
      
      if (data.success && data.data?.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        toast.error(data.message || "Failed to initiate deposit");
      }
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error("Failed to initiate deposit. Make sure server is running on port 5000");
    } finally {
      setDepositing(false);
    }
  };

  const verifyAccount = async () => {
    if (!bankName || !accountNumber) {
      toast.error("Please select bank and enter account number");
      return;
    }
    setVerifying(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/verify-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ bank_name: bankName, account_number: accountNumber })
      });
      const data = await response.json();
      if (data.success) {
        setAccountName(data.data.account_name);
        toast.success("Account verified!");
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      toast.error("Failed to verify account");
    } finally {
      setVerifying(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amount) || amount < 1000) {
      toast.error("Minimum withdrawal is ₦1,000");
      return;
    }
    if (!bankName || !accountNumber || !accountName) {
      toast.error("Please complete bank details");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setWithdrawing(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount, 
          bank_name: bankName, 
          account_number: accountNumber, 
          account_name: accountName 
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessAmount(amount);
        setSuccessType("withdraw");
        setSuccessMsg(data.message);
        setShowSuccess(true);
        setWithdrawAmount("");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        await Promise.all([fetchWalletData(), fetchTransactions()]);
      } else {
        toast.error(data.message || "Withdrawal failed");
      }
    } catch (error) {
      toast.error("Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const searchRecipient = async () => {
    if (!transferEmail.trim()) {
      toast.error("Please enter email");
      return;
    }
    setRecipient(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .eq("email", transferEmail.trim())
        .single();
      if (error || !data) {
        toast.error("User not found");
        return;
      }
      if (data.id === user?.id) {
        toast.error("Cannot transfer to yourself");
        return;
      }
      setRecipient({ id: data.id, name: data.display_name || data.email, email: data.email });
      toast.success("Recipient found!");
    } catch (error) {
      toast.error("Failed to find recipient");
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!recipient) {
      toast.error("Please find a recipient first");
      return;
    }
    if (!transferAmount || isNaN(amount) || amount < 100) {
      toast.error("Minimum transfer is ₦100");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setTransferring(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/wallet/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ to_user_id: recipient.id, amount })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessAmount(amount);
        setSuccessType("transfer");
        setSuccessMsg(`₦${amount.toLocaleString()} sent to ${recipient.name}!`);
        setShowSuccess(true);
        setTransferEmail("");
        setTransferAmount("");
        setRecipient(null);
        await Promise.all([fetchWalletData(), fetchTransactions()]);
      } else {
        toast.error(data.message || "Transfer failed");
      }
    } catch (error) {
      toast.error("Failed to process transfer");
    } finally {
      setTransferring(false);
    }
  };

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success("Reference copied!");
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchWalletData(), fetchTransactions()]);
    setRefreshing(false);
    toast.success("Wallet refreshed!");
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit": return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case "withdrawal": return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case "transfer_sent": return <Send className="w-4 h-4 text-orange-500" />;
      case "transfer_received": return <ArrowDownLeft className="w-4 h-4 text-blue-500" />;
      default: return <Banknote className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (searchTerm && !tx.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Wallet className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Please Login</h2>
              <p className="text-muted-foreground mb-6">You need to be logged in to access your wallet</p>
              <Button onClick={() => navigate("/auth")}>Login Now</Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/20">
              {successType === "deposit" && <ArrowDownLeft className="w-8 h-8 text-green-500" />}
              {successType === "withdraw" && <ArrowUpRight className="w-8 h-8 text-green-500" />}
              {successType === "transfer" && <Send className="w-8 h-8 text-green-500" />}
            </div>
            <DialogTitle className="text-xl">
              {successType === "deposit" && "Deposit Successful! 🎉"}
              {successType === "withdraw" && "Withdrawal Requested!"}
              {successType === "transfer" && "Transfer Complete!"}
            </DialogTitle>
            <DialogDescription>{successMsg}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(false)}>Continue</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={verifyingDeposit} onOpenChange={setVerifyingDeposit}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Verifying Deposit</DialogTitle>
            <DialogDescription>Please wait while we confirm your transaction</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          </div>
        </DialogContent>
      </Dialog>

      <div className="container px-4 py-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Wallet</h1>
              <p className="text-muted-foreground">Manage your funds securely</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBalance(!showBalance)}>
              {showBalance ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showBalance ? "Hide" : "Show"} Balance
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold">
                    {showBalance ? `₦${balance.toLocaleString()}` : "••••••"}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposited</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₦{totalDeposited.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ₦{totalWithdrawn.toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 gap-2">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="deposit" className="flex-1 gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1 gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex-1 gap-2">
              <Send className="w-4 h-4" />
              Send
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Wallet Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span>Current Balance</span>
                    <span className="font-bold text-primary">₦{balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span>Total Deposited</span>
                    <span className="font-bold text-green-600">₦{totalDeposited.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span>Total Withdrawn</span>
                    <span className="font-bold text-red-600">₦{totalWithdrawn.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Security Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Lock className="w-4 h-4 text-green-500 mt-0.5" />
                    <p className="text-sm">Never share your password with anyone</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-green-500 mt-0.5" />
                    <p className="text-sm">All transactions are encrypted and secure</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-green-500 mt-0.5" />
                    <p className="text-sm">Contact support for suspicious activity</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Recent Transactions
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>
                    View All <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.slice(0, 5).length === 0 ? (
                  <div className="text-center py-12">
                    <Banknote className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-medium">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.type === "deposit" || tx.type === "transfer_received" ? "text-green-600" : "text-red-600"}`}>
                            {tx.type === "deposit" || tx.type === "transfer_received" ? "+" : "-"}₦{Math.abs(tx.amount).toLocaleString()}
                          </p>
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  Deposit Funds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block">Quick Amount</Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setSelectedAmount(amt);
                          setDepositAmount(amt.toString());
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          selectedAmount === amt
                            ? "border-green-500 bg-green-500/10 text-green-600"
                            : "border-border hover:border-green-500/50"
                        }`}
                      >
                        <span className="font-medium">₦{amt.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Amount (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Minimum deposit: ₦100</p>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={depositing || !depositAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {depositing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4 mr-2" />
                  )}
                  {depositing ? "Processing..." : `Deposit ₦${parseFloat(depositAmount || "0").toLocaleString()}`}
                </Button>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                    🔒 You will be redirected to Flutterwave to complete your payment securely.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                  Withdraw Funds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Min: ₦1,000 | Available: ₦{balance.toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <Label>Select Bank</Label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-background"
                  >
                    <option value="">Select Bank</option>
                    {banks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="Enter account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={verifyAccount} disabled={verifying || !bankName || !accountNumber} variant="outline">
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </div>

                {accountName && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-green-600 dark:text-green-400">✓ Account Name: {accountName}</p>
                  </div>
                )}

                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !accountName || !withdrawAmount}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                  {withdrawing ? "Processing..." : "Request Withdrawal"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-500" />
                  Send Money
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={searchRecipient} variant="outline">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {recipient && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{recipient.name}</p>
                        <p className="text-xs text-muted-foreground">{recipient.email}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Available: ₦{balance.toLocaleString()}</p>
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={transferring || !recipient || !transferAmount}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {transferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {transferring ? "Processing..." : "Send Money"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Transaction History
                  </CardTitle>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-48"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="deposit">Deposits</option>
                      <option value="withdrawal">Withdrawals</option>
                      <option value="transfer_sent">Sent</option>
                      <option value="transfer_received">Received</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-16">
                    <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-muted">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-medium">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                            {tx.reference && (
                              <button
                                onClick={() => copyReference(tx.reference)}
                                className="text-xs text-primary hover:underline mt-1"
                              >
                                Copy Reference
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            tx.type === "deposit" || tx.type === "transfer_received" ? "text-green-600" : "text-red-600"
                          }`}>
                            {tx.type === "deposit" || tx.type === "transfer_received" ? "+" : "-"}₦{Math.abs(tx.amount).toLocaleString()}
                          </p>
                          {getStatusBadge(tx.status)}
                          {tx.balance_after && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Balance: ₦{tx.balance_after.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <div className="px-4 py-2 rounded-full bg-muted flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm">Bank-Level Security</span>
          </div>
          <div className="px-4 py-2 rounded-full bg-muted flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">Instant Transfers</span>
          </div>
          <div className="px-4 py-2 rounded-full bg-muted flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm">No Hidden Fees</span>
          </div>
          <div className="px-4 py-2 rounded-full bg-muted flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-sm">Refer & Earn ₦1,000</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default WalletPage;