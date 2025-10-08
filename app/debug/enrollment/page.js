'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function EnrollmentDebugPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/debug/session');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch debug info');
      }
      
      setDebugInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDebugInfo();
    }
  }, [status]);

  const testEnrollment = async () => {
    try {
      setError('');
      
      // Use a test class ID - you might need to adjust this
      const testClassId = '68e58f7adb5954e5b03d1f26';
      
      const response = await fetch('/api/student/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId: testClassId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Enrollment failed');
      }
      
      alert('Enrollment successful!');
      fetchDebugInfo(); // Refresh debug info
      
    } catch (err) {
      setError(`Enrollment error: ${err.message}`);
    }
  };

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Enrollment Debug</h1>
        <p>Please log in to debug enrollment issues.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enrollment Debug Page</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Session Info */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Session Information</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Database Debug Information</h2>
            <button
              onClick={fetchDebugInfo}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {debugInfo && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Debug Summary</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <ul className="space-y-1 text-sm">
                    <li><strong>Session User ID:</strong> {debugInfo.debug?.sessionUserId}</li>
                    <li><strong>Session User ID Type:</strong> {debugInfo.debug?.sessionUserIdType}</li>
                    <li><strong>DB User Exists:</strong> {debugInfo.debug?.dbUserExists ? '✅ Yes' : '❌ No'}</li>
                    <li><strong>DB User Role:</strong> {debugInfo.debug?.dbUserRole || 'N/A'}</li>
                    <li><strong>DB User Active:</strong> {debugInfo.debug?.dbUserActive ? '✅ Yes' : '❌ No'}</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Full Debug Data</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Enrollment */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test Enrollment</h2>
          <p className="text-gray-600 mb-4">
            Click the button below to test enrollment with a sample class ID.
          </p>
          <button
            onClick={testEnrollment}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Enrollment
          </button>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Troubleshooting Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Check if your user exists in the database (DB User Exists should be ✅)</li>
            <li>Verify your account role is &apos;student&apos; (DB User Role should be &apos;student&apos;)</li>
            <li>Ensure your account is active (DB User Active should be ✅)</li>
            <li>If any of the above are ❌, try logging out and logging back in</li>
            <li>If the issue persists, contact an administrator</li>
          </ol>
        </div>
      </div>
    </div>
  );
}