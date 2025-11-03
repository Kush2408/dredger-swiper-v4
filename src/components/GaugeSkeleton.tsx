
interface GaugeSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GaugeSkeleton({ 
  size = 'md',
  className = '' 
}: GaugeSkeletonProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
<div className={`${sizeClasses[size]} relative ${className}`}>
  <div className="w-full h-full rounded-full border-4 border-gray-600 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-shimmer">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-1/2 h-1/2 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-shimmer rounded-full"></div>
    </div>
  </div>
</div>

  );
}
