// Form validation utilities

export const validators = {
  required: (message = 'This field is required') => (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },

  email: (message = 'Please enter a valid email address') => (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  minLength: (min, message) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return message || `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (max, message) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return message || `Must be no more than ${max} characters long`;
    }
    return null;
  },

  pattern: (regex, message = 'Invalid format') => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  password: (message = 'Password must be at least 8 characters with uppercase, lowercase, and number') => (value) => {
    if (!value) return null;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(value)) {
      return message;
    }
    return null;
  },

  confirmPassword: (originalPassword, message = 'Passwords do not match') => (value) => {
    if (!value) return null;
    if (value !== originalPassword) {
      return message;
    }
    return null;
  },

  number: (message = 'Must be a valid number') => (value) => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  min: (min, message) => (value) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  },

  max: (max, message) => (value) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num > max) {
      return message || `Must be no more than ${max}`;
    }
    return null;
  },

  phone: (message = 'Please enter a valid phone number') => (value) => {
    if (!value) return null;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return message;
    }
    return null;
  },

  url: (message = 'Please enter a valid URL') => (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  }
};

// Combine multiple validators
export function combineValidators(...validatorFunctions) {
  return (value) => {
    for (const validator of validatorFunctions) {
      const error = validator(value);
      if (error) {
        return error;
      }
    }
    return null;
  };
}

// Validate entire form
export function validateForm(formData, validationRules) {
  const errors = {};
  let hasErrors = false;

  for (const [fieldName, rules] of Object.entries(validationRules)) {
    const value = formData[fieldName];
    const validator = Array.isArray(rules) ? combineValidators(...rules) : rules;
    const error = validator(value);
    
    if (error) {
      errors[fieldName] = error;
      hasErrors = true;
    }
  }

  return {
    isValid: !hasErrors,
    errors
  };
}

// Common validation rule sets
export const commonRules = {
  email: [validators.required(), validators.email()],
  password: [validators.required(), validators.password()],
  name: [validators.required(), validators.minLength(2), validators.maxLength(50)],
  className: [validators.required(), validators.minLength(3), validators.maxLength(100)],
  subject: [validators.required(), validators.minLength(2), validators.maxLength(50)]
};

// Async validation for unique fields
export async function validateUnique(value, checkFunction, message = 'This value is already taken') {
  if (!value) return null;
  
  try {
    const exists = await checkFunction(value);
    if (exists) {
      return message;
    }
    return null;
  } catch (error) {
    console.error('Unique validation error:', error);
    return 'Unable to validate uniqueness';
  }
}

// Location validation
export function validateLocation(location) {
  if (!location) {
    return 'Location is required';
  }

  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return 'Invalid location coordinates';
  }

  if (location.lat < -90 || location.lat > 90) {
    return 'Latitude must be between -90 and 90';
  }

  if (location.lng < -180 || location.lng > 180) {
    return 'Longitude must be between -180 and 180';
  }

  return null;
}

// QR code validation
export function validateQRData(qrData) {
  if (!qrData) {
    return 'QR code data is required';
  }

  if (typeof qrData === 'string') {
    try {
      qrData = JSON.parse(qrData);
    } catch {
      return 'Invalid QR code format';
    }
  }

  if (!qrData.sessionToken || typeof qrData.sessionToken !== 'string') {
    return 'QR code missing valid session token';
  }

  if (!qrData.classId || typeof qrData.classId !== 'string') {
    return 'QR code missing class information';
  }

  if (!qrData.location || typeof qrData.location !== 'object') {
    return 'QR code missing location information';
  }

  if (!qrData.expiresAt) {
    return 'QR code missing expiration information';
  }

  const expiresAt = new Date(qrData.expiresAt);
  if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return 'QR code has expired or invalid expiration date';
  }

  // Validate location coordinates
  const locationError = validateLocation(qrData.location);
  if (locationError) {
    return `QR code location error: ${locationError}`;
  }

  return null;
}

// Enhanced security validation functions
export function validateSessionToken(token) {
  if (!token || typeof token !== 'string') {
    return 'Session token is required';
  }

  // Check token format (should be UUID-like)
  const tokenRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!tokenRegex.test(token)) {
    return 'Invalid session token format';
  }

  return null;
}

export function validateObjectId(id) {
  if (!id || typeof id !== 'string') {
    return 'Object ID is required';
  }

  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    return 'Invalid object ID format';
  }

  return null;
}

export function validateUserRole(role) {
  const validRoles = ['teacher', 'student', 'admin'];
  if (!role || !validRoles.includes(role)) {
    return 'Invalid user role';
  }
  return null;
}

export function validateIPAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return 'IP address is required';
  }

  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return 'Invalid IP address format';
  }

  return null;
}

// Content Security Policy validation
export function validateCSPDirective(directive) {
  const validDirectives = [
    'default-src', 'script-src', 'style-src', 'img-src', 'font-src',
    'connect-src', 'media-src', 'object-src', 'base-uri', 'form-action'
  ];

  if (!directive || typeof directive !== 'string') {
    return 'CSP directive is required';
  }

  const [directiveName] = directive.split(' ');
  if (!validDirectives.includes(directiveName)) {
    return 'Invalid CSP directive';
  }

  return null;
}

// Rate limit validation
export function validateRateLimitConfig(config) {
  if (!config || typeof config !== 'object') {
    return 'Rate limit configuration is required';
  }

  if (!config.windowMs || typeof config.windowMs !== 'number' || config.windowMs < 1000) {
    return 'Window duration must be at least 1000ms';
  }

  if (!config.max || typeof config.max !== 'number' || config.max < 1) {
    return 'Maximum requests must be at least 1';
  }

  return null;
}