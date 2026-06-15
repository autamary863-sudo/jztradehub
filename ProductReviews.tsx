import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Upload, CheckCircle, User, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string;
  image_urls: string[];
  created_at: string;
  buyer_id: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
  is_verified?: boolean;
}

interface ProductReviewsProps {
  productId: string;
  sellerId: string;
}

const ProductReviews = ({ productId, sellerId }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: [0, 0, 0, 0, 0],
  });
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "", images: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [orderIdForReview, setOrderIdForReview] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
    if (user) checkCanReview();
  }, [productId, user]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const buyerIds = [...new Set(data?.map(r => r.buyer_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", buyerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const reviewsWithProfiles = (data || []).map(review => ({
        ...review,
        profiles: profileMap.get(review.buyer_id),
        is_verified: true, // All reviews require completed orders
      }));

      setReviews(reviewsWithProfiles);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Review[]) => {
    if (data.length === 0) {
      setStats({ average: 0, total: 0, distribution: [0, 0, 0, 0, 0] });
      return;
    }

    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;

    data.forEach((r) => {
      sum += r.rating;
      distribution[5 - r.rating]++;
    });

    setStats({
      average: sum / data.length,
      total: data.length,
      distribution,
    });
  };

  const checkCanReview = async () => {
    if (!user) return;

    // Check if user has a completed order for this product
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .eq("status", "completed");

    if (!orders || orders.length === 0) return;

    // Check if user already reviewed
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .single();

    if (!existingReview) {
      setCanReview(true);
      setOrderIdForReview(orders[0].id);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files).slice(0, 3)) {
        // Convert to base64 for storage (simplified approach)
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        uploadedUrls.push(base64);
      }

      setNewReview((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls].slice(0, 3),
      }));
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const submitReview = async () => {
    if (!user || !orderIdForReview) return;

    try {
      const { error } = await supabase.from("reviews").insert({
        order_id: orderIdForReview,
        product_id: productId,
        buyer_id: user.id,
        seller_id: sellerId,
        rating: newReview.rating,
        comment: newReview.comment,
        image_urls: newReview.images,
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      setShowForm(false);
      setNewReview({ rating: 5, comment: "", images: [] });
      setCanReview(false);
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    }
  };

  const StarRating = ({ rating, size = "default", interactive = false, onChange }: {
    rating: number;
    size?: "default" | "large";
    interactive?: boolean;
    onChange?: (rating: number) => void;
  }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => interactive && onChange?.(star)}
          disabled={!interactive}
          className={cn(!interactive && "cursor-default")}
        >
          <Star
            className={cn(
              size === "large" ? "w-8 h-8" : "w-4 h-4",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Customer Reviews</span>
          {canReview && (
            <Button onClick={() => setShowForm(true)}>Write a Review</Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary">{stats.average.toFixed(1)}</div>
            <StarRating rating={Math.round(stats.average)} />
            <p className="text-sm text-muted-foreground mt-1">
              {stats.total} {stats.total === 1 ? "review" : "reviews"}
            </p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star, idx) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm w-3">{star}</span>
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Progress
                  value={stats.total > 0 ? (stats.distribution[idx] / stats.total) * 100 : 0}
                  className="flex-1 h-2"
                />
                <span className="text-sm text-muted-foreground w-8">
                  {stats.distribution[idx]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Review Form */}
        {showForm && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your Rating</label>
                <div className="mt-1">
                  <StarRating
                    rating={newReview.rating}
                    size="large"
                    interactive
                    onChange={(r) => setNewReview((prev) => ({ ...prev, rating: r }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Your Review</label>
                <Textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Add Photos (Max 3)</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newReview.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img src={img} alt="" className="w-full h-full object-cover rounded" />
                      <button
                        onClick={() => setNewReview((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx),
                        }))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newReview.images.length < 3 && (
                    <label className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                    </label>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={submitReview}>Submit Review</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {review.profiles?.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.profiles?.display_name || "Anonymous"}</span>
                      {review.is_verified && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm mt-2">{review.comment}</p>
                    )}
                    {review.image_urls && review.image_urls.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.image_urls.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt=""
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductReviews;
