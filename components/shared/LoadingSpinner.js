'use client';

export default function LoadingSpinner({ 
  size = 'medium', 
  className = '', 
  message = '',
  fullScreen = false,
  overlay = false 
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };

  const spinner = (
    <div className={`flex flex-col justify-center items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {message && (
        <p className="mt-3 text-sm text-gray-600 text-center">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses.large} mx-auto`}></div>
          {message && (
            <p className="mt-4 text-gray-600">{message}</p>
          )}
        </div>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        {spinner}
      </div>
    );
  }

  return spinner;
}