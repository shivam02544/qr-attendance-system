'use client';

import LoadingSpinner from './LoadingSpinner';

export default function LoadingState({ 
  loading, 
  error, 
  children, 
  loadingMessage = 'Loading...', 
  errorMessage = 'Something went wrong',
  onRetry,
  fullScreen = false,
  overlay = false
}) {
  if (loading) {
    return (
      <LoadingSpinner 
        size="large" 
        message={loadingMessage}
        fullScreen={fullScreen}
        overlay={overlay}
      />
    );
  }

  if (error) {
    const errorDisplay = (
      <div className="text-center p-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{typeof error === 'string' ? error : errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );

    if (fullScreen) {
      return (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          {errorDisplay}
        </div>
      );
    }

    if (overlay) {
      return (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
          {errorDisplay}
        </div>
      );
    }

    return errorDisplay;
  }

  return children;
}