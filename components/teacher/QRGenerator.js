'use client';

import { useState, useEffect, useRef } from 'react';
import { generateQRCode } from '../../lib/qrcode';

export default function QRGenerator({ 
  classId, 
  className, 
  onSessionStart, 
  onSessionEnd,
  onSessionExtend 
}) {
  const [session, setSession] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef(null);

  // Update time remaining every second
  useEffect(() => {
    if (session && session.isActive) {
      const updateTimer = () => {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const diffMs = expiresAt - now;
        
        if (diffMs <= 0) {
          setTimeRemaining(0);
          setSession(prev => ({ ...prev, isActive: false }));
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        } else {
          setTimeRemaining(Math.ceil(diffMs / (1000 * 60)));
        }
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [session]);

  // Check for existing active session on component mount
  useEffect(() => {
    checkActiveSession();
  }, [classId]);

  const checkActiveSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/classes/${classId}/session`);
      const data = await response.json();

      if (data.success && data.session) {
        setSession(data.session);
        if (data.qrData) {
          const qrUrl = await generateQRCode(data.qrData);
          setQrCodeUrl(qrUrl);
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/teacher/classes/${classId}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ durationMinutes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      setSession(data.session);
      
      // Generate QR code
      const qrUrl = await generateQRCode(data.qrData);
      setQrCodeUrl(qrUrl);

      if (onSessionStart) {
        onSessionStart(data.session);
      }

    } catch (error) {
      setError(error.message);
      console.error('Error starting session:', error);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/teacher/sessions/${session.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end session');
      }

      setSession(null);
      setQrCodeUrl('');
      setTimeRemaining(0);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (onSessionEnd) {
        onSessionEnd();
      }

    } catch (error) {
      setError(error.message);
      console.error('Error ending session:', error);
    } finally {
      setLoading(false);
    }
  };

  const extendSession = async (additionalMinutes = 15) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/teacher/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ additionalMinutes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extend session');
      }

      setSession(data.session);
      
      // Update QR code with new expiration
      const qrUrl = await generateQRCode(data.qrData);
      setQrCodeUrl(qrUrl);

      if (onSessionExtend) {
        onSessionExtend(data.session);
      }

    } catch (error) {
      setError(error.message);
      console.error('Error extending session:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = () => {
    if (!session || !session.isActive) return 'text-gray-500';
    if (timeRemaining <= 5) return 'text-red-500';
    if (timeRemaining <= 15) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md card-responsive">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="heading-responsive font-semibold text-gray-800 mb-2">
          QR Code Attendance
        </h3>
        <p className="text-responsive text-gray-600 truncate">
          {className}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4 mb-4">
          <p className="text-red-600 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {!session || !session.isActive ? (
        <div className="text-center">
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Session Duration
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          
          <button
            onClick={startSession}
            disabled={loading}
            className="w-full sm:w-auto button-responsive bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Starting...' : 'Start Attendance Session'}
          </button>
        </div>
      ) : (
        <div className="text-center">
          {/* Session Status */}
          <div className="mb-4 sm:mb-6">
            <div className={`text-base sm:text-lg font-semibold ${getStatusColor()}`}>
              {session.isActive ? (
                timeRemaining > 0 ? (
                  <>Active - {formatTime(timeRemaining)} remaining</>
                ) : (
                  'Expired'
                )
              ) : (
                'Inactive'
              )}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">
              Session expires at {new Date(session.expiresAt).toLocaleTimeString()}
            </div>
          </div>

          {/* QR Code Display */}
          {qrCodeUrl && session.isActive && timeRemaining > 0 && (
            <div className="mb-4 sm:mb-6">
              <div className="qr-code-container">
                <div className="inline-block p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <img 
                    src={qrCodeUrl} 
                    alt="Attendance QR Code"
                    className="w-48 h-48 xs:w-56 xs:h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 mx-auto"
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 px-2">
                Students can scan this QR code to mark attendance
              </p>
              
              {/* QR Code Info for Desktop */}
              <div className="hidden lg:block mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 For best results: Display this QR code on a large screen or projector
                </p>
              </div>
            </div>
          )}

          {/* Session Controls */}
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 justify-center mb-4">
            {session.isActive && timeRemaining > 0 && (
              <>
                <button
                  onClick={() => extendSession(15)}
                  disabled={loading}
                  className="flex-1 xs:flex-none bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  {loading ? 'Extending...' : '+15min'}
                </button>
                
                <button
                  onClick={() => extendSession(30)}
                  disabled={loading}
                  className="flex-1 xs:flex-none bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  {loading ? 'Extending...' : '+30min'}
                </button>
              </>
            )}
            
            <button
              onClick={endSession}
              disabled={loading}
              className="flex-1 xs:flex-none bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            >
              {loading ? 'Ending...' : 'End Session'}
            </button>
          </div>

          {/* Session Info */}
          <div className="text-2xs sm:text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded-lg">
            <p>Session Token: <span className="font-mono">{session.sessionToken.substring(0, 8)}...</span></p>
            <p>Started: {new Date(session.createdAt || Date.now()).toLocaleString()}</p>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-600">💡 Students need to be within 50 meters to mark attendance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}