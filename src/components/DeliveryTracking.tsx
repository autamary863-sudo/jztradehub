import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  MapPin,
  Calendar,
  Clock,
  Building,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface DeliveryInfo {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  delivery_option: string;
  pickup_station: string | null;
  estimated_delivery: string | null;
  current_location: string | null;
  status_history: Array<{
    status: string;
    location: string;
    timestamp: string;
  }>;
}

interface DeliveryTrackingProps {
  orderId: string;
  isSeller?: boolean;
}

const CARRIERS = [
  "GIG Logistics",
  "DHL",
  "FedEx",
  "Kwik Delivery",
  "ABC Logistics",
  "Jumia Logistics",
];

const DELIVERY_OPTIONS = [
  { value: "standard", label: "Standard Delivery (3-5 days)" },
  { value: "express", label: "Express Delivery (1-2 days)" },
  { value: "same_day", label: "Same Day Delivery" },
  { value: "pickup", label: "Pickup Station" },
];

const PICKUP_STATIONS = [
  "Lagos - Ikeja Station",
  "Lagos - Lekki Station",
  "Lagos - Victoria Island",
  "Abuja - Wuse Station",
  "Abuja - Garki Station",
  "Port Harcourt - GRA Station",
  "Ibadan - Bodija Station",
  "Kano - Sabon Gari Station",
];

const DeliveryTracking = ({ orderId, isSeller = false }: DeliveryTrackingProps) => {
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: "",
    carrier: "",
    delivery_option: "standard",
    pickup_station: "",
    estimated_delivery: "",
    current_location: "",
  });

  useEffect(() => {
    fetchDeliveryInfo();
  }, [orderId]);

  const fetchDeliveryInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_tracking")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const deliveryData: DeliveryInfo = {
          ...data,
          status_history: (data.status_history as DeliveryInfo['status_history']) || [],
        };
        setDeliveryInfo(deliveryData);
        setFormData({
          tracking_number: deliveryData.tracking_number || "",
          carrier: deliveryData.carrier || "",
          delivery_option: data.delivery_option || "standard",
          pickup_station: data.pickup_station || "",
          estimated_delivery: data.estimated_delivery || "",
          current_location: data.current_location || "",
        });
      }
    } catch (error) {
      console.error("Error fetching delivery info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const trackingData = {
        order_id: orderId,
        tracking_number: formData.tracking_number || null,
        carrier: formData.carrier || null,
        delivery_option: formData.delivery_option,
        pickup_station: formData.delivery_option === "pickup" ? formData.pickup_station : null,
        estimated_delivery: formData.estimated_delivery || null,
        current_location: formData.current_location || null,
      };

      if (deliveryInfo) {
        const { error } = await supabase
          .from("delivery_tracking")
          .update(trackingData)
          .eq("id", deliveryInfo.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("delivery_tracking")
          .insert(trackingData);

        if (error) throw error;
      }

      toast.success("Delivery info updated");
      setEditing(false);
      fetchDeliveryInfo();
    } catch (error: any) {
      toast.error(error.message || "Failed to update delivery info");
    }
  };

  const updateLocation = async (location: string, status: string) => {
    if (!deliveryInfo) return;

    try {
      const newHistory = [
        ...(deliveryInfo.status_history || []),
        {
          status,
          location,
          timestamp: new Date().toISOString(),
        },
      ];

      const { error } = await supabase
        .from("delivery_tracking")
        .update({
          current_location: location,
          status_history: newHistory,
        })
        .eq("id", deliveryInfo.id);

      if (error) throw error;
      toast.success("Location updated");
      fetchDeliveryInfo();
    } catch (error: any) {
      toast.error(error.message || "Failed to update location");
    }
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedOption = DELIVERY_OPTIONS.find((o) => o.value === formData.delivery_option);

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Delivery Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSeller && !editing ? (
          <>
            {deliveryInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Carrier</p>
                    <p className="font-medium">{deliveryInfo.carrier || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-medium">
                      {deliveryInfo.tracking_number || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Option</p>
                    <Badge variant="secondary">{selectedOption?.label}</Badge>
                  </div>
                  {deliveryInfo.pickup_station && (
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup Station</p>
                      <p className="font-medium">{deliveryInfo.pickup_station}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                    <p className="font-medium">
                      {deliveryInfo.estimated_delivery
                        ? new Date(deliveryInfo.estimated_delivery).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Location</p>
                    <p className="font-medium">{deliveryInfo.current_location || "Not tracked"}</p>
                  </div>
                </div>
                <Button onClick={() => setEditing(true)}>Edit Delivery Info</Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No delivery info added yet</p>
                <Button onClick={() => setEditing(true)}>Add Delivery Info</Button>
              </div>
            )}
          </>
        ) : isSeller && editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Option</Label>
                <Select
                  value={formData.delivery_option}
                  onValueChange={(v) => setFormData((p) => ({ ...p, delivery_option: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.delivery_option === "pickup" && (
                <div className="space-y-2">
                  <Label>Pickup Station</Label>
                  <Select
                    value={formData.pickup_station}
                    onValueChange={(v) => setFormData((p) => ({ ...p, pickup_station: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {PICKUP_STATIONS.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(v) => setFormData((p) => ({ ...p, carrier: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => setFormData((p) => ({ ...p, tracking_number: e.target.value }))}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Delivery</Label>
                <Input
                  type="date"
                  value={formData.estimated_delivery}
                  onChange={(e) => setFormData((p) => ({ ...p, estimated_delivery: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Location</Label>
                <Input
                  value={formData.current_location}
                  onChange={(e) => setFormData((p) => ({ ...p, current_location: e.target.value }))}
                  placeholder="e.g., Lagos Sorting Center"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          // Buyer view
          <>
            {deliveryInfo ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {deliveryInfo.carrier && (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span>{deliveryInfo.carrier}</span>
                    </div>
                  )}
                  {deliveryInfo.tracking_number && (
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono">{deliveryInfo.tracking_number}</span>
                    </div>
                  )}
                  {deliveryInfo.estimated_delivery && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Est. {new Date(deliveryInfo.estimated_delivery).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <Badge variant="secondary" className="text-sm">
                  {DELIVERY_OPTIONS.find((o) => o.value === deliveryInfo.delivery_option)?.label}
                </Badge>

                {deliveryInfo.pickup_station && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Building className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup Station</p>
                      <p className="font-medium">{deliveryInfo.pickup_station}</p>
                    </div>
                  </div>
                )}

                {deliveryInfo.current_location && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Location</p>
                      <p className="font-medium">{deliveryInfo.current_location}</p>
                    </div>
                  </div>
                )}

                {/* Status History */}
                {deliveryInfo.status_history && deliveryInfo.status_history.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium">Tracking History</h4>
                    <div className="space-y-3">
                      {deliveryInfo.status_history
                        .slice()
                        .reverse()
                        .map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {idx === 0 ? (
                                <CheckCircle className="w-4 h-4 text-primary" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{item.status}</p>
                              <p className="text-sm text-muted-foreground">{item.location}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Delivery information will be available once the seller ships your order.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryTracking;
