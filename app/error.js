'use client';

import { useEffect } from 'react';
import ErrorMessage from '../components/shared/ErrorMessage';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
    
    // In production, you might want to log to an error reporting service
    // logErrorToService(error);
  }, [error]);

  const getErrorMessage = (error) => {
    // Provide user-friendly error messages based on error type
    if (error.message?.includes('Network')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    
    if (error.message?.includes('fetch')) {
      return 'Unable to connect to the server. Please try again in a moment.';
    }
    
    if (error.message?.includes('permission')) {
      return 'Permission denied. Please ensure you have the necessary permissions.';
    }
    
    if (error.message?.includes('location')) {
      return 'Location access is required for attendance marking. Please enable location services.';
    }
    
    // Default error message
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
        </div>

        <ErrorMessage 
          message={getErrorMessage(error)}
          className="mb-6"
        />

        <div className="flex flex-col space-y-3">
          <button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
          >
            Go to Home
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
              Technical Details (Development)
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-red-600 overflow-auto">
              {error.message}
              {error.stack && '\n\nStack trace:\n' + error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}