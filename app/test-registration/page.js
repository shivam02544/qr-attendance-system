'use client';

import { useState } from 'react';
import RegistrationForm from '../../components/shared/RegistrationForm';

export default function TestRegistrationPage() {
  const [registrationResult, setRegistrationResult] = useState(null);

  const handleRegistrationSuccess = (user) => {
    setRegistrationResult({
      success: true,
      message: `Registration successful for ${user.name} (${user.email})`,
      user
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-8">
            Test Registration Form
          </h1>
          
          {registrationResult && (
            <div className={`mb-6 p-4 rounded-md ${
              registrationResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                registrationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {registrationResult.message}
              </p>
              {registrationResult.user && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>User ID: {registrationResult.user.id}</p>
                  <p>Role: {registrationResult.user.role}</p>
                </div>
              )}
            </div>
          )}

          <RegistrationForm onSuccess={handleRegistrationSuccess} />
          
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Password Requirements:
            </h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains uppercase letter (A-Z)</li>
              <li>• Contains lowercase letter (a-z)</li>
              <li>• Contains at least one number (0-9)</li>
              <li>• May contain special characters (@$!%*?&)</li>
            </ul>
            <div className="mt-3">
              <p className="text-xs text-blue-700 font-medium">Valid example:</p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded">Password123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}