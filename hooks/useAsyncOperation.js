'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';

export function useAsyncOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const { error, handleError, clearError } = useErrorHandler();
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (
    operation, 
    options = {}
  ) => {
    const {
      onSuccess,
      onError,
      abortable = false,
      resetDataOnStart = true
    } = options;

    // Abort previous operation if it's still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller if operation is abortable
    if (abortable) {
      abortControllerRef.current = new AbortController();
    }

    try {
      setIsLoading(true);
      clearError();
      
      if (resetDataOnStart) {
        setData(null);
      }

      const result = await operation(abortControllerRef.current?.signal);
      
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      // Don't handle aborted operations as errors
      if (error.name === 'AbortError') {
        return;
      }
      
      const friendlyMessage = handleError(error);
      
      if (onError) {
        onError(error, friendlyMessage);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [handleError, clearError]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    abort();
    setData(null);
    clearError();
    setIsLoading(false);
  }, [abort, clearError]);

  return {
    isLoading,
    data,
    error,
    execute,
    abort,
    reset
  };
}