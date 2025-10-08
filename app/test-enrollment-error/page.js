'use client';

import { useState } from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { AppError, getUserFriendlyMessage } from '../../lib/errorHandling';

export default function TestEnrollmentErrorPage() {
  const { executeWithErrorHandling, error, isLoading } = useErrorHandler();
  const [testResult, setTestResult] = useState('');
  const [messageTest, setMessageTest] = useState('');

  const testEnrollmentError = async () => {
    try {
      await executeWithErrorHandling(
        async () => {
          // Simulate the enrollment error exactly as it comes from the API
          throw new AppError('Student not enrolled in class', 403, 'NOT_ENROLLED');
        },
        {
          showErrorToast: true,
          context: { operation: 'test_enrollment_error' }
        }
      );
    } catch (error) {
      setTestResult(`Error caught: ${error.message} (Code: ${error.code})`);
    }
  };

  const testOtherErrors = async () => {
    const errors = [
      { message: 'You are already enrolled in this class', code: 'ALREADY_ENROLLED' },
      { message: 'Enrollment for this class is closed', code: 'ENROLLMENT_CLOSED' },
      { message: 'This QR code has expired', code: 'EXPIRED_QR' },
      { message: 'You have already marked attendance for this session', code: 'QR_ALREADY_USED' },
      { message: 'Invalid QR code format', code: 'INVALID_QR' }
    ];

    for (const errorInfo of errors) {
      try {
        await executeWithErrorHandling(
          async () => {
            throw new AppError(errorInfo.message, 403, errorInfo.code);
          },
          {
            showErrorToast: true,
            context: { operation: 'test_error', errorType: errorInfo.code }
          }
        );
      } catch (error) {
        // Expected to catch
      }
      
      // Wait a bit between errors
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setTestResult('All error types tested');
  };

  const testMessageConversion = () => {
    const testError = new AppError('Student not enrolled in class', 403, 'NOT_ENROLLED');
    const friendlyMessage = getUserFriendlyMessage(testError);
    setMessageTest(`Original: "${testError.message}" → Friendly: "${friendlyMessage}"`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-8">
            Test Enrollment Error Handling
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={testEnrollmentError}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test &quot;Not Enrolled&quot; Error'}
            </button>
            
            <button
              onClick={testOtherErrors}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test All Error Types'}
            </button>
            
            <button
              onClick={testMessageConversion}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Test Message Conversion
            </button>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">Current Error State:</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {testResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-2">Test Result:</h3>
              <p className="text-sm text-green-700">{testResult}</p>
            </div>
          )}
          
          {messageTest && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
              <h3 className="text-sm font-medium text-purple-800 mb-2">Message Conversion Test:</h3>
              <p className="text-xs text-purple-700 break-words">{messageTest}</p>
            </div>
          )}
          
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Expected Behavior:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• &quot;Not Enrolled&quot; → &quot;You are not enrolled in this class. Please contact your teacher to enroll.&quot;</li>
              <li>• &quot;Already Enrolled&quot; → &quot;You are already enrolled in this class.&quot;</li>
              <li>• &quot;Enrollment Closed&quot; → &quot;Enrollment for this class is closed. Please contact your teacher.&quot;</li>
              <li>• &quot;Expired QR&quot; → &quot;This QR code has expired. Please ask your teacher for a new one.&quot;</li>
              <li>• &quot;Already Used&quot; → &quot;You have already marked attendance for this session.&quot;</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}