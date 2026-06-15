import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Bell, Image, Power, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdSlide {
  id: string;
  image_url: string;
  link?: string;
  title?: string;
}

const SiteSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Maintenance mode
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  
  // Site alert
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"info" | "warning" | "success">("info");
  
  // Ad slides
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adSlides, setAdSlides] = useState<AdSlide[]>([]);
  const [newSlideUrl, setNewSlideUrl] = useState("");
  const [newSlideLink, setNewSlideLink] = useState("");
  const [newSlideTitle, setNewSlideTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.value as any;
        switch (setting.key) {
          case "maintenance_mode":
            setMaintenanceEnabled(value.enabled || false);
            setMaintenanceMessage(value.message || "");
            break;
          case "site_alert":
            setAlertEnabled(value.enabled || false);
            setAlertMessage(value.message || "");
            setAlertType(value.type || "info");
            break;
          case "ad_slides":
            setAdsEnabled(value.enabled || false);
            setAdSlides(value.slides || []);
            break;
        }
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value })
        .eq("key", key);

      if (error) throw error;
      toast.success("Settings updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceToggle = async (enabled: boolean) => {
    setMaintenanceEnabled(enabled);
    await updateSetting("maintenance_mode", {
      enabled,
      message: maintenanceMessage,
    });
  };

  const handleMaintenanceMessageSave = async () => {
    await updateSetting("maintenance_mode", {
      enabled: maintenanceEnabled,
      message: maintenanceMessage,
    });
  };

  const handleAlertToggle = async (enabled: boolean) => {
    setAlertEnabled(enabled);
    await updateSetting("site_alert", {
      enabled,
      message: alertMessage,
      type: alertType,
    });
  };

  const handleAlertSave = async () => {
    await updateSetting("site_alert", {
      enabled: alertEnabled,
      message: alertMessage,
      type: alertType,
    });
  };

  const handleAdsToggle = async (enabled: boolean) => {
    setAdsEnabled(enabled);
    await updateSetting("ad_slides", {
      enabled,
      slides: adSlides,
    });
  };

  const addSlide = async () => {
    if (!newSlideUrl) {
      toast.error("Please enter an image URL");
      return;
    }
    
    const newSlide: AdSlide = {
      id: crypto.randomUUID(),
      image_url: newSlideUrl,
      link: newSlideLink || undefined,
      title: newSlideTitle || undefined,
    };
    
    const updatedSlides = [...adSlides, newSlide];
    setAdSlides(updatedSlides);
    setNewSlideUrl("");
    setNewSlideLink("");
    setNewSlideTitle("");
    
    await updateSetting("ad_slides", {
      enabled: adsEnabled,
      slides: updatedSlides,
    });
  };

  const removeSlide = async (id: string) => {
    const updatedSlides = adSlides.filter((s) => s.id !== id);
    setAdSlides(updatedSlides);
    await updateSetting("ad_slides", {
      enabled: adsEnabled,
      slides: updatedSlides,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="w-5 h-5 text-red-500" />
            Maintenance Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Site will be inaccessible to non-admins
              </p>
            </div>
            <Switch
              checked={maintenanceEnabled}
              onCheckedChange={handleMaintenanceToggle}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Maintenance Message</Label>
            <Textarea
              placeholder="Enter a message to display during maintenance..."
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="glass"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleMaintenanceMessageSave}
              disabled={saving}
            >
              Save Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Site Alert */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            Landing Page Alert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Alert Banner</p>
              <p className="text-sm text-muted-foreground">
                Display an alert message on the landing page
              </p>
            </div>
            <Switch
              checked={alertEnabled}
              onCheckedChange={handleAlertToggle}
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Alert Type</Label>
              <Select value={alertType} onValueChange={(v: any) => setAlertType(v)}>
                <SelectTrigger className="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="warning">Warning (Yellow)</SelectItem>
                  <SelectItem value="success">Success (Green)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alert Message</Label>
            <Textarea
              placeholder="Enter alert message..."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="glass"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAlertSave}
              disabled={saving}
            >
              Save Alert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ad Slideshow */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            Ad Slideshow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Ad Slideshow</p>
              <p className="text-sm text-muted-foreground">
                Show ad carousel on the landing page
              </p>
            </div>
            <Switch
              checked={adsEnabled}
              onCheckedChange={handleAdsToggle}
              disabled={saving}
            />
          </div>

          {/* Existing Slides */}
          {adSlides.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adSlides.map((slide) => (
                <div
                  key={slide.id}
                  className="relative group rounded-lg overflow-hidden border border-border"
                >
                  <img
                    src={slide.image_url}
                    alt={slide.title || "Ad"}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSlide(slide.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {slide.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                      <p className="text-xs text-white truncate">{slide.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add New Slide with Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (!file || !file.type.startsWith('image/')) {
                toast.error("Please drop an image file");
                return;
              }
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  setNewSlideUrl(event.target.result as string);
                  toast.success("Image uploaded! Add title/link and click Add Slide");
                }
              };
              reader.readAsDataURL(file);
            }}
            className={`border-2 border-dashed rounded-lg p-6 space-y-4 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="text-center">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drag & drop an image here</p>
              <p className="text-xs text-muted-foreground">or paste an image URL below</p>
            </div>
            
            {newSlideUrl && (
              <div className="relative max-w-xs mx-auto">
                <img
                  src={newSlideUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => setNewSlideUrl("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Image URL</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={newSlideUrl.startsWith('data:') ? '' : newSlideUrl}
                  onChange={(e) => setNewSlideUrl(e.target.value)}
                  className="glass text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title (optional)</Label>
                <Input
                  placeholder="Slide title"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  className="glass text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Link (optional)</Label>
                <Input
                  placeholder="https://link-to-page.com"
                  value={newSlideLink}
                  onChange={(e) => setNewSlideLink(e.target.value)}
                  className="glass text-sm"
                />
              </div>
            </div>
            
            <input
              type="file"
              accept="image/*"
              id="adImageUpload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !file.type.startsWith('image/')) {
                  toast.error("Please select an image file");
                  return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    setNewSlideUrl(event.target.result as string);
                    toast.success("Image uploaded!");
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("adImageUpload")?.click()}
              >
                <Upload className="w-4 h-4 mr-1" />
                Browse Files
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={addSlide}
                disabled={saving || !newSlideUrl}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Slide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettingsManager;
