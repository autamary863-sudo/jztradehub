import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Truck, Package, MapPin, Calendar, Edit, CheckCheck } from "lucide-react";

interface DeliveryTracking {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  delivery_option: string;
  current_location: string | null;
  estimated_delivery: string | null;
  pickup_station: string | null;
  status_history: any[];
  created_at: string;
  order?: {
    products?: { title: string };
    buyer?: { display_name: string };
  };
}

const LogisticsManager = () => {
  const [deliveries, setDeliveries] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryTracking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: "",
    carrier: "",
    current_location: "",
    estimated_delivery: "",
    status: "processing",
  });
  const [bulkFormData, setBulkFormData] = useState({
    carrier: "",
    current_location: "",
    status: "",
  });

  const carriers = [
    "GIG Logistics",
    "DHL",
    "FedEx",
    "UPS",
    "GIGL",
    "Kwik Delivery",
    "Gokada",
    "Max.ng",
  ];

  const statusOptions = [
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "in_transit", label: "In Transit" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "ready_for_pickup", label: "Ready for Pickup" },
    { value: "picked_up", label: "Picked Up" },
  ];

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    
    const { data: trackingData, error } = await supabase
      .from("delivery_tracking")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch deliveries");
      setLoading(false);
      return;
    }

    if (trackingData && trackingData.length > 0) {
      // Fetch order details separately
      const orderIds = [...new Set(trackingData.map((d) => d.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id, buyer_id, products(title)")
        .in("id", orderIds);

      // Fetch buyer profiles
      const buyerIds = orders?.map((o) => o.buyer_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", buyerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);
      const orderMap = new Map(
        orders?.map((o) => [
          o.id,
          {
            products: o.products,
            buyer: { display_name: profileMap.get(o.buyer_id) || "Unknown" },
          },
        ]) || []
      );

      const deliveriesWithOrders = trackingData.map((delivery) => ({
        ...delivery,
        status_history: Array.isArray(delivery.status_history) 
          ? delivery.status_history 
          : [],
        order: orderMap.get(delivery.order_id),
      }));

      setDeliveries(deliveriesWithOrders);
    } else {
      setDeliveries([]);
    }
    setLoading(false);
  };

  const handleEdit = (delivery: DeliveryTracking) => {
    setSelectedDelivery(delivery);
    const latestStatus = delivery.status_history?.length > 0 
      ? delivery.status_history[delivery.status_history.length - 1]?.status 
      : "processing";
    setFormData({
      tracking_number: delivery.tracking_number || "",
      carrier: delivery.carrier || "",
      current_location: delivery.current_location || "",
      estimated_delivery: delivery.estimated_delivery || "",
      status: latestStatus || "processing",
    });
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedDelivery) return;

    const statusHistory = selectedDelivery.status_history || [];
    const newStatusEntry = {
      status: formData.status,
      timestamp: new Date().toISOString(),
      location: formData.current_location,
    };

    const { error } = await supabase
      .from("delivery_tracking")
      .update({
        tracking_number: formData.tracking_number || null,
        carrier: formData.carrier || null,
        current_location: formData.current_location || null,
        estimated_delivery: formData.estimated_delivery || null,
        status_history: [...statusHistory, newStatusEntry],
      })
      .eq("id", selectedDelivery.id);

    if (error) {
      toast.error("Failed to update delivery");
      return;
    }

    toast.success("Delivery updated successfully");
    setDialogOpen(false);
    setSelectedDelivery(null);
    fetchDeliveries();
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === deliveries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deliveries.map((d) => d.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }

    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    // Build update object with only filled fields
    const updates: Record<string, any> = {};
    if (bulkFormData.carrier) updates.carrier = bulkFormData.carrier;
    if (bulkFormData.current_location) updates.current_location = bulkFormData.current_location;

    if (Object.keys(updates).length === 0 && !bulkFormData.status) {
      toast.error("Please fill at least one field to update");
      setBulkLoading(false);
      return;
    }

    // For each delivery, update status history if status changed
    for (const id of ids) {
      const delivery = deliveries.find((d) => d.id === id);
      if (!delivery) continue;

      const updateData: Record<string, any> = { ...updates };

      if (bulkFormData.status) {
        const statusHistory = delivery.status_history || [];
        updateData.status_history = [
          ...statusHistory,
          {
            status: bulkFormData.status,
            timestamp: new Date().toISOString(),
            location: bulkFormData.current_location || delivery.current_location,
          },
        ];
      }

      await supabase.from("delivery_tracking").update(updateData).eq("id", id);
    }

    toast.success(`${ids.length} delivery(ies) updated`);
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
    setBulkFormData({ carrier: "", current_location: "", status: "" });
    fetchDeliveries();
    setBulkLoading(false);
  };

  const getStatusBadge = (statusHistory: any[]) => {
    const latestStatus = statusHistory?.length > 0 
      ? statusHistory[statusHistory.length - 1]?.status 
      : "processing";
    
    const statusColors: Record<string, string> = {
      processing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      shipped: "bg-purple-500/10 text-purple-600 border-purple-500/30",
      in_transit: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
      out_for_delivery: "bg-orange-500/10 text-orange-600 border-orange-500/30",
      delivered: "bg-green-500/10 text-green-600 border-green-500/30",
      ready_for_pickup: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
      picked_up: "bg-green-500/10 text-green-600 border-green-500/30",
    };

    return (
      <Badge className={statusColors[latestStatus] || statusColors.processing}>
        {latestStatus?.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          Logistics Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-4 mb-4 bg-primary/5 rounded-lg border border-primary/20">
            <span className="text-sm font-medium">
              {selectedIds.size} item(s) selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                disabled={bulkLoading}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Bulk Update
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading deliveries...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No deliveries found
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === deliveries.length && deliveries.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id} className="border-border/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(delivery.id)}
                        onCheckedChange={() => toggleSelect(delivery.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">
                          {delivery.order?.products?.title || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {delivery.order?.buyer?.display_name || "Unknown"}
                    </TableCell>
                    <TableCell>{delivery.carrier || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {delivery.tracking_number || "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(delivery.status_history)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[100px]">
                          {delivery.current_location || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {delivery.estimated_delivery ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(delivery.estimated_delivery).toLocaleDateString()}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(delivery)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Update Delivery</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={formData.tracking_number}
                    onChange={(e) =>
                      setFormData({ ...formData, tracking_number: e.target.value })
                    }
                    placeholder="Enter tracking number"
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carrier</Label>
                  <Select
                    value={formData.carrier}
                    onValueChange={(value) =>
                      setFormData({ ...formData, carrier: value })
                    }
                  >
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {carriers.map((carrier) => (
                        <SelectItem key={carrier} value={carrier}>
                          {carrier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Location</Label>
                  <Input
                    value={formData.current_location}
                    onChange={(e) =>
                      setFormData({ ...formData, current_location: e.target.value })
                    }
                    placeholder="e.g., Lagos Warehouse"
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Delivery</Label>
                  <Input
                    type="date"
                    value={formData.estimated_delivery}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_delivery: e.target.value })
                    }
                    className="glass"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                <Truck className="w-4 h-4 mr-1" />
                Update Delivery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Update Dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Bulk Update {selectedIds.size} Deliveries</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Only filled fields will be updated. Leave empty to skip.
              </p>
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select
                  value={bulkFormData.carrier}
                  onValueChange={(value) =>
                    setBulkFormData({ ...bulkFormData, carrier: value })
                  }
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select carrier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Location</Label>
                <Input
                  value={bulkFormData.current_location}
                  onChange={(e) =>
                    setBulkFormData({ ...bulkFormData, current_location: e.target.value })
                  }
                  placeholder="e.g., Lagos Warehouse (optional)"
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={bulkFormData.status}
                  onValueChange={(value) =>
                    setBulkFormData({ ...bulkFormData, status: value })
                  }
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select status (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkUpdate} disabled={bulkLoading}>
                <CheckCheck className="w-4 h-4 mr-1" />
                {bulkLoading ? "Updating..." : "Update All"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default LogisticsManager;
