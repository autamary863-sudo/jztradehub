import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Zap, Clock } from "lucide-react";
import { toast } from "sonner";

interface FlashSale {
  id: string;
  product_id: string;
  original_price: number;
  sale_price: number;
  start_time: string;
  end_time: string;
  stock_limit: number | null;
  sold_count: number;
  is_active: boolean;
  products?: {
    title: string;
    image_url: string;
  };
}

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string;
}

const FlashSalesManager = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    sale_price: "",
    start_time: "",
    end_time: "",
    stock_limit: "",
  });

  useEffect(() => {
    fetchFlashSales();
    fetchProducts();
  }, []);

  const fetchFlashSales = async () => {
    try {
      const { data, error } = await supabase
        .from("flash_sales")
        .select(`
          *,
          products (title, image_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlashSales((data as unknown as FlashSale[]) || []);
    } catch (error) {
      console.error("Error fetching flash sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, title, price, image_url")
      .eq("is_active", true);

    setProducts(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.product_id || !formData.sale_price || !formData.start_time || !formData.end_time) {
      toast.error("Please fill all required fields");
      return;
    }

    const selectedProduct = products.find((p) => p.id === formData.product_id);
    if (!selectedProduct) return;

    try {
      const { error } = await supabase.from("flash_sales").insert({
        product_id: formData.product_id,
        original_price: selectedProduct.price,
        sale_price: parseFloat(formData.sale_price),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        stock_limit: formData.stock_limit ? parseInt(formData.stock_limit) : null,
      });

      if (error) throw error;
      toast.success("Flash sale created!");
      resetForm();
      fetchFlashSales();
    } catch (error: any) {
      toast.error(error.message || "Failed to create flash sale");
    }
  };

  const toggleActive = async (sale: FlashSale) => {
    try {
      const { error } = await supabase
        .from("flash_sales")
        .update({ is_active: !sale.is_active })
        .eq("id", sale.id);

      if (error) throw error;
      toast.success(sale.is_active ? "Flash sale deactivated" : "Flash sale activated");
      fetchFlashSales();
    } catch (error: any) {
      toast.error(error.message || "Failed to update flash sale");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this flash sale?")) return;

    try {
      const { error } = await supabase.from("flash_sales").delete().eq("id", id);

      if (error) throw error;
      toast.success("Flash sale deleted");
      fetchFlashSales();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete flash sale");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      product_id: "",
      sale_price: "",
      start_time: "",
      end_time: "",
      stock_limit: "",
    });
  };

  const getTimeStatus = (sale: FlashSale) => {
    const now = Date.now();
    const start = new Date(sale.start_time).getTime();
    const end = new Date(sale.end_time).getTime();

    if (now < start) return { label: "Upcoming", color: "bg-blue-500/20 text-blue-500" };
    if (now > end) return { label: "Ended", color: "bg-gray-500/20 text-gray-500" };
    return { label: "Active", color: "bg-green-500/20 text-green-500" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-destructive" />
          Flash Sales
        </h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Flash Sale
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Flash Sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, product_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.title} - ₦{product.price.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sale Price (₦)</Label>
                <Input
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData((p) => ({ ...p, sale_price: e.target.value }))}
                  placeholder="Discounted price"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Limit (Optional)</Label>
                <Input
                  type="number"
                  value={formData.stock_limit}
                  onChange={(e) => setFormData((p) => ({ ...p, stock_limit: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit}>Create Flash Sale</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flash Sales List */}
      <div className="space-y-4">
        {flashSales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No flash sales yet</p>
            </CardContent>
          </Card>
        ) : (
          flashSales.map((sale) => {
            const status = getTimeStatus(sale);
            const discount = Math.round(((sale.original_price - sale.sale_price) / sale.original_price) * 100);

            return (
              <Card key={sale.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {sale.products?.image_url && (
                      <img
                        src={sale.products.image_url}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{sale.products?.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                          -{discount}% OFF
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="line-through text-muted-foreground">
                          ₦{sale.original_price.toLocaleString()}
                        </span>
                        <span className="font-bold text-destructive">
                          ₦{sale.sale_price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sale.start_time).toLocaleString()} - {new Date(sale.end_time).toLocaleString()}
                        </span>
                        {sale.stock_limit && (
                          <span>
                            Sold: {sale.sold_count}/{sale.stock_limit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={sale.is_active}
                        onCheckedChange={() => toggleActive(sale)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FlashSalesManager;
