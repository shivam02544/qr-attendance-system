import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  sanitizeInput, 
  sanitizeObject, 
  validateEmail, 
  validatePassword, 
  validateCoordinates,
  suspiciousActivityDetector,
  SuspiciousActivityDetector
} from '../../lib/security';
import { 
  securityLogger, 
  LOG_LEVELS, 
  SECURITY_EVENTS 
} from '../../lib/securityLogger';
import { 
  validationSchemas 
} from '../../lib/securityMiddleware';

describe('Security Utilities', () => {
  describe('Input Sanitization', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello');
    });

    it('should remove javascript protocol', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const maliciousInput = 'onclick="alert(1)" onload="evil()"';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('');
    });

    it('should remove angle brackets', () => {
      const maliciousInput = '<div>content</div>';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('content');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize object properties recursively', () => {
      const maliciousObject = {
        name: '<script>alert("xss")</script>John',
        email: 'test@example.com',
        nested: {
          value: 'javascript:alert("nested")',
          safe: 'normal text'
        },
        array: ['<script>evil</script>', 'safe text']
      };

      const sanitized = sanitizeObject(maliciousObject);
      
      expect(sanitized.name).toBe('John');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.nested.value).toBe('alert("nested")');
      expect(sanitized.nested.safe).toBe('normal text');
      expect(sanitized.array[0]).toBe('');
      expect(sanitized.array[1]).toBe('safe text');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });
  });

  describe('Validation Functions', () => {
    describe('validateEmail', () => {
      it('should validate correct email formats', () => {
        expect(validateEmail('test@example.com')).toBe(true);
        expect(validateEmail('user.name@domain.co.uk')).toBe(true);
        expect(validateEmail('user+tag@example.org')).toBe(true);
      });

      it('should reject invalid email formats', () => {
        expect(validateEmail('invalid-email')).toBe(false);
        expect(validateEmail('@example.com')).toBe(false);
        expect(validateEmail('test@')).toBe(false);
        expect(validateEmail('test.example.com')).toBe(false);
      });
    });

    describe('validatePassword', () => {
      it('should validate strong passwords', () => {
        expect(validatePassword('Password123')).toBe(true);
        expect(validatePassword('MySecure1Pass')).toBe(true);
        expect(validatePassword('Complex9Password')).toBe(true);
      });

      it('should reject weak passwords', () => {
        expect(validatePassword('password')).toBe(false); // no uppercase or number
        expect(validatePassword('PASSWORD')).toBe(false); // no lowercase or number
        expect(validatePassword('Password')).toBe(false); // no number
        expect(validatePassword('Pass1')).toBe(false); // too short
      });
    });

    describe('validateCoordinates', () => {
      it('should validate correct coordinates', () => {
        expect(validateCoordinates(40.7128, -74.0060)).toBe(true); // NYC
        expect(validateCoordinates(0, 0)).toBe(true); // Equator/Prime Meridian
        expect(validateCoordinates(90, 180)).toBe(true); // Extreme valid values
        expect(validateCoordinates(-90, -180)).toBe(true); // Extreme valid values
      });

      it('should reject invalid coordinates', () => {
        expect(validateCoordinates(91, 0)).toBe(false); // Invalid latitude
        expect(validateCoordinates(-91, 0)).toBe(false); // Invalid latitude
        expect(validateCoordinates(0, 181)).toBe(false); // Invalid longitude
        expect(validateCoordinates(0, -181)).toBe(false); // Invalid longitude
        expect(validateCoordinates('40.7128', '-74.0060')).toBe(false); // String values
      });
    });
  });
});

describe('Suspicious Activity Detection', () => {
  let detector;

  beforeEach(() => {
    detector = new SuspiciousActivityDetector();
  });

  it('should detect excessive failed logins', () => {
    const userId = 'user123';
    
    // Record 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      const patterns = detector.recordActivity(userId, 'failed_login', {
        ip: '192.168.1.1',
        timestamp: Date.now()
      });
      
      if (i === 4) { // On the 5th attempt
        expect(patterns).toContain('excessive_failed_logins');
      }
    }
  });

  it('should detect excessive attendance attempts', () => {
    const userId = 'student123';
    
    // Record 20 attendance attempts
    for (let i = 0; i < 20; i++) {
      const patterns = detector.recordActivity(userId, 'attendance_attempt', {
        sessionToken: 'token123',
        timestamp: Date.now()
      });
      
      if (i === 19) { // On the 20th attempt
        expect(patterns).toContain('excessive_attendance_attempts');
      }
    }
  });

  it('should detect rapid location changes', () => {
    const userId = 'student123';
    
    // Record attendance from different locations
    const locations = [
      { lat: 40.7128, lng: -74.0060 }, // NYC
      { lat: 34.0522, lng: -118.2437 }, // LA (very far from NYC)
      { lat: 41.8781, lng: -87.6298 }  // Chicago
    ];
    
    locations.forEach((location, index) => {
      const patterns = detector.recordActivity(userId, 'attendance_marked', {
        location,
        timestamp: Date.now() + index * 1000
      });
      
      if (index === 2) { // After 3rd location
        expect(patterns).toContain('rapid_location_change');
      }
    });
  });

  it('should detect multiple simultaneous sessions', () => {
    const userId = 'user123';
    
    // Record logins from different IPs
    const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    
    ips.forEach((ip, index) => {
      const patterns = detector.recordActivity(userId, 'login', {
        ip,
        timestamp: Date.now() + index * 1000
      });
      
      if (index === 2) { // After 3rd IP
        expect(patterns).toContain('multiple_simultaneous_sessions');
      }
    });
  });
});

describe('Rate Limiting', () => {
  it('should implement basic rate limiting logic', () => {
    // Simple in-memory rate limiter for testing
    const store = new Map();
    
    function testRateLimit(config, ip, url) {
      const key = `${ip}-${url}`;
      const now = Date.now();
      
      let data = store.get(key);
      if (!data || now - data.resetTime > config.windowMs) {
        data = { count: 0, resetTime: now };
      }
      
      data.count++;
      store.set(key, data);
      
      return {
        limited: data.count > config.max,
        remaining: Math.max(0, config.max - data.count),
        count: data.count
      };
    }

    const config = { windowMs: 60000, max: 3 };
    const ip = '192.168.1.1';
    const url = '/api/test';

    // First 3 requests should be allowed
    const result1 = testRateLimit(config, ip, url);
    expect(result1.limited).toBe(false);
    expect(result1.remaining).toBe(2);

    const result2 = testRateLimit(config, ip, url);
    expect(result2.limited).toBe(false);
    expect(result2.remaining).toBe(1);

    const result3 = testRateLimit(config, ip, url);
    expect(result3.limited).toBe(false);
    expect(result3.remaining).toBe(0);

    // 4th request should be blocked
    const result4 = testRateLimit(config, ip, url);
    expect(result4.limited).toBe(true);
    expect(result4.remaining).toBe(0);
  });
});

describe('Validation Schemas', () => {
  describe('attendance validation', () => {
    it('should validate correct attendance data', () => {
      const validData = {
        sessionToken: 'valid-token-123',
        studentLocation: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const result = validationSchemas.attendance(validData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject invalid attendance data', () => {
      const invalidData = {
        sessionToken: '', // Empty token
        studentLocation: {
          lat: 91, // Invalid latitude
          lng: -181 // Invalid longitude
        }
      };

      const result = validationSchemas.attendance(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.sessionToken).toBeDefined();
      expect(result.errors.lat).toBeDefined();
      expect(result.errors.lng).toBeDefined();
    });
  });

  describe('registration validation', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        name: 'John Doe',
        role: 'student'
      };

      const result = validationSchemas.registration(validData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject invalid registration data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        name: 'A', // Too short
        role: 'invalid-role'
      };

      const result = validationSchemas.registration(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.name).toBeDefined();
      expect(result.errors.role).toBeDefined();
    });
  });

  describe('class creation validation', () => {
    it('should validate correct class data', () => {
      const validData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 101'
        }
      };

      const result = validationSchemas.classCreation(validData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject invalid class data', () => {
      const invalidData = {
        name: 'AB', // Too short
        subject: 'M', // Too short
        location: {
          lat: 91, // Invalid
          lng: -181, // Invalid
          name: '' // Empty
        }
      };

      const result = validationSchemas.classCreation(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.subject).toBeDefined();
      expect(result.errors.lat).toBeDefined();
      expect(result.errors.lng).toBeDefined();
      expect(result.errors.locationName).toBeDefined();
    });
  });
});

describe('Security Logger', () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log security events with correct structure', async () => {
    const logId = await securityLogger.log(
      SECURITY_EVENTS.LOGIN_FAILED,
      LOG_LEVELS.MEDIUM,
      { ip: '192.168.1.1', reason: 'invalid_password' },
      'user123'
    );

    expect(logId).toBeDefined();
    expect(typeof logId).toBe('string');
  });

  it('should generate security statistics', async () => {
    // Log some test events
    await securityLogger.log(SECURITY_EVENTS.LOGIN_SUCCESS, LOG_LEVELS.LOW, {}, 'user1');
    await securityLogger.log(SECURITY_EVENTS.LOGIN_FAILED, LOG_LEVELS.MEDIUM, {}, 'user2');
    await securityLogger.log(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, LOG_LEVELS.HIGH, {}, 'user3');

    const stats = await securityLogger.getSecurityStats(1); // Last 1 hour
    
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byLevel');
    expect(stats).toHaveProperty('byEvent');
    expect(stats).toHaveProperty('byHour');
    expect(stats).toHaveProperty('topIPs');
    expect(stats).toHaveProperty('suspiciousUsers');
  });

  it('should sanitize sensitive data in logs', () => {
    const sensitiveData = {
      password: 'secret123',
      token: 'abc123',
      key: 'private-key',
      normalField: 'normal-value'
    };

    const sanitized = securityLogger.sanitizeForLog(sensitiveData);
    
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.key).toBe('[REDACTED]');
    expect(sanitized.normalField).toBe('normal-value');
  });
});