// Global error handler for unhandled errors and promise rejections

import { logError } from './errorHandling';

// Handle unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Log the error
    logError(event.reason || new Error('Unhandled promise rejection'), {
      type: 'unhandledrejection',
      promise: event.promise
    });
    
    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    // Log the error
    logError(event.error || new Error(event.message), {
      type: 'uncaught',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Handle React error boundaries (if using React)
  window.addEventListener('react-error', (event) => {
    console.error('React error:', event.detail);
    
    logError(event.detail.error || new Error('React error'), {
      type: 'react',
      componentStack: event.detail.componentStack,
      errorBoundary: event.detail.errorBoundary
    });
  });
}

// Export a function to manually report errors
export function reportError(error, context = {}) {
  logError(error, { ...context, type: 'manual' });
}

// Export a function to create and report custom errors
export function reportCustomError(message, code = 'CUSTOM_ERROR', context = {}) {
  const error = new Error(message);
  error.code = code;
  logError(error, { ...context, type: 'custom' });
}