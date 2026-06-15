// src/services/locationService.ts
import { supabase } from "@/integrations/supabase/client";

export interface State {
  id: string;
  name: string;
  capital: string;
}

export interface LGA {
  id: string;
  name: string;
  delivery_zone: "Zone 1" | "Zone 2" | "Zone 3" | "Zone 4";
  base_fee: number;
  express_fee: number;
  free_shipping_threshold: number;
}

export interface Area {
  id: string;
  name: string;
  is_urban: boolean;
}

// Fallback local data for common locations (when API fails)
const FALLBACK_STATES = [
  "Lagos", "Abuja FCT", "Port Harcourt", "Ibadan", "Kano", "Benin City", 
  "Enugu", "Abeokuta", "Jos", "Warri", "Calabar", "Maiduguri", "Sokoto"
];

const FALLBACK_ZONES: Record<string, { zone: "Zone 1" | "Zone 2" | "Zone 3" | "Zone 4"; base_fee: number; express_fee: number; threshold: number }> = {
  "Lagos": { zone: "Zone 1", base_fee: 1500, express_fee: 3000, threshold: 10000 },
  "Abuja FCT": { zone: "Zone 1", base_fee: 1500, express_fee: 3000, threshold: 10000 },
  "Port Harcourt": { zone: "Zone 2", base_fee: 2000, express_fee: 4000, threshold: 15000 },
  "Ibadan": { zone: "Zone 2", base_fee: 2000, express_fee: 4000, threshold: 15000 },
  "Kano": { zone: "Zone 2", base_fee: 2000, express_fee: 4000, threshold: 15000 },
  "Benin City": { zone: "Zone 2", base_fee: 2000, express_fee: 4000, threshold: 15000 },
  "Enugu": { zone: "Zone 2", base_fee: 2000, express_fee: 4000, threshold: 15000 }
};

class LocationService {
  private statesCache: State[] | null = null;
  private lgasCache: Map<string, LGA[]> = new Map();
  private areasCache: Map<string, Area[]> = new Map();

  // Fetch all states
  async getStates(): Promise<State[]> {
    if (this.statesCache) return this.statesCache;

    try {
      const { data, error } = await supabase
        .from("states")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        this.statesCache = data;
        return data;
      }
      
      // Return fallback if no data
      return FALLBACK_STATES.map(name => ({ id: name, name, capital: "" }));
    } catch (error) {
      console.error("Error fetching states:", error);
      return FALLBACK_STATES.map(name => ({ id: name, name, capital: "" }));
    }
  }

  // Fetch LGAs by state
  async getLGAs(stateName: string): Promise<LGA[]> {
    if (this.lgasCache.has(stateName)) return this.lgasCache.get(stateName)!;

    try {
      // First get state ID
      const { data: stateData } = await supabase
        .from("states")
        .select("id")
        .eq("name", stateName)
        .single();

      if (!stateData) {
        return this.getFallbackLGAs(stateName);
      }

      const { data, error } = await supabase
        .from("lgas")
        .select("*")
        .eq("state_id", stateData.id)
        .order("name", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        this.lgasCache.set(stateName, data);
        return data;
      }

      return this.getFallbackLGAs(stateName);
    } catch (error) {
      console.error("Error fetching LGAs:", error);
      return this.getFallbackLGAs(stateName);
    }
  }

  private getFallbackLGAs(stateName: string): LGA[] {
    const zone = FALLBACK_ZONES[stateName] || { zone: "Zone 3" as const, base_fee: 2500, express_fee: 5000, threshold: 20000 };
    
    return [
      { id: `${stateName}_central`, name: `${stateName} Central`, delivery_zone: zone.zone, base_fee: zone.base_fee, express_fee: zone.express_fee, free_shipping_threshold: zone.threshold },
      { id: `${stateName}_north`, name: `${stateName} North`, delivery_zone: zone.zone, base_fee: zone.base_fee, express_fee: zone.express_fee, free_shipping_threshold: zone.threshold },
      { id: `${stateName}_south`, name: `${stateName} South`, delivery_zone: zone.zone, base_fee: zone.base_fee, express_fee: zone.express_fee, free_shipping_threshold: zone.threshold },
      { id: `${stateName}_east`, name: `${stateName} East`, delivery_zone: zone.zone, base_fee: zone.base_fee, express_fee: zone.express_fee, free_shipping_threshold: zone.threshold },
      { id: `${stateName}_west`, name: `${stateName} West`, delivery_zone: zone.zone, base_fee: zone.base_fee, express_fee: zone.express_fee, free_shipping_threshold: zone.threshold }
    ];
  }

  // Fetch areas by LGA
  async getAreas(lgaName: string, stateName: string): Promise<Area[]> {
    const cacheKey = `${stateName}|${lgaName}`;
    if (this.areasCache.has(cacheKey)) return this.areasCache.get(cacheKey)!;

    try {
      // Get state ID
      const { data: stateData } = await supabase
        .from("states")
        .select("id")
        .eq("name", stateName)
        .single();

      if (!stateData) {
        return this.getFallbackAreas(lgaName);
      }

      // Get LGA ID
      const { data: lgaData } = await supabase
        .from("lgas")
        .select("id")
        .eq("state_id", stateData.id)
        .eq("name", lgaName)
        .single();

      if (!lgaData) {
        return this.getFallbackAreas(lgaName);
      }

      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .eq("lga_id", lgaData.id)
        .order("name", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        this.areasCache.set(cacheKey, data);
        return data;
      }

      return this.getFallbackAreas(lgaName);
    } catch (error) {
      console.error("Error fetching areas:", error);
      return this.getFallbackAreas(lgaName);
    }
  }

  private getFallbackAreas(lgaName: string): Area[] {
    return [
      { id: `${lgaName}_urban`, name: "Urban (City Center)", is_urban: true },
      { id: `${lgaName}_semi`, name: "Semi-Urban (Town)", is_urban: false },
      { id: `${lgaName}_rural`, name: "Rural (Village)", is_urban: false }
    ];
  }

  // Clear cache (useful for testing)
  clearCache() {
    this.statesCache = null;
    this.lgasCache.clear();
    this.areasCache.clear();
  }
}

export const locationService = new LocationService();