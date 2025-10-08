import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateDistance,
  verifyLocationProximity,
  getCurrentLocation,
  checkLocationPermission,
  requestLocationPermission
} from '@/lib/location.js';

describe('Location Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance between New York and Los Angeles (approximately 3944 km)
      const nyLat = 40.7128;
      const nyLng = -74.0060;
      const laLat = 34.0522;
      const laLng = -118.2437;

      const distance = calculateDistance(nyLat, nyLng, laLat, laLng);
      
      // Should be approximately 3,944,000 meters (3,944 km)
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for same coordinates', () => {
      const lat = 40.7128;
      const lng = -74.0060;

      const distance = calculateDistance(lat, lng, lat, lng);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points very close to each other (about 100 meters apart)
      const lat1 = 40.7128;
      const lng1 = -74.0060;
      const lat2 = 40.7137; // Slightly north
      const lng2 = -74.0060;

      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Should be approximately 100 meters
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });

    it('should handle negative coordinates', () => {
      // Test with southern hemisphere coordinates
      const lat1 = -33.8688; // Sydney
      const lng1 = 151.2093;
      const lat2 = -37.8136; // Melbourne
      const lng2 = 144.9631;

      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Should be approximately 713 km
      expect(distance).toBeGreaterThan(700000);
      expect(distance).toBeLessThan(730000);
    });

    it('should handle coordinates across the international date line', () => {
      // Test coordinates that cross 180/-180 longitude
      const lat1 = 21.3099; // Honolulu
      const lng1 = -157.8581;
      const lat2 = 35.6762; // Tokyo
      const lng2 = 139.6503;

      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Should be approximately 6,200 km
      expect(distance).toBeGreaterThan(6000000);
      expect(distance).toBeLessThan(6500000);
    });
  });

  describe('verifyLocationProximity', () => {
    const classroomLocation = {
      lat: 40.7128,
      lng: -74.0060
    };

    it('should verify location within acceptable range', () => {
      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060 // Same as classroom
      };

      const result = verifyLocationProximity(studentLocation, classroomLocation, 50);

      expect(result.isValid).toBe(true);
      expect(result.distance).toBe(0);
      expect(result.message).toBe('Location verified successfully');
    });

    it('should reject location outside acceptable range', () => {
      const studentLocation = {
        lat: 40.7200, // About 800m north
        lng: -74.0060
      };

      const result = verifyLocationProximity(studentLocation, classroomLocation, 50);

      expect(result.isValid).toBe(false);
      expect(result.distance).toBeGreaterThan(50);
      expect(result.message).toContain('You are');
      expect(result.message).toContain('away from the classroom');
    });

    it('should handle missing student location', () => {
      const result = verifyLocationProximity(null, classroomLocation, 50);

      expect(result.isValid).toBe(false);
      expect(result.distance).toBeNull();
      expect(result.message).toBe('Location data is missing');
    });

    it('should handle missing classroom location', () => {
      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      const result = verifyLocationProximity(studentLocation, null, 50);

      expect(result.isValid).toBe(false);
      expect(result.distance).toBeNull();
      expect(result.message).toBe('Location data is missing');
    });

    it('should handle invalid coordinates', () => {
      const studentLocation = {
        lat: null,
        lng: -74.0060
      };

      const result = verifyLocationProximity(studentLocation, classroomLocation, 50);

      expect(result.isValid).toBe(false);
      expect(result.distance).toBeNull();
      expect(result.message).toBe('Invalid location coordinates');
    });

    it('should use custom max distance', () => {
      const studentLocation = {
        lat: 40.7135, // About 80m north
        lng: -74.0060
      };

      // Should fail with 50m limit
      const result1 = verifyLocationProximity(studentLocation, classroomLocation, 50);
      expect(result1.isValid).toBe(false);

      // Should pass with 100m limit
      const result2 = verifyLocationProximity(studentLocation, classroomLocation, 100);
      expect(result2.isValid).toBe(true);
    });

    it('should round distance to nearest meter', () => {
      const studentLocation = {
        lat: 40.7129, // Very close
        lng: -74.0060
      };

      const result = verifyLocationProximity(studentLocation, classroomLocation, 50);

      expect(Number.isInteger(result.distance)).toBe(true);
    });
  });

  describe('getCurrentLocation', () => {
    beforeEach(() => {
      // Reset mocks
      vi.clearAllMocks();
    });

    it('should resolve with location when geolocation succeeds', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        }
      };

      // Mock successful geolocation
      const mockGetCurrentPosition = vi.fn((success) => {
        success(mockPosition);
      });

      global.navigator = {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition
        }
      };

      const location = await getCurrentLocation();

      expect(location.lat).toBe(40.7128);
      expect(location.lng).toBe(-74.0060);
      expect(location.accuracy).toBe(10);
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('should reject when geolocation is not supported', async () => {
      global.navigator = {};

      await expect(getCurrentLocation()).rejects.toThrow(
        'Geolocation is not supported by this browser'
      );
    });

    it('should reject when permission is denied', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1
      };

      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(mockError);
      });

      global.navigator = {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition
        }
      };

      await expect(getCurrentLocation()).rejects.toThrow(
        'Location access denied. Please enable location permissions to mark attendance.'
      );
    });

    it('should reject when position is unavailable', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        POSITION_UNAVAILABLE: 2
      };

      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(mockError);
      });

      global.navigator = {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition
        }
      };

      await expect(getCurrentLocation()).rejects.toThrow(
        'Location information is unavailable. Please try again.'
      );
    });

    it('should reject when request times out', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        TIMEOUT: 3
      };

      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(mockError);
      });

      global.navigator = {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition
        }
      };

      await expect(getCurrentLocation()).rejects.toThrow(
        'Location request timed out. Please try again.'
      );
    });

    it('should use custom options', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        }
      };

      const mockGetCurrentPosition = vi.fn((success) => {
        success(mockPosition);
      });

      global.navigator = {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition
        }
      };

      const customOptions = {
        timeout: 5000,
        maximumAge: 30000
      };

      await getCurrentLocation(customOptions);

      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          timeout: 5000,
          maximumAge: 30000,
          enableHighAccuracy: true
        })
      );
    });
  });

  describe('checkLocationPermission', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return false when geolocation is not supported', async () => {
      global.navigator = {};

      const hasPermission = await checkLocationPermission();
      expect(hasPermission).toBe(false);
    });

    it('should return true when permission is granted', async () => {
      const mockPermission = {
        state: 'granted'
      };

      global.navigator = {
        geolocation: {},
        permissions: {
          query: vi.fn().mockResolvedValue(mockPermission)
        }
      };

      const hasPermission = await checkLocationPermission();
      expect(hasPermission).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      const mockPermission = {
        state: 'denied'
      };

      global.navigator = {
        geolocation: {},
        permissions: {
          query: vi.fn().mockResolvedValue(mockPermission)
        }
      };

      const hasPermission = await checkLocationPermission();
      expect(hasPermission).toBe(false);
    });

    it('should fallback to getCurrentLocation when permissions API is not available', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        }
      };

      global.navigator = {
        geolocation: {
          getCurrentPosition: vi.fn((success) => success(mockPosition))
        }
      };

      const hasPermission = await checkLocationPermission();
      expect(hasPermission).toBe(true);
    });
  });

  describe('requestLocationPermission', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when location access is granted', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        }
      };

      global.navigator = {
        geolocation: {
          getCurrentPosition: vi.fn((success) => success(mockPosition))
        }
      };

      const granted = await requestLocationPermission();
      expect(granted).toBe(true);
    });

    it('should return false when location access is denied', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1
      };

      global.navigator = {
        geolocation: {
          getCurrentPosition: vi.fn((success, error) => error(mockError))
        }
      };

      const granted = await requestLocationPermission();
      expect(granted).toBe(false);
    });
  });
});