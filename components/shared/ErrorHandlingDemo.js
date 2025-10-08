'use client';

import { useState } from 'react';
import AsyncButton from './AsyncButton';
import FormField from './FormField';
import LoadingState from './LoadingState';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { useToast } from './ToastProvider';
import { validators, combineValidators } from '../../lib/validation';
import { api } from '../../lib/apiClient';

export default function ErrorHandlingDemo() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    testType: 'success'
  });
  const [formErrors, setFormErrors] = useState({});
  
  const { isLoading, data, error, execute, reset } = useAsyncOperation();
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  // Simulate different API responses for demo
  const simulateApiCall = async (type) => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    
    switch (type) {
      case 'success':
        return { message: 'Operation completed successfully!', data: { id: 123 } };
      case 'error':
        throw new Error('Something went wrong with the operation');
      case 'network':
        throw new Error('Network connection failed');
      case 'validation':
        throw new Error('Validation failed: Invalid input data');
      default:
        return { message: 'Default response' };
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = {};
    const emailValidator = combineValidators(validators.required(), validators.email());
    const nameValidator = combineValidators(validators.required(), validators.minLength(2));
    
    const emailError = emailValidator(formData.email);
    const nameError = nameValidator(formData.name);
    
    if (emailError) errors.email = emailError;
    if (nameError) errors.name = nameError;
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showError('Please fix the form errors before submitting');
      return;
    }

    try {
      const result = await execute(() => simulateApiCall(formData.testType));
      showSuccess('Form submitted successfully!');
      console.log('Result:', result);
    } catch (error) {
      // Error is already handled by useAsyncOperation
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const testToasts = () => {
    showSuccess('This is a success message!');
    setTimeout(() => showError('This is an error message!'), 1000);
    setTimeout(() => showWarning('This is a warning message!'), 2000);
    setTimeout(() => showInfo('This is an info message!'), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Error Handling Demo
      </h2>
      
      <div className="space-y-6">
        {/* Toast Demo */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-3">Toast Notifications</h3>
          <AsyncButton
            onClick={testToasts}
            variant="outline"
            loadingText="Testing..."
          >
            Test All Toast Types
          </AsyncButton>
        </div>

        {/* Form with Validation Demo */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-3">Form Validation & API Calls</h3>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={formErrors.email}
              required
              placeholder="Enter your email"
              validate={combineValidators(validators.required(), validators.email())}
            />
            
            <FormField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={formErrors.name}
              required
              placeholder="Enter your name"
              validate={combineValidators(validators.required(), validators.minLength(2))}
            />
            
            <FormField
              label="Test Scenario"
              name="testType"
              type="select"
              value={formData.testType}
              onChange={handleInputChange}
              options={[
                { value: 'success', label: 'Success Response' },
                { value: 'error', label: 'Generic Error' },
                { value: 'network', label: 'Network Error' },
                { value: 'validation', label: 'Validation Error' }
              ]}
              helpText="Choose what type of response to simulate"
            />
            
            <div className="flex space-x-3">
              <AsyncButton
                type="submit"
                disabled={isLoading}
                loadingText="Submitting..."
                showSuccessToast={false} // We handle success manually
              >
                Submit Form
              </AsyncButton>
              
              <AsyncButton
                type="button"
                variant="outline"
                onClick={reset}
                disabled={isLoading}
              >
                Reset
              </AsyncButton>
            </div>
          </form>
        </div>

        {/* Loading State Demo */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Loading States & Results</h3>
          
          <LoadingState
            loading={isLoading}
            error={error}
            loadingMessage="Processing your request..."
            onRetry={() => execute(() => simulateApiCall(formData.testType))}
          >
            {data ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-900 mb-2">Success!</h4>
                <pre className="text-sm text-green-800 overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                <p className="text-gray-600">Submit the form to see results here</p>
              </div>
            )}
          </LoadingState>
        </div>
      </div>
    </div>
  );
}