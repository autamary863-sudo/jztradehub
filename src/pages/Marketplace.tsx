// src/pages/Marketplace.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingBag,
  Search,
  Filter,
  Star,
  TrendingUp,
  Flame,
  Truck,
  Shield,
  Heart,
  Eye,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
  Headphones,
  Loader2,
  X,
  Maximize2,
  CheckCircle,
  Award,
  Minus,
  Plus,
  CreditCard,
  Wallet
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  brand: string;
  stock_quantity: number;
  seller_id?: string;
}

// Hero slides with reliable images
const slides = [
  {
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=600&fit=crop",
    title: "Summer Sale Extravaganza",
    description: "Get up to 50% off on trending fashion items. Limited time offer!",
    badge: "Limited Time Offer",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=600&fit=crop",
    title: "Electronics Mega Deals",
    description: "Latest gadgets at unbeatable prices. Free shipping on orders over ₦50,000",
    badge: "Free Shipping",
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop",
    title: "Home & Living Collection",
    description: "Transform your space with our premium home decor collection",
    badge: "New Arrivals",
  },
  {
    image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=600&fit=crop",
    title: "Fashion Week Special",
    description: "Latest trends from top designers. Up to 40% off selected items",
    badge: "Trending Now",
  },
  {
    image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&h=600&fit=crop",
    title: "Tech Accessories",
    description: "Upgrade your gear with our premium accessories collection",
    badge: "Best Sellers",
  },
  {
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&h=600&fit=crop",
    title: "Fitness & Outdoors",
    description: "Get fit with our premium sports equipment. Limited time offers",
    badge: "Flash Sale",
  },
];

// 3D Quick View Modal
const QuickViewModal = ({ product, open, onClose, onAddToCart }: { 
  product: Product | null; 
  open: boolean; 
  onClose: () => void; 
  onAddToCart: (product: Product, quantity: number) => void;
}) => {
  const [quantity, setQuantity] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  if (!product) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setMousePosition({ x, y });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden glass-strong animate-in zoom-in-95 duration-300">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="grid md:grid-cols-2 gap-0">
            {/* 3D Image Section */}
            <div 
              ref={imageRef}
              className="relative bg-gradient-to-br from-muted to-muted/50 p-8 flex items-center justify-center min-h-[400px] overflow-hidden cursor-pointer"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => {
                setIsHovering(false);
                setMousePosition({ x: 0, y: 0 });
              }}
            >
              <div 
                className="relative transition-transform duration-300 ease-out"
                style={{
                  transform: isHovering ? `perspective(1000px) rotateX(${mousePosition.y}deg) rotateY(${mousePosition.x}deg) scale(1.05)` : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
                }}
              >
                <img
                  src={product.image_url || "https://placehold.co/500x500/e2e8f0/64748b?text=Product"}
                  alt={product.title}
                  className="w-full max-w-sm mx-auto object-contain rounded-2xl shadow-2xl"
                  style={{ maxHeight: '400px' }}
                />
                
                {isHovering && (
                  <div 
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at ${mousePosition.x * 5 + 50}% ${mousePosition.y * 5 + 50}%, rgba(59,130,246,0.3) 0%, transparent 70%)`,
                    }}
                  />
                )}
              </div>
              
              {isHovering && (
                <div className="absolute bottom-4 right-4 text-xs text-white/50 bg-black/50 px-2 py-1 rounded-full">
                  Drag to rotate 3D
                </div>
              )}
            </div>
            
            {/* Product Info Section */}
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                    Only {product.stock_quantity} left
                  </Badge>
                )}
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{product.title}</h2>
              
              <div className="flex items-center gap-3 mb-4">
                {product.brand && (
                  <Badge variant="outline" className="text-sm">{product.brand}</Badge>
                )}
                {product.category && (
                  <Badge variant="secondary" className="text-sm">{product.category}</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">5.0 (128 reviews)</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">Verified Seller</span>
              </div>
              
              <div className="mb-6">
                <span className="text-3xl md:text-4xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {product.description || "Experience premium quality with this amazing product. Designed for comfort and durability, it's perfect for everyday use."}
              </p>
              
              <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-muted/30">
                {product.stock_quantity > 0 ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-green-600">In Stock • {product.stock_quantity} units available</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-red-600">Out of Stock</span>
                  </>
                )}
              </div>
              
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 rounded-lg border hover:border-primary transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="p-2 rounded-lg border hover:border-primary transition-all"
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => onAddToCart(product, quantity)}
                  disabled={product.stock_quantity === 0}
                  className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-xl transition-all py-6 text-lg"
                  size="lg"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Add to Cart - ₦{(product.price * quantity).toLocaleString()}
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    window.location.href = `/checkout/${product.id}?quantity=${quantity}`;
                  }}
                  disabled={product.stock_quantity === 0}
                  variant="outline"
                  size="lg"
                  className="py-6"
                >
                  Buy Now
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                  <CreditCard className="w-3 h-3" />
                  Secure payment with Flutterwave
                  <Wallet className="w-3 h-3 ml-2" />
                  Wallet balance available
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hero Slide Component
const HeroSlide = ({ slide, isActive, onClick }: { slide: any; isActive: boolean; onClick: () => void }) => {
  return (
    <div
      className={`relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden cursor-pointer transition-all duration-700 ${
        isActive ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"
      }`}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent z-10" />
      <img
        src={slide.image}
        alt={slide.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 z-20 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{slide.badge}</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
            {slide.title}
          </h1>
          <p className="text-lg text-white/90 mb-8 max-w-lg">{slide.description}</p>
          <div className="flex gap-4">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:shadow-2xl transition-all group">
              <span>Shop Now</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Category Card Component
const CategoryCard = ({ category, onClick }: { category: any; onClick: () => void }) => (
  <div onClick={onClick} className="group relative cursor-pointer">
    <div className="relative glass-strong rounded-2xl p-6 text-center border border-white/10 group-hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
        <Package className="w-8 h-8 text-primary" />
      </div>
      <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{category.name}</h4>
      <p className="text-sm text-muted-foreground">{category.count}+ items</p>
    </div>
  </div>
);

// Product Card Component
const ProductCard = ({ product, onWishlist, isWishlisted, onQuickView }: { 
  product: Product; 
  onWishlist: (id: string) => void; 
  isWishlisted: boolean;
  onQuickView: (product: Product) => void;
}) => {
  const navigate = useNavigate();

  return (
    <div className="group relative">
      <Card className="relative glass-strong overflow-hidden border border-white/10 group-hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
        <div className="absolute top-3 left-3 z-10">
          {product.stock_quantity < 10 && product.stock_quantity > 0 && (
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
              Only {product.stock_quantity} left
            </Badge>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onWishlist(product.id);
          }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-primary/80 transition-all duration-300"
        >
          <Heart className={`w-4 h-4 transition-all ${isWishlisted ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>

        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          <img
            src={product.image_url || "https://placehold.co/400x400/e2e8f0/64748b?text=Product"}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
            >
              <Maximize2 className="w-4 h-4" />
              Quick View
            </Button>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            {product.category && (
              <Badge variant="outline" className="text-xs">{product.category}</Badge>
            )}
            {product.brand && (
              <Badge variant="secondary" className="text-xs">{product.brand}</Badge>
            )}
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">(128)</span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/checkout/${product.id}`)}
              disabled={product.stock_quantity === 0}
              className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy Now
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [flashSales, setFlashSales] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const categories = [
    { name: "Electronics", count: 120 },
    { name: "Fashion", count: 250 },
    { name: "Home & Living", count: 80 },
    { name: "Health & Beauty", count: 95 },
    { name: "Sports", count: 60 },
    { name: "Books", count: 45 },
  ];

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    sessionStorage.setItem('marketplace_scroll', window.scrollY.toString());
  }, []);

  // Restore scroll position
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('marketplace_scroll');
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', saveScrollPosition);
    return () => window.removeEventListener('beforeunload', saveScrollPosition);
  }, [saveScrollPosition]);

  // Auto-rotate slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data without showing loading screen
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchTrendingProducts(),
          fetchFlashSales(),
          user && fetchWishlist()
        ]);
      } finally {
        setLoading(false);
        setDataLoaded(true);
      }
    };
    
    fetchAllData();
  }, [selectedCategory, user]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchTrendingProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      setTrendingProducts(data || []);
    } catch (error) {
      console.error("Error fetching trending:", error);
    }
  };

  const fetchFlashSales = async () => {
    try {
      const { data } = await supabase
        .from("flash_sales")
        .select("*, products(*)")
        .eq("is_active", true)
        .gte("end_time", new Date().toISOString());
      
      if (data) {
        const flashProducts = data.map((sale: any) => ({
          ...sale.products,
          is_flash_sale: true,
          flash_price: sale.sale_price,
          flash_end: sale.end_time,
        }));
        setFlashSales(flashProducts);
      }
    } catch (error) {
      console.error("Error fetching flash sales:", error);
    }
  };

  const fetchWishlist = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", user.id);
      
      if (data) {
        setWishlist(new Set(data.map((w: any) => w.product_id)));
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      navigate("/auth");
      return;
    }

    try {
      if (wishlist.has(productId)) {
        await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
        setWishlist(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success("Removed from wishlist");
      } else {
        await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
        setWishlist(prev => new Set([...prev, productId]));
        toast.success("Added to wishlist");
      }
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item: any) => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + quantity, product.stock_quantity);
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
        quantity: quantity,
        stock_quantity: product.stock_quantity,
        seller_id: product.seller_id,
      });
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`Added ${quantity} ${product.title} to cart!`);
    setQuickViewOpen(false);
  };

  const filteredProducts = products.filter(product =>
    product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  // Show content immediately, no loading screen
  if (!dataLoaded && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Slideshow - always visible */}
          <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden mb-12">
            <div className="relative h-full rounded-3xl overflow-hidden bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse" />
          </div>
          
          {/* Categories skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 mb-16">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
          
          {/* Products skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-96 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      
      {/* 3D Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        onAddToCart={addToCart}
      />
      
      {/* Hero Slideshow */}
      <section className="relative px-4 pt-8 pb-4">
        <div className="container mx-auto max-w-7xl">
          <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden">
            {slides.map((slide, index) => (
              <HeroSlide
                key={index}
                slide={slide}
                isActive={index === currentSlide}
                onClick={() => navigate("/marketplace")}
              />
            ))}
            
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? "w-8 bg-primary" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="sticky top-20 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10 py-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for products, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-base rounded-xl glass-strong border-white/10 focus:border-primary/50"
              />
            </div>
            <Button variant="outline" className="gap-2 px-8">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Flash Sales */}
        {flashSales.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                    Flash Sales
                  </h2>
                  <p className="text-muted-foreground">Limited time offers - Grab them fast!</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {flashSales.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onWishlist={toggleWishlist}
                  isWishlisted={wishlist.has(product.id)}
                  onQuickView={(p) => {
                    setQuickViewProduct(p);
                    setQuickViewOpen(true);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm rounded-full">
              Shop by Category
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Browse Our <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find exactly what you're looking for with our wide range of categories
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
            {categories.map((category) => (
              <CategoryCard
                key={category.name}
                category={{ ...category, icon: "Package", color: "primary" }}
                onClick={() => {
                  setSelectedCategory(category.name);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        </section>

        {/* Trending Products */}
        {trendingProducts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Trending Now</h2>
                  <p className="text-muted-foreground">Most popular products this week</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingProducts.slice(0, 6).map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => {
                    setQuickViewProduct(product);
                    setQuickViewOpen(true);
                  }}
                  className="group relative cursor-pointer"
                >
                  <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold z-10 shadow-lg">
                    #{index + 1}
                  </div>
                  <Card className="glass-strong overflow-hidden border border-white/10 group-hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
                    <div className="flex gap-4 p-4">
                      <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                        <img 
                          src={product.image_url || "https://placehold.co/100x100/e2e8f0/64748b?text=Product"}
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-orange-500 font-semibold">Trending</span>
                        </div>
                        <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                          {product.title}
                        </h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
                          <Button size="sm" variant="ghost" className="rounded-full">
                            Quick View <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">All Products</h2>
              <p className="text-muted-foreground">Discover our curated collection</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Check back soon for new products"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onWishlist={toggleWishlist}
                  isWishlisted={wishlist.has(product.id)}
                  onQuickView={(p) => {
                    setQuickViewProduct(p);
                    setQuickViewOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trust Badges */}
        <section className="mt-20 pt-8 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-primary/10">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold">Secure Payments</p>
              <p className="text-sm text-muted-foreground">100% secure transactions</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-primary/10">
                <Truck className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold">Fast Delivery</p>
              <p className="text-sm text-muted-foreground">Nationwide shipping</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-primary/10">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold">Quality Guarantee</p>
              <p className="text-sm text-muted-foreground">Verified products only</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-primary/10">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold">24/7 Support</p>
              <p className="text-sm text-muted-foreground">Always here to help</p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default Marketplace;