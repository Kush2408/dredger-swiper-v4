
interface LoaderProps {
  variant?: 'dots' | 'spinner' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export default function Loader({ 
  variant = 'dots', 
  size = 'md', 
  color = 'primary',
  className = '' 
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const getThemeColor = (color: string) => {
    switch (color) {
      case 'primary': return 'var(--ocean-blue)';
      case 'secondary': return 'var(--text-secondary)';
      case 'success': return 'var(--glow-green)';
      case 'warning': return 'var(--alert-orange)';
      case 'danger': return '#ff4444';
      default: return 'var(--ocean-blue)';
    }
  };

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            <div 
              className="w-1 h-1 rounded-full spinner-bounce" 
              style={{ 
                backgroundColor: getThemeColor(color),
                animation: 'bounce 1s infinite'
              }}
            ></div>
            <div 
              className="w-1 h-1 rounded-full spinner-bounce" 
              style={{ 
                backgroundColor: getThemeColor(color),
                animationDelay: '0.1s',
                animation: 'bounce 1s infinite 0.1s'
              }}
            ></div>
            <div 
              className="w-1 h-1 rounded-full spinner-bounce" 
              style={{ 
                backgroundColor: getThemeColor(color),
                animationDelay: '0.2s',
                animation: 'bounce 1s infinite 0.2s'
              }}
            ></div>
          </div>
        );
      
      case 'spinner':
        return (
          <div 
            className={`spinner-spin rounded-full border-2 ${sizeClasses[size]}`}
            style={{
              borderColor: 'var(--skeleton-bg-1)',
              borderTopColor: getThemeColor(color),
              opacity: 0.6,
              animation: 'spin 1s linear infinite'
            }}
          ></div>
        );
      
      case 'pulse':
        return (
          <div 
            className={`spinner-pulse rounded-full ${sizeClasses[size]}`}
            style={{ 
              backgroundColor: getThemeColor(color),
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          ></div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {renderLoader()}
    </div>
  );
}
