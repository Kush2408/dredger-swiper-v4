import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Skeleton, ChartSkeleton, MetricCardSkeleton, Spinner } from "../components";
import { dashboardService } from "../services/dashboardService";
import { useCachedSSE } from "../hooks/useCachedSSE";
import { CACHE_KEYS } from "../services/dataCacheService";
import "../styles/dashboard.css";
import Chart from "chart.js/auto";

// Minimal shape of dashboard data used in this component
type DashboardData = {
  [key: string]: unknown;
  engine_temperature?: number | string;
  engine_rpm?: number | string;
  power_output?: number | string;
  load_sensor?: number | string;
  depth_sensor?: number | string;
  performance_metrics?: {
    efficiency_performance_metrics?: number[];
    power_output_trend?: number[];
  };
  overall_health?: number[];
  maintenance?: { next_service?: number };
  maintenance_update?: { estimated_completion?: number };
};

export default function Dashboard() {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const portLocationChartRef = useRef<HTMLCanvasElement | null>(null);
  const progressCircleRef = useRef<SVGCircleElement | null>(null);
  const gaugeValueRef = useRef<HTMLDivElement | null>(null);
  const progressTextRef = useRef<SVGTextElement | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Use cached SSE for real-time data updates with caching
  const {
    data,
    loading,
    isCached,
    isStale
  } = useCachedSSE<{ type: string; data?: DashboardData[] }>(dashboardService.getSSEUrl(), {
    cacheKey: CACHE_KEYS.DASHBOARD,
    forceRefresh,
    onMessage: (newData) => {
      console.log("Dashboard data received via SSE:", newData);
      console.log("Message type:", newData?.type);
      console.log("Has dashboard data:", newData?.type === "dashboard" && newData?.data?.[0]);
    },
    onError: (error) => {
      console.error("SSE connection error for dashboard:", error);
    }
  });

  // Reset force refresh after it's been applied
  useEffect(() => {
    if (forceRefresh) {
      setForceRefresh(false);
    }
  }, [forceRefresh]);

  // Extract the first item from the data array for easier access
  // Handle the actual SSE message format: {type: "dashboard", data: [...]}
  const dashboardData: DashboardData | null = data?.type === "dashboard" ? (data?.data?.[0] as DashboardData) : null;

  // Check if we have received dashboard data (not just connection messages)
  const hasDashboardData = data?.type === "dashboard" && dashboardData;

  // Debug logging
  console.log("Current SSE data:", data);
  console.log("Dashboard data:", dashboardData);
  console.log("Has dashboard data:", hasDashboardData);
  console.log("Loading state:", loading);
  console.log("Is cached:", isCached);
  console.log("Is stale:", isStale);

  // Helper function to get a safe value or fallback
  const getSafeValue = useCallback(<T,>(value: T | null | undefined, fallback: T): T => {
    // If value is a number, ensure it's not NaN
    if (typeof (value as unknown) === 'number') {
      return (Number.isNaN(value as unknown as number) ? fallback : (value as T));
    }
    return (value === null || value === undefined ? fallback : (value as T));
  }, []);

  // Helper function to filter out NaN values from arrays
  const filterValidValues = useCallback((arr: unknown[]): number[] => {
    return (Array.isArray(arr) ? arr : [])
      .filter((val): val is number => typeof val === 'number' && !Number.isNaN(val));
  }, []);

  // Helper function to get dynamic heading from API response keys
  const getDynamicHeading = (obj: Record<string, unknown>, patterns: string[]): string => {
    if (!obj || typeof obj !== 'object') return 'Dashboard';

    // Look for keys that match any of the provided patterns (case-insensitive)
    for (const pattern of patterns) {
      for (const [key, value] of Object.entries(obj)) {
        if (new RegExp(pattern, 'i').test(key)) {
          return key;
        }
        // Also check nested objects
        if (value && typeof value === 'object') {
          for (const [subKey] of Object.entries(value as Record<string, unknown>)) {
            if (new RegExp(pattern, 'i').test(subKey)) {
              return subKey;
            }
          }
        }
      }
    }

    // Fallback to first available key or default
    const firstKey = Object.keys(obj)[0];
    return firstKey || 'Dashboard';
  };

  // Helper function to get health-related heading
  const getHealthHeading = (obj: Record<string, unknown>): string => {
    return getDynamicHeading(obj, ['health', 'overall', 'status', 'condition']);
  };

  // Helper function to get performance-related heading
  const getPerformanceHeading = (obj: Record<string, unknown>): string => {
    return getDynamicHeading(obj, ['performance', 'metrics', 'efficiency', 'power', 'output']);
  };

  // Helper function to get alerts-related heading
  const getAlertsHeading = (obj: Record<string, unknown>): string => {
    return getDynamicHeading(obj, ['alerts', 'warnings', 'notifications', 'issues', 'problems']);
  };

  // Helper function to extract alerts data from API response
  const getAlertsData = (obj: Record<string, unknown>): Array<{ sensor: string, status: string, severity: 'high' | 'medium' | 'low' }> => {
    if (!obj || typeof obj !== 'object') return [];

    // Look for alerts object in the response
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes('alert') && value && typeof value === 'object') {
        const alertsObj = value as Record<string, unknown>;
        return Object.entries(alertsObj).map(([sensor, status]) => {
          const statusStr = String(status).toLowerCase();
          let severity: 'high' | 'medium' | 'low' = 'low';

          if (statusStr.includes('high') || statusStr.includes('critical') || statusStr.includes('danger')) {
            severity = 'high';
          } else if (statusStr.includes('medium') || statusStr.includes('warning') || statusStr.includes('caution')) {
            severity = 'medium';
          }

          return {
            sensor: sensor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            status: String(status),
            severity
          };
        });
      }
    }

    return [];
  };

  // Helper function to get alert count
  const getAlertCount = (obj: Record<string, unknown>): number => {
    return getAlertsData(obj).length;
  };

  //changes
  // Presence guards
  const hasScalar = (obj: Record<string, unknown>, key: string) => {
    const v = obj?.[key];
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    if (typeof v === "number" && Number.isNaN(v)) return false;
    return true;
  };
  // removed unused helpers hasArray and hasNestedArray

  // Helpers to dynamically render top metric cards from scalar fields
  const formatTitle = (rawKey: string): string => {
    return rawKey
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const getTopMetricEntries = (obj: Record<string, unknown>): Array<[string, unknown]> => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).filter(([key, value]) => {
      // Only show primitive scalars (number/string) for the top row
      return hasScalar(obj, key) && (typeof value === 'number' || typeof value === 'string');
    });
  };

  const formatDisplayValue = (value: unknown): string | number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;
    return '-';
  };

  // Estimated skeleton count for top metrics while loading (fallback to a sensible minimum)
  const topMetricPreviewSource = (dashboardData ?? {}) as Record<string, unknown>;
  const estimatedTopMetricCount = Math.max(getTopMetricEntries(topMetricPreviewSource).length, 4);

  // Provide non-repeating icons per key (specific mapping first, then deterministic fallback)
  const ICON_MAP: Record<string, { icon: string; color: string }> = {
    engine_temperature: { icon: 'fas fa-temperature-low', color: 'text-red-400' },
    engine_rpm: { icon: 'fas fa-tachometer-alt', color: 'text-green-400' },
    power_output: { icon: 'fas fa-battery-three-quarters', color: 'text-yellow-400' },
    load_sensor: { icon: 'fas fa-weight-hanging', color: 'text-indigo-400' },
    depth_sensor: { icon: 'fas fa-water', color: 'text-blue-400' }
  };
  const ICON_POOL: Array<{ icon: string; color: string }> = [
    { icon: 'fas fa-gauge-high', color: 'text-blue-400' },
    { icon: 'fas fa-cogs', color: 'text-indigo-400' },
    { icon: 'fas fa-bolt', color: 'text-yellow-400' },
    { icon: 'fas fa-wave-square', color: 'text-pink-400' },
    { icon: 'fas fa-fan', color: 'text-teal-400' },
    { icon: 'fas fa-compass', color: 'text-orange-400' },
    { icon: 'fas fa-microchip', color: 'text-cyan-400' },
    { icon: 'fas fa-signal', color: 'text-lime-400' },
  ];
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  const getIconMetaForKey = (key: string): { icon: string; color: string } => {
    const keyLower = key.toLowerCase().replace(/_/g, ' ');
    for (const [mapKey, meta] of Object.entries(ICON_MAP)) {
      if (keyLower.includes(mapKey.replace(/_/g, ' '))) return meta;
    }
    const idx = hashString(key) % ICON_POOL.length;
    return ICON_POOL[idx];
  };

  const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const toRgba = (hexOrRgb: string, alpha: number) => {
    const c = hexOrRgb;
    if (c.startsWith('#')) {
      const bigint = parseInt(c.slice(1), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (c.startsWith('rgb')) {
      return c.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    return c;
  };

  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setTheme(event.detail.theme);
    };
    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  // Chart helpers for dynamic datasets
  const isChartCandidate = (value: unknown) =>
    Array.isArray(value) && value.length >= 2 && value.every((n) => typeof n === 'number' && !Number.isNaN(n));

  useEffect(() => {
    if (!dashboardData) return;

    let chart: Chart | null = null;
    let portLocationChart: Chart | null = null;

    // Theme-aware colors
    const textColor = getCssVar('--text-secondary') || '#9ca3af';
    const gridColor = toRgba(getCssVar('--text-secondary') || '#9ca3af', 0.3);

    // Performance Metrics Chart (dynamic datasets based on available numeric arrays)
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        // Build datasets from performance_metrics object dynamically
        const perf = (dashboardData.performance_metrics ?? {}) as Record<string, unknown>;
        const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        const datasets = Object.entries(perf)
          .filter(([, v]) => isChartCandidate(v))
          .map(([k, v], i) => {
            const series = filterValidValues(v as number[]);
            return {
              label: formatTitle(k),
              data: series,
              borderColor: palette[i % palette.length],
              backgroundColor: toRgba(palette[i % palette.length], 0.1),
              borderWidth: 2,
              tension: 0.4,
              fill: true
            };
          });

        // Fallback to previous keys if no dynamic series found
        const fallbackDatasets = [
          {
            label: 'Efficiency',
            data: filterValidValues((dashboardData.performance_metrics?.efficiency_performance_metrics as number[] | undefined) || []),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          },
          {
            label: 'Power Output',
            data: filterValidValues((dashboardData.performance_metrics?.power_output_trend as number[] | undefined) || []),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }
        ];

        const finalDatasets = datasets.length > 0 ? datasets : fallbackDatasets.filter(d => (d.data as number[]).length > 0);

        chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
            datasets: finalDatasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: textColor,
                  font: { family: 'Roboto Mono' }
                }
              }
            },
            scales: {
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              },
              y: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              }
            }
          }
        });
      }
    }

    // Port Location Chart
    if (portLocationChartRef.current) {
      const ctx = portLocationChartRef.current.getContext("2d");
      if (ctx) {
        const generateVesselData = () => {
          const baseLat = 51.8875;
          const baseLon = 4.3575;
          const positions = [];

          const healthData = filterValidValues(dashboardData.overall_health || [85, 87, 89, 88, 90, 92, 91]);

          for (let i = 0; i < healthData.length; i++) {
            const health = healthData[i];
            const stability = health / 100;
            const latVariation = (Math.random() - 0.5) * 0.001 * (1 - stability);
            const lonVariation = (Math.random() - 0.5) * 0.001 * (1 - stability);

            positions.push({
              lat: baseLat + latVariation,
              lon: baseLon + lonVariation,
              timestamp: `${i * 4}:00`
            });
          }

          return positions;
        };

        const vesselData = generateVesselData();

        portLocationChart = new Chart(ctx, {
          type: "scatter",
          data: {
            datasets: [
              {
                label: 'Vessel Position',
                data: vesselData.map((pos) => ({
                  x: pos.lon,
                  y: pos.lat
                })),
                backgroundColor: '#10b981',
                borderColor: '#059669',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
              },
              {
                label: 'Port Location',
                data: [{
                  x: 4.3575,
                  y: 51.8875
                }],
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 10,
                pointStyle: 'rect'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: textColor,
                  font: { family: 'Roboto Mono' }
                }
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const dataIndex = context.dataIndex;
                    if (context.datasetIndex === 0 && vesselData[dataIndex]) {
                      return `Vessel: ${vesselData[dataIndex].timestamp}`;
                    }
                    return 'Port Location';
                  }
                }
              }
            },
            scales: {
              x: {
                type: 'linear',
                position: 'bottom',
                title: {
                  display: true,
                  text: 'Longitude',
                  color: textColor
                },
                grid: { color: gridColor },
                ticks: { color: textColor }
              },
              y: {
                type: 'linear',
                title: {
                  display: true,
                  text: 'Latitude',
                  color: textColor
                },
                grid: { color: gridColor },
                ticks: { color: textColor }
              }
            }
          }
        });
      }
    }

    const interval = setInterval(() => {
      if (gaugeValueRef.current) {
        const validHealth = filterValidValues((dashboardData.overall_health as number[] | undefined) || []);
        const healthValue = validHealth.length > 0 ? validHealth[validHealth.length - 1] : 85;
        gaugeValueRef.current.textContent = `${healthValue}%`;
      }
      if (progressCircleRef.current && progressTextRef.current) {
        const progress = getSafeValue<number>(dashboardData.maintenance?.next_service, 72);
        const circumference = 251.2;
        const offset = circumference - (progress / 100) * circumference;
        progressCircleRef.current.style.strokeDashoffset = `${offset}`;
        progressTextRef.current.textContent = `${progress}%`;
      }
    }, 5000);

    const onThemeChange = () => {
      // rebuild charts on theme change
      if (chart) { chart.destroy(); chart = null; }
      if (portLocationChart) { portLocationChart.destroy(); portLocationChart = null; }
      // Charts will be rebuilt when data changes via SSE
      console.log('Theme changed, charts will update automatically');
    };
    window.addEventListener('themechange', onThemeChange);

    return () => {
      clearInterval(interval);
      if (chart) chart.destroy();
      if (portLocationChart) portLocationChart.destroy();
      window.removeEventListener('themechange', onThemeChange);
    };
  }, [dashboardData, filterValidValues, getSafeValue, theme]);

  return (
    <div className="min-h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden relative">
        {/* Connection Status Banner */}
        {/* {error && (
          <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center space-x-2 mb-4 rounded-lg">
            <i className="fas fa-exclamation-triangle"></i>
            <span className="text-sm font-medium">Connection Error: {error}</span>
          </div>
        )}
        {!isConnected && !error && (
          <div className="bg-yellow-600 text-white px-4 py-2 flex items-center justify-center space-x-2 mb-4 rounded-lg">
            <i className="fas fa-spinner fa-spin"></i>
            <span className="text-sm font-medium">Connecting to real-time data stream...</span>
          </div>
        )}
        {isConnected && (
          <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-center space-x-2 mb-4 rounded-lg">
            <i className="fas fa-check-circle"></i>
            <span className="text-sm font-medium">Connected to real-time data stream</span>
          </div>
        )} */}

        {/* Cache Status and Refresh Button */}
        {/* <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            {isCached && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isStale ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="text-sm text-gray-400">
                  {isStale ? 'Data is cached (stale)' : 'Data is cached (fresh)'}
                </span>
              </div>
            )}
            {!isCached && !loading && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-400">Live data</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setForceRefresh(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            disabled={loading}
          >
            <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div> */}

        {/* Top Metrics Row */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4 mb-6 relative z-10">
          {loading || !hasDashboardData ? (
            <>
              {Array.from({ length: estimatedTopMetricCount }).map((_, i) => (
                <MetricCardSkeleton key={`metric-skel-${i}`} />
              ))}
            </>
          ) : (
            <>
              {getTopMetricEntries(dashboardData as Record<string, unknown>).map(([key, value]) => {
                const { icon, color } = getIconMetaForKey(key);
                return (
                  <div key={key} className="bg-gray-800 rounded-lg p-4 flex items-center border border-gray-700">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                      <i className={`${icon} ${color} text-xl`}></i>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{formatTitle(key)}</div>
                      <div className={`text-xl font-bold ${color}`}>{formatDisplayValue(value)}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>


        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Overall Health Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                {dashboardData ? getHealthHeading(dashboardData as Record<string, unknown>) : 'Engine Health'}
              </h3>
              <i className="fas fa-ship text-gray-400"></i>
            </div>

            <div className="flex justify-center">
              {!dashboardData ? (
                <div className="flex items-center justify-center w-32 h-32">
                  <Spinner variant="dual-ring" size="xl" color="primary" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-sky-300"
                      fill="transparent"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      className="text-gray-500"
                      strokeDasharray="282.6"
                      strokeDashoffset={(() => {
                        const validHealth = filterValidValues((dashboardData?.overall_health as number[] | undefined) || []);
                        const lastHealth = validHealth.length > 0 ? validHealth[validHealth.length - 1] : 85;
                        return 282.6 - (lastHealth / 100) * 282.6;
                      })()}
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold text-gray-400">
                    {(() => {
                      const healthVals = filterValidValues((dashboardData?.overall_health as number[] | undefined) || []);
                      const lastHealth = healthVals.length > 0 ? healthVals[healthVals.length - 1] : 85;
                      return `${Math.round(lastHealth)}%`;
                    })()}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-sm">
              <div className="flex justify-between">
                <span className="text-green-400">Optimal</span>
                <span className="text-purple-400">Warning</span>
                <span className="text-red-400">Critical</span>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                {dashboardData ? getAlertsHeading(dashboardData as Record<string, unknown>) : 'Alerts'}
              </h3>
              <div className="relative">
                <i className="fas fa-bell text-yellow-400"></i>
                {dashboardData && getAlertCount(dashboardData as Record<string, unknown>) > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold pulse">
                    {getAlertCount(dashboardData as Record<string, unknown>)}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {loading || !hasDashboardData ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start">
                      <Skeleton variant="avatar" className="w-2 h-2 rounded-full mt-1.5 mr-2" />
                      <div className="flex-1">
                        <Skeleton variant="text" className="w-24 mb-1" />
                        <Skeleton variant="text" className="w-16" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (() => {
                const alerts = getAlertsData(dashboardData as Record<string, unknown>);
                if (alerts.length === 0) {
                  return (
                    <div className="text-center text-gray-400 py-4">
                      <i className="fas fa-check-circle text-green-400 text-2xl mb-2"></i>
                      <div className="text-sm">No alerts at this time</div>
                    </div>
                  );
                }
                return alerts.map((alert, index) => {
                  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
                    switch (severity) {
                      case 'high': return 'bg-red-500';
                      case 'medium': return 'bg-yellow-500';
                      case 'low': return 'bg-blue-500';
                      default: return 'bg-gray-500';
                    }
                  };

                  return (
                    <div key={index} className="flex items-start">
                      <div className={`w-2 h-2 ${getSeverityColor(alert.severity)} rounded-full mt-1.5 mr-2`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-100">{alert.sensor}</div>
                        <div className="text-xs text-gray-400">{alert.status}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>


          {/* //changes */}
          {/* Maintenance Card */}
          {/* <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">Maintenance</h3>
              <i className="fas fa-tools text-blue-400"></i>
            </div>
            {loading || !hasDashboardData ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <Skeleton variant="text" className="w-20" />
                    <Skeleton variant="text" className="w-8" />
                  </div>
                  <Skeleton variant="text" className="h-2 mt-3" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-700 rounded p-2">
                      <Skeleton variant="text" className="w-16 mb-3" />
                      <Skeleton variant="text" className="w-12 mb-3" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1 text-gray-300">
                    <span>Next Service</span>
                    <span>{Math.round(getSafeValue(dashboardData.maintenance?.next_service, 72))}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${getSafeValue(dashboardData.maintenance?.next_service, 72)}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-300">Oil Change</div>
                    <div className="font-bold text-gray-100">Due in 14d</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-300">Filter Check</div>
                    <div className="font-bold text-gray-100">Due in 7d</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-300">System Scan</div>
                    <div className="font-bold text-gray-100">Running</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-gray-300">Hull Inspect</div>
                    <div className="font-bold text-gray-100">OK</div>
                  </div>
                </div>
              </>
            )}
          </div> */}

          {/* Maintenance Update Card */}
          {/* <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">Maintenance Update</h3>
              <i className="fas fa-sync-alt text-green-400"></i>
            </div>
            <div className="flex justify-center mb-4">
              {loading || !hasDashboardData ? (
                <div className="flex items-center justify-center w-24 h-24">
                  <Spinner variant="dual-ring" size="lg" color="success" />
                </div>
              ) : (
                <svg className="progress-ring" viewBox="0 0 100 100">
                  <circle className="text-gray-500" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle
                    ref={progressCircleRef}
                    className="progress-ring-circle text-sky-300"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={(() => {
                      const nextService = getSafeValue(dashboardData.maintenance?.next_service, 72);
                      return 251.2 - (nextService / 100) * 251.2;
                    })()}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <text
                    ref={progressTextRef as any}
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dy=".3em"
                    className="text-xl font-bold fill-current text-gray-400"
                  >
                    {Math.round(getSafeValue(dashboardData.maintenance?.next_service, 72))}%
                  </text>
                </svg>
              )}
            </div>
            <div className="text-center text-sm">
              {loading || !hasDashboardData ? (
                <div className="flex flex-col items-center space-y-2">
                  <Spinner variant="pulse-dots" size="sm" color="success" />
                  <div className="text-gray-400 text-xs">Loading update status...</div>
                </div>
              ) : (
                <>
                  <div className="mb-1 text-gray-100">System Update in Progress</div>
                  <div className="text-gray-400">Estimated completion: {Math.round(getSafeValue(dashboardData.maintenance_update?.estimated_completion, 15))}min</div>
                </>
              )}
            </div>
          </div> */}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 h-64">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">
                {dashboardData ? getPerformanceHeading(dashboardData as Record<string, unknown>) : 'Performance Metrics'}
              </h3>
              <i className="fas fa-chart-bar text-blue-400"></i>
            </div>
            <div className="relative h-48">
              {loading || !hasDashboardData ? (
                <ChartSkeleton type="line" height="h-40" />
              ) : (
                <canvas ref={chartRef} />
              )}
            </div>
          </div>

          {/* <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 h-64">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">Port Location</h3>
              <i className="fas fa-map-marked-alt text-green-400"></i>
            </div>
            <div className="relative h-48">
              {loading || !hasDashboardData ? (
                <ChartSkeleton type="line" height="h-40" />
              ) : (
                <canvas ref={portLocationChartRef} />
              )}
            </div>
          </div> */}
        </div>

        {/* Bottom Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4">
          <Link to="/engine-propulsion">
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center h-28 border border-gray-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-cogs text-gray-400"></i>
              </div>
              <div className="text-xs text-center font-medium text-gray-100">Engine & Propulsion</div>
            </div>
          </Link>

          <Link to="/suction-system">
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center h-28 border border-gray-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-arrow-down text-gray-400"></i>
              </div>
              <div className="text-xs text-center font-medium text-gray-100">Suction System</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}