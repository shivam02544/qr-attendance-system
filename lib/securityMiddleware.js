// Security middleware for API routes

import { NextResponse } from 'next/server';
import { 
  addSecurityHeaders, 
  validateOrigin, 
  logSecurityEvent,
  suspiciousActivityDetector,
  rateLimitConfigs,
  withRateLimit
} from './security.js';

// In-memory store for rate limiting (use Redis in production)
export const rateLimitStore = new Map();

// Simple rate limiter implementation for Next.js
export function createSimpleRateLimit(config) {
  return function(request) {
    const ip = request.headers?.get ? 
               (request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                '127.0.0.1') :
               '127.0.0.1';
    
    const url = request.url || '/api/test';
    const key = `${ip}-${url}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > config.windowMs) {
        rateLimitStore.delete(k);
      }
    }
    
    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key);
    if (!rateLimitData || now - rateLimitData.resetTime > config.windowMs) {
      rateLimitData = {
        count: 0,
        resetTime: now
      };
    }
    
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
    
    // Check if limit exceeded
    if (rateLimitData.count > config.max) {
      logSecurityEvent('rate_limit_exceeded', {
        ip,
        url: url,
        count: rateLimitData.count,
        limit: config.max
      });
      
      return {
        limited: true,
        remaining: 0,
        resetTime: rateLimitData.resetTime + config.windowMs
      };
    }
    
    return {
      limited: false,
      remaining: config.max - rateLimitData.count,
      resetTime: rateLimitData.resetTime + config.windowMs
    };
  };
}

// Security middleware wrapper
export function withSecurity(options = {}) {
  const {
    rateLimit = null,
    requireAuth = false,
    validateOrigin: checkOrigin = true,
    logActivity = true
  } = options;

  return function securityMiddleware(handler) {
    return async function(request, context) {
      try {
        // 1. Validate origin
        if (checkOrigin && !validateOrigin(request)) {
          logSecurityEvent('invalid_origin', {
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer'),
            url: request.url
          });

          const response = NextResponse.json(
            { error: 'Invalid request origin' },
            { status: 403 }
          );
          return addSecurityHeaders(response);
        }

        // 2. Apply rate limiting
        if (rateLimit) {
          const rateLimiter = createSimpleRateLimit(rateLimit);
          const limitResult = rateLimiter(request);
          
          if (limitResult.limited) {
            const response = NextResponse.json(
              { error: rateLimit.message || 'Too many requests' },
              { status: 429 }
            );
            
            response.headers.set('X-RateLimit-Limit', rateLimit.max.toString());
            response.headers.set('X-RateLimit-Remaining', '0');
            response.headers.set('X-RateLimit-Reset', limitResult.resetTime.toString());
            
            return addSecurityHeaders(response);
          }
          
          // Add rate limit headers to successful responses
          request.rateLimitInfo = limitResult;
        }

        // 3. Execute the handler
        const response = await handler(request, context);

        // 4. Add security headers to response
        const secureResponse = addSecurityHeaders(response);

        // 5. Add rate limit headers if applicable
        if (request.rateLimitInfo) {
          secureResponse.headers.set('X-RateLimit-Limit', rateLimit.max.toString());
          secureResponse.headers.set('X-RateLimit-Remaining', request.rateLimitInfo.remaining.toString());
          secureResponse.headers.set('X-RateLimit-Reset', request.rateLimitInfo.resetTime.toString());
        }

        return secureResponse;

      } catch (error) {
        logSecurityEvent('security_middleware_error', {
          error: error.message,
          url: request.url,
          stack: error.stack
        });

        const response = NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
        return addSecurityHeaders(response);
      }
    };
  };
}

// Specific middleware for different route types
export const withAttendanceSecurity = withSecurity({
  rateLimit: rateLimitConfigs.attendance,
  requireAuth: true,
  validateOrigin: true,
  logActivity: true
});

export const withAuthSecurity = withSecurity({
  rateLimit: rateLimitConfigs.auth,
  requireAuth: false,
  validateOrigin: true,
  logActivity: true
});

export const withRegistrationSecurity = withSecurity({
  rateLimit: rateLimitConfigs.registration,
  requireAuth: false,
  validateOrigin: true,
  logActivity: true
});

export const withGeneralSecurity = withSecurity({
  rateLimit: rateLimitConfigs.general,
  requireAuth: false,
  validateOrigin: true,
  logActivity: false
});

export const withQRSecurity = withSecurity({
  rateLimit: rateLimitConfigs.qrGeneration,
  requireAuth: true,
  validateOrigin: true,
  logActivity: true
});

// Activity logging helper
export function logUserActivity(userId, activityType, metadata = {}) {
  if (!userId || !activityType) return;

  // Record activity for suspicious pattern detection
  const suspiciousPatterns = suspiciousActivityDetector.recordActivity(
    userId, 
    activityType, 
    metadata
  );

  // Log suspicious patterns
  if (suspiciousPatterns.length > 0) {
    logSecurityEvent('suspicious_activity_detected', {
      userId,
      activityType,
      patterns: suspiciousPatterns,
      metadata
    });
  }

  // Log general activity
  logSecurityEvent('user_activity', {
    userId,
    activityType,
    metadata,
    suspicious: suspiciousPatterns.length > 0
  });
}

// Input validation schemas
export const validationSchemas = {
  attendance: (data) => {
    const errors = {};
    
    if (!data.sessionToken || typeof data.sessionToken !== 'string') {
      errors.sessionToken = 'Valid session token is required';
    }
    
    if (!data.studentLocation) {
      errors.studentLocation = 'Student location is required';
    } else {
      if (typeof data.studentLocation.lat !== 'number' || 
          data.studentLocation.lat < -90 || 
          data.studentLocation.lat > 90) {
        errors.lat = 'Valid latitude is required (-90 to 90)';
      }
      
      if (typeof data.studentLocation.lng !== 'number' || 
          data.studentLocation.lng < -180 || 
          data.studentLocation.lng > 180) {
        errors.lng = 'Valid longitude is required (-180 to 180)';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  registration: (data) => {
    const errors = {};
    
    if (!data.email || typeof data.email !== 'string') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Valid email is required';
    }
    
    if (!data.password || typeof data.password !== 'string') {
      errors.password = 'Password is required';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(data.password)) {
      errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!data.role || !['teacher', 'student', 'admin'].includes(data.role)) {
      errors.role = 'Valid role is required (teacher, student, or admin)';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  classCreation: (data) => {
    const errors = {};
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
      errors.name = 'Class name must be at least 3 characters';
    }
    
    if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length < 2) {
      errors.subject = 'Subject must be at least 2 characters';
    }
    
    if (!data.location) {
      errors.location = 'Location is required';
    } else {
      if (typeof data.location.lat !== 'number' || 
          data.location.lat < -90 || 
          data.location.lat > 90) {
        errors.lat = 'Valid latitude is required (-90 to 90)';
      }
      
      if (typeof data.location.lng !== 'number' || 
          data.location.lng < -180 || 
          data.location.lng > 180) {
        errors.lng = 'Valid longitude is required (-180 to 180)';
      }
      
      if (!data.location.name || typeof data.location.name !== 'string') {
        errors.locationName = 'Location name is required';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Request validation middleware
export function withValidation(schema) {
  return function(handler) {
    return async function(request, context) {
      try {
        const body = await request.json();
        const validation = schema(body);
        
        if (!validation.isValid) {
          logSecurityEvent('validation_failed', {
            url: request.url,
            errors: validation.errors
          });
          
          return NextResponse.json(
            { error: 'Validation failed', details: validation.errors },
            { status: 400 }
          );
        }
        
        // Add validated data to request
        request.validatedData = body;
        return handler(request, context);
        
      } catch (error) {
        logSecurityEvent('validation_error', {
          url: request.url,
          error: error.message
        });
        
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    };
  };
}