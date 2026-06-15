import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wrench } from "lucide-react";

interface MaintenanceData {
  enabled: boolean;
  message: string;
}

interface MaintenanceModeProps {
  children: React.ReactNode;
}

const MaintenanceMode = ({ children }: MaintenanceModeProps) => {
  const { roles, loading } = useAuth();
  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkMaintenance();
  }, []);

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (data?.value) {
        setMaintenance(data.value as unknown as MaintenanceData);
      }
    } catch (error) {
      console.error("Error checking maintenance:", error);
    } finally {
      setChecking(false);
    }
  };

  // Still loading
  if (checking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show maintenance page if enabled and user is not admin
  if (maintenance?.enabled && !roles.includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6">
            <Wrench className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            {maintenance.message || "We're currently performing maintenance. Please check back soon."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceMode;
