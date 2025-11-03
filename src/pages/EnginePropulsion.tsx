import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  Skeleton,
  ChartSkeleton,
  MetricCardSkeleton,
  // GaugeSkeleton,
  Spinner
} from "../components";
import "../styles/engine.propulsion.css";
import Chart from "chart.js/auto";
import { useSSE } from "../hooks/useSSE";
import { engineService } from "../services/engineservice";

interface Overview {
  engine_rpm: number;
  shaft_rpm: number;
  thruster_rpm: number;
  turbocharger_rpm: number;
  thruster_load: number;
  system_health: number;
}

// Make this a flexible record to handle any sensor
type TemperatureAndPressure = Record<string, number[]>;

type AlertsAndNotifications = Record<string, string>;

// Make this a flexible record to handle any sensor
type VibrationAndBearing = Record<string, number[]>;

interface TrendAnalysis {
  engine_rpm: number[];
  shaft_rpm: number[];
  exhaust_temp: number[];
  fuel_pressure: number[];
  lube_oil_temp: number[];
  vibration: number[];
}

interface EnginePropulsionData {
  overview: Overview;
  temperature_and_pressure: TemperatureAndPressure;
  vibration_and_bearing: VibrationAndBearing;
  trend_analysis: TrendAnalysis;
  alerts?: AlertsAndNotifications;
  system_status?: Record<string, string>;
}

// SSE Response can be either an object or an array of objects
interface EnginePropulsionSSEResponse {
  data: EnginePropulsionData | EnginePropulsionData[];
}

// Normalized data type for consistent access
interface NormalizedEngineData {
  overview: Overview;
  temperature_and_pressure: TemperatureAndPressure;
  vibration_and_bearing: VibrationAndBearing;
  trend_analysis: TrendAnalysis;
  alerts?: AlertsAndNotifications;
  system_status?: Record<string, string>;
}

export default function EnginePropulsion() {
  // Use SSE for real-time data updates
  const { data: rawData, loading } = useSSE<EnginePropulsionSSEResponse>(engineService.getSSEUrl(), {
    onMessage: (newData) => {
      console.log("Engine propulsion data received via SSE:", newData);
    },
    onError: (error) => {
      console.error("SSE connection error for engine propulsion:", error);
    }
  });

  // Normalize data to handle both array and object responses
  const normalizeData = (rawData: EnginePropulsionSSEResponse | null): NormalizedEngineData | null => {
    if (!rawData?.data) return null;

    // If data is an array, take the first element
    const raw = Array.isArray(rawData.data) ? rawData.data[0] : rawData.data;
    if (!raw) return null;

    // API key mapping: map API sensor names to canonical keys used in this component
    const overviewMap: Record<string, keyof Overview> = {
      'Engine RPM sensor': 'engine_rpm',
      'Shaft RPM sensor': 'shaft_rpm',
      'Thruster RPM sensor': 'thruster_rpm',
      'Turbocharger_RPM': 'turbocharger_rpm',
      'Turbocharger RPM': 'turbocharger_rpm',
      'thruster_load': 'thruster_load',
      'system_health': 'system_health',
    };

    const trendMap: Record<string, keyof TrendAnalysis> = {
      'Engine RPM sensor': 'engine_rpm',
      'Shaft RPM sensor': 'shaft_rpm',
      'Exhaust gas temperature sensor': 'exhaust_temp',
      'Fuel pressure sensor': 'fuel_pressure',
      'Lube oil temperature sensor': 'lube_oil_temp',
      'Vibration sensor (engine/shaft)': 'vibration',
    };

    // Helper to pull mapped value
    const mapOverview = (src: any): Overview => {
      const out: Overview = {
        engine_rpm: 0,
        shaft_rpm: 0,
        thruster_rpm: 0,
        turbocharger_rpm: 0,
        thruster_load: 0,
        system_health: 0,
      };

      if (!src) return out;

      for (const [k, v] of Object.entries(src)) {
        const canonical = overviewMap[k as string];
        const numeric = typeof v === 'number' ? v : Number(v);
        if (canonical) out[canonical] = Number.isFinite(numeric) ? numeric : out[canonical];
      }

      return out;
    };

    const mapDynamicSection = (src: any): Record<string, number[]> => {
      const out: Record<string, number[]> = {};
      if (!src) return out;
      for (const [k, v] of Object.entries(src)) {
        // If the value is an array of numbers, add it to our output object
        if (Array.isArray(v) && v.every(item => typeof item === 'number')) {
          out[k] = v as number[];
        }
      }
      return out;
    };

    const mapTrend = (src: any): TrendAnalysis => {
      const out: TrendAnalysis = {
        engine_rpm: [],
        shaft_rpm: [],
        exhaust_temp: [],
        fuel_pressure: [],
        lube_oil_temp: [],
        vibration: [],
      };
      if (!src) return out;
      for (const [k, v] of Object.entries(src)) {
        const canonical = trendMap[k as string];
        if (canonical && Array.isArray(v)) {
          out[canonical] = v as number[];
        }
      }
      return out;
    };

    const normalized: NormalizedEngineData = {
      overview: mapOverview((raw as any).overview),
      temperature_and_pressure: mapDynamicSection((raw as any).temperature_and_pressure),
      vibration_and_bearing: mapDynamicSection((raw as any).vibration_and_bearing),
      // Correctly map the trend analysis data from its actual key in the API response,
      // ensuring that an empty `trend_analysis` object falls back to the other key.
      trend_analysis: mapTrend(
        ((raw as any).trend_analysis && Object.keys((raw as any).trend_analysis).length > 0)
        ? (raw as any).trend_analysis :
        (raw as any)['Engine Shaft Exhaust Fuel Lube Vibration Sensor Analysis']
      ),
      alerts: (raw as any)['Alerts & Notifications'],
      system_status: (raw as any)['system status'],
    };

    return normalized;
  };

  const data = normalizeData(rawData);


  // Helper to format keys for display
  const formatSensorName = (name: string) => {
    return name.replace(/sensor/gi, '').replace(/_/g, ' ').replace(/\(.*\)/, '').trim().toUpperCase();
  };

  // Helper to determine chart color based on sensor name
  const getChartColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('exhaust') || lowerName.includes('rpm')) return '#ff5555';
    if (lowerName.includes('cooling')) return '#55aaff';
    if (lowerName.includes('lube')) return '#ffaa55';
    if (lowerName.includes('bearing')) return '#ffcc00';
    if (lowerName.includes('vibration')) return '#00ff00';
    return '#9ca3af'; // Default color
  };

  const getVibrationStatus = (key: string, value: number) => {
    const lowerKey = key.toLowerCase();
    // Example thresholds, adjust as needed
    if (lowerKey.includes('vibration')) {
      if (value > 4.5) return { text: 'High', color: 'text-red-400', bg: 'bg-red-500' };
      if (value > 2.8) return { text: 'Warn', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    }
    if (lowerKey.includes('temp')) {
      if (value > 90) return { text: 'High', color: 'text-red-400', bg: 'bg-red-500' };
      if (value > 75) return { text: 'Warn', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    }
    return { text: 'Normal', color: 'text-green-400', bg: 'bg-green-500' };
  };

  useEffect(() => {
    const charts: Record<string, Chart> = {};

    const reg = (id: string, ch: Chart) => {
      charts[id]?.destroy();
      charts[id] = ch;
    };

    const destroyAll = () => {
      Object.values(charts).forEach(c => c.destroy());
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

    const line = (id: string, data: number[], color: string) => {
      const el = document.getElementById(id) as HTMLCanvasElement | null;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;

      Chart.getChart(el)?.destroy();

      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = toRgba(getCssVar('--text-secondary') || '#9ca3af', 0.3);

      const ch = new Chart(ctx, {
        type: "line",
        data: {
          labels: Array(data.length).fill(""),
          datasets: [{
            data,
            borderColor: color,
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false, grid: { color: gridColor }, ticks: { color: textColor } },
            y: {
              display: false,
              min: Math.min(...data) - 5,
              max: Math.max(...data) + 5,
              grid: { color: gridColor },
              ticks: { color: textColor }
            }
          }
        }
      });

      reg(id, ch);
    };

    const spark = (id: string, data: number[], color: string) => {
      const el = document.getElementById(id) as HTMLCanvasElement | null;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;

      Chart.getChart(el)?.destroy();

      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = toRgba(getCssVar('--text-secondary') || '#9ca3af', 0.3);

      const ch = new Chart(ctx, {
        type: "line",
        data: {
          labels: Array(data.length).fill(""),
          datasets: [{
            data,
            borderColor: color,
            borderWidth: 1,
            tension: 0.1,
            fill: false,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false, grid: { color: gridColor }, ticks: { color: textColor } },
            y: {
              display: false,
              min: Math.min(...data) - 0.5,
              max: Math.max(...data) + 0.5,
              grid: { color: gridColor },
              ticks: { color: textColor }
            }
          }
        }
      });

      reg(id, ch);
    };

    // (bar helper removed — not used anymore; bearing temperatures render as sparkline)

    const createPressureGauge = (id: string, value: number, maxValue: number, color: string) => {
      const el = document.getElementById(id) as HTMLCanvasElement | null;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;

      Chart.getChart(el)?.destroy();

      const percentage = Math.min(100, (value / maxValue) * 100);

      const bgTrack = getCssVar('--hover-bg') || '#374151';
      const ch = new Chart(ctx, {
        type: "doughnut",
        data: {
          datasets: [{
            data: [percentage, 100 - percentage],
            backgroundColor: [color, bgTrack],
            borderWidth: 0
          }]
        },
        options: {
          circumference: 270,
          rotation: 225,
          cutout: "80%",
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });

      reg(id, ch);
      return ch;
    };

    const trend = (exhaustTemps: number[], chartTitle: string = "Exhaust Gas Temperature") => {
      const el = document.getElementById("trendChart") as HTMLCanvasElement | null;
      if (!el) return;
      const ctx = el.getContext("2d");
      if (!ctx) return;

      Chart.getChart(el)?.destroy();

      // Create labels that match the data length. If the data is short (<=7) we show recent 7-day labels,
      // otherwise we generate empty labels so Chart.js scales correctly without overcrowding the axis.
      let labels: string[];
      if (!exhaustTemps || exhaustTemps.length === 0) {
        labels = [];
      } else if (exhaustTemps.length <= 7) {
        labels = [];
        for (let i = exhaustTemps.length - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
      } else {
        labels = Array(exhaustTemps.length).fill("");
      }

      const textColor = getCssVar('--text-secondary') || '#9ca3af';
      const gridColor = toRgba(getCssVar('--text-secondary') || '#9ca3af', 0.3);

      const ch = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: `${chartTitle} (°C)`,
            data: exhaustTemps,
            borderColor: "#ff5555",
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointBackgroundColor: "#ff5555",
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                // Show only a few ticks for long datasets: first, middle, last
                callback: function(this: any, _value: any, index: number) {
                  const len = labels.length;
                  if (len <= 7) return labels[index];
                  if (index === 0) return 'start';
                  if (index === Math.floor(len / 2)) return 'mid';
                  if (index === len - 1) return 'now';
                  return '';
                }
              }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor }
            }
          }
        }
      });

      reg("trendChart", ch);
    };

    const updateCharts = (engineData: NormalizedEngineData) => {
      if (!engineData) return;

      console.debug('updateCharts called', {
        exhaust: engineData.temperature_and_pressure?.exhaust_gas_temp?.length,
        cooling: engineData.temperature_and_pressure?.cooling_water_temp?.length,
        lube: engineData.temperature_and_pressure?.['Lube oil temperature sensor']?.length,
      });

      // Dynamically create temperature & pressure charts
      if (engineData.temperature_and_pressure) {
        Object.entries(engineData.temperature_and_pressure).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const canvasId = `chart-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const color = getChartColor(key);
            line(canvasId, values, color);
          }
        });
      }

      // Vibration charts
      if (engineData.vibration_and_bearing) {
        Object.entries(engineData.vibration_and_bearing).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            const canvasId = `chart-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const color = getChartColor(key);
            spark(canvasId, values, color);
          }
        });
      }

      // Pressure gauges
      if (engineData.temperature_and_pressure?.['Fuel pressure sensor']?.length) {
        const fuelValue = getCurrentValue(engineData.temperature_and_pressure['Fuel pressure sensor'], 0);
        createPressureGauge("fuelPressureGauge", fuelValue, 5.0, "#10b981");
      }

      if (engineData.temperature_and_pressure?.['Lube oil pressure sensor']?.length) {
        const lubeValue = getCurrentValue(engineData.temperature_and_pressure['Lube oil pressure sensor'], 0);
        createPressureGauge("lubePressureGauge", lubeValue, 4.5, "#3b82f6");
      }

      // Trend analysis chart
      const trendData = engineData.trend_analysis?.exhaust_temp || engineData.temperature_and_pressure?.['Exhaust gas temperature sensor'];
      if (trendData?.length) {
        trend(trendData);
      }
    };

    // Update charts when data changes
    if (data) {
      updateCharts(data);
    }

    const onThemeChange = () => {
      if (data) {
        updateCharts(data);
      }
    };
    window.addEventListener('themechange', onThemeChange);

    return () => {
      destroyAll(); // 👈 clean up on unmount
      window.removeEventListener('themechange', onThemeChange);
    };
  }, [data]);

  const getCurrentValue = (values: number[] | undefined, fallback: number): number => {
    return values && values.length > 0 ? values[values.length - 1] : fallback;
  };

  // Safe data access helpers
  const getOverviewValue = (key: keyof Overview, fallback: number = 0): number => {
    return data?.overview?.[key] ?? fallback;
  };

  // NOTE: raw API keys are shown verbatim in the overview cards, so humanizeKey is unused.

  // Helper: format a value (number or string) for display
  const formatValue = (v: any) => {
    if (v == null) return '-';
    if (typeof v === 'number') return v.toLocaleString();
    if (Array.isArray(v)) {
      // show latest numeric value if possible
      const last = v.length ? v[v.length - 1] : null;
      return last == null ? '-' : (typeof last === 'number' ? last.toLocaleString() : String(last));
    }
    return String(v);
  };

  const getTemperatureValue = (key: keyof TemperatureAndPressure, fallback: number = 0): number => {
    return getCurrentValue(data?.temperature_and_pressure?.[key as string], fallback);
  };

  const getVibrationValue = (key: keyof VibrationAndBearing, fallback: number = 0): number => {
    return getCurrentValue(data?.vibration_and_bearing?.[key as string], fallback);
  };


  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-900 text-gray-100">
      <Sidebar />
  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold">Dredger Alpha</h2>
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
              <span className="text-sm">Operational</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-400">System Status:</span>
              <span className="font-medium text-green-400">OPERATIONAL</span>
            </div>
            <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm font-medium">
              <i className="fas fa-ship mr-1"></i> Engine & Propulsion
            </button>
          </div>
        </div>


        {/* Connection Status Banner */}{/*         
        {error && (
          <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center space-x-2">
            <i className="fas fa-exclamation-triangle"></i>
            <span className="text-sm font-medium">Connection Error: {error}</span>
          </div>
        )}
        {!isConnected && !error && (
          <div className="bg-yellow-600 text-white px-4 py-2 flex items-center justify-center space-x-2">
            <i className="fas fa-spinner fa-spin"></i>
            <span className="text-sm font-medium">Connecting to real-time data stream...</span>
          </div>
        )}
        {isConnected && (
          <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-center space-x-2">
            <i className="fas fa-check-circle"></i>
            <span className="text-sm font-medium">Connected to real-time data stream</span>
          </div>
        )} */}

        {/* Status Overview */}
        <div
          className="p-4 border-b border-gray-700 grid gap-4 overflow-auto items-stretch"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gridAutoRows: '1fr' }}
        >
          {loading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (() => {
            // Prefer raw API overview keys if available in the SSE payload
            const raw = rawData?.data ? (Array.isArray(rawData.data) ? rawData.data[0] : rawData.data) : null;
            const rawOverview = raw && typeof raw === 'object' && raw.overview && typeof raw.overview === 'object' ? (raw.overview as Record<string, any>) : null;

            if (rawOverview) {
              return (
                <>
                  {Object.entries(rawOverview).map(([key, value]) => {
                    const ICON_MAP: Record<string, { icon: string; color: string }> = {
                      'turbo': { icon: 'fas fa-wind', color: 'text-yellow-400' },
                      'thruster': { icon: 'fas fa-ship', color: 'text-indigo-400' },
                      'engine_rpm': { icon: 'fas fa-tachometer-alt', color: 'text-green-400' },
                      'rpm': { icon: 'fas fa-cog', color: 'text-blue-400' },
                      'pressure': { icon: 'fas fa-tint', color: 'text-pink-400' },
                      'health': { icon: 'fas fa-heart', color: 'text-green-400' },
                      'score': { icon: 'fas fa-star', color: 'text-green-400' },
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

                    const getIconMetaForKey = (k: string): { icon: string; color: string } => {
                      const keyLower = k.toLowerCase().replace(/_/g, ' ');
                      for (const [mapKey, meta] of Object.entries(ICON_MAP)) {
                        if (keyLower.includes(mapKey.replace(/_/g, ' '))) return meta;
                      }
                      // Fallback to a deterministic icon from the pool
                      const idx = hashString(k) % ICON_POOL.length;
                      return ICON_POOL[idx];
                    }

                    const { icon, color } = getIconMetaForKey(key);

                    return (
                      <div key={key} className="bg-gray-800 rounded-lg p-4 flex items-center h-full">
                        <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                          <i className={`${icon} ${color}`}></i>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">{key}</div>
                          <div className={`font-bold ${color}`}>{formatValue(value)}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            }

            // fallback to normalized overview
            if (data && data.overview) {
              const overviewMeta: Record<string, { label: string; icon?: string; color?: string; fmt?: (v: number) => string }> = {
                engine_rpm: { label: 'Engine RPM', icon: 'fas fa-tachometer-alt', color: 'text-green-400', fmt: (v) => v.toLocaleString() },
                shaft_rpm: { label: 'Shaft RPM', icon: 'fas fa-cog', color: 'text-blue-400', fmt: (v) => v.toLocaleString() },
                turbocharger_rpm: { label: 'Turbocharger', icon: 'fas fa-wind', color: 'text-yellow-400', fmt: (v) => v.toLocaleString() },
                thruster_rpm: { label: 'Thruster RPM', icon: 'fas fa-ship', color: 'text-blue-400', fmt: (v) => v.toLocaleString() },
                thruster_load: { label: 'Thruster Load', icon: 'fas fa-weight', color: 'text-yellow-400', fmt: (v) => `${v.toFixed(1)}%` },
                system_health: { label: 'Engine Health', icon: 'fas fa-heart', color: 'text-green-400', fmt: (v) => `${v.toFixed(1)}%` },
              };

              const keysOrder = Object.keys(overviewMeta).filter(k => k in data.overview);
              const otherKeys = Object.keys(data.overview).filter(k => !keysOrder.includes(k));
              const allKeys = [...keysOrder, ...otherKeys];

              return (
                <>
                  {allKeys.map((key) => {
                    const meta = overviewMeta[key] || { label: key, icon: undefined, color: 'text-gray-200', fmt: (v: number) => String(v) };
                    const value = getOverviewValue(key as keyof Overview, 0);

                    return (
                      <div key={key} className="bg-gray-800 rounded-lg p-4 flex items-center h-full">
                        <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                          {meta.icon ? <i className={`${meta.icon} ${meta.color}`}></i> : <span className={`${meta.color} font-bold`}>{meta.label.charAt(0)}</span>}
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">{meta.label}</div>
                          <div className={`font-bold ${meta.color}`}>{meta.fmt ? meta.fmt(value) : String(value)}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            }

            // no data to show
            return (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            );
          })()}
        </div>


        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Temperature & Pressure */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Temperature & Pressure</h3>
                <span className="text-sm text-gray-400">Real-time Monitoring</span>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/3 mb-2" />
                        <ChartSkeleton type="line" height="h-32 mb-2" />
                        <div className="flex justify-between text-xs mt-1">
                          <Skeleton variant="text" className="w-16 mb-2" />
                          <Skeleton variant="text" className="w-16 mb-2" />
                          <Skeleton variant="text" className="w-16 mb-2" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : data ? (
                  <>
                    {(() => {
                      const tempAndPressureData = data.temperature_and_pressure || {};
                      const chartableEntries = Object.entries(tempAndPressureData).filter(
                        ([, values]) => Array.isArray(values) && values.length > 0
                      );

                      if (chartableEntries.length === 0) {
                        return <div className="text-center text-gray-500">No temperature or pressure data available.</div>;
                      }

                      return chartableEntries.map(([key, values]) => {
                        const canvasId = `chart-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
                        const latestValue = getCurrentValue(values, 0);
                        return (
                          <div key={key}>
                            <div className="text-sm mb-2">{formatSensorName(key)}</div>
                            <div className="h-32"><canvas id={canvasId} className="w-full h-full block"></canvas></div>
                            <div className="text-right text-green-400 text-xs mt-1">{latestValue.toFixed(2)}</div>
                          </div>
                        );
                      });
                    })()}
                  </>
                ) : (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/3 mb-2" />
                        <ChartSkeleton type="line" height="h-32 mb-2" />
                        <div className="flex justify-between text-xs mt-1">
                          <Skeleton variant="text" className="w-16 mb-2" />
                          <Skeleton variant="text" className="w-16 mb-2" />
                          <Skeleton variant="text" className="w-16 mb-2" />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Pressure Gauges */}
            {(() => {
              const hasFuel = data?.temperature_and_pressure?.['Fuel pressure sensor']?.length;
              const hasLube = data?.temperature_and_pressure?.['Lube oil pressure sensor']?.length;
              if (!loading && !hasFuel && !hasLube) {
                return null;
              }
              return (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Pressure Readings</h3>
                <span className="text-sm text-gray-400">Current Values</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {loading ? (
                  <>
                    {[1, 2].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/3 mb-2" />
                        <div className="h-32 flex items-center justify-center">
                          <Spinner variant="dual-ring" size="xl" color="primary" />
                        </div>
                        <Skeleton variant="text" className="w-full text-center mt-1" />
                      </div>
                    ))}
                  </>
                ) : data ? (
                  <>
                    <div>
                      <div className="text-sm mb-2">FUEL PRESSURE</div> 
                      <div className="h-32 flex items-center justify-center">
                        <div className="w-24 h-24 relative">
                          <canvas id="fuelPressureGauge" className="w-full h-full block"></canvas>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-lg font-bold">{getCurrentValue(data.temperature_and_pressure?.['Fuel pressure sensor'], 0).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-xs mt-1 text-gray-400">Range: 3.5-5.0 bar</div>
                    </div>
                    <div>
                      <div className="text-sm mb-2">LUBE OIL PRESSURE</div> 
                      <div className="h-32 flex items-center justify-center">
                        <div className="w-24 h-24 relative">
                          <canvas id="lubePressureGauge" className="w-full h-full block"></canvas>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-lg font-bold">{getCurrentValue(data.temperature_and_pressure?.['Lube oil pressure sensor'], 0).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-xs mt-1 text-gray-400">Range: 3.0-4.5 bar</div>
                    </div>
                  </>
                ) : (
                  <>
                    {[1, 2].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/3 mb-2" />
                        <div className="h-32 flex items-center justify-center">
                          <Spinner variant="dual-ring" size="xl" color="primary" />
                        </div>
                        <Skeleton variant="text" className="w-full text-center mt-1" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
              )
            })()}
          </div>

          {/* Middle Column */}
          <div className="space-y-4">
            {/* Vibration & Bearing */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Vibration & Bearing</h3>
                <span className="text-sm text-gray-400">System Analysis</span>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/3 mb-2" />
                        <ChartSkeleton type="line" height="h-20 mb-2" />
                        <div className="flex justify-between items-center mt-1">
                          <Skeleton variant="text" className="w-24 mb-2" />
                          <div className="flex items-center">
                            <Skeleton variant="text" className="w-16 mr-2" />
                            <Skeleton variant="avatar" className="w-2 h-2" />
                            <Skeleton variant="text" className="w-16 ml-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : data ? (
                  (() => {
                    const vibAndBearingData = data.vibration_and_bearing || {};
                    const chartableEntries = Object.entries(vibAndBearingData).filter(
                      ([, values]) => Array.isArray(values) && values.length > 0
                    );

                    if (chartableEntries.length === 0) {
                      return <div className="text-center text-gray-500">No vibration or bearing data available.</div>;
                    }

                    return chartableEntries.map(([key, values]) => {
                      const canvasId = `chart-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
                      const latestValue = getCurrentValue(values, 0);
                      const isTemp = key.toLowerCase().includes('temp');
                      const status = getVibrationStatus(key, latestValue);
                      const unit = isTemp ? '°C' : 'mm/s';

                      return (
                        <div key={key}>
                          <div className="text-sm mb-2">{formatSensorName(key)}</div>
                          <div className="h-20"><canvas id={canvasId} className="w-full h-full block"></canvas></div>
                          <div className="flex justify-between items-center mt-1 text-xs">
                            <span className="text-gray-400">Current: <span className={`font-bold ${status.color}`}>{latestValue.toFixed(2)} {unit}</span></span>
                            <div className="flex items-center">
                              <span className="text-xs mr-2 text-gray-400">Status:</span>
                              <div className={`w-2 h-2 rounded-full ${status.bg}`}></div>
                              <span className={`ml-1 ${status.color}`}>{status.text}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/3 mb-2" />
                        <ChartSkeleton type="line" height="h-20 mb-2" />
                        <div className="flex justify-between items-center mt-1">
                          <Skeleton variant="text" className="w-24 mb-2" />
                          <div className="flex items-center">
                            <Skeleton variant="text" className="w-16 mr-2" />
                            <Skeleton variant="avatar" className="w-2 h-2" />
                            <Skeleton variant="text" className="w-16 ml-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Alerts & Notifications */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Alerts & Notifications</h3>
                <span className="text-sm text-gray-400">Active Alerts: {Object.keys(data?.alerts || {}).length}</span>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border-l-4 border-gray-600 pl-3 py-2 bg-gray-700 rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <Skeleton variant="text" className="w-32 mb-3" />
                            <Skeleton variant="text" className="w-24" />
                          </div>
                          <Skeleton variant="avatar" className="w-5 h-5 mr-2" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : (() => {
                  // prefer raw Alerts & Notifications if provided in SSE payload
                  const raw = rawData?.data ? (Array.isArray(rawData.data) ? rawData.data[0] : rawData.data) : null;
                  const alerts = data?.alerts;                  
                  if (alerts) {
                    return (
                      <>
                        {Object.keys(alerts).map((k) => {
                          const val = alerts[k];
                          const isWarning = String(val).toLowerCase() !== 'ok' && String(val).toLowerCase() !== 'normal' && String(val).toLowerCase() !== 'resolved';
                          return (
                            <div key={k} className={`border-l-4 ${isWarning ? 'border-yellow-500' : 'border-green-500'} pl-3 py-2 bg-gray-700 rounded`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className={`font-semibold ${isWarning ? 'text-yellow-400' : 'text-green-400'}`}>{k}</div>
                                  <div className="text-xs text-gray-400">{String(val)}</div>
                                </div>
                                <div className={`${isWarning ? 'text-yellow-400' : 'text-green-400'}`}>{isWarning ? <i className="fas fa-exclamation-circle"></i> : <i className="fas fa-check-circle"></i>}</div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  }

                  // fallback to previous behavior when no raw alerts provided
                  return (
                    <>
                      {getOverviewValue('turbocharger_rpm') > 12000 && (
                        <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-gray-700 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-yellow-400">Turbocharger RPM High</div>
                              <div className="text-xs text-gray-400">{getOverviewValue('turbocharger_rpm').toLocaleString()} RPM ({(getOverviewValue('turbocharger_rpm') / 15000 * 100).toFixed(0)}% of max)</div>
                            </div>
                            <div className="text-yellow-400"><i className="fas fa-exclamation-circle"></i></div>
                          </div>
                        </div>
                      )}
                      {getOverviewValue('thruster_load') > 75 && (
                        <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-gray-700 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-yellow-400">Thruster Load High</div>
                              <div className="text-xs text-gray-400">{getOverviewValue('thruster_load').toFixed(1)}% load</div>
                            </div>
                            <div className="text-yellow-400"><i className="fas fa-exclamation-circle"></i></div>
                          </div>
                        </div>
                      )}
                      <div className="border-l-4 border-green-500 pl-3 py-2 bg-gray-700 rounded opacity-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-green-400">Cooling Water Temp Rising</div>
                            <div className="text-xs text-gray-400">Resolved 12 min ago</div>
                          </div>
                          <div className="text-green-400"><i className="fas fa-check-circle"></i></div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Trend Analysis */}
            {(() => {
              const trendData = data?.trend_analysis?.exhaust_temp || data?.temperature_and_pressure?.['Exhaust gas temperature sensor'];
              const hasTrendData = trendData && trendData.length > 0;
              if (!loading && !hasTrendData) {
                return null;
              }
              return (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">{(() => {
                  // Prefer raw API sensor name if present in the SSE payload (rawData)
                  if (rawData?.data) {
                    const raw = Array.isArray(rawData.data) ? rawData.data[0] : rawData.data;
                    const taRaw = (raw as any).trend_analysis as Record<string, any> | undefined;
                    if (taRaw) {
                      // Prefer exact API sensor name for exhaust if present
                      const preferApiNames = ['Exhaust gas temperature sensor'];
                      for (const apiName of preferApiNames) {
                        if (apiName in taRaw && Array.isArray(taRaw[apiName]) && taRaw[apiName].length) {
                          // humanize: remove 'sensor' and title-case
                          return apiName.replace(/sensor/ig, '').trim().replace(/\b\w/g, (c) => c.toUpperCase());
                        }
                      }

                      // Otherwise pick the first non-empty API key and humanize it (strip 'sensor')
                      for (const k of Object.keys(taRaw)) {
                        const arr = taRaw[k];
                        if (Array.isArray(arr) && arr.length) {
                          if (k.includes(' ')) {
                            return k.replace(/sensor/ig, '').trim().replace(/\b\w/g, (c) => c.toUpperCase());
                          }
                          break; // fall through to normalized mapping below
                        }
                      }
                    }
                  }

                  // Fallback: use normalized data keys (existing behavior)
                  if (!data) return 'Trend Analysis';
                  const ta = data.trend_analysis;
                  const map: Record<string, string> = {
                    engine_rpm: 'Engine RPM',
                    shaft_rpm: 'Shaft RPM',
                    exhaust_temp: 'Exhaust Gas Temperature',
                    fuel_pressure: 'Fuel Pressure',
                    lube_oil_temp: 'Lube Oil Temperature',
                    vibration: 'Vibration',
                  };

                  if (ta?.exhaust_temp && ta.exhaust_temp.length) return map.exhaust_temp;

                  for (const k of Object.keys(ta || {})) {
                    const arr = (ta as any)[k] as number[] | undefined;
                    if (Array.isArray(arr) && arr.length) return map[k] || k;
                  }

                  return 'Trend Analysis';
                })()}</h3>
                <div className="flex space-x-2">
                  {/* <button className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">24H</button>
                  <button className="text-xs px-2 py-1 bg-green-600 rounded">7D</button>
                  <button className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">30D</button> */}
                </div>
              </div>
              {loading ? (
                <ChartSkeleton type="line" height="h-64" />
              ) : data ? (
                <div className="h-64"><canvas id="trendChart" className="w-full h-full block"></canvas></div>
              ) : (
                <ChartSkeleton type="line" height="h-64" />
              )}
            </div>
              )
            })()}

            {/* System Status */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">System Status</h3>
                <span className="text-sm text-gray-400">Real-time</span>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Skeleton variant="avatar" className="w-8 h-8 mr-2" />
                          <Skeleton variant="text" className="w-20" />
                        </div>
                        <Skeleton variant="text" className="w-16" />
                      </div>
                    ))}
                  </>
                ) : (() => {
                  // prefer raw "system status" object from SSE payload when available
                  const raw = rawData?.data ? (Array.isArray(rawData.data) ? rawData.data[0] : rawData.data) : null;
                  const systemStatus = data?.system_status;
                  
                  if (systemStatus) {
                    return (
                      <>
                        {Object.keys(systemStatus).map((k) => {
                          const v = systemStatus[k];
                          const lv = String(v).toLowerCase();
                          const isWarning = !['ok', 'normal', 'active', 'resolved', 'online'].includes(lv);
                          const isCritical = ['critical', 'error', 'offline', 'failed'].includes(lv);

                          let colorClass = 'text-green-400';
                          let bgClass = 'bg-green-500';
                          let iconClass = 'fas fa-check-circle';

                          if (isWarning) {
                            colorClass = 'text-yellow-400';
                            bgClass = 'bg-yellow-500';
                            iconClass = 'fas fa-exclamation-triangle';
                          }
                          if (isCritical) {
                            colorClass = 'text-red-400';
                            bgClass = 'bg-red-500';
                            iconClass = 'fas fa-times-circle';
                          }

                          // Assign specific icons to known system components
                          const keyLower = k.toLowerCase();
                          if (keyLower.includes('engine')) iconClass = 'fas fa-cogs';
                          if (keyLower.includes('turbo')) iconClass = 'fas fa-wind';
                          if (keyLower.includes('propulsion')) iconClass = 'fas fa-ship';
                          if (keyLower.includes('cooling')) iconClass = 'fas fa-snowflake';
                          if (keyLower.includes('fuel')) {
                            iconClass = 'fas fa-gas-pump';
                          }

                          return (
                            <div key={k} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${bgClass} bg-opacity-20 flex items-center justify-center mr-2`}>
                                  <i className={`${iconClass} ${colorClass} text-xs`}></i>
                                </div>
                                <span className="text-sm">{formatSensorName(k)}</span>
                              </div>
                              <div className={`text-sm font-medium ${colorClass}`}>{String(v)}</div>
                            </div>
                          );
                        })}
                      </>
                    );
                  }

                  // fallback to previous static UI when system status not present
                  if (data) {
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mr-2">
                              <i className="fas fa-check text-green-400 text-xs"></i>
                            </div>
                            <span className="text-sm">Engine System</span>
                          </div>
                          <div className="text-sm font-medium text-green-400">Normal</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-yellow-500 bg-opacity-20 flex items-center justify-center mr-2">
                              <i className="fas fa-exclamation-triangle text-yellow-400 text-xs"></i>
                            </div>
                            <span className="text-sm">Turbocharger</span>
                          </div>
                          <div className="text-sm font-medium text-yellow-400">Warning</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mr-2">
                              <i className="fas fa-check text-green-400 text-xs"></i>
                            </div>
                            <span className="text-sm">Propulsion</span>
                          </div>
                          <div className="text-sm font-medium text-green-400">Normal</div>
                        </div>
                      </>
                    );
                  }

                  // no data / not loading
                  return (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Skeleton variant="avatar" className="w-8 h-8 mr-2" />
                            <Skeleton variant="text" className="w-20" />
                          </div>
                          <Skeleton variant="text" className="w-16" />
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}