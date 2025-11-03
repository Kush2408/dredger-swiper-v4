interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'area';
  height?: string;
  className?: string;
}

export default function ChartSkeleton({
  type = 'line',
  height = 'h-32',
  className = ''
}: ChartSkeletonProps) {
  const renderChartSkeleton = () => {
    switch (type) {
      case 'line':
        return (
          <div className="relative w-full h-full">
            <div className="w-full h-full bg-[var(--skeleton-bg-2)] animate-pulse rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full relative">
                  {[1 / 4, 1 / 2, 3 / 4].map((pos, i) => (
                    <div
                      key={i}
                      className="absolute left-0 w-full h-0.5 bg-[var(--skeleton-bg-2)] animate-pulse"
                      style={{ top: `${pos * 100}%`, transform: 'translateY(-50%)' }}
                    />
                  ))}
                  {[{ t: '1/4', l: '1/4' }, { t: '1/2', l: '1/2' }, { t: '3/4', l: '3/4' }].map(
                    (p, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-[var(--skeleton-bg-2)] animate-pulse"
                        style={{
                          top: `calc(${p.t} * 100%)`,
                          left: `calc(${p.l} * 100%)`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'bar':
        return (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800 animate-pulse rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
              {['60%', '80%', '40%', '90%', '70%'].map((h, i) => (
                <div
                  key={i}
                  className="w-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 dark:from-gray-500 dark:via-gray-600 dark:to-gray-700 animate-pulse rounded-t"
                  style={{ height: h }}
                />
              ))}
            </div>
          </div>
        );

      case 'pie':
        return (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800 animate-pulse rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-8 border-gray-300 dark:border-gray-600 relative">
                <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-500 border-t-gray-400 dark:border-t-gray-700 transform rotate-45"></div>
                <div className="absolute inset-0 rounded-full border-8 border-gray-300 dark:border-gray-600 border-r-gray-400 dark:border-r-gray-800 transform rotate-90"></div>
              </div>
            </div>
          </div>
        );

      case 'area':
        return (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800 animate-pulse rounded-lg relative overflow-hidden">
            <div className="absolute inset-0">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="areaGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d1d5db" /> {/* gray-300 */}
                    <stop offset="100%" stopColor="#9ca3af" /> {/* gray-400 */}
                  </linearGradient>
                  <linearGradient id="areaGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6b7280" /> {/* gray-500 */}
                    <stop offset="100%" stopColor="#374151" /> {/* gray-800 */}
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 L25,60 L50,70 L75,40 L100,50 L100,100 L0,100 Z"
                  fill="url(#areaGradientLight)"
                  opacity="0.35"
                  className="dark:hidden"
                />
                <path
                  d="M0,80 L25,60 L50,70 L75,40 L100,50 L100,100 L0,100 Z"
                  fill="url(#areaGradientDark)"
                  opacity="0.35"
                  className="hidden dark:block"
                />
              </svg>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className={`${height} ${className}`}>{renderChartSkeleton()}</div>;
}
