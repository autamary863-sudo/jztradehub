import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, AlertTriangle, CheckCircle } from "lucide-react";

interface AlertData {
  enabled: boolean;
  message: string;
  type: "info" | "warning" | "success";
}

const SiteAlert = () => {
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAlert();
  }, []);

  const fetchAlert = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "site_alert")
      .maybeSingle();

    if (data?.value) {
      setAlert(data.value as unknown as AlertData);
    }
  };

  if (!alert?.enabled || !alert?.message || dismissed) return null;

  const colors = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-600",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600",
    success: "bg-green-500/10 border-green-500/30 text-green-600",
  };

  const icons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
  };

  const Icon = icons[alert.type];

  return (
    <div className={`border-b ${colors[alert.type]}`}>
      <div className="container px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{alert.message}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SiteAlert;
