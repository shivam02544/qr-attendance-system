/**
 * Location utility functions for attendance verification
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if student location is within acceptable range of classroom
 * @param {Object} studentLocation - Student's current location {lat, lng}
 * @param {Object} classroomLocation - Classroom location {lat, lng}
 * @param {number} maxDistance - Maximum allowed distance in meters (default: 50)
 * @returns {Object} Verification result {isValid, distance, message}
 */
export function verifyLocationProximity(studentLocation, classroomLocation, maxDistance = 50) {
  if (!studentLocation || !classroomLocation) {
    return {
      isValid: false,
      distance: null,
      message: 'Location data is missing'
    };
  }

  if (!studentLocation.lat || !studentLocation.lng || !classroomLocation.lat || !classroomLocation.lng) {
    return {
      isValid: false,
      distance: null,
      message: 'Invalid location coordinates'
    };
  }

  const distance = calculateDistance(
    studentLocation.lat,
    studentLocation.lng,
    classroomLocation.lat,
    classroomLocation.lng
  );

  const isValid = distance <= maxDistance;

  return {
    isValid,
    distance: Math.round(distance),
    message: isValid 
      ? 'Location verified successfully'
      : `You are ${Math.round(distance)}m away from the classroom. You must be within ${maxDistance}m to mark attendance.`
  };
}

/**
 * Get user's current location using browser geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<Object>} Promise resolving to location {lat, lng} or error
 */
export function getCurrentLocation(options = {}) {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    ...options
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let message;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions to mark attendance.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
          default:
            message = 'An unknown error occurred while getting your location.';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
}

/**
 * Check if geolocation is supported and permissions are granted
 * @returns {Promise<boolean>} Promise resolving to permission status
 */
export async function checkLocationPermission() {
  if (!navigator.geolocation) {
    return false;
  }

  if (!navigator.permissions) {
    // Fallback for browsers without permissions API
    try {
      await getCurrentLocation({ timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'granted';
  } catch {
    return false;
  }
}

/**
 * Request location permission from user
 * @returns {Promise<boolean>} Promise resolving to whether permission was granted
 */
export async function requestLocationPermission() {
  try {
    await getCurrentLocation({ timeout: 5000 });
    return true;
  } catch (error) {
    console.error('Location permission denied:', error.message);
    return false;
  }
}