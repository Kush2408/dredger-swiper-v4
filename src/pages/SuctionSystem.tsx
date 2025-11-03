import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { Skeleton, ChartSkeleton, MetricCardSkeleton } from "../components";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { type SuctionSystemData, type SuctionSystemResponse, SuctionSystemService } from "../services/suctionSystemService";
import { useCachedSSE } from "../hooks/useCachedSSE";
import { CACHE_KEYS } from "../services/dataCacheService";
import "../styles/suction-system.css";

export default function SuctionSystem() {
  // Helper to provide non-repeating icons per key
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

  const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [forceRefresh, setForceRefresh] = useState(false);

  // Use cached SSE for real-time data updates with caching
  const { 
    data: rawData, 
    loading,
    isCached,
    isStale
  } = useCachedSSE<SuctionSystemResponse>(SuctionSystemService.getSSEUrl(), {
    cacheKey: CACHE_KEYS.SUCTION_SYSTEM,
    forceRefresh,
    onMessage: (newData) => {
      console.log("Suction system data received via SSE:", newData);
    },
    onError: (error) => {
      console.error("SSE connection error for suction system:", error);
    }
  });

  // Reset force refresh after it's been applied
  useEffect(() => {
    if (forceRefresh) {
      setForceRefresh(false);
    }
  }, [forceRefresh]);

  // Normalize data to handle array response format
  const normalizeData = (rawData: SuctionSystemResponse | null): SuctionSystemData | null => {
    if (!rawData?.data) return null;
    
    let dataItem: SuctionSystemData;
    
    // If data is an array, take the first element
    if (Array.isArray(rawData.data)) {
      dataItem = rawData.data[0] || null;
    } else {
      // If data is an object, return it directly (fallback)
      dataItem = rawData.data as SuctionSystemData;
    }
    
    // Ensure seabed_resistance is set to 485 if not present
    if (dataItem && dataItem.draghead_and_cutter) {
      if (!dataItem.draghead_and_cutter["SEABED RESISTANCE"]) {
        dataItem.draghead_and_cutter["SEABED RESISTANCE"] = 485;
      }
    }
    
    return dataItem;
  };

  const data = normalizeData(rawData);

  useEffect(() => {
    const onThemeChange = () => {
      // Recharts reads colors from props; force re-render by updating a dummy state
      // Since we're using SSE, we don't need to manually trigger re-renders
      console.log('Theme changed, charts will update automatically');
    };
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, []);

  const formatChartData = (values: number[]) => {
    return values.map((value, index) => ({
      index,
      value,
    }));
  };

  // Helper: find the first numeric array in an object, with optional preferred keys
  const findFirstNumericArray = (obj: Record<string, any> | undefined, preferredKeys: string[] = []): number[] => {
    if (!obj) return [];
    // check preferred keys first (case-sensitive and case-insensitive)
    for (const k of preferredKeys) {
      if (Array.isArray((obj as any)[k])) return (obj as any)[k] as number[];
      // case-insensitive lookup
      const foundKey = Object.keys(obj).find(orig => orig.toLowerCase() === k.toLowerCase());
      if (foundKey && Array.isArray((obj as any)[foundKey])) return (obj as any)[foundKey] as number[];
    }

    // fallback: return the first Array value found on the object
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) return v as number[];
    }

    return [];
  };

  // Compute seabed resistance value once (supports different key casing/format)
  const seabedResistance = (() => {
    const obj = (data as any)?.draghead_and_cutter || {};
    const key = Object.keys(obj).find(k => k.toLowerCase().replace(/[_ ]+/g, '') === 'seabedresistance');
    const val = key ? obj[key] : 485;
    const n = Number(val ?? 485);
    return Number.isFinite(n) ? n : 485;
  })();

  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-900 text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
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
            <div className="flex items-center space-x-2">
              {isCached && (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isStale ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-400">
                    {isStale ? 'Cached (stale)' : 'Cached (fresh)'}
                  </span>
                </div>
              )}
              {!isCached && !loading && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-sm text-gray-400">Live data</span>
                </div>
              )}
            </div>
            {/* <button 
              onClick={() => setForceRefresh(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
              disabled={loading}
            >
              <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button> */}
            <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm font-medium">
              <i className="fas fa-ship mr-1"></i> Suction System
            </button>
          </div>
        </div>

        {/* Connection Status Banner */}
        {/* {error && (
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

        {/* Status Overview (dynamic columns based on discovered cards) */}
        {(() => {
          // Loading state: show skeletons in the original grid layout
          if (loading) {
            return (
              <div className="p-4 border-b border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            );
          }

          // Build cards from the raw SSE payload (top-level scalars)
          const raw = rawData?.data ? (Array.isArray(rawData.data) ? rawData.data[0] : rawData.data) : null;
          if (!raw) {
            return (
              <div className="p-4 border-b border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            );
          }

          // Helper to provide non-repeating icons per key
          const ICON_MAP: Record<string, { icon: string; color: string; unit?: string }> = {
            'dredge pump suction pressure': { icon: 'fas fa-tachometer-alt', color: 'text-green-400', unit: 'bar' },
            'turbidity': { icon: 'fas fa-water', color: 'text-purple-400' },
          };

          const cards: Array<{ id: string; label: string; value: number | string; icon?: string; color?: string; unit?: string }> = [];
          for (const [k, v] of Object.entries(raw as any)) {
            if (k === 'pipe_performance' || k === 'draghead_and_cutter') continue;
            if (v === null || v === undefined) continue;
            if (typeof v === 'number' || typeof v === 'string') {
              const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const keyLower = k.toLowerCase();
              
              let cardMeta = ICON_MAP[keyLower];
              if (!cardMeta) {
                // Fallback to a deterministic icon from the pool
                const idx = hashString(keyLower) % ICON_POOL.length;
                cardMeta = ICON_POOL[idx];
              }

              cards.push({ id: k, label, value: v as any, ...cardMeta });
            }
          }

          // Determine columns: at least 1, at most 5
          const cols = Math.min(Math.max(cards.length || 1, 1), 5);

          return (
            <div
              className="p-4 border-b border-gray-700 gap-4"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(220px, 1fr))`, gridAutoRows: '1fr' }}
            >
              {cards.length === 0 ? (
                <>
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </>
              ) : (
                cards.map(card => (
                  <div key={card.id} className="bg-gray-800 rounded-lg p-4 flex items-center h-full">
                    <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                      <i className={`${card.icon} ${card.color}`}></i>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">{card.label}</div>
                      <div className={`font-bold ${card.color}`}>{typeof card.value === 'number' ? (card.value).toLocaleString() : card.value}{card.unit ? ` ${card.unit}` : ''}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })()}


        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Pipe Performance */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Pipe Performance</h3>
                <span className="text-sm text-gray-400">Real-time Monitoring</span>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-3">
                        <Skeleton variant="text" className="w-1/2 mb-2" />
                        <Skeleton variant="text" className="w-1/3" />
                      </div>
                    ))}
                  </>
                ) : data ? (
                  <>
                    {Object.entries(data.pipe_performance || {}).map(([key, value]) => {
                      if (value === null || value === undefined) return null;

                      const keyLower = key.toLowerCase();
                      let color = 'text-green-200';
                      let unit = '';

                      if (keyLower.includes('depth')) {
                        color = 'text-blue-400';
                        unit = ' m';
                      } else if (keyLower.includes('pressure')) {
                        color = 'text-green-400';
                        unit = ' bar';
                      } else if (keyLower.includes('flow') || keyLower.includes('velocity')) {
                        color = 'text-yellow-400';
                        unit = ' m³/s';
                      }

                      const formattedValue = typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);

                      return (
                        <div key={key} className="bg-gray-700 rounded-lg p-3">
                          <div className="text-sm text-gray-400 mb-1">{key.toUpperCase()}</div>
                          <div className={`text-2xl font-bold ${color}`}>
                            {formattedValue}
                            {unit}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-3">
                        <Skeleton variant="text" className="w-1/2 mb-2" />
                        <Skeleton variant="text" className="w-1/3" />
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
                <span className="text-sm text-gray-400">Active Alerts: 3/15</span>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border-l-4 border-gray-600 pl-3 py-2 bg-gray-700 rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <Skeleton variant="text" className="w-32 mb-2" />
                            <Skeleton variant="text" className="w-24" />
                          </div>
                          <Skeleton variant="avatar" className="w-5 h-5 mr-2" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : data ? (
                  <>
                    {(() => {
                      const raw = rawData?.data ? (Array.isArray(rawData.data) ? rawData.data[0] : rawData.data) : null;
                      // Alerts may appear under several keys depending on API shape
                      const alertsObj = raw && ((raw as any)['Alerts & Notifications'] || (raw as any).alerts || (raw as any).notifications) as Record<string, any> | undefined;

                      const alerts: Array<{ title: string; severity: string }> = [];
                      if (alertsObj && typeof alertsObj === 'object' && !Array.isArray(alertsObj)) {
                        for (const [k, v] of Object.entries(alertsObj)) {
                          if (v === null || v === undefined) continue;
                          alerts.push({ title: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), severity: String(v) });
                        }
                      }

                      if (alerts.length > 0) {
                        return alerts.map((a) => {
                          const sev = a.severity.toLowerCase();
                          const isHigh = /high|critical|danger|error|fail|failed/i.test(sev);
                          const isWarn = /warn|medium|warning|low/i.test(sev);
                          const border = isHigh ? 'border-red-500' : isWarn ? 'border-yellow-500' : 'border-green-500';
                          const text = isHigh ? 'text-red-400' : isWarn ? 'text-yellow-400' : 'text-green-400';
                          const icon = isHigh ? 'fas fa-exclamation-circle' : isWarn ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';

                          return (
                            <div key={a.title} className={`border-l-4 ${border} pl-3 py-2 bg-gray-700 rounded`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className={`font-semibold ${text}`}>{a.title}</div>
                                  <div className="text-xs text-gray-400">{a.severity}</div>
                                </div>
                                <div className={`${text} mr-1`}><i className={icon}></i></div>
                              </div>
                            </div>
                          );
                        });
                      }

                      // Fallback to existing static alerts when none present in payload
                      return (
                        <>
                          <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-gray-700 rounded">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-yellow-400">HIGH CUTTER TORQUE</div>
                                <div className="text-xs text-gray-400">2 min ago</div>
                              </div>
                              <div className="text-yellow-400 mr-1"><i className="fas fa-exclamation-circle"></i></div>
                            </div>
                          </div>
                          <div className="border-l-4 border-yellow-500 pl-3 py-2 bg-gray-700 rounded">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-yellow-400">DRAGHEAD PRESSURE INCREASE</div>
                                <div className="text-xs text-gray-400">5 min ago</div>
                              </div>
                              <div className="text-yellow-400 mr-1"><i className="fas fa-exclamation-circle"></i></div>
                            </div>
                          </div>
                          <div className="border-l-4 border-gray-500 pl-3 py-2 bg-gray-700 rounded">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-red-400">SUCTION PRESSURE FLUCTUATION</div>
                                <div className="text-xs text-gray-400">12 min ago</div>
                              </div>
                              <div className="text-red-400 mr-1"><i className="fas fa-exclamation-circle"></i></div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border-l-4 border-gray-600 pl-3 py-2 bg-gray-700 rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <Skeleton variant="text" className="w-32 mb-2" />
                            <Skeleton variant="text" className="w-24" />
                          </div>
                          <Skeleton variant="avatar" className="w-5 h-5 mr-2" />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-4">
            {/* Draghead & Cutter */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Draghead & Cutter</h3>
                <span className="text-sm text-gray-400">System Analysis</span>
              </div>
              <div className="space-y-16">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/2 mb-4" />
                        <ChartSkeleton type="line" height="h-32" />
                        {i === 3 && (
                          <div className="bg-gray-700 rounded-lg p-3 mt-4">
                            <Skeleton variant="text" className="w-1/2 mb-1" />
                            <Skeleton variant="text" className="w-1/3" />
                            <Skeleton variant="card" className="h-2 rounded-full mt-2" />
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : data ? (
                  <>
                    <div>
                      <div className="text-sm mb-4">DRAGHEAD PRESSURE & FLOW</div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="140%">
                          <AreaChart data={formatChartData(findFirstNumericArray((data as any)?.draghead_and_cutter, ['Dredge pump suction pressure sensor', 'draghead_pressure_and_flow', 'Suction Pipe Pressure', 'Suction pipe pressure']))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                            <XAxis dataKey="index" stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                            <YAxis stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: getCssVar('--bg-secondary') || '#1f2937',
                                border: `1px solid ${getCssVar('--border-color') || '#374151'}`,
                                borderRadius: '6px',
                                color: getCssVar('--text-primary') || '#f9fafb'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#39ff14"
                              fill="#39ff14"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-4">CUTTER TORQUE & RPM</div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="140%">
                          <LineChart data={formatChartData(findFirstNumericArray((data as any)?.draghead_and_cutter, ['Cutter head torque sensor', 'cutter_torque_and_rpm', 'Cutter head torque']))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                            <XAxis dataKey="index" stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                            <YAxis stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: getCssVar('--bg-secondary') || '#1f2937',
                                border: `1px solid ${getCssVar('--border-color') || '#374151'}`,
                                borderRadius: '6px',
                                color: getCssVar('--text-primary') || '#f9fafb'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#ff3131"
                              strokeWidth={2}
                              dot={{ fill: '#ff3131', strokeWidth: 2, r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm text-gray-400">SEABED RESISTANCE</div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          seabedResistance > 400 ? 'bg-red-900 text-red-300' : seabedResistance > 200 ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                        }`}>
                          {seabedResistance > 400 ? 'HIGH' : seabedResistance > 200 ? 'MEDIUM' : 'LOW'}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">{seabedResistance}</div>
                      <div className="h-3 bg-gray-600 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, (seabedResistance / 5))}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1 text-gray-400">
                        <span>Low (0-200)</span>
                        <span>Medium (200-400)</span>
                        <span>High (400+)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton variant="text" className="w-1/2 mb-4" />
                        <ChartSkeleton type="line" height="h-32" />
                        {i === 3 && (
                          <div className="bg-gray-700 rounded-lg p-3 mt-4">
                            <Skeleton variant="text" className="w-1/2 mb-1" />
                            <Skeleton variant="text" className="w-1/3" />
                            <Skeleton variant="card" className="h-2 rounded-full mt-2" />
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Excavation Control */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Excavation Control</h3>
                <span className="text-sm text-gray-400">Real-time</span>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <>
                    <div className="text-center">
                      <Skeleton variant="text" className="w-1/2 mb-2 mx-auto" />
                      <Skeleton variant="avatar" className="w-16 h-16 rounded-full mx-auto" />
                      <Skeleton variant="text" className="w-1/3 mx-auto mt-2" />
                    </div>
                    <div>
                      <Skeleton variant="text" className="w-full mb-4" />
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-gray-700 rounded-lg p-3">
                            <Skeleton variant="text" className="w-1/2 mb-1" />
                            <Skeleton variant="text" className="w-1/3" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <Skeleton variant="text" className="w-full mb-2" />
                      <Skeleton variant="card" className="h-2 rounded-full" />
                      <div className="flex justify-between text-xs mt-2">
                        <Skeleton variant="text" className="w-8" />
                        <Skeleton variant="text" className="w-8" />
                      </div>
                    </div>
                  </>
                ) : data ? (
                  <>
                    {(() => {
                      const exc = (data as any)?.excavation_control as Record<string, any> | undefined;
                      if (!exc) return null;

                      const grabPosition = exc.grab_position;
                      const angles = exc.boom_arm_bucket_angles || {};
                      const angleKeys = Object.keys(angles).filter(k => angles[k] !== null && angles[k] !== undefined && (typeof angles[k] === 'number' || typeof angles[k] === 'string'));

                      const otherEntries = Object.entries(exc).filter(([k]) => k !== 'boom_arm_bucket_angles' && k !== 'grab_position' && k !== null && k !== undefined && k !== '');
                      const otherScalars = otherEntries.filter(([_, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean');

                      return (
                        <>
                          {grabPosition !== undefined && (
                            <div className="text-center">
                              <div className="text-sm text-center mb-2">GRAB POSITION</div>
                              <div className="w-16 h-16 mx-auto bg-gray-700 rounded-full flex items-center justify-center">
                                <i className={`fas fa-${String(grabPosition).toLowerCase() === 'closed' ? 'lock' : 'unlock'} text-2xl ${String(grabPosition).toLowerCase() === 'closed' ? 'text-red-400' : 'text-green-400'}`}></i>
                              </div>
                              <div className="text-center mt-2 text-xs text-gray-400">{String(grabPosition || 'CLOSED').toUpperCase()}</div>
                            </div>
                          )}

                          {angleKeys.length > 0 && (
                            <div>
                              <div className="text-sm text-center mb-4">BOOM/ARM/BUCKET ANGLES</div>
                              <div className={`grid ${angleKeys.length === 1 ? 'grid-cols-1' : angleKeys.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
                                {angleKeys.map((ak) => (
                                  <div key={ak} className="bg-gray-700 rounded-lg p-3">
                                    <div className="text-xs text-center mb-1 text-gray-400">{ak.replace(/_/g, ' ').toUpperCase()}</div>
                                    <div className="text-xl text-center font-bold text-green-400">{angles[ak] ?? 0}°</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {otherScalars.length > 0 && (
                            <div className="grid grid-cols-1 gap-3">
                              {otherScalars.map(([k, v]) => {
                                const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                return (
                                  <div key={k} className="bg-gray-700 rounded-lg p-3">
                                    <div className="text-sm text-gray-400 mb-1">
                                      {label}
                                    </div>
                                    <div
                                      className={`text-lg font-bold ${
                                        ICON_POOL[hashString(k) % ICON_POOL.length].color
                                      }`}
                                    >
                                      {String(v)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <Skeleton variant="text" className="w-1/2 mb-2 mx-auto" />
                      <Skeleton variant="avatar" className="w-16 h-16 rounded-full mx-auto" />
                      <Skeleton variant="text" className="w-1/3 mx-auto mt-2" />
                    </div>
                    <div>
                      <Skeleton variant="text" className="w-full mb-4" />
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-gray-700 rounded-lg p-3">
                            <Skeleton variant="text" className="w-1/2 mb-1" />
                            <Skeleton variant="text" className="w-1/3" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <Skeleton variant="text" className="w-full mb-2" />
                      <Skeleton variant="card" className="h-2 rounded-full" />
                      <div className="flex justify-between text-xs mt-2">
                        <Skeleton variant="text" className="w-8" />
                        <Skeleton variant="text" className="w-8" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

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
                ) : data ? (
                  <>
                    {Object.entries((data as any)['system status'] || {}).map(([key, value]) => {
                      const status = String(value).toLowerCase();
                      let bgColor = 'bg-gray-600';
                      let textColor = 'text-gray-200';
                      let icon = <i className="fas fa-question text-gray-200 text-xs"></i>;

                      if (status === 'warning' || status === 'high' || status === 'critical' || status === 'error') {
                        bgColor = 'bg-yellow-500';
                        textColor = 'text-yellow-400';
                        icon = <i className="fas fa-exclamation-triangle text-yellow-400 text-xs"></i>;
                      } else if (status === 'ok' || status === 'normal' || status === 'active' || status === 'resolved') {
                        bgColor = 'bg-green-500';
                        textColor = 'text-green-400';
                        icon = <i className="fas fa-check text-green-400 text-xs"></i>;
                      }

                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full ${bgColor} bg-opacity-20 flex items-center justify-center mr-2`}>
                              {icon}
                            </div>
                            <span className="text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                          </div>
                          <div className={`text-sm font-medium ${textColor}`}>{String(value)}</div>
                        </div>
                      );
                    })}
                  </>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel - Trend Analysis */}
        {data && (data as any)?.['Suction, Flow & Cutter Sensor Analysis'] && Object.keys((data as any)['Suction, Flow & Cutter Sensor Analysis']).length > 0 && (
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{(() => {
                // pick active trend key from data.trend_analysis
                const ta = (data as any)?.['Suction, Flow & Cutter Sensor Analysis'] || {};
                const preferred = ['Suction Pipe Pressure', 'Flow velocity sensor', 'Cutter head torque sensor'];
                let chosen: string | undefined;
                for (const k of preferred) {
                  if (Array.isArray(ta[k]) && ta[k].length) { chosen = k; break; }
                }
                if (!chosen) {
                  const first = Object.keys(ta).find(k => Array.isArray((ta as any)[k]) && (ta as any)[k].length);
                  chosen = first;
                }
                if (!chosen) return 'Trend Analysis';
                return chosen.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              })()}</h3>
              {/* <div className="flex space-x-2">
              <button className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">1H</button>
              <button className="text-xs px-2 py-1 bg-green-600 rounded">30M</button>
              <button className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">15M</button>
            </div> */}
            </div>
            <div className="h-64">
              {loading ? (
                <ChartSkeleton type="line" height="h-64" />
              ) : data ? (
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const ta = (data as any)?.['Suction, Flow & Cutter Sensor Analysis'] || {};
                    let key: string | undefined;
                    const preferred = ['Suction Pipe Pressure', 'Flow velocity sensor', 'Cutter head torque sensor'];
                    for (const k of preferred) {
                      if (Array.isArray(ta[k]) && ta[k].length) { key = k; break; }
                    }
                    if (!key) {
                      key = Object.keys(ta).find(k => Array.isArray((ta as any)[k]) && (ta as any)[k].length);
                    }
                    const values: number[] = key && Array.isArray((ta as any)[key]) ? (ta as any)[key] : [];

                    const title = key ? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Trend';

                    return (
                      <LineChart data={formatChartData(values)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                    <XAxis dataKey="index" stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                    <YAxis stroke={getCssVar('--text-secondary') || '#9ca3af'} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: getCssVar('--bg-secondary') || '#1f2937',
                        border: `1px solid ${getCssVar('--border-color') || '#374151'}`,
                        borderRadius: '6px',
                        color: getCssVar('--text-primary') || '#f9fafb'
                      }}
                    />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#39ff14"
                        strokeWidth={2}
                        dot={{ fill: '#39ff14', strokeWidth: 2, r: 3 }}
                        name={title}
                      />
                    </LineChart>
                  );
                  })()}
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton type="line" height="h-64" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}