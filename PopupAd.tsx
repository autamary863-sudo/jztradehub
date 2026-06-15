import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Sparkles, Gift, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const PopupAd = () => {
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopupSettings();
  }, []);

  const fetchPopupSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "popup_settings")
        .single();

      console.log("Popup settings from DB:", data);

      if (!error && data?.value) {
        const popupSettings = data.value as PopupSettings;
        setSettings(popupSettings);
        
        if (popupSettings.enabled) {
          // Check if should show popup
          const hasSeen = sessionStorage.getItem("popup_shown");
          if (popupSettings.show_once_per_session && hasSeen) {
            console.log("Popup already shown this session");
            return;
          }
          
          // Show popup after delay
          const delay = (popupSettings.show_delay || 2) * 1000;
          console.log(`Popup will show after ${delay}ms`);
          
          setTimeout(() => {
            console.log("Showing popup now");
            setIsOpen(true);
            if (popupSettings.show_once_per_session) {
              sessionStorage.setItem("popup_shown", "true");
            }
          }, delay);
        } else {
          console.log("Popup is disabled");
        }
      } else {
        console.log("No popup settings found");
      }
    } catch (error) {
      console.error("Error fetching popup settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (settings?.button_link) {
      window.location.href = settings.button_link;
    }
    setIsOpen(false);
  };

  if (loading || !settings || !settings.enabled || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Popup Card */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300 slide-in-from-bottom-10">
        <div 
          className="relative overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-gray-900"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl" />
          
          {/* Content */}
          <div className="p-6 text-center relative z-10">
            {/* Sparkle Icon */}
            <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 animate-bounce">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            {/* Image */}
            {settings.image_url && (
              <div className="mb-4 flex justify-center">
                <img 
                  src={settings.image_url} 
                  alt={settings.title}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              </div>
            )}
            
            {/* Title */}
            <h2 
              className="text-2xl md:text-3xl font-bold mb-3"
              style={{ color: settings.background_color || "#3b82f6" }}
            >
              {settings.title || "Special Offer!"}
            </h2>
            
            {/* Message */}
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              {settings.message || "Get amazing deals on your first purchase"}
            </p>
            
            {/* CTA Button */}
            <Button
              onClick={handleButtonClick}
              className="w-full relative overflow-hidden group"
              style={{ 
                backgroundColor: settings.background_color || "#3b82f6",
                color: "white"
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                {settings.button_text || "Shop Now"}
                <Zap className="w-4 h-4 group-hover:animate-pulse" />
              </span>
            </Button>
            
            {/* Footer Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Don't miss out on this amazing offer!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupAd;