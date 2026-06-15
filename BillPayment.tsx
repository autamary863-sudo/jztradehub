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
import { 
  Tv, Wifi, Zap, Smartphone, Loader2, CheckCircle, 
  Clock, AlertCircle, History, CreditCard, Building2, User,
  Phone, Mail, DollarSign, Calendar
} from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000";

interface Category {
  id: number;
  name: string;
  code: string;
  country_code: string;
}

interface Biller {
  biller_code: string;
  name: string;
  item_code: string;
  country_code: string;
}

interface BillItem {
  item_code: string;
  name: string;
  amount: number;
  currency?: string;
}

interface BillHistory {
  id: string;
  biller_name: string;
  biller_type: string;
  customer_code: string;
  customer_name: string;
  amount: number;
  reference: string;
  status: string;
  created_at: string;
}

const BillPayment = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pay");
  const [categories, setCategories] = useState<Category[]>([]);
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [selectedItem, setSelectedItem] = useState<BillItem | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [history, setHistory] = useState<BillHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bill/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillers = async (categoryCode: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bill/billers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode, countryCode: "NG" })
      });
      const data = await res.json();
      if (data.success) {
        setBillers(data.billers);
      }
    } catch (error) {
      console.error("Error fetching billers:", error);
    }
  };

  const fetchBillItems = async (billerCode: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bill/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billerCode, countryCode: "NG" })
      });
      const data = await res.json();
      if (data.success && data.items.length > 0) {
        setBillItems(data.items);
        setSelectedItem(data.items[0]);
      }
    } catch (error) {
      console.error("Error fetching bill items:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bill/history/${user?.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.bills);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedBiller(null);
    setSelectedItem(null);
    setBillers([]);
    setBillItems([]);
    setCustomerId("");
    setCustomerName("");
    setValidated(false);
    fetchBillers(category.code);
  };

  const handleBillerSelect = (biller: Biller) => {
    setSelectedBiller(biller);
    setSelectedItem(null);
    setBillItems([]);
    setCustomerId("");
    setCustomerName("");
    setValidated(false);
    fetchBillItems(biller.biller_code);
  };

  const validateCustomer = async () => {
    if (!selectedBiller || !selectedItem || !customerId) {
      toast.error("Please fill all required fields");
      return;
    }

    setValidating(true);
    try {
      const res = await fetch(`${API_URL}/api/bill/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billerCode: selectedBiller.biller_code,
          itemCode: selectedItem.item_code,
          customerId: customerId
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setCustomerName(data.customer_name);
        setValidated(true);
        toast.success("Customer verified successfully!");
      } else {
        toast.error(data.message || "Invalid customer ID");
      }
    } catch (error) {
      toast.error("Failed to validate customer");
    } finally {
      setValidating(false);
    }
  };

  const initiatePayment = async () => {
    if (!validated || !selectedBiller || !selectedItem || !selectedCategory) {
      toast.error("Please complete all steps");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/bill/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          billerCode: selectedBiller.biller_code,
          itemCode: selectedItem.item_code,
          customerId: customerId,
          customerName: customerName,
          amount: selectedItem.amount,
          billerName: selectedBiller.name,
          billerType: selectedCategory.code,
          phoneNumber: user?.phone_number || "08012345678",
          email: user?.email
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Bill payment of ₦${selectedItem.amount.toLocaleString()} initiated!`);
        setPaymentDialog(false);
        resetForm();
        fetchHistory();
      } else {
        toast.error(data.message || "Payment failed");
      }
    } catch (error) {
      toast.error("Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedBiller(null);
    setSelectedItem(null);
    setCustomerId("");
    setCustomerName("");
    setValidated(false);
    setBillers([]);
    setBillItems([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case "airtime": return <Smartphone className="w-5 h-5" />;
      case "cable tv": return <Tv className="w-5 h-5" />;
      case "electricity": return <Zap className="w-5 h-5" />;
      case "internet": return <Wifi className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-strong w-full">
          <TabsTrigger value="pay" className="flex-1 gap-2">
            <CreditCard className="w-4 h-4" />
            Pay Bill
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-2">
            <History className="w-4 h-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        {/* Pay Bill Tab */}
        <TabsContent value="pay" className="space-y-6">
          {/* Category Selection */}
          {!selectedCategory && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    {getCategoryIcon(category.name)}
                  </div>
                  <p className="font-semibold">{category.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category.country_code}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Biller Selection */}
          {selectedCategory && !selectedBiller && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(selectedCategory.name)}
                  Select {selectedCategory.name} Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {billers.map((biller) => (
                    <button
                      key={biller.biller_code}
                      onClick={() => handleBillerSelect(biller)}
                      className="flex items-center justify-between p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{biller.name}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
                <Button variant="ghost" className="mt-4" onClick={() => setSelectedCategory(null)}>
                  ← Back to Categories
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Amount Selection */}
          {selectedBiller && !validated && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(selectedCategory?.name || "")}
                  Select Plan - {selectedBiller.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {billItems.map((item) => (
                    <button
                      key={item.item_code}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedItem?.item_code === item.item_code
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-2xl font-bold text-primary mt-2">₦{item.amount.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
                
                {selectedItem && (
                  <div className="space-y-4 mt-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Customer ID / Meter Number / Smart Card Number</Label>
                      <Input
                        placeholder="Enter your customer ID"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {selectedCategory?.code === "CABLEBILLS" && "Enter your Smart Card Number (e.g., 1234567890)"}
                        {selectedCategory?.code === "UTILITYBILLS" && "Enter your Meter Number"}
                        {selectedCategory?.code === "AIRTIME" && "Enter your Phone Number"}
                      </p>
                    </div>
                    <Button
                      onClick={validateCustomer}
                      disabled={validating || !customerId}
                      className="w-full"
                    >
                      {validating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Verify Customer
                    </Button>
                  </div>
                )}
                
                <Button variant="ghost" size="sm" onClick={() => setSelectedBiller(null)}>
                  ← Back to Billers
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Confirmation */}
          {validated && selectedItem && selectedBiller && (
            <Card className="glass-strong border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Customer Verified
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">{selectedBiller.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">{selectedItem.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer ID:</span>
                    <span className="font-mono">{customerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer Name:</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold">Amount:</span>
                    <span className="text-2xl font-bold text-primary">₦{selectedItem.amount.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setValidated(false)} className="flex-1">
                    Edit Details
                  </Button>
                  <Button
                    onClick={() => setPaymentDialog(true)}
                    className="flex-1 bg-gradient-to-r from-primary to-accent"
                  >
                    Pay ₦{selectedItem.amount.toLocaleString()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Bill Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No bill payments yet</p>
                  <p className="text-sm mt-1">Pay a bill to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-accent/5 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {bill.biller_type === "AIRTIME" && <Smartphone className="w-5 h-5 text-primary" />}
                          {bill.biller_type === "CABLEBILLS" && <Tv className="w-5 h-5 text-primary" />}
                          {bill.biller_type === "UTILITYBILLS" && <Zap className="w-5 h-5 text-primary" />}
                          {!bill.biller_type && <Building2 className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-medium">{bill.biller_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{bill.customer_name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {new Date(bill.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₦{bill.amount.toLocaleString()}</p>
                        {getStatusBadge(bill.status)}
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Ref: {bill.reference?.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Confirm Bill Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-medium">{selectedBiller?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{selectedItem?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-bold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">₦{selectedItem?.amount.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                This payment is final and cannot be reversed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={initiatePayment}
              disabled={processing}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillPayment;