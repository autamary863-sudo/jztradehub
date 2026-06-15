import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Image, Bell, Palette, Clock, Eye, EyeOff, Upload, X, Sparkles } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface PopupSettings {
  enabled: boolean;
  title: string;
  message: string;
  image_url: string;
  button_text: string;
  button_link: string;
  show_delay: number;
  show_once_per_session: boolean;
  background_color: string;
}

const PopupManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<PopupSettings>({
    enabled: false,
    title: "Special Offer!",
    message: "Get 20% off your first purchase",
    image_url: "",
    button_text: "Shop Now",
    button_link: "/marketplace",
    show_delay: 2,
    show_once_per_session: true,
    background_color: "#3b82f6",
  });
  const [previewImage, setPreviewImage] = useState<string>("");

  useEffect(() => {
    fetchPopupSettings();
  }, []);

  const fetchPopupSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "popup_settings")
        .maybeSingle(); // Use maybeSingle to avoid 406 error

      if (!error && data?.value) {
        const popupSettings = data.value as PopupSettings;
        setSettings(popupSettings);
        if (popupSettings.image_url) {
          setPreviewImage(popupSettings.image_url);
        }
      }
    } catch (error) {
      console.error("Error fetching popup settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("key")
        .eq("key", "popup_settings")
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from("app_settings")
          .update({ value: settings as unknown as Json })
          .eq("key", "popup_settings");
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("app_settings")
          .insert({ key: "popup_settings", value: settings as unknown as Json });
        error = result.error;
      }

      if (error) throw error;
      toast.success("Popup settings saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large. Please upload an image less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageUrl = event.target.result as string;
        setSettings({ ...settings, image_url: imageUrl });
        setPreviewImage(imageUrl);
        toast.success("Image uploaded successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setSettings({ ...settings, image_url: "" });
    setPreviewImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Image removed");
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Popup Advertisement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Enable Popup
            </h3>
            <p className="text-sm text-muted-foreground">
              Show popup when users visit the landing page
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {/* Preview Section */}
        {settings.enabled && (
          <div className="p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Live Preview
            </h3>
            <div 
              className="relative overflow-hidden rounded-xl shadow-2xl"
              style={{ backgroundColor: settings.background_color + '20' }}
            >
              <div className="p-6 text-center">
                {previewImage && (
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="w-24 h-24 mx-auto rounded-full object-cover mb-4 border-4 border-white shadow-lg"
                  />
                )}
                <h2 className="text-2xl font-bold mb-2" style={{ color: settings.background_color }}>
                  {settings.title}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {settings.message}
                </p>
                <button 
                  className="px-6 py-2 rounded-lg text-white font-semibold transition-transform hover:scale-105"
                  style={{ backgroundColor: settings.background_color }}
                >
                  {settings.button_text}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Popup Title</Label>
            <Input
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="glass"
              placeholder="Special Offer!"
            />
          </div>

          <div className="space-y-2">
            <Label>Popup Message</Label>
            <Textarea
              value={settings.message}
              onChange={(e) => setSettings({ ...settings, message: e.target.value })}
              rows={3}
              className="glass"
              placeholder="Get 20% off your first purchase"
            />
          </div>

          {/* Drag & Drop Image Upload */}
          <div className="space-y-2">
            <Label>Popup Image</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              }`}
            >
              {previewImage ? (
                <div className="relative inline-block group">
                  <img 
                    src={previewImage} 
                    alt="Popup preview" 
                    className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={removeImage}
                      className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-primary rounded-full text-white hover:bg-primary/80 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop an image here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports: JPG, PNG, GIF (Max 2MB)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={settings.button_text}
                onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                className="glass"
                placeholder="Shop Now"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input
                value={settings.button_link}
                onChange={(e) => setSettings({ ...settings, button_link: e.target.value })}
                className="glass"
                placeholder="/marketplace"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Show Delay (seconds)
              </Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={settings.show_delay}
                onChange={(e) => setSettings({ ...settings, show_delay: parseFloat(e.target.value) || 2 })}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">Delay before popup appears</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Brand Color
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.background_color}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  className="w-16 h-10 p-1 rounded-lg"
                />
                <Input
                  value={settings.background_color}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  className="flex-1 glass"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Show once per session</p>
              <p className="text-xs text-muted-foreground">Don't show popup again during this visit</p>
            </div>
            <Switch
              checked={settings.show_once_per_session}
              onCheckedChange={(checked) => setSettings({ ...settings, show_once_per_session: checked })}
            />
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all">
          {saving ? "Saving..." : "💾 Save Popup Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PopupManager;