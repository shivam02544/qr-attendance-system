'use client';

import { useState, useEffect } from 'react';
import { User, Calendar, TrendingUp, Clock, MapPin, Download } from 'lucide-react';

export default function StudentAttendanceDetail({ studentId, classId, onClose }) {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (studentId && classId) {
      fetchStudentAttendance();
    }
  }, [studentId, classId, filters]);

  const fetchStudentAttendance = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('studentId', studentId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/teacher/classes/${classId}/students/attendance?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch student attendance');
      }

      setStudentData(data.data);
    } catch (err) {
      console.error('Error fetching student attendance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('studentId', studentId);
      params.append('format', 'csv');
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/teacher/classes/${classId}/students/attendance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export student attendance');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-attendance-${studentData?.student?.name || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting student attendance:', err);
      setError('Failed to export student attendance');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading student attendance...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Student Attendance Detail
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchStudentAttendance}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {studentData && (
          <>
            {/* Student Info and Filters */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center mb-4 sm:mb-0">
                  <User className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{studentData.student.name}</h3>
                    <p className="text-sm text-gray-600">{studentData.student.email}</p>
                  </div>
                </div>
              </div>

              {/* Date Filters */}
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

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Attendance</p>
                    <p className="text-xl font-bold text-gray-900">{studentData.statistics.totalAttendance}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                    <p className="text-xl font-bold text-gray-900">
                      {studentData.statistics.attendanceRate || 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Last Attendance</p>
                    <p className="text-sm font-bold text-gray-900">
                      {studentData.statistics.lastAttendance 
                        ? new Date(studentData.statistics.lastAttendance).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Attendance History</h4>
              
              {studentData.attendanceHistory && studentData.attendanceHistory.length > 0 ? (
                <div className="space-y-3">
                  {studentData.attendanceHistory.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center text-sm text-gray-500 mb-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span className="mr-4">
                              {new Date(record.markedAt).toLocaleDateString()}
                            </span>
                            <Clock className="w-4 h-4 mr-1" />
                            <span>
                              {new Date(record.markedAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {record.location && (
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>
                                Location: {record.location.lat?.toFixed(4)}, {record.location.lng?.toFixed(4)}
                              </span>
                            </div>
                          )}
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
                <p className="text-gray-500 text-center py-8">
                  No attendance records found for the selected period
                </p>
              )}
            </div>

            {/* Patterns Analysis */}
            {studentData.patterns && (
              <div className="bg-white border rounded-lg p-4 mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Attendance Patterns</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Most Active Day */}
                  <div>
                    <h5 className="text-md font-medium text-gray-700 mb-2">Most Active Day</h5>
                    <p className="text-lg text-blue-600">{studentData.patterns.mostActiveDay || 'N/A'}</p>
                  </div>

                  {/* Most Active Hour */}
                  <div>
                    <h5 className="text-md font-medium text-gray-700 mb-2">Most Active Hour</h5>
                    <p className="text-lg text-blue-600">{studentData.patterns.mostActiveHour || 'N/A'}:00</p>
                  </div>

                  {/* Attendance Frequency */}
                  <div>
                    <h5 className="text-md font-medium text-gray-700 mb-2">Attendance Frequency</h5>
                    <p className="text-lg text-blue-600">{studentData.patterns.attendanceFrequency || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}