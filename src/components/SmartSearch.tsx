import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Filter, Star, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  brand: string | null;
  image_url: string | null;
}

interface Filters {
  minPrice: number;
  maxPrice: number;
  category: string;
  brand: string;
  minRating: number;
}

const SmartSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 1000000,
    category: "",
    brand: "",
    minRating: 0,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategoriesAndBrands();
    const saved = localStorage.getItem("recentSearches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filters]);

  const fetchCategoriesAndBrands = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("category, brand")
      .eq("is_active", true);

    if (products) {
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
      setBrands(uniqueBrands as string[]);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("products")
        .select("id, title, price, category, brand, image_url")
        .eq("is_active", true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,brand.ilike.%${query}%`)
        .gte("price", filters.minPrice)
        .lte("price", filters.maxPrice)
        .limit(8);

      if (filters.category) {
        queryBuilder = queryBuilder.eq("category", filters.category);
      }
      if (filters.brand) {
        queryBuilder = queryBuilder.eq("brand", filters.brand);
      }

      const { data } = await queryBuilder;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
    
    navigate(`/marketplace?search=${encodeURIComponent(query)}&minPrice=${filters.minPrice}&maxPrice=${filters.maxPrice}&category=${filters.category}&brand=${filters.brand}`);
    setShowSuggestions(false);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/checkout/${productId}`);
    setShowSuggestions(false);
  };

  const clearFilters = () => {
    setFilters({
      minPrice: 0,
      maxPrice: 1000000,
      category: "",
      brand: "",
      minRating: 0,
    });
  };

  const hasActiveFilters = filters.minPrice > 0 || filters.maxPrice < 1000000 || filters.category || filters.brand || filters.minRating > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for products, brands, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 pr-10 h-12 text-base bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className={cn("h-12 w-12", hasActiveFilters && "border-primary bg-primary/10")}>
              <Filter className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filters</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Price Range</label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>₦{filters.minPrice.toLocaleString()}</span>
                  <span>-</span>
                  <span>₦{filters.maxPrice.toLocaleString()}</span>
                </div>
                <Slider
                  value={[filters.minPrice, filters.maxPrice]}
                  min={0}
                  max={1000000}
                  step={1000}
                  onValueChange={([min, max]) => setFilters(f => ({ ...f, minPrice: min, maxPrice: max }))}
                  className="mt-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 6).map((cat) => (
                    <Badge
                      key={cat}
                      variant={filters.category === cat ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? "" : cat }))}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Brand</label>
                <div className="flex flex-wrap gap-2">
                  {brands.slice(0, 6).map((brand) => (
                    <Badge
                      key={brand}
                      variant={filters.brand === brand ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setFilters(f => ({ ...f, brand: f.brand === brand ? "" : brand }))}
                    >
                      {brand}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFilters(f => ({ ...f, minRating: f.minRating === star ? 0 : star }))}
                      className="focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "w-6 h-6 transition-colors",
                          star <= filters.minRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleSearch} className="h-12 px-6">
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-xl z-50 overflow-hidden">
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-3 border-b">
              <p className="text-xs text-muted-foreground mb-2">Recent Searches</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setQuery(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="max-h-96 overflow-y-auto">
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Search className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {product.category && <span>{product.category}</span>}
                      {product.brand && <span>• {product.brand}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₦{product.price.toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && suggestions.length === 0 && !loading && (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No products found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
