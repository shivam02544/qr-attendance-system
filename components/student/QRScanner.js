'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import SuccessMessage from '../shared/SuccessMessage';
import LocationPermission from '../LocationPermission';
import { useLocation } from '../../hooks/useLocation';
import { verifyLocationProximity } from '../../lib/location';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../shared/ToastProvider';
import { api } from '../../lib/apiClient';
import { validateQRData } from '../../lib/validation';

export default function QRScanner({ onScanSuccess, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState('');
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const html5QrcodeScannerRef = useRef(null);
  
  const { 
    location, 
    loading: locationLoading, 
    permissionGranted,
    getLocation
  } = useLocation();

  const { error, isLoading, executeWithErrorHandling, clearError } = useErrorHandler();
  const { showSuccess, showError } = useToast();

  const initializeScanner = useCallback(async () => {
    if (!permissionGranted) {
      setShowLocationPermission(true);
      return;
    }
    
    // Get location first
    try {
      await getLocation();
      // Don't start scanner immediately, let the DOM render first
    } catch (err) {
      showError('Location access is required to mark attendance');
      setShowLocationPermission(true);
    }
  }, [permissionGranted, getLocation]);

  // Separate effect to start scanner after DOM is ready
  useEffect(() => {
    if (!showLocationPermission && permissionGranted && location) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [showLocationPermission, permissionGranted, location]);

  useEffect(() => {
    // Check location permission first
    initializeScanner();
    
    return () => {
      stopScanner();
    };
  }, [initializeScanner]);

  const startScanner = async () => {
    if (html5QrcodeScannerRef.current) {
      return; // Scanner already initialized
    }

    // Wait for DOM element to be available with retry logic
    const qrReaderElement = document.getElementById('qr-reader');
    if (!qrReaderElement) {
      console.warn('QR reader element not found, retrying...');
      // Element not ready yet, wait a bit and try again (max 5 retries)
      const retryCount = startScanner.retryCount || 0;
      if (retryCount < 5) {
        startScanner.retryCount = retryCount + 1;
        setTimeout(() => {
          startScanner();
        }, 200 * (retryCount + 1)); // Exponential backoff
      } else {
        showError('Failed to initialize camera. Please refresh the page and try again.');
      }
      return;
    }

    // Reset retry count on success
    startScanner.retryCount = 0;

    try {
      setIsScanning(true);
      clearError();

      // Responsive configuration based on screen size
      const screenWidth = window.innerWidth;
      const isMobile = screenWidth < 640;
      const isTablet = screenWidth >= 640 && screenWidth < 1024;
      
      let qrboxSize;
      if (isMobile) {
        qrboxSize = Math.min(screenWidth * 0.7, 250);
      } else if (isTablet) {
        qrboxSize = Math.min(screenWidth * 0.5, 300);
      } else {
        qrboxSize = 350;
      }

      const config = {
        fps: isMobile ? 8 : 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: !isMobile,
        verbose: false,
        // Browser-specific optimizations
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        // Better camera selection for different browsers
        videoConstraints: {
          facingMode: "environment", // Use back camera by default
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 }
        }
      };

      html5QrcodeScannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false
      );

      html5QrcodeScannerRef.current.render(handleScanSuccess, onScanFailure);

    } catch (err) {
      console.error('Error starting scanner:', err);
      showError('Failed to start camera. Please ensure camera permissions are granted and try refreshing the page.');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (html5QrcodeScannerRef.current) {
      try {
        html5QrcodeScannerRef.current.clear();
        html5QrcodeScannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    try {
      // Stop the scanner immediately after successful scan
      stopScanner();

      const result = await executeWithErrorHandling(
        async () => {
          // Parse and validate QR code data
          let qrData;
          try {
            qrData = JSON.parse(decodedText);
          } catch (parseError) {
            throw new Error('Invalid QR code format');
          }

          // Validate QR code structure
          const qrValidationError = validateQRData(qrData);
          if (qrValidationError) {
            throw new Error(qrValidationError);
          }

          // Get current location
          let currentLocation = location;
          if (!currentLocation) {
            currentLocation = await getLocation();
          }

          // Verify location proximity
          const locationVerification = verifyLocationProximity(
            currentLocation,
            qrData.location,
            50 // 50 meters max distance
          );

          if (!locationVerification.isValid) {
            throw new Error(locationVerification.message);
          }

          // Mark attendance using API client
          return await api.student.markAttendance(qrData.sessionToken, currentLocation);
        },
        {
          showErrorToast: true,
          showSuccessToast: false, // We'll handle success manually
          context: { operation: 'mark_attendance' }
        }
      );

      // Handle success
      setSuccess(`Attendance marked successfully for ${result.attendance.className}!`);
      showSuccess(`Attendance marked for ${result.attendance.className}`);
      
      // Call parent success handler
      if (onScanSuccess) {
        onScanSuccess(result);
      }

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      // Error is already handled by executeWithErrorHandling
      // Restart scanner after error
      setTimeout(() => {
        if (!success) { // Only restart if we didn't succeed
          startScanner();
        }
      }, 2000);
    }
  };

  const onScanFailure = () => {
    // Don't show errors for scan failures - they're too frequent
  };

  const handleLocationPermissionGranted = async () => {
    setShowLocationPermission(false);
    clearError();
    try {
      await getLocation();
      startScanner();
    } catch (err) {
      showError('Failed to get location. Please try again.');
    }
  };

  const handleLocationPermissionDenied = (errorMessage) => {
    showError(errorMessage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b sticky top-0 bg-white rounded-t-lg">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close scanner"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {/* Location Permission Request */}
          {showLocationPermission && (
            <LocationPermission
              onPermissionGranted={handleLocationPermissionGranted}
              onPermissionDenied={handleLocationPermissionDenied}
            />
          )}

          {/* Scanner Interface - only show when location permission is granted */}
          {!showLocationPermission && (
            <>
              {/* Instructions */}
              <div className="mb-3 sm:mb-4 text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">
                  Point your camera at the QR code displayed by your teacher
                </p>
                <div className="flex items-center justify-center space-x-2 text-2xs sm:text-xs text-gray-500">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Location verified ✓</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-3 sm:mb-4">
                  <ErrorMessage message={error} />
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-3 sm:mb-4">
                  <SuccessMessage message={success} />
                </div>
              )}

              {/* Loading State */}
              {(isLoading || locationLoading) && (
                <div className="mb-3 sm:mb-4 flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2 text-xs sm:text-sm text-gray-600">
                    {locationLoading ? 'Getting location...' : 'Processing attendance...'}
                  </span>
                </div>
              )}

              {/* QR Scanner */}
              <div className="relative">
                <div 
                  id="qr-reader" 
                  className="w-full min-h-[250px] xs:min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] rounded-lg overflow-hidden bg-gray-100"
                ></div>
                
                {!isScanning && !isLoading && !success && error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center p-3 sm:p-4">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-xs sm:text-sm text-red-600 mb-3">Camera access failed</p>
                      <button
                        onClick={startScanner}
                        className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md text-xs sm:text-sm hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Scanner overlay for better UX */}
                {isScanning && !success && !error && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white rounded-lg shadow-lg">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                    </div>
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs">
                      Position QR code in frame
                    </div>
                  </div>
                )}
              </div>

              {/* Help Text */}
              <div className="mt-3 sm:mt-4 text-2xs sm:text-xs text-gray-500 text-center space-y-1">
                <p>Make sure the QR code is well-lit and fully visible in the camera frame</p>
                <p>If camera doesn&apos;t work, try refreshing the page and allowing camera permissions</p>
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="font-medium text-gray-600">Browser Compatibility:</p>
                  <p>Works best with Chrome, Safari, Firefox, and Edge</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}