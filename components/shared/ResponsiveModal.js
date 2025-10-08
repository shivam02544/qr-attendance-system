'use client';

import { useEffect, useRef } from 'react';

export default function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'default', // small, default, large, full
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = ""
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && closeOnEscape) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus the modal for accessibility
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'max-w-sm';
      case 'large':
        return 'max-w-2xl lg:max-w-4xl';
      case 'full':
        return 'max-w-full mx-2 sm:mx-4 lg:mx-8 h-[95vh]';
      default:
        return 'max-w-md sm:max-w-lg lg:max-w-xl';
    }
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        className={`
          bg-white rounded-lg shadow-xl w-full ${getSizeClasses()} 
          ${size === 'full' ? 'overflow-hidden flex flex-col' : 'max-h-[95vh] overflow-y-auto'}
          animate-slide-up ${className}
        `}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`
            flex items-center justify-between p-3 sm:p-4 border-b 
            ${size === 'full' ? 'flex-shrink-0' : ''}
            ${title ? '' : 'justify-end'}
          `}>
            {title && (
              <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-4">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`
          p-3 sm:p-4 
          ${size === 'full' ? 'flex-1 overflow-y-auto' : ''}
        `}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Specialized modal components
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  type = "default", // default, danger, warning
  loading = false
}) {
  const getButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 disabled:bg-red-300';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300';
      default:
        return 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      closeOnOverlayClick={!loading}
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
          {getIcon()}
        </div>
        
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          {message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              w-full sm:w-auto button-responsive text-white font-medium rounded-md transition-colors
              ${getButtonClasses()}
            `}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              confirmLabel
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto button-responsive border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 font-medium rounded-md transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info", // info, success, warning, error
  buttonLabel = "OK"
}) {
  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-100', text: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' };
      case 'warning':
        return { bg: 'bg-yellow-100', text: 'text-yellow-600', button: 'bg-yellow-600 hover:bg-yellow-700' };
      case 'error':
        return { bg: 'bg-red-100', text: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' };
      default:
        return { bg: 'bg-blue-100', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' };
    }
  };

  const colors = getColors();

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
    >
      <div className="text-center">
        <div className={`mx-auto flex items-center justify-center w-12 h-12 rounded-full ${colors.bg} mb-4`}>
          <svg className={`w-6 h-6 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          {message}
        </p>
        
        <button
          onClick={onClose}
          className={`w-full sm:w-auto button-responsive text-white font-medium rounded-md transition-colors ${colors.button}`}
        >
          {buttonLabel}
        </button>
      </div>
    </ResponsiveModal>
  );
}