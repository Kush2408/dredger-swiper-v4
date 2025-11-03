import axios from "axios";

// Environment configuration with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Type definitions for the API response
export interface SystemOverview {
  Engine: string;
  Dredging: string;
  Navigation: string;
  Hopper: string;
  Environment: string;
}

export interface EngineMetrics {
  "Engine RPM": number;
  "Oil Pressure": number;
  "Engine Temperature": number;
  "Thermal Stress Index": number;
  "Mechanical Efficiency": number;
  "Cooling Efficiency": number;
  "Propulsion Alignment": number;
}

export interface SuctionMetrics {
  "Suction Pressure": number;
  "Discharge Pressure": number;
  "Pressure Fluctuation": number;
  "Cutter Resistance": number;
  "Turbidity to Torque": number;
  "Flow Stability Factor": number;
}

export interface VibrationAnalysis {
  "Engine Vibration": number[];
  "Shaft Vibration": number[];
  "Bearing Vibration": number[];
}

export interface TemperatureTrend {
  "Engine Temperature": number[];
  "Oil Temperature": number[];
  "Cooling Water Temperature": number[];
}

export interface PredictiveInsights {
  "Discharge Pump": {
    risk: number;
    timeframe: string;
    status: string;
  };
  "Suction Valve": {
    risk: number;
    timeframe: string;
    status: string;
  };
  "Main Engine": {
    risk: number;
    timeframe: string;
    status: string;
  };
}

export interface PredictiveAnalysisData {
  overview: SystemOverview;
  engine_metrics: EngineMetrics;
  suction_metrics: SuctionMetrics;
  vibration_analysis: VibrationAnalysis;
  temperature_trend: TemperatureTrend;
  predictive_insights: PredictiveInsights;
  hopper_level: number;
  system_risk_heatmap: Record<string, string>;
}

export interface PredictiveAnalysisResponse {
  data: PredictiveAnalysisData[];
}

// Service functions
export const predictiveAnalysisService = {
  async getPredictiveAnalysis(): Promise<PredictiveAnalysisData> {
    try {
      const response = await api.get<PredictiveAnalysisResponse>("predictive-analysis");
      
      if (!response.data.data || response.data.data.length === 0) {
        throw new Error("No data received from API");
      }
      console.log(response.data.data);
      // Return the latest data entry
      return response.data.data[response.data.data.length - 1];
    } catch (error) {
      console.error("Error fetching predictive analysis data:", error);
      throw new Error("Failed to fetch predictive analysis data");
    }
  },

  // Force background processing when Start Live is pressed
  async forceBackgroundProcessing(): Promise<any> {
    try {
      console.log("Forcing background processing...");
      const response = await api.post("force-background-processing");
      console.log("Background processing triggered:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error forcing background processing:", error);
      throw new Error("Failed to trigger background processing");
    }
  },

  // Check background processing status
  async getBackgroundStatus(): Promise<any> {
    try {
      const response = await api.get("background-status");
      console.log("Background status:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching background status:", error);
      throw new Error("Failed to fetch background status");
    }
  },

  // Get URL for predictive analysis data (HTTP polling)
  getSSEUrl(): string {
    return `${API_BASE_URL}/predictive-analysis`;
  },

  // Method to test API connectivity
  // async testConnection(): Promise<boolean> {
  //   try {
  //     await api.get("/health");
  //     return true;
  //   } catch {
  //     return false;
  //   }
  // }
};

export default predictiveAnalysisService;