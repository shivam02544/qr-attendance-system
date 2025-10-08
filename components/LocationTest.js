import { useState } from 'react';
import { useLocation } from '../hooks/useLocation';
import { verifyLocationProximity } from '../lib/location';
import LocationPermission from './LocationPermission';
import LocationStatus from './LocationStatus';

/**
 * Test component for location verification system
 */
export default function LocationTest() {
  const [testResults, setTestResults] = useState([]);
  const [showPermission, setShowPermission] = useState(false);
  
  const { 
    location, 
    loading, 
    error, 
    permissionGranted,
    getLocation,
    requestPermission 
  } = useLocation();

  const runLocationTests = async () => {
    if (!location) {
      alert('Please enable location access first');
      return;
    }

    const results = [];
    
    // Test 1: Close location (should pass)
    const closeLocation = {
      lat: location.lat + 0.0001, // About 10-15 meters away
      lng: location.lng + 0.0001
    };
    
    const test1 = verifyLocationProximity(location, closeLocation, 50);
    results.push({
      name: 'Close Location Test (should pass)',
      result: test1,
      expected: 'Valid'
    });

    // Test 2: Far location (should fail)
    const farLocation = {
      lat: location.lat + 0.001, // About 100+ meters away
      lng: location.lng + 0.001
    };
    
    const test2 = verifyLocationProximity(location, farLocation, 50);
    results.push({
      name: 'Far Location Test (should fail)',
      result: test2,
      expected: 'Invalid'
    });

    // Test 3: Invalid coordinates (should fail)
    const test3 = verifyLocationProximity(location, null, 50);
    results.push({
      name: 'Invalid Coordinates Test (should fail)',
      result: test3,
      expected: 'Invalid'
    });

    setTestResults(results);
  };

  const handlePermissionGranted = () => {
    setShowPermission(false);
  };

  const handlePermissionDenied = (errorMessage) => {
    alert(`Permission denied: ${errorMessage}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Location Verification System Test</h2>
      
      {/* Location Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Location Status</h3>
        <LocationStatus />
        
        {location && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Latitude: {location.lat.toFixed(6)}</p>
            <p>Longitude: {location.lng.toFixed(6)}</p>
            {location.accuracy && <p>Accuracy: ±{Math.round(location.accuracy)}m</p>}
          </div>
        )}
      </div>

      {/* Permission Request */}
      {showPermission && (
        <div className="mb-6">
          <LocationPermission
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowPermission(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Request Location Permission
        </button>
        
        <button
          onClick={getLocation}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Getting Location...' : 'Get Current Location'}
        </button>
        
        <button
          onClick={runLocationTests}
          disabled={!location}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
        >
          Run Location Tests
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Test Results</h3>
          <div className="space-y-4">
            {testResults.map((test, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{test.name}</h4>
                  <span className={`px-2 py-1 rounded text-sm ${
                    test.result.isValid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {test.result.isValid ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Expected:</strong> {test.expected}</p>
                  <p><strong>Result:</strong> {test.result.isValid ? 'Valid' : 'Invalid'}</p>
                  <p><strong>Message:</strong> {test.result.message}</p>
                  {test.result.distance && (
                    <p><strong>Distance:</strong> {test.result.distance}m</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How to Test</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click &quot;Request Location Permission&quot; to enable location access</li>
          <li>Click &quot;Get Current Location&quot; to retrieve your current position</li>
          <li>Click &quot;Run Location Tests&quot; to test the verification system</li>
          <li>Review the test results to ensure all functionality works correctly</li>
        </ol>
      </div>
    </div>
  );
}