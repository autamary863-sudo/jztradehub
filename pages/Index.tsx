// src/pages/Index.tsx
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  ArrowRight, 
  Shield, 
  Truck, 
  Headphones, 
  TrendingUp, 
  Star, 
  Users, 
  Clock, 
  CheckCircle,
  Sparkles,
  Award,
  Wallet,
  Globe,
  Smartphone,
  ShoppingBag,
  Mail,
  ChevronRight,
  Crown,
  Gem,
  Target,
  Eye,
  Layers,
  BarChart3,
  RefreshCw,
  CreditCard,
  UserCheck,
  DollarSign,
  Rocket,
  Heart,
  ThumbsUp,
  Play,
  Circle,
  Square,
  Flame,
  Package,
  Eye as EyeIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";

// Lazy load components
const FloatingShapes = lazy(() => import("@/components/FloatingShapes"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const Features = lazy(() => import("@/components/Features"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const CTA = lazy(() => import("@/components/CTA"));
const Footer = lazy(() => import("@/components/Footer"));
const SiteAlert = lazy(() => import("@/components/SiteAlert"));
const AdCarousel = lazy(() => import("@/components/AdCarousel"));
const FlashSales = lazy(() => import("@/components/FlashSales"));
const SmartSearch = lazy(() => import("@/components/SmartSearch"));
const PopupAd = lazy(() => import("@/components/PopupAd"));

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string;
  category: string;
  brand: string;
  rating?: number;
  review_count?: number;
}

const SectionLoader = () => (
  <div className="py-8 flex items-center justify-center">
    <div className="animate-pulse bg-muted rounded-lg h-32 w-full max-w-4xl" />
  </div>
);

// Hero Slideshow Component
const HeroSlideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&h=800&fit=crop",
      title: "Summer Sale Extravaganza",
      description: "Get up to 50% off on trending fashion items. Limited time offer!",
      badge: "Limited Time Offer",
      cta: "Shop Now",
      link: "/marketplace?category=Fashion"
    },
    {
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=800&fit=crop",
      title: "Electronics Mega Deals",
      description: "Latest gadgets at unbeatable prices. Free shipping on orders over ₦50,000",
      badge: "Free Shipping",
      cta: "Shop Electronics",
      link: "/marketplace?category=Electronics"
    },
    {
      image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1920&h=800&fit=crop",
      title: "Home & Living Collection",
      description: "Transform your space with our premium home decor collection",
      badge: "New Arrivals",
      cta: "Shop Home",
      link: "/marketplace?category=Home"
    },
    {
      image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=1920&h=800&fit=crop",
      title: "Fashion Week Special",
      description: "Latest trends from top designers. Up to 40% off selected items",
      badge: "Trending Now",
      cta: "Shop Fashion",
      link: "/marketplace?category=Fashion"
    },
    {
      image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1920&h=800&fit=crop",
      title: "Tech Accessories",
      description: "Upgrade your gear with our premium accessories collection",
      badge: "Best Sellers",
      cta: "Shop Accessories",
      link: "/marketplace?category=Accessories"
    },
    {
      image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1920&h=800&fit=crop",
      title: "Fitness & Outdoors",
      description: "Get fit with our premium sports equipment. Limited time offers",
      badge: "Flash Sale",
      cta: "Shop Sports",
      link: "/marketplace?category=Sports"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative h-[550px] md:h-[650px] rounded-3xl overflow-hidden shadow-2xl">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ${
            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-110"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent z-10" />
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-20 flex flex-col justify-center px-8 md:px-16 lg:px-24">
            <div className="max-w-2xl animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm mb-4">
                <Sparkles className="w-4 h-4" />
                <span>{slide.badge}</span>
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
                {slide.title}
              </h1>
              <p className="text-lg text-white/90 mb-8 max-w-lg">
                {slide.description}
              </p>
              <Button
                size="lg"
                onClick={() => navigate(slide.link)}
                className="bg-gradient-to-r from-primary to-accent hover:shadow-2xl transition-all group"
              >
                <span>{slide.cta}</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 transition-all"
      >
        <ChevronRight className="w-6 h-6 rotate-180" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      
      {/* Dots */}
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
  );
};

// Trending Product Card
const TrendingProductCard = ({ product, rank }: { product: Product; rank: number }) => {
  const navigate = useNavigate();
  
  return (
    <div
      onClick={() => navigate(`/checkout/${product.id}`)}
      className="group relative cursor-pointer animate-fade-in"
      style={{ animationDelay: `${rank * 0.1}s` }}
    >
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold z-10 shadow-lg">
        #{rank + 1}
      </div>
      <Card className="glass-strong overflow-hidden border border-white/10 group-hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
        <div className="flex gap-4 p-4">
          <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-orange-500 font-semibold">Trending</span>
            </div>
            <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(1k+ sold)</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
              <Button size="sm" variant="ghost" className="rounded-full">
                Buy Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hot Product Card
const HotProductCard = ({ product, index }: { product: Product; index: number }) => {
  const navigate = useNavigate();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/checkout/${product.id}`)}
    >
      <Card className="relative overflow-hidden glass-strong border border-white/10 group-hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
            <Flame className="w-3 h-3 mr-1" />
            Hot
          </Badge>
        </div>
        <div className="relative h-48 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Package className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button variant="secondary" size="sm" className="gap-2">
              <EyeIcon className="w-4 h-4" />
              Quick View
            </Button>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {product.category && (
              <Badge variant="outline" className="text-xs">{product.category}</Badge>
            )}
            {product.brand && (
              <Badge variant="secondary" className="text-xs">{product.brand}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">(1k+ sold)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
            <Button size="sm" variant="outline" className="rounded-full">
              Buy Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Animated Counter
const FancyCounter = ({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const duration = 2500;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [inView, target]);

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// Fancy Stat Card
const FancyStatCard = ({ icon: Icon, value, label, delay, suffix = "", prefix = "" }: any) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, type: "spring" }}
      whileHover={{ scale: 1.05 }}
      className="relative"
    >
      <div className="relative glass-strong rounded-2xl p-6 text-center border border-white/10 hover:border-primary/30 transition-all duration-300">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div className="text-3xl md:text-4xl font-black text-primary mb-2">
          {prefix}{inView ? value : "0"}{suffix}
        </div>
        <div className="text-sm text-muted-foreground font-medium">{label}</div>
      </div>
    </motion.div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  useEffect(() => {
    window.addEventListener("scroll", () => setScrolled(window.scrollY > 50));
    fetchTrendingProducts();
    fetchHotProducts();
    return () => window.removeEventListener("scroll", () => setScrolled(window.scrollY > 50));
  }, []);

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
      console.error("Error fetching trending products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      setHotProducts(data || []);
    } catch (error) {
      console.error("Error fetching hot products:", error);
    }
  };

  const categories = [
    { name: "Electronics", icon: Smartphone, color: "primary", count: 120, link: "/marketplace?category=Electronics" },
    { name: "Fashion", icon: ShoppingBag, color: "secondary", count: 250, link: "/marketplace?category=Fashion" },
    { name: "Home & Living", icon: Shield, color: "accent", count: 80, link: "/marketplace?category=Home" },
    { name: "Health & Beauty", icon: Sparkles, color: "primary", count: 95, link: "/marketplace?category=Beauty" },
    { name: "Sports", icon: TrendingUp, color: "secondary", count: 60, link: "/marketplace?category=Sports" },
    { name: "Books", icon: Globe, color: "accent", count: 45, link: "/marketplace?category=Books" },
  ];

  const stats = [
    { icon: Users, value: "50", label: "Happy Customers", suffix: "K+" },
    { icon: ShoppingBag, value: "10", label: "Orders Completed", suffix: "K+" },
    { icon: Star, value: "4.9", label: "Customer Rating" },
    { icon: Clock, value: "24/7", label: "Support Available" },
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <Suspense fallback={null}>
        <FloatingShapes />
        <SiteAlert />
      </Suspense>
      
      <motion.div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-background/95 backdrop-blur-2xl shadow-2xl" : ""}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <Header />
      </motion.div>
      
      {/* Hero Section with Slideshow */}
      <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="pt-20">
        <div className="container px-4 py-8 max-w-7xl mx-auto">
          <HeroSlideshow />
        </div>
      </motion.div>
      
      {/* Smart Search */}
      <div className="container px-4 py-8 max-w-7xl mx-auto relative z-20">
        <Suspense fallback={<SectionLoader />}>
          <SmartSearch />
        </Suspense>
      </div>
      
      {/* Stats Section */}
      <section className="py-16 relative z-20">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-5 py-1.5 text-sm rounded-full">Our Impact</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Trusted by <span className="gradient-text">Thousands</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Join thousands of satisfied customers who have found success on our platform
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <FancyStatCard
                key={index}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                suffix={stat.suffix || ""}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* Hot Trending Products Section */}
      <section className="py-16 relative z-20 bg-muted/30">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-5 py-1.5 text-sm rounded-full">
              <Flame className="w-3 h-3 mr-1" />
              Hot This Week
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Trending Now</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Most popular products people are buying right now
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Top 6 Trending Products */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                {trendingProducts.slice(0, 6).map((product, index) => (
                  <TrendingProductCard key={product.id} product={product} rank={index} />
                ))}
              </div>
              
              {/* Hot Products Grid */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">You Might Also Like</h3>
                <p className="text-muted-foreground">Discover our hottest selling items</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {hotProducts.slice(0, 8).map((product, index) => (
                  <HotProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            </>
          )}
          
          <div className="text-center mt-12">
            <Button
              onClick={() => navigate("/marketplace")}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent group"
            >
              View All Products
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Categories Section */}
      <section className="py-16 relative z-20">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-5 py-1.5 text-sm rounded-full">Shop by Category</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Browse Our <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Find exactly what you're looking for with our wide range of categories
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate(category.link)}
                  className="group cursor-pointer"
                >
                  <div className="relative glass-strong rounded-2xl p-6 text-center border border-white/10 group-hover:border-primary/30 transition-all duration-300">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${category.color}/20 to-${category.color}/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-8 h-8 text-${category.color}`} />
                    </div>
                    <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                      {category.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">{category.count}+ items</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Flash Sales */}
      <Suspense fallback={<SectionLoader />}>
        <FlashSales />
      </Suspense>
      
      {/* Features Section */}
      <Suspense fallback={<SectionLoader />}>
        <Features />
      </Suspense>
      
      {/* How It Works */}
      <Suspense fallback={<SectionLoader />}>
        <HowItWorks />
      </Suspense>
      
      {/* Trust Badges */}
      <Suspense fallback={<SectionLoader />}>
        <TrustBadges />
      </Suspense>
      
      {/* CTA Section */}
      <Suspense fallback={<SectionLoader />}>
        <CTA />
      </Suspense>
      
      {/* Newsletter Section */}
      <section className="py-16 relative z-20 bg-muted/30">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Subscribe to Our Newsletter</h2>
              <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
                Get the latest updates on new products, exclusive offers, and shopping tips
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="flex-1 px-6 py-4 rounded-xl glass-strong border border-white/10 focus:border-primary focus:outline-none transition-all text-lg"
                />
                <Button className="bg-gradient-to-r from-primary to-accent whitespace-nowrap px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all">
                  Subscribe
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      <Suspense fallback={<SectionLoader />}>
        <AdCarousel />
        <Footer />
      </Suspense>
      
      {/* Popup Ad */}
      <PopupAd />
    </div>
  );
};

export default Index;