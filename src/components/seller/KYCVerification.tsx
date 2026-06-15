import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Shield, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  UserCheck,
  Building2,
  CreditCard,
  AlertCircle,
  Camera,
  Eye,
  Trash2
} from "lucide-react";

interface KYCDocument {
  id: string;
  document_type: string;
  document_number: string;
  document_front_url: string;
  document_back_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface SellerVerification {
  verification_status: string;
  verification_level: string;
  business_reg_number: string;
  tax_id: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  website_url: string;
  suspension_reason: string;
  suspension_end_date: string;
  banned_reason: string;
}

const documentTypes = [
  { value: "national_id", label: "National ID Card" },
  { value: "passport", label: "International Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "voters_card", label: "Voter's Card" },
  { value: "nin_slip", label: "NIN Slip" },
  { value: "utility_bill", label: "Utility Bill (Proof of Address)" },
  { value: "bank_statement", label: "Bank Statement" },
];

const KYCVerification = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [verification, setVerification] = useState<SellerVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    document_type: "national_id",
    document_number: "",
    document_front: null as File | null,
    document_back: null as File | null,
  });
  const [previewFront, setPreviewFront] = useState<string | null>(null);
  const [previewBack, setPreviewBack] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("documents");

  useEffect(() => {
    if (user) {
      fetchKYCData();
    }
  }, [user]);

  const fetchKYCData = async () => {
    setLoading(true);
    try {
      // Fetch KYC documents
      const { data: docs, error: docsError } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (docsError) throw docsError;
      setDocuments(docs || []);
      
      // Fetch seller verification status
      const { data: verif, error: verifError } = await supabase
        .from("seller_verification")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (verifError && verifError.code !== 'PGRST116') throw verifError;
      setVerification(verif as SellerVerification);
      
    } catch (error) {
      console.error("Error fetching KYC data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (type: 'front' | 'back', file: File | null) => {
    if (!file) return;
    
    if (type === 'front') {
      setFormData({ ...formData, document_front: file });
      const reader = new FileReader();
      reader.onload = (e) => setPreviewFront(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFormData({ ...formData, document_back: file });
      const reader = new FileReader();
      reader.onload = (e) => setPreviewBack(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadDocument = async () => {
    if (!formData.document_front) {
      toast.error("Please select a document to upload");
      return;
    }

    setUploading(true);
    try {
      // Convert to base64
      const readerFront = new FileReader();
      const frontBase64 = await new Promise<string>((resolve) => {
        readerFront.onload = () => resolve(readerFront.result as string);
        readerFront.readAsDataURL(formData.document_front!);
      });
      
      let backBase64 = null;
      if (formData.document_back) {
        const readerBack = new FileReader();
        backBase64 = await new Promise<string>((resolve) => {
          readerBack.onload = () => resolve(readerBack.result as string);
          readerBack.readAsDataURL(formData.document_back!);
        });
      }
      
      const { error } = await supabase.from("kyc_documents").insert({
        user_id: user?.id,
        document_type: formData.document_type,
        document_number: formData.document_number,
        document_front_url: frontBase64,
        document_back_url: backBase64,
        status: "pending"
      });
      
      if (error) throw error;
      
      toast.success("Document uploaded successfully! Awaiting verification.");
      resetForm();
      fetchKYCData();
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setShowUploadForm(false);
    setFormData({
      document_type: "national_id",
      document_number: "",
      document_front: null,
      document_back: null,
    });
    setPreviewFront(null);
    setPreviewBack(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getVerificationStatusBadge = () => {
    if (!verification) return null;
    
    switch (verification.verification_status) {
      case "verified":
        return <Badge className="bg-green-500/10 text-green-600 text-lg py-2 px-4"><CheckCircle className="w-5 h-5 mr-2" /> Fully Verified Seller</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 text-lg py-2 px-4"><Clock className="w-5 h-5 mr-2" /> Verification Pending</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500/10 text-orange-600 text-lg py-2 px-4"><AlertCircle className="w-5 h-5 mr-2" /> Account Suspended</Badge>;
      case "banned":
        return <Badge className="bg-red-500/10 text-red-600 text-lg py-2 px-4"><XCircle className="w-5 h-5 mr-2" /> Account Banned</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-600 text-lg py-2 px-4"><Shield className="w-5 h-5 mr-2" /> Not Verified</Badge>;
    }
  };

  const getVerificationProgress = () => {
    if (!verification) return 0;
    const steps: Record<string, number> = {
      unverified: 0,
      pending: 25,
      verified: 100,
      suspended: 0,
      banned: 0
    };
    return steps[verification.verification_status] || 0;
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading verification status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Header */}
      <Card className="glass-strong bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-12 h-12 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Seller Verification</h2>
                <p className="text-muted-foreground">Verify your identity to unlock all seller features</p>
              </div>
            </div>
            {getVerificationStatusBadge()}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Verification Progress</span>
              <span>{getVerificationProgress()}%</span>
            </div>
            <Progress value={getVerificationProgress()} className="h-2" />
          </div>
          {verification?.verification_status === "suspended" && (
            <div className="mt-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <p className="text-orange-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <strong>Account Suspended:</strong> {verification.suspension_reason}
              </p>
              {verification.suspension_end_date && (
                <p className="text-sm text-orange-600 mt-2">
                  Suspension ends: {new Date(verification.suspension_end_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {verification?.verification_status === "banned" && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <strong>Account Banned:</strong> {verification.banned_reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-strong w-full">
          <TabsTrigger value="documents" className="flex-1 gap-2">
            <FileText className="w-4 h-4" />
            KYC Documents
          </TabsTrigger>
          <TabsTrigger value="business" className="flex-1 gap-2">
            <Building2 className="w-4 h-4" />
            Business Info
          </TabsTrigger>
          <TabsTrigger value="status" className="flex-1 gap-2">
            <UserCheck className="w-4 h-4" />
            Verification Status
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="glass-strong">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Uploaded Documents
                </CardTitle>
                {verification?.verification_status !== "banned" && verification?.verification_status !== "suspended" && (
                  <Button onClick={() => setShowUploadForm(!showUploadForm)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Form */}
              {showUploadForm && (
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <h3 className="font-semibold mb-4">Upload New Document</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Document Type</Label>
                        <Select
                          value={formData.document_type}
                          onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Document Number (Optional)</Label>
                        <Input
                          placeholder="e.g., ID card number"
                          value={formData.document_number}
                          onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Front Side / Document Image *</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="front-upload"
                            onChange={(e) => handleFileSelect('front', e.target.files?.[0] || null)}
                          />
                          <label htmlFor="front-upload" className="cursor-pointer block">
                            {previewFront ? (
                              <div className="relative">
                                <img src={previewFront} alt="Front preview" className="max-h-32 mx-auto rounded" />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => {
                                    setFormData({ ...formData, document_front: null });
                                    setPreviewFront(null);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="py-4">
                                <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to upload front side</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Back Side (Optional)</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="back-upload"
                            onChange={(e) => handleFileSelect('back', e.target.files?.[0] || null)}
                          />
                          <label htmlFor="back-upload" className="cursor-pointer block">
                            {previewBack ? (
                              <div className="relative">
                                <img src={previewBack} alt="Back preview" className="max-h-32 mx-auto rounded" />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => {
                                    setFormData({ ...formData, document_back: null });
                                    setPreviewBack(null);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="py-4">
                                <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to upload back side</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={resetForm}>Cancel</Button>
                      <Button onClick={uploadDocument} disabled={uploading || !formData.document_front}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload Document
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No documents uploaded yet</p>
                  <p className="text-sm">Upload your identification documents for verification</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/5">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">
                            {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                          </p>
                          {doc.document_number && (
                            <p className="text-xs text-muted-foreground">Number: {doc.document_number}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <Button variant="ghost" size="sm" onClick={() => window.open(doc.document_front_url, '_blank')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Info Tab */}
        <TabsContent value="business">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Business Registration Number</Label>
                    <p className="mt-1 font-medium">{verification?.business_reg_number || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Tax ID (VAT/TIN)</Label>
                    <p className="mt-1 font-medium">{verification?.tax_id || "Not provided"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Business Address</Label>
                    <p className="mt-1 font-medium">{verification?.business_address || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Business Phone</Label>
                    <p className="mt-1 font-medium">{verification?.business_phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Business Email</Label>
                    <p className="mt-1 font-medium">{verification?.business_email || "Not provided"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Website</Label>
                    <p className="mt-1 font-medium">{verification?.website_url || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Verification Status Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Verification Level</Label>
                    <p className="mt-1 font-medium capitalize">{verification?.verification_level || "Basic"}</p>
                  </div>
                  <div>
                    <Label>Verification Date</Label>
                    <p className="mt-1 font-medium">
                      {verification?.verification_date ? new Date(verification.verification_date).toLocaleDateString() : "Not verified"}
                    </p>
                  </div>
                </div>
                {verification?.notes && (
                  <div>
                    <Label>Admin Notes</Label>
                    <p className="mt-1 text-muted-foreground">{verification.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KYCVerification;