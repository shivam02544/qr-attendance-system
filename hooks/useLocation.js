import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation, checkLocationPermission, requestLocationPermission } from '../lib/location';

/**
 * Custom hook for managing geolocation state and operations
 */
export function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Check initial permission status
  useEffect(() => {
    checkLocationPermission().then(setPermissionGranted);
  }, []);

  /**
   * Get current location
   */
  const getLocation = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const currentLocation = await getCurrentLocation(options);
      setLocation(currentLocation);
      setPermissionGranted(true);
      return currentLocation;
    } catch (err) {
      setError(err.message);
      setPermissionGranted(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const granted = await requestLocationPermission();
      setPermissionGranted(granted);
      
      if (granted) {
        // Get location immediately after permission is granted
        await getLocation();
      } else {
        setError('Location permission is required to mark attendance');
      }
      
      return granted;
    } catch (err) {
      setError(err.message);
      setPermissionGranted(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getLocation]);

  /**
   * Clear location data and errors
   */
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    permissionGranted,
    getLocation,
    requestPermission,
    clearLocation
  };
}