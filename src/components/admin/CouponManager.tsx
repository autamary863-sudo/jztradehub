import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Copy, CheckCircle, Clock, XCircle, Tag, Percent, DollarSign, Loader2, RefreshCw } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  minimum_order: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CouponManager = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    minimum_order: "",
    maximum_discount: "",
    usage_limit: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      const response = await fetch(`${API_URL}/api/admin/coupons`).catch(() => null);
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setCoupons(data.data);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to direct Supabase query
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCoupons(data || []);
      
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to load coupons");
      // Set empty array on error
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        minimum_order: parseFloat(formData.minimum_order) || 0,
        maximum_discount: formData.maximum_discount ? parseFloat(formData.maximum_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
      };
      
      // Try API first
      const response = await fetch(`${API_URL}/api/admin/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponData),
      }).catch(() => null);
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Coupon created successfully!");
          resetForm();
          fetchCoupons();
          setSaving(false);
          return;
        }
      }
      
      // Fallback to direct Supabase insert
      const { data, error } = await supabase
        .from("coupons")
        .insert(couponData)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Coupon created successfully!");
      resetForm();
      fetchCoupons();
      
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Coupon code already exists");
      } else {
        toast.error(error.message || "Failed to create coupon");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCoupon) return;
    
    setSaving(true);
    try {
      // Try API first
      const response = await fetch(`${API_URL}/api/admin/coupons/${selectedCoupon.id}`, {
        method: "DELETE",
      }).catch(() => null);
      
      if (response && response.ok) {
        toast.success("Coupon deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedCoupon(null);
        fetchCoupons();
        setSaving(false);
        return;
      }
      
      // Fallback to direct Supabase delete
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", selectedCoupon.id);
      
      if (error) throw error;
      
      toast.success("Coupon deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedCoupon(null);
      fetchCoupons();
      
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      toast.error(error.message || "Failed to delete coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      // Try API first
      const response = await fetch(`${API_URL}/api/admin/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      }).catch(() => null);
      
      if (response && response.ok) {
        toast.success(`Coupon ${!coupon.is_active ? "activated" : "deactivated"}`);
        fetchCoupons();
        return;
      }
      
      // Fallback to direct Supabase update
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);
      
      if (error) throw error;
      
      toast.success(`Coupon ${!coupon.is_active ? "activated" : "deactivated"}`);
      fetchCoupons();
      
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      toast.error(error.message || "Failed to update coupon");
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
  };

  const resetForm = () => {
    setDialogOpen(false);
    setSelectedCoupon(null);
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      minimum_order: "",
      maximum_discount: "",
      usage_limit: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });
  };

  const openDeleteDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (coupon: Coupon) => {
    const isExpired = coupon.end_date && new Date(coupon.end_date) < new Date();
    const isActive = coupon.is_active && !isExpired;
    
    if (isActive) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>;
    }
    if (isExpired) {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Expired</Badge>;
    }
    return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30">Inactive</Badge>;
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}% off`;
    }
    return `₦${coupon.discount_value.toLocaleString()} off`;
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading coupons...</p>
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
                <Tag className="w-6 h-6 text-primary" />
                Coupon Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage discount coupons for your customers
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchCoupons}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Tag className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Coupons Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first coupon to start offering discounts to customers
              </p>
              <Button onClick={() => setDialogOpen(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Coupon
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Discount</TableHead>
                    <TableHead className="font-semibold">Min. Order</TableHead>
                    <TableHead className="font-semibold">Usage</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded font-mono text-sm font-semibold">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => copyCouponCode(coupon.code)}
                            className="p-1 rounded hover:bg-primary/10 transition-colors"
                            title="Copy coupon code"
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {coupon.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {coupon.discount_type === "percentage" ? (
                            <Percent className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <DollarSign className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span className="font-medium">{getDiscountDisplay(coupon)}</span>
                        </div>
                        {coupon.maximum_discount && coupon.discount_type === "percentage" && (
                          <span className="text-xs text-muted-foreground">
                            Max ₦{coupon.maximum_discount.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.minimum_order > 0 ? (
                          <span>₦{coupon.minimum_order.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">No minimum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {coupon.used_count} used
                          </span>
                          {coupon.usage_limit && (
                            <span className="text-xs text-muted-foreground">
                              Limit: {coupon.usage_limit}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(coupon)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActive(coupon)}
                            className="h-8 px-2"
                          >
                            {coupon.is_active ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(coupon)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Create/Edit Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedCoupon ? "Edit Coupon" : "Create New Coupon"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Coupon Code *</Label>
              <Input
                placeholder="e.g., SAVE20"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="uppercase font-mono"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">Only letters and numbers, no spaces</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                placeholder="Describe this coupon (e.g., '10% off your first order')"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Discount Type *</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {formData.discount_type === "percentage" ? "Discount (%) *" : "Discount (₦) *"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step={formData.discount_type === "percentage" ? "1" : "100"}
                  placeholder={formData.discount_type === "percentage" ? "10" : "500"}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Minimum Order (₦)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={formData.minimum_order}
                  onChange={(e) => setFormData({ ...formData, minimum_order: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Minimum order amount to apply coupon</p>
              </div>
              {formData.discount_type === "percentage" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Maximum Discount (₦)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Optional"
                    value={formData.maximum_discount}
                    onChange={(e) => setFormData({ ...formData, maximum_discount: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Max discount amount for percentage coupons</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Usage Limit</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Maximum number of times this coupon can be used</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Expiry Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-semibold">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive coupons won't work for customers</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {selectedCoupon ? "Update Coupon" : "Create Coupon"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Delete Coupon</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center">
              Are you sure you want to delete coupon <br />
              <span className="font-mono font-bold text-primary">{selectedCoupon?.code}</span>?
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Coupon
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CouponManager;