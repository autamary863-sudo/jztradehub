import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AlertTriangle, CheckCircle, Clock, XCircle, Eye, CheckCheck } from "lucide-react";

interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  order?: {
    total_amount: number;
    products?: { title: string };
  };
  raiser?: { display_name: string };
}

const DisputesManager = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("disputes")
      .select("*, orders(total_amount, products(title))")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch disputes");
      return;
    }

    // Fetch raiser profiles
    if (data && data.length > 0) {
      const raiserIds = [...new Set(data.map((d) => d.raised_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", raiserIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.id, p.display_name]) || []
      );

      const disputesWithProfiles = data.map((dispute) => ({
        ...dispute,
        order: dispute.orders,
        raiser: { display_name: profileMap.get(dispute.raised_by) || "Unknown" },
      }));

      setDisputes(disputesWithProfiles);
    } else {
      setDisputes([]);
    }
    setLoading(false);
  };

  const handleResolve = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolution(dispute.resolution || "");
    setDialogOpen(true);
  };

  const submitResolution = async (status: "resolved" | "rejected") => {
    if (!selectedDispute) return;

    const { error } = await supabase
      .from("disputes")
      .update({
        status,
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selectedDispute.id);

    if (error) {
      toast.error("Failed to update dispute");
      return;
    }

    toast.success(`Dispute ${status}`);
    setDialogOpen(false);
    setSelectedDispute(null);
    setResolution("");
    fetchDisputes();
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
    const pendingDisputes = disputes.filter((d) => d.status === "pending");
    if (selectedIds.size === pendingDisputes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingDisputes.map((d) => d.id)));
    }
  };

  const handleBulkAction = async (status: "resolved" | "rejected") => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }

    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from("disputes")
      .update({
        status,
        resolution: `Bulk ${status} by admin`,
        resolved_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update disputes");
    } else {
      toast.success(`${ids.length} dispute(s) ${status}`);
      setSelectedIds(new Set());
      fetchDisputes();
    }
    setBulkLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      pending: {
        className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
        icon: Clock,
      },
      resolved: {
        className: "bg-green-500/10 text-green-600 border-green-500/30",
        icon: CheckCircle,
      },
      rejected: {
        className: "bg-red-500/10 text-red-600 border-red-500/30",
        icon: XCircle,
      },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge className={`gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-primary" />
          Disputes Management
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
                variant="outline"
                onClick={() => handleBulkAction("rejected")}
                disabled={bulkLoading}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkAction("resolved")}
                disabled={bulkLoading}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Resolve All
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading disputes...
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No disputes found
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === disputes.filter((d) => d.status === "pending").length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Raised By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id} className="border-border/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(dispute.id)}
                        onCheckedChange={() => toggleSelect(dispute.id)}
                        disabled={dispute.status !== "pending"}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {dispute.order?.products?.title || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ₦{Number(dispute.order?.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{dispute.raiser?.display_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {dispute.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(dispute.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(dispute)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {dispute.status === "pending" ? "Resolve" : "View"}
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
              <DialogTitle>Dispute Details</DialogTitle>
            </DialogHeader>
            {selectedDispute && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Reason
                  </p>
                  <p className="mt-1">{selectedDispute.reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Resolution
                  </p>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Enter resolution details..."
                    disabled={selectedDispute.status !== "pending"}
                    className="glass"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {selectedDispute?.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => submitResolution("rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button onClick={() => submitResolution("resolved")}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Resolve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DisputesManager;
