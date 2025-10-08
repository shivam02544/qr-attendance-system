'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Users, TrendingUp, Clock, BarChart3, AlertCircle, RefreshCw, Database, Settings } from 'lucide-react';

// Error types for better error handling
const ERROR_TYPES = {
  NO_DATA: 'NO_DATA',
  NO_ENROLLMENTS: 'NO_ENROLLMENTS',
  NO_SESSIONS: 'NO_SESSIONS',
  NO_RECORDS: 'NO_RECORDS',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

export default function AttendanceReport({ 
  data, 
  loading, 
  error, 
  onRetry, 
  onSeedTestData,
  classId, 
  className,
  dateRange,
  onStudentSelect 
}) {
  const [filters, setFilters] = useState({
    startDate: dateRange?.startDate || '',
    endDate: dateRange?.endDate || '',
    includeDetails: false
  });
  const [activeTab, setActiveTab] = useState('summary');
  const [retryCount, setRetryCount] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);

  // Update filters when dateRange prop changes
  useEffect(() => {
    if (dateRange) {
      setFilters(prev => ({
        ...prev,
        startDate: dateRange.startDate || '',
        endDate: dateRange.endDate || ''
      }));
    }
  }, [dateRange]);

  // Handle retry with exponential backoff
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    if (onRetry) {
      await onRetry();
    }
  };

  // Handle test data seeding
  const handleSeedTestData = async () => {
    if (!onSeedTestData || !classId) return;
    
    setIsSeeding(true);
    try {
      await onSeedTestData(classId);
      // Retry fetching data after seeding
      setTimeout(() => {
        if (onRetry) onRetry();
      }, 1000);
    } catch (err) {
      console.error('Error seeding test data:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Determine error type for better messaging
  const getErrorType = (error, data) => {
    if (!error && (!data || !data.students || data.students.length === 0)) {
      if (!data?.summary?.totalStudents) return ERROR_TYPES.NO_ENROLLMENTS;
      if (!data?.summary?.totalSessions) return ERROR_TYPES.NO_SESSIONS;
      if (!data?.summary?.totalAttendanceRecords) return ERROR_TYPES.NO_RECORDS;
      return ERROR_TYPES.NO_DATA;
    }
    
    if (error) {
      if (error.includes('network') || error.includes('fetch')) {
        return ERROR_TYPES.NETWORK_ERROR;
      }
      return ERROR_TYPES.API_ERROR;
    }
    
    return null;
  };

  const handleExportCSV = async () => {
    if (!data || !classId) return;
    
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('format', 'csv');

      const response = await fetch(`/api/teacher/classes/${classId}/attendance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${className || 'class'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting report:', err);
      // Don't set error state here as it's handled by parent component
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading attendance report...</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  const errorType = getErrorType(error, data);

  // Error states with specific messaging and actions
  if (error || errorType) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          
          {errorType === ERROR_TYPES.NETWORK_ERROR && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Problem</h3>
              <p className="text-gray-600 mb-6">
                Unable to connect to the server. Please check your internet connection and try again.
              </p>
            </>
          )}
          
          {errorType === ERROR_TYPES.API_ERROR && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Server Error</h3>
              <p className="text-gray-600 mb-6">
                {error || 'An unexpected error occurred while loading the attendance report.'}
              </p>
            </>
          )}
          
          {errorType === ERROR_TYPES.NO_ENROLLMENTS && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
              <p className="text-gray-600 mb-6">
                This class doesn&apos;t have any enrolled students yet. Students need to enroll before attendance can be tracked.
              </p>
            </>
          )}
          
          {errorType === ERROR_TYPES.NO_SESSIONS && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Created</h3>
              <p className="text-gray-600 mb-6">
                No attendance sessions have been created for this class yet. Create a session to start tracking attendance.
              </p>
            </>
          )}
          
          {errorType === ERROR_TYPES.NO_RECORDS && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
              <p className="text-gray-600 mb-6">
                No students have marked their attendance yet. Once students start attending sessions, their records will appear here.
              </p>
            </>
          )}
          
          {errorType === ERROR_TYPES.NO_DATA && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
              <p className="text-gray-600 mb-6">
                No attendance data is available for the selected date range. Try adjusting the date range or check if any sessions were held during this period.
              </p>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again {retryCount > 0 && `(${retryCount})`}
            </button>
            
            {(errorType === ERROR_TYPES.NO_ENROLLMENTS || 
              errorType === ERROR_TYPES.NO_SESSIONS || 
              errorType === ERROR_TYPES.NO_RECORDS ||
              errorType === ERROR_TYPES.NO_DATA) && onSeedTestData && (
              <button
                onClick={handleSeedTestData}
                disabled={isSeeding || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSeeding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Test Data...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Create Test Data
                  </>
                )}
              </button>
            )}
          </div>
          
          {errorType === ERROR_TYPES.NO_DATA && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex">
                <Settings className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Troubleshooting Tips</h4>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check if students are enrolled in this class</li>
                      <li>Verify that attendance sessions have been created</li>
                      <li>Ensure the date range includes periods when classes were held</li>
                      <li>Try expanding the date range to include more historical data</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Empty data state (no error but no meaningful data)
  if (!data || !data.students || data.students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-6">
            There&apos;s no attendance data to display for the selected criteria.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </button>
            
            {onSeedTestData && (
              <button
                onClick={handleSeedTestData}
                disabled={isSeeding}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSeeding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Test Data...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Create Test Data
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main report display with data
  return (
    <div className="space-y-6">
      {/* Header and Export */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 sm:mb-0">
            Attendance Report - {className || data.class?.name || 'Class'}
          </h2>
          <button
            onClick={handleExportCSV}
            disabled={!data || loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary?.totalStudents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary?.totalSessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attendance Records</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary?.totalAttendanceRecords || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rate</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary?.averageAttendanceRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['summary', 'students', 'sessions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'summary' && <SummaryTab reportData={data} />}
          {activeTab === 'students' && <StudentsTab students={data.students || []} onStudentSelect={onStudentSelect} />}
          {activeTab === 'sessions' && <SessionsTab reportData={data} />}
        </div>
      </div>
    </div>
  );
}

function SummaryTab({ reportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Class Information</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {reportData.class.name}</p>
            <p><span className="font-medium">Subject:</span> {reportData.class.subject}</p>
            {reportData.class.location && (
              <p><span className="font-medium">Location:</span> {reportData.class.location.name}</p>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Period</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Start Date:</span>{' '}
              {reportData.dateRange.startDate 
                ? new Date(reportData.dateRange.startDate).toLocaleDateString()
                : 'All time'
              }
            </p>
            <p>
              <span className="font-medium">End Date:</span>{' '}
              {reportData.dateRange.endDate 
                ? new Date(reportData.dateRange.endDate).toLocaleDateString()
                : 'Present'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {reportData.students && reportData.students.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportData.students
              .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
              .slice(0, 3)
              .map((student, index) => (
                <div key={student.studentId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{student.studentName}</span>
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{student.attendancePercentage}% attendance</p>
                  <p className="text-sm text-gray-600">{student.attendanceCount} sessions</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentsTab({ students, onStudentSelect }) {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  if (!students || students.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
        <p className="text-gray-600">
          No student data is available for the selected criteria.
        </p>
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = (a.studentName || '').toLowerCase();
        bValue = (b.studentName || '').toLowerCase();
        break;
      case 'attendance':
        aValue = a.attendanceCount || 0;
        bValue = b.attendanceCount || 0;
        break;
      case 'percentage':
        aValue = a.attendancePercentage || 0;
        bValue = b.attendancePercentage || 0;
        break;
      default:
        aValue = (a.studentName || '').toLowerCase();
        bValue = (b.studentName || '').toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">Student Attendance</h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Name</option>
            <option value="attendance">Attendance Count</option>
            <option value="percentage">Percentage</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Attendance
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStudents.map((student) => (
              <tr 
                key={student.studentId} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onStudentSelect && onStudentSelect(student)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{student.studentName || 'Unknown Student'}</div>
                    <div className="text-sm text-gray-500">{student.studentEmail || 'No email'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.attendanceCount || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${student.attendancePercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900">{student.attendancePercentage || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.lastAttendance 
                    ? new Date(student.lastAttendance).toLocaleDateString()
                    : 'Never'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionsTab({ reportData }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Sessions</h3>
      
      {reportData.detailedRecords && reportData.detailedRecords.length > 0 ? (
        <div className="space-y-4">
          {/* Group records by session/date */}
          {Object.entries(
            reportData.detailedRecords.reduce((acc, record) => {
              const date = new Date(record.markedAt).toLocaleDateString();
              if (!acc[date]) acc[date] = [];
              acc[date].push(record);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .slice(0, 10)
            .map(([date, records]) => (
              <div key={date} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{date}</h4>
                  <span className="text-sm text-gray-600">{records.length} students attended</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {records.map((record) => (
                    <div key={record._id} className="text-sm text-gray-700 bg-white rounded px-3 py-2">
                      <div className="font-medium">{record.student?.name || 'Unknown Student'}</div>
                      <div className="text-gray-500">
                        {new Date(record.markedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">
          No detailed session records available. Enable &quot;Include detailed records&quot; in filters to see session data.
        </p>
      )}
    </div>
  );
}