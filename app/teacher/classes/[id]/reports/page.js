'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '../../../../../components/shared/LoadingSpinner';
import ErrorMessage from '../../../../../components/shared/ErrorMessage';
import AttendanceReport from '../../../../../components/teacher/AttendanceReport';
import StudentAttendanceDetail from '../../../../../components/teacher/StudentAttendanceDetail';
import { useErrorHandler } from '../../../../../hooks/useErrorHandler';
import { api } from '../../../../../lib/apiClient';

export default function ClassReportsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { executeWithErrorHandling, error, isLoading } = useErrorHandler();
  
  const [classData, setClassData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  // Redirect if not authenticated or not a teacher
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/teacher/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'teacher') {
      router.push('/');
    }
  }, [session, status, router]);

  // Fetch class data
  useEffect(() => {
    if (params.id && session?.user?.role === 'teacher') {
      fetchClassData();
    }
  }, [params.id, session]);

  // Fetch attendance data when date range changes
  useEffect(() => {
    if (classData && dateRange.startDate && dateRange.endDate) {
      fetchAttendanceData();
    }
  }, [classData, dateRange]);

  const fetchClassData = async () => {
    await executeWithErrorHandling(
      async () => {
        const data = await api.teacher.getClass(params.id);
        setClassData(data.class);
      },
      {
        showErrorToast: true,
        context: { operation: 'fetch_class_data', classId: params.id }
      }
    );
  };

  const fetchAttendanceData = async () => {
    await executeWithErrorHandling(
      async () => {
        const data = await api.teacher.getAttendanceReports(params.id, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        setAttendanceData(data);
      },
      {
        showErrorToast: true,
        context: { operation: 'fetch_attendance_data', classId: params.id }
      }
    );
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
  };

  const handleExportData = async () => {
    await executeWithErrorHandling(
      async () => {
        const data = await api.teacher.exportAttendance({
          classId: params.id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        
        // Create and download CSV file
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${classData.name}_attendance_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Attendance data exported successfully',
        context: { operation: 'export_attendance', classId: params.id }
      }
    );
  };

  const handleSeedTestData = async (classId) => {
    await executeWithErrorHandling(
      async () => {
        const response = await fetch(`/api/debug/seed?classId=${classId}&action=seed`, {
          method: 'GET'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to seed test data');
        }
        
        const result = await response.json();
        return result;
      },
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Test data created successfully',
        context: { operation: 'seed_test_data', classId }
      }
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'teacher') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Class
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {classData ? `${classData.name} - Attendance Reports` : 'Class Reports'}
              </h1>
              {classData && (
                <p className="text-gray-600 mt-2">
                  {classData.subject} • {classData.code}
                </p>
              )}
            </div>
            
            <button
              onClick={handleExportData}
              disabled={!attendanceData || isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Date Range</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Report */}
          <div className="lg:col-span-2">
            <AttendanceReport
              data={attendanceData}
              loading={isLoading}
              error={error}
              onRetry={fetchAttendanceData}
              onSeedTestData={handleSeedTestData}
              onStudentSelect={handleStudentSelect}
              dateRange={dateRange}
              classId={params.id}
              className={classData?.name}
            />
          </div>

          {/* Student Detail */}
          <div className="lg:col-span-1">
            {selectedStudent ? (
              <StudentAttendanceDetail
                student={selectedStudent}
                classData={classData}
                dateRange={dateRange}
                onClose={() => setSelectedStudent(null)}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Student Details</h3>
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-gray-500">
                    Click on a student in the attendance report to view detailed information
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        {attendanceData && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                  <p className="text-2xl font-semibold text-gray-900">{attendanceData.totalSessions || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-semibold text-gray-900">{attendanceData.totalStudents || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Attendance</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {attendanceData.averageAttendance ? `${Math.round(attendanceData.averageAttendance)}%` : '0%'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Absent Students</p>
                  <p className="text-2xl font-semibold text-gray-900">{attendanceData.totalAbsent || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}