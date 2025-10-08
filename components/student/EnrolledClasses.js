'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, TrendingUp, BarChart3, Download } from 'lucide-react';

export default function EnrolledClasses({ classes, onScanQR }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  if (classes.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-8 sm:py-12">
          <div className="text-gray-400 text-lg mb-2">🎓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Enrolled Classes
          </h3>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            You haven&apos;t enrolled in any classes yet. Browse available classes to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          My Enrolled Classes
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Classes you are currently enrolled in.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.filter(enrollment => enrollment && enrollment.class && enrollment.class._id).map((enrollment) => (
          <div
            key={enrollment.enrollmentId}
            className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="mb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                  {enrollment.class.name || 'Unnamed Class'}
                </h3>
                <div className="ml-2 flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {enrollment.class.subject || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                {/* Teacher Information */}
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Teacher:</span>
                  <span className="ml-1">{enrollment.class.teacherId?.name || 'Unknown'}</span>
                </div>

                {/* Location Information */}
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">Location:</span>
                  <span className="ml-1">{enrollment.class.location?.name || 'Unknown'}</span>
                </div>

                {/* Teacher Email */}
                {enrollment.class.teacherId?.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Contact:</span>
                    <span className="ml-1 truncate">{enrollment.class.teacherId.email}</span>
                  </div>
                )}

                {/* Class Statistics */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span className="font-medium">Students:</span>
                    <span className="ml-1">{enrollment.class.enrollmentCount || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">My Attendance:</span>
                    <span className="ml-1 text-blue-600 font-semibold">{enrollment.attendanceCount || 0}</span>
                  </div>
                </div>

                {/* Last Attendance */}
                {enrollment.lastAttendance && (
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Last Attended:</span>
                    <span className="ml-1">{new Date(enrollment.lastAttendance).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>
                  Enrolled: {enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : 'Unknown'}
                </span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                  <span>Active</span>
                </div>
              </div>

              {/* Attendance Rate Progress Bar */}
              {enrollment.totalSessions > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Attendance Rate</span>
                    <span className="font-semibold">{enrollment.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        enrollment.attendanceRate >= 80 ? 'bg-green-500' :
                        enrollment.attendanceRate >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${enrollment.attendanceRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{enrollment.attendanceCount} of {enrollment.totalSessions} sessions</span>
                    <span className={`font-medium ${
                      enrollment.attendanceRate >= 80 ? 'text-green-600' :
                      enrollment.attendanceRate >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {enrollment.attendanceRate >= 80 ? 'Excellent' :
                       enrollment.attendanceRate >= 60 ? 'Good' :
                       'Needs Improvement'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {/* Primary Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:gap-0">
                <button
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-1"
                  onClick={() => onScanQR && onScanQR()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Scan QR</span>
                </button>
                <button
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-1"
                  onClick={() => {
                    setSelectedClassId(enrollment.class._id);
                    setSelectedClassName(enrollment.class.name);
                    setShowHistory(true);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>History</span>
                </button>
              </div>

              {/* Secondary Action */}
              <button
                className="w-full bg-gray-50 text-gray-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-1 border border-gray-200"
                onClick={() => {
                  setSelectedClassId(enrollment.class._id);
                  setSelectedClassName(enrollment.class.name);
                  setSelectedClass(enrollment);
                  setShowClassDetails(true);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>View Class Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Attendance History - {selectedClassName}
              </h3>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedClassId(null);
                  setSelectedClassName('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close history"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
              <ClassSpecificAttendanceHistory 
                classId={selectedClassId}
                className={selectedClassName}
                onClose={() => {
                  setShowHistory(false);
                  setSelectedClassId(null);
                  setSelectedClassName('');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Class Details Modal */}
      {showClassDetails && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Class Details - {selectedClassName}
              </h3>
              <button
                onClick={() => {
                  setShowClassDetails(false);
                  setSelectedClassId(null);
                  setSelectedClassName('');
                  setSelectedClass(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close details"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-80px)] p-4 sm:p-6">
              <ClassDetailsView classData={selectedClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Class-specific attendance history component
function ClassSpecificAttendanceHistory({ classId, className, onClose }) {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchAttendanceHistory = useCallback(async () => {
    if (!classId) return;
    
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('classId', classId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/student/attendance/history?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attendance history');
      }

      setAttendanceData(data.data);
    } catch (err) {
      console.error('Error fetching class attendance history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classId, filters]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('classId', classId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('format', 'csv');

      const response = await fetch(`/api/student/attendance/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to export attendance history');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${className.replace(/\s+/g, '-').toLowerCase()}-attendance-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting attendance history:', err);
      setError('Failed to export attendance history');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading attendance history...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Filters and Export */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">
            Filter & Export
          </h4>
          <button
            onClick={handleExport}
            disabled={!attendanceData || loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAttendanceHistory}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {attendanceData && (
        <>
          {/* Summary Statistics */}
          {attendanceData.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-xl font-bold text-gray-900">{attendanceData.summary.totalAttendance}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">This Class</p>
                    <p className="text-xl font-bold text-gray-900">
                      {attendanceData.summary.attendanceByClass?.find(c => c.classId === classId)?.attendanceCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Last Attended</p>
                    <p className="text-sm font-bold text-gray-900">
                      {attendanceData.summary.attendanceByClass?.find(c => c.classId === classId)?.lastAttendance 
                        ? new Date(attendanceData.summary.attendanceByClass.find(c => c.classId === classId).lastAttendance).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-sm font-bold text-green-600">Active</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Records */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 sm:p-6 border-b">
              <h4 className="text-lg font-medium text-gray-900">Attendance Records</h4>
            </div>
            
            <div className="p-4 sm:p-6">
              {attendanceData.attendanceHistory && attendanceData.attendanceHistory.length > 0 ? (
                <div className="space-y-4">
                  {attendanceData.attendanceHistory
                    .filter(record => !classId || record.className === className)
                    .map((record, index) => (
                    <div key={record.id || index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{record.className}</h5>
                          <p className="text-sm text-gray-600">{record.subject}</p>
                          <div className="flex items-center mt-2 text-sm text-gray-500 flex-wrap gap-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>{new Date(record.markedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{new Date(record.markedAt).toLocaleTimeString()}</span>
                            </div>
                            {record.location && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>
                                  {record.location.lat?.toFixed(4)}, {record.location.lng?.toFixed(4)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Present
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h5 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h5>
                  <p className="text-gray-600">
                    You haven&apos;t marked attendance for this class yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Patterns for this class */}
          {attendanceData.patterns && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6 border-b">
                <h4 className="text-lg font-medium text-gray-900">Attendance Patterns</h4>
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Attendance by Day of Week */}
                  {attendanceData.patterns.attendanceByDayOfWeek && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">By Day of Week</h5>
                      <div className="space-y-2">
                        {Object.entries(attendanceData.patterns.attendanceByDayOfWeek).map(([day, count]) => {
                          const maxCount = Math.max(...Object.values(attendanceData.patterns.attendanceByDayOfWeek));
                          return (
                            <div key={day} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 w-20">{day}</span>
                              <div className="flex items-center flex-1 mx-4">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-900 ml-2 w-8">{count}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Attendance by Hour */}
                  {attendanceData.patterns.attendanceByHour && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">By Hour</h5>
                      <div className="space-y-2">
                        {Object.entries(attendanceData.patterns.attendanceByHour)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .slice(0, 8) // Show top 8 hours
                          .map(([hour, count]) => {
                            const maxCount = Math.max(...Object.values(attendanceData.patterns.attendanceByHour));
                            return (
                              <div key={hour} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 w-16">{hour}:00</span>
                                <div className="flex items-center flex-1 mx-4">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-900 ml-2 w-8">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!attendanceData && !loading && !error && (
        <div className="text-center p-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h5 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h5>
          <p className="text-gray-600">
            No attendance history available for this class.
          </p>
        </div>
      )}
    </div>
  );
}

// Comprehensive class details view component
function ClassDetailsView({ classData }) {
  const { class: classInfo, attendanceCount, totalSessions, attendanceRate, lastAttendance, enrolledAt } = classData;

  return (
    <div className="space-y-6">
      {/* Class Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{classInfo.name}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {classInfo.subject}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Created: {new Date(classInfo.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${
              attendanceRate >= 80 ? 'text-green-600' :
              attendanceRate >= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {attendanceRate}%
            </div>
            <div className="text-sm text-gray-600">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">My Attendance</p>
              <p className="text-xl font-bold text-gray-900">{attendanceCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-xl font-bold text-gray-900">{totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-xl font-bold text-gray-900">{classInfo.enrollmentCount || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Last Attended</p>
              <p className="text-sm font-bold text-gray-900">
                {lastAttendance ? new Date(lastAttendance).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Teacher Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-gray-900">{classInfo.teacherId?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900">{classInfo.teacherId?.email || 'Not provided'}</p>
            </div>
            {classInfo.teacherId?.email && (
              <div className="pt-2">
                <a
                  href={`mailto:${classInfo.teacherId.email}?subject=Question about ${classInfo.name}`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Teacher
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Class Location
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Location Name</label>
              <p className="text-gray-900">{classInfo.location?.name || 'Not specified'}</p>
            </div>
            {classInfo.location?.lat && classInfo.location?.lng && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600">Coordinates</label>
                  <p className="text-gray-900 font-mono text-sm">
                    {classInfo.location.lat.toFixed(6)}, {classInfo.location.lng.toFixed(6)}
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href={`https://maps.google.com/?q=${classInfo.location.lat},${classInfo.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Maps
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Information */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          My Enrollment Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Enrollment Date</label>
            <p className="text-gray-900">{new Date(enrolledAt).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Days Enrolled</label>
            <p className="text-gray-900">
              {Math.ceil((new Date() - new Date(enrolledAt)) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <p className="text-green-600 font-semibold">Active</p>
          </div>
        </div>
      </div>

      {/* Attendance Progress */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Attendance Progress
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">{attendanceCount} / {totalSessions} sessions</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  attendanceRate >= 80 ? 'bg-green-500' :
                  attendanceRate >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${attendanceRate}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-gray-500">0%</span>
              <span className={`font-semibold ${
                attendanceRate >= 80 ? 'text-green-600' :
                attendanceRate >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {attendanceRate}%
              </span>
              <span className="text-gray-500">100%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{attendanceCount}</div>
              <div className="text-sm text-gray-600">Sessions Attended</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalSessions - attendanceCount}</div>
              <div className="text-sm text-gray-600">Sessions Missed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                attendanceRate >= 80 ? 'text-green-600' :
                attendanceRate >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {attendanceRate >= 80 ? 'Excellent' :
                 attendanceRate >= 60 ? 'Good' :
                 'Poor'}
              </div>
              <div className="text-sm text-gray-600">Performance</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}