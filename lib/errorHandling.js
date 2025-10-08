// Error handling utilities for the application

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network connection failed') {
    super(message, 0, 'NETWORK_ERROR');
  }
}

export class LocationError extends AppError {
  constructor(message = 'Location access failed') {
    super(message, 400, 'LOCATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Error message mapping for user-friendly messages
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  FETCH_FAILED: 'Request failed. Please try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  
  // Authentication errors
  AUTH_ERROR: 'Please log in to continue.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Authorization errors
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  ROLE_REQUIRED: 'Insufficient permissions.',
  
  // Location errors
  LOCATION_ERROR: 'Location access is required for attendance marking.',
  LOCATION_DENIED: 'Please enable location services to mark attendance.',
  LOCATION_UNAVAILABLE: 'Unable to determine your location. Please try again.',
  LOCATION_TIMEOUT: 'Location request timed out. Please try again.',
  LOCATION_OUT_OF_RANGE: 'You are too far from the classroom to mark attendance.',
  
  // QR Code errors
  INVALID_QR: 'Invalid QR code. Please scan a valid attendance QR code.',
  EXPIRED_QR: 'This QR code has expired. Please ask your teacher for a new one.',
  QR_ALREADY_USED: 'You have already marked attendance for this session.',
  
  // Enrollment errors
  NOT_ENROLLED: 'You are not enrolled in this class. Please contact your teacher to enroll.',
  ALREADY_ENROLLED: 'You are already enrolled in this class.',
  ENROLLMENT_CLOSED: 'Enrollment for this class is closed. Please contact your teacher.',
  
  // General errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
  NOT_FOUND: 'The requested resource was not found.',
  DUPLICATE_ENTRY: 'This entry already exists.',
  
  // Database errors
  DB_CONNECTION_ERROR: 'Database connection failed. Please try again.',
  DB_OPERATION_ERROR: 'Database operation failed. Please try again.',
  
  // File/Upload errors
  FILE_TOO_LARGE: 'File size is too large.',
  INVALID_FILE_TYPE: 'Invalid file type.',
  UPLOAD_FAILED: 'File upload failed. Please try again.'
};

// Get user-friendly error message
export function getUserFriendlyMessage(error) {
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error;
  }
  
  if (error instanceof AppError) {
    return ERROR_MESSAGES[error.code] || error.message;
  }
  
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  if (error?.message) {
    // Check if the error message contains known patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    if (message.includes('location')) {
      return ERROR_MESSAGES.LOCATION_ERROR;
    }
    
    if (message.includes('not enrolled') || message.includes('student not enrolled')) {
      return ERROR_MESSAGES.NOT_ENROLLED;
    }
    
    if (message.includes('already enrolled')) {
      return ERROR_MESSAGES.ALREADY_ENROLLED;
    }
    
    if (message.includes('enrollment closed')) {
      return ERROR_MESSAGES.ENROLLMENT_CLOSED;
    }
    
    if (message.includes('expired')) {
      return ERROR_MESSAGES.EXPIRED_QR;
    }
    
    if (message.includes('already marked') || message.includes('already used')) {
      return ERROR_MESSAGES.QR_ALREADY_USED;
    }
    
    if (message.includes('invalid qr') || message.includes('invalid code')) {
      return ERROR_MESSAGES.INVALID_QR;
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return ERROR_MESSAGES.AUTHORIZATION_ERROR;
    }
    
    return error.message;
  }
  
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

// API error handler
export async function handleApiResponse(response) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Request failed' };
    }
    
    const error = new AppError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData.code || 'API_ERROR'
    );
    
    throw error;
  }
  
  return response.json();
}

// Async operation wrapper with error handling
export async function withErrorHandling(operation, options = {}) {
  const { 
    retries = 0, 
    retryDelay = 1000, 
    onError,
    onRetry 
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (onError) {
        onError(error, attempt);
      }
      
      // Don't retry on certain errors
      if (error instanceof ValidationError || 
          error instanceof AuthenticationError || 
          error instanceof AuthorizationError) {
        break;
      }
      
      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }
      
      if (onRetry) {
        onRetry(attempt + 1, retries + 1);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  
  throw lastError;
}

// Log error for debugging/monitoring
export function logError(error, context = {}) {
  // Handle cases where error might be null, undefined, or not an Error object
  if (!error) {
    console.error('Application Error: No error provided', { context, timestamp: new Date().toISOString() });
    return;
  }

  // Handle string errors
  if (typeof error === 'string') {
    console.error('Application Error:', {
      message: error,
      timestamp: new Date().toISOString(),
      context
    });
    return;
  }

  // Handle Error objects and custom error objects
  const errorInfo = {
    message: error.message || 'Unknown error',
    stack: error.stack || 'No stack trace available',
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
    name: error.name || 'Error',
    timestamp: new Date().toISOString(),
    context,
    // Include the original error for debugging
    originalError: error.toString()
  };
  
  console.error('Application Error:', errorInfo);
  
  // In production, send to error monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorService(errorInfo);
  }
}

// Create error response for API routes
export function createErrorResponse(error, defaultMessage = 'Internal server error') {
  let statusCode = 500;
  let message = defaultMessage;
  let code = 'INTERNAL_ERROR';
  
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error?.statusCode) {
    statusCode = error.statusCode;
    message = error.message || defaultMessage;
    code = error.code || 'API_ERROR';
  }
  
  // Log the error
  logError(error, { statusCode, code });
  
  return {
    error: message,
    code,
    statusCode
  };
}