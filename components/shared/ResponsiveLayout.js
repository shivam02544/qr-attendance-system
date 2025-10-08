'use client';

import { useState, useEffect } from 'react';

export default function ResponsiveLayout({ 
  children, 
  title, 
  user, 
  onLogout, 
  actions = [], 
  showMobileMenu = true,
  className = "" 
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-8xl mx-auto container-responsive">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Title and Mobile Menu Button */}
            <div className="flex items-center min-w-0 flex-1">
              {showMobileMenu && screenSize === 'mobile' && (
                <button
                  onClick={toggleMobileMenu}
                  className="mr-3 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <h1 className="heading-responsive font-bold text-gray-900 truncate">
                {title}
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`button-responsive font-medium transition-colors ${action.className || 'bg-blue-600 hover:bg-blue-700 text-white'} rounded-md`}
                  disabled={action.disabled}
                >
                  {action.icon && (
                    <span className="mr-2">{action.icon}</span>
                  )}
                  {action.label}
                </button>
              ))}
              
              {user && (
                <>
                  <span className="text-xs sm:text-sm text-gray-600 truncate max-w-32 lg:max-w-none">
                    Welcome, {user.name}
                  </span>
                  <button
                    onClick={onLogout}
                    className="bg-red-600 hover:bg-red-700 text-white button-responsive rounded-md font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center space-x-2">
              {actions.slice(0, 2).map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`p-2 rounded-md transition-colors ${action.mobileClassName || action.className || 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  title={action.label}
                  disabled={action.disabled}
                >
                  {action.icon || (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              ))}
              
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile User Info */}
        {user && (
          <div className="md:hidden bg-gray-50 border-t px-4 py-2">
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              Welcome, {user.name}
            </p>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
          <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-md transition-colors ${action.className || 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  disabled={action.disabled}
                >
                  <div className="flex items-center">
                    {action.icon && <span className="mr-3">{action.icon}</span>}
                    {action.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-8xl mx-auto container-responsive py-4 sm:py-6 lg:py-8">
        {children}
      </main>

      {/* Screen Size Indicator (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-mono z-50">
          {screenSize} ({window.innerWidth}px)
        </div>
      )}
    </div>
  );
}

// Utility component for responsive cards
export function ResponsiveCard({ children, className = "", padding = "default" }) {
  const paddingClasses = {
    none: "",
    small: "p-3 sm:p-4",
    default: "card-responsive",
    large: "p-6 sm:p-8 lg:p-10"
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

// Utility component for responsive grids
export function ResponsiveGrid({ children, cols = "default", gap = "default", className = "" }) {
  const colClasses = {
    1: "grid grid-cols-1",
    2: "grid grid-cols-1 sm:grid-cols-2",
    3: "grid-responsive",
    4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    auto: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    default: "grid-responsive"
  };

  const gapClasses = {
    small: "gap-2 sm:gap-3",
    default: "gap-4 sm:gap-6",
    large: "gap-6 sm:gap-8"
  };

  return (
    <div className={`${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}