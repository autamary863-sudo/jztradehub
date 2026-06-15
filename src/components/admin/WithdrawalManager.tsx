import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Loader2,
  RefreshCw,
  Banknote,
  Calendar,
  MessageCircle,
  AlertCircle,
  Send,
  Sparkles,
  Building2,
  User,
  CreditCard,
  AlertTriangle,
  Ban,
  Coins
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
  seller_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_notes: string | null;
  reference: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  seller?: {
    display_name: string;
    email: string;
  };
}

// Professional decline message templates
const declineTemplates = [
  {
    id: "invalid_account",
    title: "Invalid Account Details",
    icon: Ban,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    message: (sellerName: string, amount: number, accountNumber: string, bankName: string) => `
Dear ${sellerName},

Thank you for your withdrawal request of ₦${amount.toLocaleString()} on JZTradeHub.

After reviewing your request, we were unable to process it due to INVALID ACCOUNT DETAILS.

The account information you provided:
• Bank: ${bankName}
• Account Number: ${accountNumber}

This appears to be incorrect or does not match the account name registered with us.

Please update your bank account details in your seller profile and submit a new withdrawal request.

For assistance, please contact our support team at support@jztradehub.com.

Best regards,
JZTradeHub Finance Team
    `,
    shortReason: "Invalid account details provided"
  },
  {
    id: "insufficient_funds",
    title: "Insufficient Balance",
    icon: Coins,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    message: (sellerName: string, amount: number) => `
Dear ${sellerName},

Thank you for your withdrawal request on JZTradeHub.

We regret to inform you that your withdrawal request of ₦${amount.toLocaleString()} has been declined due to INSUFFICIENT BALANCE in your seller wallet.

Your current available balance does not meet the requested withdrawal amount. Please verify your available balance and submit a new withdrawal request with a valid amount.

You can check your current balance in your Seller Dashboard.

If you believe this is an error, please contact our support team at support@jztradehub.com.

Best regards,
JZTradeHub Finance Team
    `,
    shortReason: "Insufficient balance in seller wallet"
  },
  {
    id: "ineligible",
    title: "Seller Not Eligible",
    icon: AlertTriangle,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    message: (sellerName: string, amount: number) => `
Dear ${sellerName},

Thank you for your withdrawal request of ₦${amount.toLocaleString()} on JZTradeHub.

After careful review, we regret to inform you that your withdrawal request has been declined as you do not currently meet our eligibility criteria for withdrawals.

To become eligible for withdrawals, please ensure:
• Your seller account is fully verified
• You have completed the mandatory seller training
• You have no active disputes or pending orders
• Your account has been active for at least 30 days

Please complete the above requirements and submit a new withdrawal request.

For more information, please contact our support team at support@jztradehub.com.

Best regards,
JZTradeHub Finance Team
    `,
    shortReason: "Seller does not meet withdrawal eligibility criteria"
  },
  {
    id: "unverified_account",
    title: "Unverified Account",
    icon: User,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    message: (sellerName: string, amount: number) => `
Dear ${sellerName},

Thank you for your withdrawal request of ₦${amount.toLocaleString()} on JZTradeHub.

We regret to inform you that your withdrawal request has been declined because your seller account is NOT FULLY VERIFIED.

To withdraw funds, please complete the following verification steps:
• Upload a valid government-issued ID
• Verify your phone number
• Verify your email address
• Complete your business profile

Once verification is complete, you may submit a new withdrawal request.

For assistance, please contact our support team at support@jztradehub.com.

Best regards,
JZTradeHub Finance Team
    `,
    shortReason: "Seller account not fully verified"
  },
  {
    id: "suspicious_activity",
    title: "Suspicious Activity Detected",
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    message: (sellerName: string, amount: number) => `
Dear ${sellerName},

Thank you for your withdrawal request of ₦${amount.toLocaleString()} on JZTradeHub.

We regret to inform you that your withdrawal request has been declined due to SUSPICIOUS ACTIVITY detected on your account.

For security reasons, we have temporarily suspended withdrawal requests on your account pending further review.

Please contact our security team immediately at security@jztradehub.com to resolve this matter.

We appreciate your understanding and cooperation.

Best regards,
JZTradeHub Security Team
    `,
    shortReason: "Suspicious activity detected on account"
  },
  {
    id: "pending_orders",
    title: "Pending Orders/Disputes",
    icon: Clock,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    message: (sellerName: string, amount: number) => `
Dear ${sellerName},

Thank you for your withdrawal request of ₦${amount.toLocaleString()} on JZTradeHub.

We regret to inform you that your withdrawal request has been declined because you have PENDING ORDERS OR ACTIVE DISPUTES on your account.

As per our terms and conditions, withdrawals cannot be processed while there are:
• Undelivered orders
• Active disputes or claims
• Pending refund requests

Please resolve all pending issues and ensure all orders are completed before submitting a new withdrawal request.

For assistance, please contact our support team at support@jztradehub.com.

Best regards,
JZTradeHub Finance Team
    `,
    shortReason: "Pending orders or active disputes on account"
  },
  {
    id: "custom",
    title: "Custom Message",
    icon: MessageCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    message: (sellerName: string, amount: number, customMessage: string) => `
Dear ${sellerName},

Thank you for your withdrawal request of ₦${amount.toLocaleString()} on JZTradeHub.

${customMessage || "We regret to inform you that your withdrawal request has been declined."}

If you have any questions, please contact our support team at support@jztradehub.com.

Best regards,
JZTradeHub Finance Team
    `,
    shortReason: ""
  }
];

const WithdrawalManager = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [declineRequest, setDeclineRequest] = useState<WithdrawalRequest | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(declineTemplates[0].id);
  const [customMessage, setCustomMessage] = useState("");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchWithdrawalRequests();
    
    const channel = supabase
      .channel('withdrawal-requests-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'withdrawal_requests' 
      }, () => {
        fetchWithdrawalRequests();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWithdrawalRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const sellerIds = [...new Set(data?.map(r => r.seller_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", sellerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const requestsWithSellers = (data || []).map(request => ({
        ...request,
        seller: profileMap.get(request.seller_id)
      }));
      
      setRequests(requestsWithSellers);
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: WithdrawalRequest) => {
    setProcessingId(request.id);
    
    try {
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      
      if (updateError) throw updateError;
      
      const { data: wallet } = await supabase
        .from("seller_wallets")
        .select("balance, total_withdrawn")
        .eq("seller_id", request.seller_id)
        .single();
      
      if (wallet) {
        await supabase
          .from("seller_wallets")
          .update({
            balance: wallet.balance - request.amount,
            total_withdrawn: (wallet.total_withdrawn || 0) + request.amount,
            updated_at: new Date().toISOString()
          })
          .eq("seller_id", request.seller_id);
      }
      
      toast.success(`✅ Withdrawal of ₦${request.amount.toLocaleString()} approved!`);
      fetchWithdrawalRequests();
      
    } catch (error: any) {
      console.error("Error approving withdrawal:", error);
      toast.error(error.message || "Failed to approve withdrawal");
    } finally {
      setProcessingId(null);
    }
  };

  const openDeclineDialog = (e: React.MouseEvent, request: WithdrawalRequest) => {
    e.preventDefault();
    e.stopPropagation();
    setDeclineRequest(request);
    setSelectedTemplate(declineTemplates[0].id);
    setCustomMessage("");
    setDeclineDialogOpen(true);
  };

  const getDeclineMessage = () => {
    if (!declineRequest) return "";
    
    const template = declineTemplates.find(t => t.id === selectedTemplate);
    if (!template) return "";
    
    const sellerName = declineRequest.seller?.display_name || "Valued Seller";
    const amount = declineRequest.amount;
    const accountNumber = declineRequest.account_number;
    const bankName = declineRequest.bank_name;
    
    if (selectedTemplate === "custom") {
      return template.message(sellerName, amount, customMessage);
    }
    
    return template.message(sellerName, amount, accountNumber, bankName);
  };

  const getShortReason = () => {
    const template = declineTemplates.find(t => t.id === selectedTemplate);
    if (selectedTemplate === "custom" && customMessage) {
      return customMessage.substring(0, 100);
    }
    return template?.shortReason || "Withdrawal request declined";
  };

  const handleDecline = async () => {
    if (!declineRequest) return;
    
    const declineMessage = getDeclineMessage();
    const shortReason = getShortReason();
    
    if (!declineMessage) {
      toast.error("Please provide a reason for declining");
      return;
    }
    
    setProcessingId(declineRequest.id);
    
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "declined",
          admin_notes: declineMessage,
          processed_at: new Date().toISOString(),
        })
        .eq("id", declineRequest.id);
      
      if (error) throw error;
      
      toast.success(`❌ Withdrawal request declined`);
      setDeclineDialogOpen(false);
      setDeclineRequest(null);
      setSelectedTemplate(declineTemplates[0].id);
      setCustomMessage("");
      fetchWithdrawalRequests();
      
    } catch (error: any) {
      console.error("Error declining withdrawal:", error);
      toast.error(error.message || "Failed to decline withdrawal");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "declined":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === "pending") return r.status === "pending";
    if (activeTab === "approved") return r.status === "approved";
    if (activeTab === "declined") return r.status === "declined";
    if (activeTab === "all") return true;
    return true;
  });

  const stats = {
    pending: requests.filter(r => r.status === "pending").length,
    totalAmount: requests.filter(r => r.status === "pending").reduce((sum, r) => sum + r.amount, 0),
    approved: requests.filter(r => r.status === "approved").length,
    declined: requests.filter(r => r.status === "declined").length,
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading withdrawal requests...</p>
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
                <Banknote className="w-6 h-6 text-primary" />
                Withdrawal Requests
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and process seller withdrawal requests
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchWithdrawalRequests}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Total: ₦{stats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-muted-foreground">Declined</p>
              <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="glass-strong w-full">
              <TabsTrigger value="pending" className="flex-1 gap-2">
                <Clock className="w-4 h-4" />
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex-1 gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved
              </TabsTrigger>
              <TabsTrigger value="declined" className="flex-1 gap-2">
                <XCircle className="w-4 h-4" />
                Declined
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 gap-2">
                <Eye className="w-4 h-4" />
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No withdrawal requests found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Seller</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.seller?.display_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{request.seller?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-primary">₦{request.amount.toLocaleString()}</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{request.bank_name}</p>
                              <p className="text-xs font-mono text-muted-foreground">{request.account_number}</p>
                              <p className="text-xs text-muted-foreground">{request.account_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === "pending" && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApprove(request)}
                                  disabled={processingId === request.id}
                                  type="button"
                                >
                                  {processingId === request.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => openDeclineDialog(e, request)}
                                  disabled={processingId === request.id}
                                  type="button"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Professional Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Decline Withdrawal Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a reason and a professional message will be sent to the seller
            </DialogDescription>
          </DialogHeader>
          
          {declineRequest && (
            <div className="space-y-6 py-4">
              {/* Request Summary Card */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">JZTradeHub Withdrawal Request</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Seller</p>
                    <p className="font-medium">{declineRequest.seller?.display_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-bold text-primary text-lg">₦{declineRequest.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bank</p>
                    <p className="font-medium">{declineRequest.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account</p>
                    <p className="font-mono">{declineRequest.account_number}</p>
                  </div>
                </div>
              </div>

              {/* Decline Reason Options */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Decline Reason
                </Label>
                <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate} className="space-y-3">
                  {declineTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <div
                        key={template.id}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTemplate === template.id
                            ? `${template.borderColor} ${template.bgColor}`
                            : "border-border hover:border-primary/30"
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                        <div className="flex-1">
                          <label htmlFor={template.id} className="flex items-center gap-2 cursor-pointer">
                            <Icon className={`w-5 h-5 ${template.color}`} />
                            <span className="font-semibold">{template.title}</span>
                          </label>
                          <p className="text-sm text-muted-foreground mt-1 ml-7">
                            {template.id === "custom" 
                              ? "Write your own custom message" 
                              : template.shortReason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Custom Message Input (only shown when custom is selected) */}
              {selectedTemplate === "custom" && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Custom Message</Label>
                  <Textarea
                    placeholder="Write your custom decline message here..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={5}
                    className="glass resize-none"
                    autoFocus
                  />
                </div>
              )}

              {/* Message Preview */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Message Preview (Will be sent to seller)
                </Label>
                <div className="p-5 rounded-lg bg-muted/30 border border-primary/20 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {getDeclineMessage()}
                </div>
              </div>

              {/* Warning Message */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  This action cannot be undone. The seller will receive this message via email and in their dashboard.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeclineDialogOpen(false);
                setDeclineRequest(null);
                setSelectedTemplate(declineTemplates[0].id);
                setCustomMessage("");
              }}
              className="gap-2"
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={processingId === declineRequest?.id || (selectedTemplate === "custom" && !customMessage)}
              className="gap-2"
              type="button"
            >
              {processingId === declineRequest?.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send & Decline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WithdrawalManager;