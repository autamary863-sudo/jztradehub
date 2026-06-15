import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, ShoppingCart, Flame, TrendingUp } from "lucide-react";

interface FlashSale {
  id: string;
  product_id: string;
  original_price: number;
  sale_price: number;
  start_time: string;
  end_time: string;
  stock_limit: number | null;
  sold_count: number;
  products: {
    id: string;
    title: string;
    image_url: string | null;
    category: string;
  };
}

const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-destructive animate-pulse" />
      <div className="flex gap-1 font-mono text-sm font-bold">
        <span className="bg-gradient-to-br from-destructive to-orange-500 text-white px-2 py-1 rounded-lg shadow-lg">
          {String(timeLeft.hours).padStart(2, "0")}
        </span>
        <span className="text-destructive font-bold">:</span>
        <span className="bg-gradient-to-br from-destructive to-orange-500 text-white px-2 py-1 rounded-lg shadow-lg">
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-destructive font-bold">:</span>
        <span className="bg-gradient-to-br from-destructive to-orange-500 text-white px-2 py-1 rounded-lg shadow-lg">
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
};

const FlashSales = () => {
  const navigate = useNavigate();
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const fetchFlashSales = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("flash_sales")
        .select(`
          id,
          product_id,
          original_price,
          sale_price,
          start_time,
          end_time,
          stock_limit,
          sold_count,
          products (
            id,
            title,
            image_url,
            category
          )
        `)
        .eq("is_active", true)
        .lte("start_time", now)
        .gte("end_time", now)
        .order("end_time", { ascending: true });

      if (error) throw error;
      setFlashSales((data as unknown as FlashSale[]) || []);
    } catch (error) {
      console.error("Error fetching flash sales:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || flashSales.length === 0) return null;

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-orange-500/5 to-destructive/5" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive via-orange-500 to-destructive" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-destructive via-orange-500 to-destructive" />
      
      {/* Animated flames */}
      <div className="absolute top-4 left-10 text-destructive/20 animate-bounce">
        <Flame className="w-12 h-12" />
      </div>
      <div className="absolute top-4 right-10 text-orange-500/20 animate-bounce" style={{ animationDelay: '0.5s' }}>
        <Flame className="w-10 h-10" />
      </div>
      
      <div className="container px-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-destructive to-orange-500 shadow-lg shadow-destructive/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 bg-destructive/50 rounded-2xl blur-xl animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl sm:text-4xl font-black">
                  <span className="bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
                    Flash Sales
                  </span>
                </h2>
                <TrendingUp className="w-6 h-6 text-destructive animate-pulse" />
              </div>
              <p className="text-muted-foreground font-medium">⚡ Limited time offers - Grab them fast!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/marketplace?flash=true")}
            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white transition-all"
          >
            View All Deals
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {flashSales.slice(0, 4).map((sale, index) => {
            const discount = Math.round(((sale.original_price - sale.sale_price) / sale.original_price) * 100);
            const stockRemaining = sale.stock_limit ? sale.stock_limit - sale.sold_count : null;

            return (
              <Card
                key={sale.id}
                className="overflow-hidden group hover:shadow-2xl hover:shadow-destructive/20 transition-all duration-500 border-2 border-destructive/20 hover:border-destructive/50 hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {sale.products?.image_url ? (
                      <img
                        src={sale.products.image_url}
                        alt={sale.products.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <ShoppingCart className="w-16 h-16 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Discount Badge */}
                  <Badge className="absolute top-3 left-3 bg-gradient-to-r from-destructive to-orange-500 text-white font-bold text-sm px-3 py-1 shadow-lg animate-pulse">
                    🔥 -{discount}%
                  </Badge>
                  
                  {/* Stock Warning */}
                  {stockRemaining !== null && stockRemaining <= 10 && (
                    <Badge className="absolute top-3 right-3 bg-amber-500 text-white font-bold shadow-lg">
                      Only {stockRemaining} left!
                    </Badge>
                  )}
                  
                  {/* Hot badge overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                
                <CardContent className="p-5 space-y-4">
                  <CountdownTimer endTime={sale.end_time} />
                  
                  <h3 className="font-bold text-lg truncate group-hover:text-destructive transition-colors">
                    {sale.products?.title}
                  </h3>
                  
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-black bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
                      ₦{sale.sale_price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      ₦{sale.original_price.toLocaleString()}
                    </span>
                  </div>
                  
                  {stockRemaining !== null && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>🔥 {sale.sold_count} sold</span>
                        <span>{stockRemaining} remaining</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-destructive via-orange-500 to-yellow-500 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min((sale.sold_count / (sale.stock_limit || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => navigate(`/checkout/${sale.product_id}?flashSaleId=${sale.id}&flashPrice=${sale.sale_price}`)}
                    className="w-full bg-gradient-to-r from-destructive to-orange-500 hover:from-destructive/90 hover:to-orange-500/90 text-white font-bold shadow-lg hover:shadow-destructive/30 transition-all"
                    disabled={stockRemaining === 0}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {stockRemaining === 0 ? "Sold Out" : "Buy Now"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlashSales;