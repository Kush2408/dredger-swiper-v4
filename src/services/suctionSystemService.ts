import axios from "axios";

// Environment configuration with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.10.251:8001/api/v1'

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Type definitions for the API response
export interface BoomArmBucketAngles {
  arm_angle: number;
  boom_angle: number;
  bucket_angle: number;
  EXCAVATION_ACTIVITY: number;
}

export interface PipePerformance {
  suction_depth: number;
  suction_pipe_flow_rate: number;
  suction_pipe_pressure: number;
}

export interface DragheadAndCutter {
  draghead_pressure_and_flow: number[];
  cutter_torque_and_rpm: number[];
  "SEABED RESISTANCE": number;
}

export interface ExcavationControl {
  grab_position: string;
  boom_arm_bucket_angles: BoomArmBucketAngles;
}

export interface TrendAnalysis {
  suction_pressure: number[];
  flow_rate: number[];
  cutter_torque: number[];
}

export interface SuctionSystemData {
  pipe_performance: PipePerformance;
  draghead_and_cutter: DragheadAndCutter;
  excavation_control: ExcavationControl;
  trend_analysis: TrendAnalysis;
}

export interface SuctionSystemResponse {
  data: SuctionSystemData[];
}

// Service functions with multiple endpoint attempts
export const SuctionSystemService = {
  async getSuctionSystem(): Promise<SuctionSystemData> {
    const endpoints = [
      "/suction-system"
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting API call to: ${API_BASE_URL}${endpoint}`);
        
        const response = await api.get<SuctionSystemResponse>(endpoint);
        
        if (response.data && response.data.data && response.data.data.length > 0) {
          console.log("API call successful:", response.data);
          return response.data.data[response.data.data.length - 1];
        }
        
        throw new Error("No data received from API");
      } catch (error: any) {
        console.log(`Failed endpoint ${endpoint}:`, error.response?.status, error.message);
        
        // If this is the last endpoint, throw the error
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw new Error(`All API endpoints failed. Last error: ${error.response?.status || error.message}`);
        }
      }
    }
    
    throw new Error("No working API endpoint found");
  },

  // Get SSE URL for real-time suction system data
  getSSEUrl(): string {
    return `${API_BASE_URL}/suction-system`;
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

export default SuctionSystemService;