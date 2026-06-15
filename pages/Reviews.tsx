// src/pages/Reviews.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";

interface Order {
  id: string;
  product_id: string;
  seller_id: string;
  status: string;
  product?: {
    id: string;
    title: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  product_id: string;
}

export default function Reviews() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchOrdersAndReviews();
    }
  }, [user]);

  const fetchOrdersAndReviews = async () => {
    try {
      setLoading(true);
      // Fetch completed orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user?.id)
        .eq("status", "completed");

      if (ordersError) throw ordersError;

      // Fetch products for these orders
      const productIds = [...new Set(ordersData?.map(o => o.product_id) || [])];
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, title")
          .in("id", productIds);

        const productMap = new Map(products?.map(p => [p.id, p]) || []);
        
        const ordersWithProducts = (ordersData || []).map(order => ({
          ...order,
          product: productMap.get(order.product_id)
        }));
        setOrders(ordersWithProducts);
      } else {
        setOrders([]);
      }

      // Fetch existing reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("buyer_id", user?.id);

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders and reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from("reviews").insert({
        order_id: selectedOrder.id,
        product_id: selectedOrder.product_id,
        buyer_id: user?.id,
        seller_id: selectedOrder.seller_id,
        rating,
        comment,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review submitted successfully",
      });

      setSelectedOrder(null);
      setRating(5);
      setComment("");
      fetchOrdersAndReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ordersNeedingReviews = orders.filter(
    (order) => !reviews.some((review) => review.product_id === order.product_id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Reviews</h1>

      {selectedOrder ? (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Review: {selectedOrder.product?.title}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        value <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Comment (Optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitReview} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <h2 className="text-xl font-semibold mb-4">Orders Needing Reviews</h2>
      {ordersNeedingReviews.length === 0 ? (
        <p className="text-muted-foreground">No orders need reviews.</p>
      ) : (
        <div className="grid gap-4">
          {ordersNeedingReviews.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{order.product?.title}</h3>
                  <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
                </div>
                <Button onClick={() => setSelectedOrder(order)}>Leave Review</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4 mt-8">My Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={`h-5 w-5 ${
                      value <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm">{review.comment}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}