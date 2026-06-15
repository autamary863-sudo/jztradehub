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
import { RotateCcw, CheckCircle, Clock, XCircle, Eye, CheckCheck } from "lucide-react";

interface ReturnRequest {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  buyer?: { display_name: string };
  seller?: { display_name: string };
}

const ReturnsManager = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("return_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch return requests");
      return;
    }

    if (data && data.length > 0) {
      const userIds = [
        ...new Set([...data.map((r) => r.buyer_id), ...data.map((r) => r.seller_id)]),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.id, p.display_name]) || []
      );

      const returnsWithProfiles = data.map((ret) => ({
        ...ret,
        buyer: { display_name: profileMap.get(ret.buyer_id) || "Unknown" },
        seller: { display_name: profileMap.get(ret.seller_id) || "Unknown" },
      }));

      setReturns(returnsWithProfiles);
    } else {
      setReturns([]);
    }
    setLoading(false);
  };

  const handleReview = (returnRequest: ReturnRequest) => {
    setSelectedReturn(returnRequest);
    setAdminNotes(returnRequest.admin_notes || "");
    setDialogOpen(true);
  };

  const submitDecision = async (status: "approved" | "rejected") => {
    if (!selectedReturn) return;

    const { error } = await supabase
      .from("return_requests")
      .update({
        status,
        admin_notes: adminNotes,
      })
      .eq("id", selectedReturn.id);

    if (error) {
      toast.error("Failed to update return request");
      return;
    }

    toast.success(`Return request ${status}`);
    setDialogOpen(false);
    setSelectedReturn(null);
    setAdminNotes("");
    fetchReturns();
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
    const pendingReturns = returns.filter((r) => r.status === "pending");
    if (selectedIds.size === pendingReturns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingReturns.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (status: "approved" | "rejected") => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }

    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from("return_requests")
      .update({ status, admin_notes: `Bulk ${status} by admin` })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update return requests");
    } else {
      toast.success(`${ids.length} return request(s) ${status}`);
      setSelectedIds(new Set());
      fetchReturns();
    }
    setBulkLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      pending: {
        className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
        icon: Clock,
      },
      approved: {
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
          <RotateCcw className="w-6 h-6 text-primary" />
          Returns Management
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
                onClick={() => handleBulkAction("approved")}
                disabled={bulkLoading}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Approve All
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading return requests...
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No return requests found
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
                        selectedIds.size === returns.filter((r) => r.status === "pending").length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow key={ret.id} className="border-border/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(ret.id)}
                        onCheckedChange={() => toggleSelect(ret.id)}
                        disabled={ret.status !== "pending"}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {ret.order_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{ret.buyer?.display_name}</TableCell>
                    <TableCell>{ret.seller?.display_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {ret.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(ret.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(ret)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {ret.status === "pending" ? "Review" : "View"}
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
              <DialogTitle>Return Request Details</DialogTitle>
            </DialogHeader>
            {selectedReturn && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Buyer
                    </p>
                    <p>{selectedReturn.buyer?.display_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Seller
                    </p>
                    <p>{selectedReturn.seller?.display_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Reason
                  </p>
                  <p className="mt-1">{selectedReturn.reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Admin Notes
                  </p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter admin notes..."
                    disabled={selectedReturn.status !== "pending"}
                    className="glass"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {selectedReturn?.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => submitDecision("rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button onClick={() => submitDecision("approved")}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
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

export default ReturnsManager;
