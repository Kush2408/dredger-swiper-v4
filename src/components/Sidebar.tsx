import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/shared-sidebar.css";
import { Moon, Sun } from "lucide-react";

export default function Sidebar() {
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const isActive = (path: string) => pathname === path;

  // Check if current path is in critical infrastructure section
  const isInCriticalInfra = (path: string) =>
    path === "/engine-propulsion" || path === "/suction-system";

  // Map routes to labels
  const criticalInfraLabels: Record<string, string> = {
    "/engine-propulsion": "Engine & Propulsion",
    "/suction-system": "Suction System",
  };

  // Show selected label or fallback
  const selectedInfra = criticalInfraLabels[pathname] || "Critical Infrastructure";

  // dispatch theme change event so charts/loaders can react
  const dispatchThemeChange = (theme: 'light' | 'dark') => {
    try {
      const evt = new CustomEvent('themechange', { detail: { theme } });
      window.dispatchEvent(evt);
    } catch (_) {
      // no-op
    }
  };

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      setIsDarkTheme(isDark);
      document.documentElement.className = isDark ? 'dark-theme' : 'light-theme';
      dispatchThemeChange(isDark ? 'dark' : 'light');
    } else {
      // Default to dark theme
      document.documentElement.className = 'dark-theme';
      dispatchThemeChange('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    const themeClass = newTheme ? 'dark-theme' : 'light-theme';
    document.documentElement.className = themeClass;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    dispatchThemeChange(newTheme ? 'dark' : 'light');
  };

  return (
    <div className="sidebar-wrapper">
      <div className="sidebar">
        <div className="brand-header">
          <h1 className="brand">DREDGER SWIPER</h1>
          <div className="theme-toggle-container">
            <button
              aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDarkTheme ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>  
        </div>

        <nav className="menu">
          <Link to="/" className={`menu-item ${isActive("/") ? "active" : ""}`}>
            Dashboard
          </Link>

          <div className="menu-group">
            <button
              className={`menu-item dropdown-btn ${isInCriticalInfra(pathname) ? "active" : ""}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedInfra} {dropdownOpen ? "▴" : "▾"}
            </button>
            <div className={`dropdown ${dropdownOpen ? "open" : ""}`}>
              <Link
                to="/engine-propulsion"
                className={`dropdown-item ${isActive("/engine-propulsion") ? "active" : ""}`}
              >
                Engine & Propulsion
              </Link>
            </div>
            <div className={`dropdown ${dropdownOpen ? "open" : ""}`}>
              <Link
                to="/suction-system"
                className={`dropdown-item ${isActive("/suction-system") ? "active" : ""}`}
              >
                Suction System
              </Link>
            </div>
          </div>

          <Link to="/upload" className={`menu-item ${isActive("/upload") ? "active" : ""}`}>
            Upload Document
          </Link>

          <Link to="/predictive" className={`menu-item ${isActive("/predictive") ? "active" : ""}`}>
            Predictive Analysis
          </Link>

          <Link to="/settings" className={`menu-item ${isActive("/settings") ? "active" : ""}`}>
            Settings
          </Link>
        </nav>
      </div>
    </div>
  );
}
