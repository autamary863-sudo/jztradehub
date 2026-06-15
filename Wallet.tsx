import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Send, History, 
  Eye, Loader2, CheckCircle, Banknote, Shield, Sparkles,
  TrendingUp, TrendingDown, Copy, RefreshCw, CreditCard,
  Calendar, Clock, Building2, User
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WalletPage = () => {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const depositStatus = urlParams.get('deposit_status');
    const depositAmountParam = urlParams.get('amount');
    const depositMessage = urlParams.get('message');
    
    if (depositStatus === 'success') {
      toast.success(`₦${parseFloat(depositAmountParam || '0').toLocaleString()} added to your wallet!`);
      fetchWalletData();
      fetchTransactions();
      window.history.replaceState({}, '', '/wallet');
    } else if (depositStatus === 'failed') {
      toast.error(depositMessage || 'Deposit failed. Please try again.');
      window.history.replaceState({}, '', '/wallet');
    }
  }, []);

  useEffect(() => {
    if (token) {
      console.log("Token available, fetching wallet data...");
      fetchWalletData();
      fetchTransactions();
    } else {
      console.log("No token available, user might not be logged in");
      setLoading(false);
    }
  }, [token]);

  const fetchWalletData = async () => {
    try {
      console.log("Fetching wallet with token:", token?.substring(0, 20) + "...");
      const res = await fetch(`${API_URL}/api/wallet/balance`, {
        method: "GET",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Wallet response status:", res.status);
      const data = await res.json();
      console.log("Wallet data:", data);
      
      if (data.success) {
        setBalance(data.wallet?.balance || 0);
        setTotalDeposited(data.wallet?.total_deposited || 0);
        setTotalWithdrawn(data.wallet?.total_withdrawn || 0);
      } else if (res.status === 401) {
        console.log("Unauthorized - redirecting to login");
        toast.error("Please login again");
        navigate("/auth");
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/wallet/transactions`, {
        method: "GET",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) < 100) {
      toast.error("Minimum deposit is ₦100");
      return;
    }

    if (!token) {
      toast.error("Please login first");
      navigate("/auth");
      return;
    }

    setDepositing(true);
    try {
      console.log("Initiating deposit with token:", token?.substring(0, 20) + "...");
      const response = await fetch(`${API_URL}/api/wallet/deposit/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: parseFloat(depositAmount),
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
      toast.error("Failed to initiate deposit");
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
      const res = await fetch(`${API_URL}/api/verify-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_name: bankName, account_number: accountNumber })
      });
      const data = await res.json();
      if (data.success) {
        setAccountName(data.data.account_name);
        toast.success("Account verified!");
      } else {
        toast.error("Verification failed");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < 1000) {
      toast.error("Minimum withdrawal is ₦1,000");
      return;
    }
    if (!bankName || !accountNumber || !accountName) {
      toast.error("Please complete bank details");
      return;
    }
    if (parseFloat(withdrawAmount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setWithdrawAmount("");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        fetchWalletData();
        fetchTransactions();
      } else {
        toast.error(data.message || "Withdrawal failed");
      }
    } catch (error) {
      toast.error("Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferEmail || !transferAmount || parseFloat(transferAmount) < 100) {
      toast.error("Please enter valid recipient email and amount");
      return;
    }
    if (parseFloat(transferAmount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          to_email: transferEmail,
          amount: parseFloat(transferAmount)
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setTransferEmail("");
        setTransferAmount("");
        fetchWalletData();
        fetchTransactions();
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

  const getTransactionIcon = (type: string) => {
    switch(type) {
      case "deposit": return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case "withdrawal": return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case "transfer_sent": return <Send className="w-4 h-4 text-orange-500" />;
      case "transfer_received": return <ArrowDownLeft className="w-4 h-4 text-blue-500" />;
      default: return <Banknote className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your wallet...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please Login</h2>
            <p className="text-muted-foreground mb-6">You need to be logged in to access your wallet</p>
            <Button onClick={() => navigate("/auth")}>Login Now</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      <div className="container px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">My Wallet</h1>
                <p className="text-muted-foreground">Manage your funds and transactions securely</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { fetchWalletData(); fetchTransactions(); }} 
              className="gap-2 glass-strong"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-strong bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-3xl font-bold text-primary">₦{balance.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/20">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deposited</p>
                    <p className="text-2xl font-bold text-green-600">₦{totalDeposited.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                    <p className="text-2xl font-bold text-red-600">₦{totalWithdrawn.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-500/10">
                    <TrendingDown className="w-6 h-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass-strong w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="flex-1 gap-2">
                <Eye className="w-4 h-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="deposit" className="flex-1 gap-2">
                <ArrowDownLeft className="w-4 h-4" /> Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="flex-1 gap-2">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex-1 gap-2">
                <Send className="w-4 h-4" /> Send
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-2">
                <History className="w-4 h-4" /> History
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass-strong">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Wallet Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span>Current Balance</span>
                      <span className="font-bold text-primary">₦{balance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span>Total Deposited</span>
                      <span className="font-bold text-green-600">₦{totalDeposited.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span>Total Withdrawn</span>
                      <span className="font-bold text-red-600">₦{totalWithdrawn.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-strong">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Security Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <p className="text-sm">Never share your wallet credentials</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <p className="text-sm">All transactions are encrypted</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Deposit Tab */}
            <TabsContent value="deposit">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-500" />
                    Deposit Funds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[1000, 5000, 10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setDepositAmount(amt.toString())}
                        className="p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition"
                      >
                        ₦{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="glass"
                    />
                    <p className="text-xs text-muted-foreground">Minimum deposit: ₦100</p>
                  </div>
                  <Button
                    onClick={handleDeposit}
                    disabled={depositing}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600"
                    size="lg"
                  >
                    {depositing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deposit Now"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Withdraw Tab */}
            <TabsContent value="withdraw">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-red-500" />
                    Withdraw Funds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="glass"
                    />
                    <p className="text-xs">Min: ₦1,000 | Available: ₦{balance.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-3 rounded-xl border bg-background"
                    >
                      <option value="">Select Bank</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="GTBank">GTBank</option>
                      <option value="First Bank">First Bank</option>
                      <option value="UBA">UBA</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="flex-1 glass"
                      />
                      <Button onClick={verifyAccount} disabled={verifying} variant="outline">
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  </div>
                  {accountName && (
                    <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                      Account Name: {accountName}
                    </div>
                  )}
                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !accountName}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600"
                    size="lg"
                  >
                    {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Withdrawal"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transfer Tab */}
            <TabsContent value="transfer">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-500" />
                    Send Money
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient Email</Label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="glass"
                    />
                  </div>
                  <Button
                    onClick={handleTransfer}
                    disabled={transferring}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                    size="lg"
                  >
                    {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Money"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-center p-4 rounded-xl border">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(tx.type)}
                            <div>
                              <p className="font-medium">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                              <button onClick={() => copyReference(tx.reference)} className="text-xs text-primary mt-1">
                                Copy Ref
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                              {tx.amount > 0 ? "+" : ""}₦{Math.abs(tx.amount).toLocaleString()}
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
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default WalletPage;
