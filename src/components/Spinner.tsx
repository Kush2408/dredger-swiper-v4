interface SpinnerProps {
  variant?: 'gradient-ring' | 'dual-ring' | 'pulse-dots' | 'wave';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export default function Spinner({ 
  variant = 'gradient-ring', 
  size = 'md', 
  color = 'success',
  className = '' 
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const colorClasses = {
    primary: 'from-blue-500 to-blue-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-yellow-500 to-yellow-600',
    danger: 'from-red-500 to-red-600'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'gradient-ring':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div className={`absolute inset-0 rounded-full border-4 border-gray-700`}></div>
            <div className={`absolute inset-0 rounded-full border-4 border-t-transparent bg-gradient-to-r ${colorClasses[color]} animate-spin`}></div>
          </div>
        );
      
      case 'dual-ring':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div className={`absolute inset-0 rounded-full border-4 border-gray-700`}></div>
            <div className={`absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent ${colorClasses[color]} animate-spin`}></div>
            <div className={`absolute inset-2 rounded-full border-4 border-gray-700`}></div>
            <div className={`absolute inset-2 rounded-full border-4 border-b-transparent border-l-transparent ${colorClasses[color]} animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
        );
      
      case 'pulse-dots':
        return (
          <div className={`flex space-x-2 ${sizeClasses[size]}`}>
            <div className={`w-2 h-2 bg-gradient-to-r ${colorClasses[color]} rounded-full animate-pulse`} style={{ animationDelay: '0ms' }}></div>
            <div className={`w-2 h-2 bg-gradient-to-r ${colorClasses[color]} rounded-full animate-pulse`} style={{ animationDelay: '150ms' }}></div>
            <div className={`w-2 h-2 bg-gradient-to-r ${colorClasses[color]} rounded-full animate-pulse`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'wave':
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-1 bg-gradient-to-r ${colorClasses[color]} rounded-full animate-pulse`}
                style={{ 
                  animationDelay: `${i * 100}ms`,
                  height: size === 'sm' ? '16px' : size === 'md' ? '24px' : size === 'lg' ? '32px' : '40px'
                }}
              ></div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {renderSpinner()}
    </div>
  );
}