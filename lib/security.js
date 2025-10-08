// Security utilities and middleware

import rateLimit from 'express-rate-limit';
import { NextResponse } from 'next/server';

// Rate limiting configurations
export const rateLimitConfigs = {
  // Attendance marking - strict limits to prevent abuse
  attendance: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many attendance attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Authentication - moderate limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Registration - strict limits
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 registration attempts per hour
    message: 'Too many registration attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // General API - moderate limits
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // QR code generation - moderate limits
  qrGeneration: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 QR generations per 5 minutes
    message: 'Too many QR code generation attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

// Create rate limiter instances
export const createRateLimiter = (config) => {
  return rateLimit({
    ...config,
    handler: (req, res) => {
      return NextResponse.json(
        { error: config.message },
        { status: 429 }
      );
    }
  });
};

// Rate limiting middleware for Next.js API routes
export function withRateLimit(config) {
  const limiter = createRateLimiter(config);
  
  return function rateLimitMiddleware(handler) {
    return async function(request, context) {
      // Create a mock Express-like request/response for rate-limit
      const req = {
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            '127.0.0.1',
        method: request.method,
        url: request.url
      };

      const res = {
        status: (code) => ({ json: (data) => NextResponse.json(data, { status: code }) }),
        setHeader: () => {},
        getHeader: () => null
      };

      // Check rate limit
      try {
        await new Promise((resolve, reject) => {
          limiter(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (error) {
        return NextResponse.json(
          { error: config.message },
          { status: 429 }
        );
      }

      // Continue to the actual handler
      return handler(request, context);
    };
  };
}

// Input sanitization utilities
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers with quotes
    .replace(/on\w+\s*=\s*[^"'\s>]+/gi, '') // Remove event handlers without quotes
    .replace(/<[^>]*>/g, '') // Remove all HTML tags including angle brackets
    .trim();
}

// Sanitize object recursively
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// CSRF token generation and validation
export function generateCSRFToken() {
  return crypto.randomUUID();
}

export function validateCSRFToken(token, sessionToken) {
  // In a real implementation, you'd store CSRF tokens in session/database
  // For now, we'll use a simple validation
  return token && typeof token === 'string' && token.length > 10;
}

// Security headers middleware
export function addSecurityHeaders(response) {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(self), camera=(self)');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

// Validate request origin
export function validateOrigin(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Resolve the request's own origin (always allowed)
  let requestOrigin;
  try {
    const url = new URL(request.url);
    requestOrigin = `${url.protocol}//${url.host}`;
  } catch {}

  // Allow requests without origin/referer (direct API calls)
  if (!origin && !referer) {
    return true;
  }

  // Build allowed origins from env and deployment context
  const envAllowed = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
  ].filter(Boolean);

  // Vercel provides VERCEL_URL without protocol
  if (process.env.VERCEL_URL) {
    envAllowed.push(`https://${process.env.VERCEL_URL}`);
  }

  const allowedOrigins = [
    requestOrigin, // always allow same-origin
    'http://localhost:3000',
    'https://localhost:3000',
    ...envAllowed,
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (!allowedOrigins.includes(refererOrigin)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

// Suspicious activity detection
export class SuspiciousActivityDetector {
  constructor() {
    this.activities = new Map(); // In production, use Redis or database
  }

  recordActivity(userId, activityType, metadata = {}) {
    const key = `${userId}-${activityType}`;
    const now = Date.now();
    
    if (!this.activities.has(key)) {
      this.activities.set(key, []);
    }

    const activities = this.activities.get(key);
    activities.push({ timestamp: now, metadata });

    // Keep only last 100 activities per user-activity type
    if (activities.length > 100) {
      activities.splice(0, activities.length - 100);
    }

    // Check for suspicious patterns
    return this.detectSuspiciousPattern(userId, activityType, activities);
  }

  detectSuspiciousPattern(userId, activityType, activities) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentActivities = activities.filter(a => now - a.timestamp < oneHour);

    const suspiciousPatterns = [];

    // Pattern 1: Too many failed attempts
    if (activityType === 'failed_login' && recentActivities.length >= 5) {
      suspiciousPatterns.push('excessive_failed_logins');
    }

    // Pattern 2: Too many attendance attempts
    if (activityType === 'attendance_attempt' && recentActivities.length >= 20) {
      suspiciousPatterns.push('excessive_attendance_attempts');
    }

    // Pattern 3: Rapid location changes (potential GPS spoofing)
    if (activityType === 'attendance_marked' && recentActivities.length >= 3) {
      const locations = recentActivities
        .map(a => a.metadata.location)
        .filter(Boolean);
      
      if (locations.length >= 3) {
        const distances = [];
        for (let i = 1; i < locations.length; i++) {
          const dist = this.calculateDistance(locations[i-1], locations[i]);
          distances.push(dist);
        }
        
        // If user traveled more than 10km in less than an hour
        const maxDistance = Math.max(...distances);
        if (maxDistance > 10000) {
          suspiciousPatterns.push('rapid_location_change');
        }
      }
    }

    // Pattern 4: Multiple simultaneous sessions
    if (activityType === 'login' && recentActivities.length >= 3) {
      const uniqueIPs = new Set(recentActivities.map(a => a.metadata.ip));
      if (uniqueIPs.size >= 3) {
        suspiciousPatterns.push('multiple_simultaneous_sessions');
      }
    }

    return suspiciousPatterns;
  }

  calculateDistance(loc1, loc2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  isSuspicious(userId, activityType) {
    const key = `${userId}-${activityType}`;
    const activities = this.activities.get(key) || [];
    return this.detectSuspiciousPattern(userId, activityType, activities).length > 0;
  }
}

// Global suspicious activity detector instance
export const suspiciousActivityDetector = new SuspiciousActivityDetector();

// Security logging utility
export function logSecurityEvent(event, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: getSeverityLevel(event)
  };

  // In production, send to security monitoring service
  console.warn('SECURITY EVENT:', JSON.stringify(logEntry, null, 2));

  // Store in database for analysis
  // await SecurityLog.create(logEntry);
}

function getSeverityLevel(event) {
  const highSeverityEvents = [
    'excessive_failed_logins',
    'rapid_location_change',
    'multiple_simultaneous_sessions',
    'csrf_token_mismatch',
    'invalid_origin'
  ];

  const mediumSeverityEvents = [
    'excessive_attendance_attempts',
    'rate_limit_exceeded',
    'invalid_input_detected'
  ];

  if (highSeverityEvents.includes(event)) return 'HIGH';
  if (mediumSeverityEvents.includes(event)) return 'MEDIUM';
  return 'LOW';
}

// Validation utilities
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export function validateObjectId(id) {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
}

export function validateCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// Request validation middleware
export function validateRequest(schema) {
  return function(handler) {
    return async function(request, context) {
      try {
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);

        // Validate against schema
        const validation = schema(sanitizedBody);
        if (!validation.isValid) {
          logSecurityEvent('invalid_input_detected', {
            errors: validation.errors,
            url: request.url
          });

          return NextResponse.json(
            { error: 'Invalid input data', details: validation.errors },
            { status: 400 }
          );
        }

        // Add sanitized body to request
        request.sanitizedBody = sanitizedBody;
        return handler(request, context);

      } catch (error) {
        logSecurityEvent('request_validation_error', {
          error: error.message,
          url: request.url
        });

        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    };
  };
}