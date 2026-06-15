import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
  };
}

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchWishlist();
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          id,
          product_id,
          products (
            id,
            title,
            price,
            image_url,
            stock_quantity
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data as unknown as WishlistItem[]) || []);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Removed from wishlist");
      fetchWishlist();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove item");
    }
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-destructive" />
          My Wishlist
          {items.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({items.length} items)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
            <Button onClick={() => navigate("/marketplace")}>
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                  {item.products?.image_url ? (
                    <img
                      src={item.products.image_url}
                      alt={item.products.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.products?.title}</h4>
                  <p className="text-lg font-bold text-primary">
                    ₦{item.products?.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.products?.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/checkout/${item.product_id}`)}
                    disabled={item.products?.stock_quantity === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeFromWishlist(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Wishlist;

// Hook to toggle wishlist
export const useWishlist = () => {
  const { user } = useAuth();

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please sign in to add to wishlist");
      return;
    }

    // Check if already in wishlist
    const { data: existing } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", existing.id);

      if (!error) toast.success("Removed from wishlist");
      return false;
    } else {
      const { error } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id, product_id: productId });

      if (!error) toast.success("Added to wishlist");
      return true;
    }
  };

  const isInWishlist = async (productId: string) => {
    if (!user) return false;

    const { data } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    return !!data;
  };

  return { toggleWishlist, isInWishlist };
};
