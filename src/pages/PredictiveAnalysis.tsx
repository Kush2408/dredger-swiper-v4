import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import Chart from "chart.js/auto";
import type { Chart as ChartJS } from "chart.js";
import "../styles/predictive.css";
import { predictiveAnalysisService } from "../services/predictiveAnalysisService";
import { useCachedSSE } from "../hooks/useCachedSSE";
import { CACHE_KEYS } from "../services/dataCacheService";

type Alert = { title: string; status: string; severity: 'high' | 'medium' | 'low' };

interface SystemOverview {
  [key: string]: number;
}

interface EngineHealthTrend {
  engine_health_trend: number[];
}

interface SuctionEfficiencyTrend {
  suction_efficiency_trend: number[];
}

interface DredgingPerformance {
  dredging_performance: number[];
}

interface EnginePropulsionHealth {
  [key: string]: number;
}

interface SuctionSystemPerformance {
  [key: string]: number;
}

interface PredictiveMaintenanceForecast {
  engine_health_score: number[];
}

interface PerformancePredictiveTrends {
  [key: string]: number[];
}

interface SystemDetailedMetrics {
  [key: string]: number[];
}

interface PredictiveAnalysisData {
  system_overview: SystemOverview;
  engine_health_trend: EngineHealthTrend;
  suction_efficiency_trend: SuctionEfficiencyTrend;
  dredging_performance: DredgingPerformance;
  engine_propulsion_health: EnginePropulsionHealth;
  suction_system_performance: SuctionSystemPerformance;
  predictive_maintenance_forecast: PredictiveMaintenanceForecast;
  performance_predictive_trends: PerformancePredictiveTrends;
  system_detailed_metrics: SystemDetailedMetrics;
  alerts?: Alert[];
}


// Data normalization utility
const normalizeApiData = (raw: any): PredictiveAnalysisData | null => {
  if (!raw) return null;

  const dataItem = raw?.data ?? raw;

  if (!dataItem || typeof dataItem !== 'object') return null;

  // Dynamically find alerts, supporting different possible keys
  const alertsRaw = dataItem.system_alerts || dataItem.alerts || dataItem['System Alerts'];
  let alerts: Alert[] | undefined;
  if (alertsRaw && typeof alertsRaw === 'object') {
    alerts = Object.entries(alertsRaw).map(([title, status]) => {
      const s = String(status).toLowerCase();
      const severity = /high|critical|danger|error/i.test(s) ? 'high'
        : /warn|medium|warning/i.test(s) ? 'medium'
        : 'low';
      return { title, status: String(status), severity };
    });
  }

  // Map the API data structure to our expected structure
  return {
    system_overview: dataItem.system_overview ?? {},
    engine_health_trend: {
      engine_health_trend: dataItem.engine_health_trend?.["Engine_Health_Score"] ?? []
    },
    suction_efficiency_trend: {
      suction_efficiency_trend: dataItem.suction_efficiency_trend?.["Suction_Efficiency_Index"] ?? []
    },
    dredging_performance: {
      dredging_performance: dataItem.dredging_performance?.["Dredging Efficiency Index"] ?? []
    },
    engine_propulsion_health: dataItem.engine_propulsion_health ?? {},
    suction_system_performance: dataItem.suction_system_performance ?? {},
    predictive_maintenance_forecast: {
      engine_health_score: dataItem.predictive_maintenance_forecast?.["Engine_Health_Score"] ?? []
    },
    performance_predictive_trends: dataItem.performance_predictive_trends ?? {},
    system_detailed_metrics: dataItem.system_detailed_metrics ?? {},
    alerts
  };
};

// Default data structure with 0.0 values for the initial render
const defaultData: PredictiveAnalysisData = {
  system_overview: {
    "Engine_Health_Score": 0.0,
    "Suction_Efficiency_Index": 0.0,
    "Dredging Efficiency Index": 0.0,
  },
  engine_health_trend: { engine_health_trend: [] },
  suction_efficiency_trend: { suction_efficiency_trend: [] },
  dredging_performance: { dredging_performance: [] },
  engine_propulsion_health: {
    "Thermal_Stress_Index": 0.0,
    "Mechanical_Efficiency": 0.0,
    "Cooling_Efficiency": 0.0,
    "Propulsion_Alignment": 0.0,
  },
  suction_system_performance: {
    "Pressure_Fluctuation_Std": 0.0,
    "Cutter_Resistance_Index": 0.0,
    "Turbidity_to_Torque_Ratio": 0.0,
    "Flow Stability Factor (FSF)": 0.0,
  },
  predictive_maintenance_forecast: { engine_health_score: [] },
  performance_predictive_trends: {
    "Dredging Efficiency Index": [],
    "Turbidity Efficiency Score (TES)": [],
  },
  system_detailed_metrics: {
    Shaft_RPM: [],
    Engine_RPM: [],
    Bearing_Temperature: [],
    Suction_Pipe_Pressure: [],
    Turbidity: [],
    Cutter_Torque: [],
  },
  alerts: []
};

export default function PredictiveAnalysis() {
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [displayData, setDisplayData] = useState<PredictiveAnalysisData | null>(defaultData);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Use cached SSE for real-time data updates with caching - only when live mode is enabled
  const { 
    data: rawData, 
    loading, 
    isCached, 
    isStale
  } = useCachedSSE<any>(isLiveMode ? predictiveAnalysisService.getSSEUrl() : '', {
    cacheKey: CACHE_KEYS.PREDICTIVE_ANALYSIS,
    forceRefresh,
    onMessage: (msg: any) => {
      console.log("📩 Predictive Analysis Message:", msg);
    },
    onError: (err: any) => {
      console.log("❌ Predictive Analysis Error:", err);
    }
  });

  // Memoize normalized data, falling back to default data for initial render
  const normalizedSseData = useMemo(() => {
    // If loading for the first time and we have no cached data, don't normalize anything yet.
    if (initialDataLoading && !isCached) return null;
    const normalized = normalizeApiData(rawData);
    return normalized || (isLiveMode ? null : defaultData);
  }, [rawData, isLiveMode, initialDataLoading, isCached]);

  useEffect(() => {
    // Don't update display data if we are in the middle of connecting to live
    if (isConnecting) return;

    // Once SSE is no longer loading, we can consider the initial data load complete.
    if (!loading && initialDataLoading) {
      setInitialDataLoading(false);
    }
    setDisplayData(normalizedSseData);
  }, [normalizedSseData, isConnecting]);

  // Check if we have received the actual data payload, not just connection messages
  useEffect(() => {
    if (normalizedSseData && rawData) setIsConnecting(false);
  }, [normalizedSseData, rawData]);

  // Helper to format titles from API keys
  const formatTitle = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Helper to get status based on value
  const getStatus = (value: number) => {
    if (value < 0) return { text: 'Critical', className: 'bg-red-900 text-red-300' };
    if (value < 0.5) return { text: 'Warning', className: 'bg-yellow-900 text-yellow-300' };
    return { text: 'Optimal', className: 'bg-green-900 text-green-300' };
  };

  // Dynamic data for cards
  const systemOverviewCards = useMemo(() => {
    const overview = displayData?.system_overview;
    if (!overview) return [];
    return Object.entries(overview).map(([key, value]) => ({
      title: key, // Use the raw key for the title
      value,
      status: getStatus(value),
      icon: key.toLowerCase().includes('engine') ? 'fa-engine' : key.toLowerCase().includes('suction') ? 'fa-water' : 'fa-tachometer-alt',
      iconColor: key.toLowerCase().includes('engine') ? 'text-blue-400' : key.toLowerCase().includes('suction') ? 'text-green-400' : 'text-purple-400',
    }));
  }, [displayData?.system_overview]);

  const engineHealthCards = useMemo(() => {
    const health = displayData?.engine_propulsion_health;
    if (!health) return [];
    return Object.entries(health).map(([key, value]) => ({
      title: formatTitle(key),
      value,
      status: getStatus(value),
    }));
  }, [displayData?.engine_propulsion_health]);

  const suctionSystemCards = useMemo(() => {
    const performance = displayData?.suction_system_performance;
    if (!performance) return [];
    return Object.entries(performance).map(([key, value]) => ({
      title: formatTitle(key),
      value,
      status: getStatus(value),
    }));
  }, [displayData?.suction_system_performance]);

  const systemAlerts = useMemo(() => {
    if (!displayData?.alerts || displayData.alerts.length === 0) return null;
    return displayData.alerts;
  }, [displayData?.alerts]);

  // Reset force refresh after it's been applied
  useEffect(() => {
    if (forceRefresh) {
      setForceRefresh(false);
    }
  }, [forceRefresh]);

  const handleConnect = () => {
    console.log("🔄 Live mode activated");
    setIsLiveMode(true);
    setInitialDataLoading(false); // No longer in initial loading state
    setDisplayData(null); // Clear current data to show skeletons
    setIsConnecting(true);
    setForceRefresh(true);
  };


  // Chart registry for cleanup
  const charts: Record<string, ChartJS> = {};
  const reg = (id: string, ch: ChartJS): ChartJS => {
    charts[id]?.destroy();
    charts[id] = ch;
    return ch;
  };
  const destroyAll = () => Object.values(charts).forEach(c => c.destroy());

  useEffect(() => {
    if (!displayData || isConnecting || initialDataLoading) return;

    // Initialize gauges with real API data
    const updateGauge = (gaugeElementId: string, value: number, valueElementId: string) => {
      const gauge = document.querySelector(`#${gaugeElementId} .gauge-fill`);
      const valueElement = document.getElementById(valueElementId);

      if (gauge && valueElement) {
        const safeValue = Math.max(0, Math.min(1, value));
        const rotation = 0.5 + (safeValue * 0.5);
        let displayValue: string;

        if (Math.abs(value) > 0 && Math.abs(value) < 0.001) {
          // Use scientific notation for very small non-zero numbers
          displayValue = value.toExponential(2);
        } else {
          displayValue = value.toFixed(3);
        }

        (gauge as HTMLElement).style.transform = `rotate(${rotation}turn)`;
        valueElement.textContent = displayValue;
        
        if (value < 0) {
          valueElement.style.color = '#ef4444'; // Red color for negative values
        } else {
          valueElement.style.color = '#f3f4f6'; // Default color for positive values
        }
      }
    };

    if (displayData?.system_overview) {
      Object.entries(displayData.system_overview).forEach(([key, value]) => {
        const gaugeId = `${key.toLowerCase().replace(/ /g, '-')}-gauge`;
        const valueId = `${key.toLowerCase().replace(/ /g, '-')}-value`;
        updateGauge(gaugeId, value, valueId);
      });
    }

    const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const createTrendChart = (canvasId: string, data: number[], color: string) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) {
        console.error(`Canvas element not found: ${canvasId}`);
        return;
      }

      const ctx = canvas.getContext('2d')!;
      const labels = Array.from({ length: data.length }, (_, i) => i);

      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = getCssVar('--border-color') || '#374151';

      return reg(canvasId, new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Actual',
              data: data,
              borderColor: color,
              backgroundColor: 'rgba(0, 0, 0, 0)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: {
              min: -1,
              max: 1,
              ticks: { stepSize: 0.2, color: textColor },
              grid: { color: gridColor }
            },
            x: { 
              display: false,
              grid: { color: gridColor }
            }
          }
        }
      }));
    };

    const createMaintenanceForecastChart = (canvasId: string) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = getCssVar('--border-color') || '#374151';

      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

      const forecastData = displayData?.predictive_maintenance_forecast?.engine_health_score || [];

      return reg(canvasId, new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array.from({ length: forecastData.length }, (_, i) => i),
          datasets: [{
            label: 'Engine Health Score',
            data: forecastData,
            backgroundColor: gradient,
            borderColor: '#3B82F6',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
          scales: {
            y: { min: -1, max: 1, ticks: { stepSize: 0.2, color: textColor }, grid: { color: gridColor } },
            x: { grid: { color: gridColor } }
          }
        }
      }));
    };

    const createPerformanceForecastChart = (canvasId: string) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = getCssVar('--border-color') || '#374151';

      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

      const dredgingData = displayData?.performance_predictive_trends?.["Dredging Efficiency Index"] || [];
      const turbidityData = displayData?.performance_predictive_trends?.["Turbidity Efficiency Score (TES)"] || [];

      return reg(canvasId, new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array.from({ length: Math.max(dredgingData.length, turbidityData.length) }, (_, i) => i),
          datasets: [
            {
              label: 'Dredging Efficiency',
              data: dredgingData,
              backgroundColor: gradient,
              borderColor: '#10B981',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Turbidity Efficiency',
              data: turbidityData,
              borderColor: '#F59E0B',
              borderWidth: 2,
              tension: 0.4,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
          scales: {
            y: { min: -0.2, max: 0.2, ticks: { stepSize: 0.05, color: textColor }, grid: { color: gridColor } },
            x: { grid: { color: gridColor } }
          }
        }
      }));
    };

    const createDetailedChart = (canvasId: string, datasets: any[]) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = getCssVar('--border-color') || '#374151';

      const maxDataLength = Math.max(...datasets.map(d => d.data.length));

      return reg(canvasId, new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array.from({ length: maxDataLength }, (_, i) => i),
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, color: textColor, pointStyle: 'circle' } },
            tooltip: { mode: 'index', intersect: false }
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { display: false, grid: { color: gridColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      }));
    };

    // Create trend charts for system overview
    if (displayData.system_overview) {
      const trendDataMap = {
        "Engine_Health_Score": displayData.engine_health_trend.engine_health_trend,
        "Suction_Efficiency_Index": displayData.suction_efficiency_trend.suction_efficiency_trend,
        "Dredging Efficiency Index": displayData.dredging_performance.dredging_performance,
      };
      const colors = ['#3B82F6', '#10B981', '#8B5CF6'];
      Object.keys(displayData.system_overview).forEach((key, index) => {
        const trendCanvasId = `${key.toLowerCase().replace(/ /g, '-')}-trend`;
        const trendData = (trendDataMap as any)[key] || [];
        createTrendChart(trendCanvasId, trendData, colors[index % colors.length]);
      });
    }

    createMaintenanceForecastChart('engineMaintenanceForecast');
    createPerformanceForecastChart('suctionPerformanceForecast');

    if (displayData?.system_detailed_metrics) {
      createDetailedChart('propulsionDetailedChart', [
        { label: 'Shaft RPM', data: displayData.system_detailed_metrics.Shaft_RPM || [], borderColor: '#3B82F6', borderWidth: 1, pointRadius: 0, backgroundColor: 'transparent' },
        { label: 'Engine RPM', data: displayData.system_detailed_metrics.Engine_RPM || [], borderColor: '#10B981', borderWidth: 1, pointRadius: 0, backgroundColor: 'transparent' },
        { label: 'Bearing Temp', data: displayData.system_detailed_metrics.Bearing_Temperature || [], borderColor: '#EF4444', borderWidth: 1, pointRadius: 0, backgroundColor: 'transparent' }
      ]);

      createDetailedChart('suctionDetailedChart', [
        { label: 'Pressure', data: displayData.system_detailed_metrics.Suction_Pipe_Pressure || [], borderColor: '#3B82F6', borderWidth: 1, pointRadius: 0, backgroundColor: 'transparent' },
        { label: 'Turbidity', data: displayData.system_detailed_metrics.Turbidity || [], borderColor: '#10B981', borderWidth: 1, pointRadius: 0, backgroundColor: 'transparent' },
        { label: 'Cutter Torque', data: displayData.system_detailed_metrics.Cutter_Torque || [], borderColor: '#8B5CF6', borderWidth: 1, pointRadius: 0, backgroundColor: 'transparent' }
      ]);
    }

    const onThemeChange = () => {
      destroyAll();
    };
    window.addEventListener('themechange', onThemeChange);

    return () => {
      destroyAll();
      window.removeEventListener('themechange', onThemeChange);
    };
  }, [displayData, isConnecting, theme, initialDataLoading]);

  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setTheme(event.detail.theme);
    };
    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-900 text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
          <div className="container mx-auto px-4 py-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <i className="fas fa-ship text-3xl"></i>
              <h1 className="text-2xl font-bold">Dredger Predictive Analytics Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleConnect} 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed ${
                  isConnecting
                    ? 'bg-yellow-600 text-white cursor-wait' 
                    : isLiveMode 
                      ? 'bg-green-600 text-white opacity-75' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={isLiveMode}
              >
                {loading && isLiveMode ? 'Connecting...' : isLiveMode ? 'Live Active' : 'Go Live'}
              </button>
              <div className="flex items-center space-x-2">
                {isConnecting ? (
                  <>
                    <div className="bg-yellow-500 w-3 h-3 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-400">Connecting</span>
                  </>
                )
                : !isLiveMode ? (
                  <>
                    <div className="bg-gray-500 w-3 h-3 rounded-full"></div>
                    <span className="text-sm text-gray-400">Offline</span>
                  </>
                ) : (
                  <>
                    {isCached && (
                      <div className={`w-3 h-3 rounded-full ${isStale ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    )}
                    {!isCached && !loading && (
                      <div className="bg-blue-500 w-3 h-3 rounded-full animate-pulse"></div>
                    )}
                    <span className="text-sm text-gray-400">
                      {isCached 
                        ? (isStale ? 'Cached (stale)' : 'Cached (fresh)')
                        : 'Live data'
                      }
                    </span>
                  </>
                )}
              </div>
              <span className="font-medium">{currentTime}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto container mx-auto px-4 py-6">
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">System Overview</h2>
              <div className="flex space-x-2">
                <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">Settings</button>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${systemAlerts ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-6`}>
              {isConnecting || !displayData || (loading && initialDataLoading) ? (
                <>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <div className="w-32 h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-6 h-6 bg-gray-700 rounded-full animate-pulse"></div>
                      </div>
                      <div className="mt-2 text-center">
                        <div className="flex items-center justify-center h-32">
                          <div className="w-24 h-24 bg-gray-700 rounded-full animate-pulse"></div>
                        </div>
                        <div className="w-20 h-5 bg-gray-700 rounded mx-auto mt-2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {systemOverviewCards.map((card, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-gray-200">{card.title}</h3>
                        <i className={`fas ${card.icon} ${card.iconColor}`}></i>
                      </div>
                      <div className="mt-2 text-center">
                        <div id={`${card.title.toLowerCase().replace(/ /g, '-')}-gauge`} className="gauge-container">
                          <div className="gauge-body">
                            <div className="gauge-fill"></div>
                            <div className="gauge-cover bg-gray-800">
                              <div id={`${card.title.toLowerCase().replace(/ /g, '-')}-value`} className="gauge-value text-gray-100">
                                {card.value.toFixed(3)}
                              </div>
                              <div className="text-xs font-medium text-gray-400">Score</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center mt-2">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${card.status.className}`}>
                            {card.status.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {systemAlerts && (
                    <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-gray-200">System Alerts</h3>
                        <i className="fas fa-exclamation-triangle text-red-400"></i>
                      </div>
                      <div className="mt-4">
                        <div className="space-y-2">
                          {systemAlerts.map((alert, alertIndex) => {
                            const severityClasses = {
                              high: 'bg-red-900/20 border-red-700/30 text-red-500',
                              medium: 'bg-yellow-900/20 border-yellow-700/30 text-yellow-400',
                              low: 'bg-green-900/20 border-green-700/30 text-green-500',
                            };
                            const pulseClass = alert.severity === 'high' ? 'alert-pulse' : '';
                            return (
                              <div key={alertIndex} className={`flex items-center p-2 rounded ${severityClasses[alert.severity]} ${pulseClass}`}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{alert.title}</p>
                                  <p className="text-xs text-gray-400 truncate">{alert.status}</p>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {systemOverviewCards.map((card, index) => (
                <div key={index} className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-200">{card.title} Trend</h3>
                    <div className={`w-3 h-3 rounded-full ${card.status.className.split(' ')[0].replace('bg-', 'border-')}`}></div>
                  </div>
                  <div className="chart-container" style={{ height: '200px', width: '100%' }}>
                    <canvas id={`${card.title.toLowerCase().replace(/ /g, '-')}-trend`}></canvas>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-200">Engine & Propulsion Health</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {isConnecting || !displayData || (loading && initialDataLoading) ? (
                  <>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="bg-gray-700 p-3 rounded border border-gray-600 animate-pulse">
                        <div className="w-3/4 h-4 bg-gray-600 rounded mb-2"></div>
                        <div className="w-1/2 h-6 bg-gray-600 rounded"></div>
                      </div>
                    ))}
                  </>
                ) : (
                  engineHealthCards.map((card, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded border border-gray-600">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-300">{card.title}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${card.status.className}`}>
                          {card.status.text}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className={`text-2xl font-bold ${card.value < 0 ? 'text-red-400' : 'text-gray-100'}`}>
                          {card.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                        <div className={`${card.status.className.replace('text-', 'bg-').split(' ')[0]} h-1 rounded-full`} style={{ width: `${Math.min(100, Math.abs(card.value))}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Predictive Maintenance Forecast</h3>
                <div className="chart-container" style={{ height: '200px', width: '100%' }}>
                  <canvas id="engineMaintenanceForecast"></canvas>
                </div>
              </div>
            </section>

            <section className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-200">Suction System Performance</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {isConnecting || !displayData || (loading && initialDataLoading) ? (
                  <>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="bg-gray-700 p-3 rounded border border-gray-600 animate-pulse">
                        <div className="w-3/4 h-4 bg-gray-600 rounded mb-2"></div>
                        <div className="w-1/2 h-6 bg-gray-600 rounded"></div>
                      </div>
                    ))}
                  </>
                ) : (
                  suctionSystemCards.map((card, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded border border-gray-600">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-300">{card.title}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${card.status.className}`}>
                          {card.status.text}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className={`text-2xl font-bold ${card.value < 0 ? 'text-red-400' : 'text-gray-100'}`}>
                          {card.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                        <div className={`${card.status.className.replace('text-', 'bg-').split(' ')[0]} h-1 rounded-full`} style={{ width: `${Math.min(100, Math.abs(card.value))}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Performance & Predictive Trends</h3>
                <div className="chart-container" style={{ height: '200px', width: '100%' }}>
                  <canvas id="suctionPerformanceForecast"></canvas>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6">
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-200">System Detailed Metrics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="chart-container" style={{ height: '300px', width: '100%' }}>
                  <canvas id="propulsionDetailedChart"></canvas>
                </div>
                <div className="chart-container" style={{ height: '300px', width: '100%' }}>
                  <canvas id="suctionDetailedChart"></canvas>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
