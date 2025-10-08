'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function AsyncButton({
  onClick,
  children,
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'medium',
  loadingText = 'Loading...',
  showErrorToast = true,
  showSuccessToast = false,
  successMessage = 'Operation completed successfully',
  ...props
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { executeWithErrorHandling } = useErrorHandler();

  const handleClick = async (e) => {
    if (!onClick || isLoading || disabled) return;

    try {
      await executeWithErrorHandling(
        () => onClick(e),
        {
          showErrorToast,
          showSuccessToast,
          successMessage
        }
      );
    } catch (error) {
      // Error is already handled by executeWithErrorHandling
      console.error('Button operation failed:', error);
    }
  };

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  };

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-md transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `.trim();

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={baseClasses}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="small" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}