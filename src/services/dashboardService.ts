import axios from "axios";

// Environment configuration with fallback
// Use Vite proxy for development, or direct URL for production
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
export interface PerformanceMetrics {
  efficiency_performance_metrics: number[];
  power_output_trend: number[];
}

export interface Maintenance {
  next_service: number;
}

export interface MaintenanceUpdate {
  estimated_completion: number;
}

export interface DashboardData {
  engine_temperature: number;
  engine_rpm: number;
  power_output: number;
  load_sensor: number;
  depth_sensor: number;
  overall_health: number[];
  maintenance: Maintenance;
  maintenance_update: MaintenanceUpdate;
  performance_metrics: PerformanceMetrics;
}

export interface DashboardResponse {
  data: DashboardData[];
}

// Service functions
export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await api.get<DashboardResponse>("/dashboard");
      
      if (!response.data.data || response.data.data.length === 0) {
        throw new Error("No data received from API");
      }
      
      // Return the latest data entry
      return response.data.data[response.data.data.length - 1];
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw new Error("Failed to fetch dashboard data");
    }
  },

  // Get SSE URL for real-time dashboard data
  getSSEUrl(): string {
    const url = `${API_BASE_URL}/dashboard`;
    console.log("SSE URL:", url);
    return url;
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

export default dashboardService;