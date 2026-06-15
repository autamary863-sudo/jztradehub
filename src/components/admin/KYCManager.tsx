import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  RefreshCw,
  FileText,
  Eye,
  Shield,
  UserCheck,
  Search,
  AlertCircle,
  X,
  ZoomIn
} from "lucide-react";

interface KYCRequest {
  id: string;
  user_id: string;
  document_type: string;
  document_number: string;
  document_front_url: string;
  document_back_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user?: {
    display_name: string;
    email: string;
    phone_number: string;
    avatar_url: string;
  };
  seller_profile?: {
    business_name: string;
  };
}

const documentTypes: Record<string, string> = {
  national_id: "National ID Card",
  passport: "International Passport",
  drivers_license: "Driver's License",
  voters_card: "Voter's Card",
  nin_slip: "NIN Slip",
  utility_bill: "Utility Bill",
  bank_statement: "Bank Statement",
};

const KYCManager = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<KYCRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [verificationLevel, setVerificationLevel] = useState("advanced");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [imageViewOpen, setImageViewOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");
  const [currentImageTitle, setCurrentImageTitle] = useState("");

  useEffect(() => {
    fetchKYCData();
  }, []);

  const fetchKYCData = async () => {
    setLoading(true);
    try {
      const { data: kycData, error: kycError } = await supabase
        .from("kyc_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (kycError) throw kycError;
      
      if (!kycData || kycData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }
      
      const userIds = [...new Set(kycData.map(k => k.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email, phone_number, avatar_url")
        .in("id", userIds);
      
      const { data: sellerProfiles } = await supabase
        .from("seller_profiles")
        .select("user_id, business_name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const sellerMap = new Map(sellerProfiles?.map(s => [s.user_id, s]) || []);
      
      const requestsWithUsers = kycData.map(request => ({
        ...request,
        user: profileMap.get(request.user_id),
        seller_profile: sellerMap.get(request.user_id)
      }));
      
      setRequests(requestsWithUsers);
      
    } catch (error) {
      console.error("Error fetching KYC data:", error);
      toast.error("Failed to load KYC requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: KYCRequest) => {
    setProcessingId(request.id);
    
    try {
      const { error: kycError } = await supabase
        .from("kyc_documents")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      
      if (kycError) throw kycError;
      
      const { data: existingVerif } = await supabase
        .from("seller_verification")
        .select("*")
        .eq("user_id", request.user_id)
        .maybeSingle();
      
      if (existingVerif) {
        await supabase
          .from("seller_verification")
          .update({
            verification_status: "verified",
            verification_level: verificationLevel,
            verification_date: new Date().toISOString(),
            notes: adminNotes || null,
          })
          .eq("user_id", request.user_id);
      } else {
        await supabase
          .from("seller_verification")
          .insert({
            user_id: request.user_id,
            verification_status: "verified",
            verification_level: verificationLevel,
            verification_date: new Date().toISOString(),
            notes: adminNotes || null,
          });
      }
      
      toast.success(`KYC request approved for ${request.user?.display_name || "Seller"}`);
      setDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchKYCData();
      
    } catch (error: any) {
      console.error("Error approving KYC:", error);
      toast.error(error.message || "Failed to approve KYC");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: KYCRequest) => {
    setProcessingId(request.id);
    
    try {
      const { error } = await supabase
        .from("kyc_documents")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      
      if (error) throw error;
      
      toast.success(`KYC request rejected for ${request.user?.display_name || "Seller"}`);
      setDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchKYCData();
      
    } catch (error: any) {
      console.error("Error rejecting KYC:", error);
      toast.error(error.message || "Failed to reject KYC");
    } finally {
      setProcessingId(null);
    }
  };

  const openActionDialog = (request: KYCRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes("");
    setVerificationLevel("advanced");
    setDialogOpen(true);
  };

  const openImageView = (url: string, title: string) => {
    setCurrentImage(url);
    setCurrentImageTitle(title);
    setImageViewOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.seller_profile?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "pending") return matchesSearch && request.status === "pending";
    if (activeTab === "approved") return matchesSearch && request.status === "approved";
    if (activeTab === "rejected") return matchesSearch && request.status === "rejected";
    return matchesSearch;
  });

  const stats = {
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    total: requests.length,
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">Loading KYC requests...</p>
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
                <Shield className="w-6 h-6 text-primary" />
                KYC Verification Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and verify seller KYC documents
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchKYCData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>

          {/* Tabs */}
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
              <TabsTrigger value="rejected" className="flex-1 gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No KYC requests found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Seller</TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {request.user?.display_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{request.user?.display_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{request.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{request.seller_profile?.business_name || "—"}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{documentTypes[request.document_type] || request.document_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openImageView(request.document_front_url, `${request.user?.display_name} - Front Side`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {request.document_back_url && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openImageView(request.document_back_url!, `${request.user?.display_name} - Back Side`)}
                                >
                                  <ZoomIn className="w-4 h-4 mr-1" />
                                  Back
                                </Button>
                              )}
                              {request.status === "pending" && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => openActionDialog(request, "approve")}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => openActionDialog(request, "reject")}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
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

      {/* Image View Dialog - FIXED */}
      <Dialog open={imageViewOpen} onOpenChange={setImageViewOpen}>
        <DialogContent className="glass-strong max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Document Preview - {currentImageTitle}
            </DialogTitle>
            <DialogDescription>
              Review the document image below
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            {currentImage && (
              <img 
                src={currentImage} 
                alt="Document Preview" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-white/20"
                style={{ maxHeight: "70vh" }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className={`text-xl font-bold ${actionType === "approve" ? "text-green-600" : "text-red-600"}`}>
              {actionType === "approve" ? "Approve KYC Request" : "Reject KYC Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? "This will verify the seller's identity and approve their KYC submission."
                : "This will reject the KYC request. The seller will be notified with your reason."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedRequest.user?.display_name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.user?.email}</p>
                <p className="text-sm mt-1">{selectedRequest.seller_profile?.business_name}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  {documentTypes[selectedRequest.document_type]}
                </div>
              </div>
              
              {actionType === "approve" && (
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
              
              <div className="space-y-2">
                <Label>Admin Notes {actionType === "reject" && <span className="text-red-500">*</span>}</Label>
                <Textarea
                  placeholder={actionType === "reject" ? "Please provide a reason for rejection..." : "Optional notes about this verification..."}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="glass"
                />
              </div>
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {actionType === "approve" 
                    ? "This action will mark the seller as verified in the system."
                    : "This action cannot be undone. The seller will be notified."}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedRequest) {
                  if (actionType === "approve") {
                    handleApprove(selectedRequest);
                  } else {
                    handleReject(selectedRequest);
                  }
                }
              }}
              disabled={processingId === selectedRequest?.id || (actionType === "reject" && !adminNotes)}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {processingId === selectedRequest?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" ? (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Approve KYC</>
                  ) : (
                    <><XCircle className="w-4 h-4 mr-2" /> Reject KYC</>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KYCManager;