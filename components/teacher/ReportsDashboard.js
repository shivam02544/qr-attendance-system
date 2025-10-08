'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, Users } from 'lucide-react';

export default function ReportsDashboard() {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    classId: '',
    reportType: 'summary'
  });
  const [teacherClasses, setTeacherClasses] = useState([]);

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchTeacherClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      const data = await response.json();
      
      if (response.ok) {
        setTeacherClasses(data.classes || []);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.classId) params.append('classId', filters.classId);
      params.append('type', filters.reportType);

      const response = await fetch(`/api/teacher/reports?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      setReportsData(data.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.classId) params.append('classId', filters.classId);
      params.append('type', filters.reportType);
      params.append('format', format);

      const response = await fetch(`/api/teacher/reports?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${filters.reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Failed to export report');
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
            Attendance Reports Dashboard
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) => handleFilterChange('reportType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class
            </label>
            <select
              value={filters.classId}
              onChange={(e) => handleFilterChange('classId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Classes</option>
              {teacherClasses.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} - {cls.subject}
                </option>
              ))}
            </select>
          </div>

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
            onClick={fetchReports}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {reportsData && (
        <>
          {/* Summary Statistics */}
          {reportsData.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-900">{reportsData.summary.totalClasses}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{reportsData.summary.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{reportsData.summary.totalSessions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                    <p className="text-2xl font-bold text-gray-900">{reportsData.summary.averageAttendanceRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Content */}
          {filters.reportType === 'summary' && reportsData.classes && (
            <SummaryReport classes={reportsData.classes} />
          )}

          {filters.reportType === 'detailed' && reportsData.detailedReports && (
            <DetailedReport reports={reportsData.detailedReports} />
          )}

          {filters.reportType === 'analytics' && reportsData.analytics && (
            <AnalyticsReport analytics={reportsData.analytics} />
          )}
        </>
      )}
    </div>
  );
}

function SummaryReport({ classes }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Class Summary</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Students
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Session
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classes.map((cls) => (
              <tr key={cls.classId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{cls.className}</div>
                    <div className="text-sm text-gray-500">{cls.subject}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cls.totalStudents}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cls.totalSessions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-[100px]">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${cls.averageAttendanceRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900">{cls.averageAttendanceRate}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {cls.lastSessionDate 
                    ? new Date(cls.lastSessionDate).toLocaleDateString()
                    : 'Never'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Performers Section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Classes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes
            .sort((a, b) => b.averageAttendanceRate - a.averageAttendanceRate)
            .slice(0, 3)
            .map((cls, index) => (
              <div key={cls.classId} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{cls.className}</span>
                  <span className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{cls.subject}</p>
                <p className="text-sm text-gray-600">{cls.averageAttendanceRate}% attendance rate</p>
                <p className="text-sm text-gray-600">{cls.totalStudents} students</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function DetailedReport({ reports }) {
  return (
    <div className="space-y-6">
      {reports.map((report) => (
        <div key={report.classId} className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {report.className} - {report.subject}
            </h3>
            <span className="text-sm text-gray-500">
              {report.totalRecords} total records
            </span>
          </div>

          {/* Student Statistics */}
          {report.studentStatistics && report.studentStatistics.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Student Performance</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Attendance
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        First
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Last
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.studentStatistics.slice(0, 10).map((student) => (
                      <tr key={student.studentId}>
                        <td className="px-4 py-2 text-sm text-gray-900">{student.studentName}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{student.attendanceCount}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {student.firstAttendance 
                            ? new Date(student.firstAttendance).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {student.lastAttendance 
                            ? new Date(student.lastAttendance).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.studentStatistics.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing top 10 students. Export for complete data.
                </p>
              )}
            </div>
          )}

          {/* Attendance by Date */}
          {report.attendanceByDate && Object.keys(report.attendanceByDate).length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Recent Sessions</h4>
              <div className="space-y-3">
                {Object.entries(report.attendanceByDate)
                  .sort(([a], [b]) => new Date(b) - new Date(a))
                  .slice(0, 5)
                  .map(([date, attendees]) => (
                    <div key={date} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{date}</span>
                        <span className="text-sm text-gray-600">{attendees.length} attendees</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attendees.slice(0, 8).map((attendee, index) => (
                          <span key={index} className="text-xs bg-white rounded px-2 py-1 text-gray-700">
                            {attendee.studentName}
                          </span>
                        ))}
                        {attendees.length > 8 && (
                          <span className="text-xs text-gray-500">
                            +{attendees.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AnalyticsReport({ analytics }) {
  return (
    <div className="space-y-6">
      {/* Class Comparison */}
      {analytics.classComparison && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unique Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg per Student
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.classComparison.map((cls) => (
                  <tr key={cls.className}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{cls.className}</div>
                        <div className="text-sm text-gray-500">{cls.subject}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cls.totalAttendance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cls.uniqueStudents}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cls.averageAttendancePerStudent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Time Analysis */}
      {analytics.timeAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Attendance Hours</h3>
            <div className="space-y-2">
              {Object.entries(analytics.timeAnalysis.peakAttendanceHours)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([hour, count]) => (
                  <div key={hour} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {hour}:00 - {parseInt(hour) + 1}:00
                    </span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ 
                            width: `${(count / Math.max(...Object.values(analytics.timeAnalysis.peakAttendanceHours))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance by Day</h3>
            <div className="space-y-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                const count = analytics.timeAnalysis.attendanceByDayOfWeek[index] || 0;
                const maxCount = Math.max(...Object.values(analytics.timeAnalysis.attendanceByDayOfWeek));
                return (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{day}</span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Trends */}
      {analytics.attendanceTrends && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Attendance Trends</h3>
          <div className="space-y-4">
            {Object.entries(analytics.attendanceTrends).map(([className, trends]) => (
              <div key={className}>
                <h4 className="text-md font-medium text-gray-900 mb-2">{className}</h4>
                <div className="flex items-end space-x-1 h-20">
                  {Object.entries(trends)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, count]) => {
                      const maxCount = Math.max(...Object.values(trends));
                      const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={month} className="flex flex-col items-center">
                          <div
                            className="bg-blue-500 rounded-t w-8"
                            style={{ height: `${height}%` }}
                            title={`${month}: ${count} attendances`}
                          ></div>
                          <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                            {month.split('-')[1]}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}