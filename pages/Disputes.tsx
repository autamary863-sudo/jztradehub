import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Dispute {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
  orders: {
    products: {
      title: string;
    };
  };
}

export default function Disputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDisputes();
    }
  }, [user]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          orders (
            products (title)
          )
        `)
        .eq("raised_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch disputes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Disputes</h1>

      {disputes.length === 0 ? (
        <p className="text-muted-foreground">No disputes found.</p>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card key={dispute.id} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {dispute.orders.products.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Order ID: {dispute.order_id}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Reason:</p>
                  <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Status:</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded ${
                      dispute.status === "resolved"
                        ? "bg-green-100 text-green-800"
                        : dispute.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {dispute.status}
                  </span>
                </div>

                {dispute.resolution && (
                  <div>
                    <p className="text-sm font-medium">Resolution:</p>
                    <p className="text-sm text-muted-foreground">{dispute.resolution}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Created: {new Date(dispute.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
