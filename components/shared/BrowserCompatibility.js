'use client';

import { useState, useEffect } from 'react';

export default function BrowserCompatibility({ onCompatibilityCheck }) {
  const [compatibility, setCompatibility] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkCompatibility();
  }, []);

  const checkCompatibility = () => {
    const checks = {
      camera: checkCameraSupport(),
      geolocation: checkGeolocationSupport(),
      localStorage: checkLocalStorageSupport(),
      webRTC: checkWebRTCSupport(),
      modernJS: checkModernJSSupport(),
      browser: getBrowserInfo()
    };

    const isCompatible = checks.camera && checks.geolocation && checks.localStorage;
    const result = {
      isCompatible,
      checks,
      recommendations: getRecommendations(checks)
    };

    setCompatibility(result);
    if (onCompatibilityCheck) {
      onCompatibilityCheck(result);
    }
  };

  const checkCameraSupport = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const checkGeolocationSupport = () => {
    return !!navigator.geolocation;
  };

  const checkLocalStorageSupport = () => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  };

  const checkWebRTCSupport = () => {
    return !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection);
  };

  const checkModernJSSupport = () => {
    try {
      // Check for modern JS features
      return !!(
        window.Promise &&
        window.fetch &&
        Array.prototype.includes &&
        Object.assign
      );
    } catch (e) {
      return false;
    }
  };

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    let isSupported = false;

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 60;
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 55;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 11;
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 79;
    }

    return { browser, version, isSupported };
  };

  const getRecommendations = (checks) => {
    const recommendations = [];

    if (!checks.camera) {
      recommendations.push({
        type: 'error',
        message: 'Camera access is not supported or blocked. Please use a modern browser and allow camera permissions.'
      });
    }

    if (!checks.geolocation) {
      recommendations.push({
        type: 'error',
        message: 'Geolocation is not supported. Location verification will not work.'
      });
    }

    if (!checks.browser.isSupported) {
      recommendations.push({
        type: 'warning',
        message: `Your browser (${checks.browser.browser} ${checks.browser.version}) may not be fully supported. Consider updating to the latest version.`
      });
    }

    if (!checks.webRTC) {
      recommendations.push({
        type: 'warning',
        message: 'WebRTC is not supported. Some camera features may not work optimally.'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Your browser is fully compatible with all features!'
      });
    }

    return recommendations;
  };

  if (!compatibility) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Checking browser compatibility...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Browser Compatibility</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Status Overview */}
      <div className="flex items-center mb-3">
        {compatibility.isCompatible ? (
          <div className="flex items-center text-green-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Compatible</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium">Issues Detected</span>
          </div>
        )}
        <span className="ml-2 text-xs text-gray-500">
          {compatibility.checks.browser.browser} {compatibility.checks.browser.version}
        </span>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        {compatibility.recommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-2 rounded-md text-xs ${
              rec.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : rec.type === 'warning'
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {rec.message}
          </div>
        ))}
      </div>

      {/* Detailed Checks */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Feature Support:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(compatibility.checks).map(([feature, supported]) => {
              if (feature === 'browser') return null;
              return (
                <div key={feature} className="flex items-center justify-between">
                  <span className="capitalize text-gray-600">{feature}:</span>
                  <span className={supported ? 'text-green-600' : 'text-red-600'}>
                    {supported ? '✓' : '✗'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Browser-specific tips */}
      {!compatibility.isCompatible && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Recommended Browsers:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Chrome 60+ (Recommended)</div>
            <div>• Firefox 55+</div>
            <div>• Safari 11+</div>
            <div>• Edge 79+</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using browser compatibility in components
export function useBrowserCompatibility() {
  const [compatibility, setCompatibility] = useState(null);

  useEffect(() => {
    // Simple compatibility check without UI
    const isCompatible = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.geolocation
    );

    setCompatibility({ isCompatible });
  }, []);

  return compatibility;
}