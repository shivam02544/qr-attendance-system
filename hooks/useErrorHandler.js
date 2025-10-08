'use client';

import { useState, useCallback } from 'react';
import { getUserFriendlyMessage, logError } from '../lib/errorHandling';
import { useToast } from '../components/shared/ToastProvider';

export function useErrorHandler() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();

  const handleError = useCallback((error, context = {}) => {
    const friendlyMessage = getUserFriendlyMessage(error);
    
    // Log the error
    logError(error, context);
    
    // Set error state
    setError(friendlyMessage);
    
    // Show toast notification
    showError(friendlyMessage);
    
    return friendlyMessage;
  }, [showError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async (
    operation, 
    options = {}
  ) => {
    const {
      loadingMessage,
      successMessage,
      showSuccessToast = false,
      showErrorToast = true,
      context = {}
    } = options;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await operation();
      
      if (successMessage && showSuccessToast) {
        showSuccess(successMessage);
      }
      
      return result;
    } catch (error) {
      const friendlyMessage = getUserFriendlyMessage(error);
      
      // Log the error
      logError(error, context);
      
      // Set error state
      setError(friendlyMessage);
      
      // Show toast notification if enabled
      if (showErrorToast) {
        showError(friendlyMessage);
      }
      
      // Re-throw the error so calling code can handle it if needed
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, showError, showSuccess]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling
  };
}