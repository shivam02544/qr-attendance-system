'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Button from '../shared/Button';
import FormInput from '../shared/FormInput';
import FormSelect from '../shared/FormSelect';

export default function SystemReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Report filters
  const [reportType, setReportType] = useState('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  
  // Available classes and teachers for filters
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);

    fetchFiltersData();
    generateReport();
  }, [session, status, router]);

  const fetchFiltersData = async () => {
    try {
      // Fetch classes and teachers for filter dropdowns
      const [classesResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/classes?limit=1000'),
        fetch('/api/admin/users?role=teacher&limit=1000')
      ]);

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes || []);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setTeachers(usersData.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch filter data:', err);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        type: reportType
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (classId) params.append('classId', classId);
      if (teacherId) params.append('teacherId', teacherId);

      const response = await fetch(`/api/admin/reports?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format = 'json') => {
    try {
      const params = new URLSearchParams({
        type: 'comprehensive',
        format
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (classId) params.append('classId', classId);
      if (teacherId) params.append('teacherId', teacherId);

      const response = await fetch(`/api/admin/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `admin_report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    generateReport();
  };

  if (loading && !reportData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Reports</h1>
        <p className="text-gray-600">Comprehensive attendance and system reports</p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Report Filters</h2>
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Report Type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'overview', label: 'System Overview' },
                { value: 'attendance', label: 'Attendance Records' },
                { value: 'class', label: 'Class Report' },
                { value: 'teacher', label: 'Teacher Report' }
              ]}
            />
            
            <FormInput
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            
            <FormInput
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(reportType === 'class' || reportType === 'attendance') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Filter by Class (Optional)"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={[
                  { value: '', label: 'All Classes' },
                  ...classes.map(cls => ({
                    value: cls._id,
                    label: `${cls.name} - ${cls.subject}`
                  }))
                ]}
              />
              
              <FormSelect
                label="Filter by Teacher (Optional)"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                options={[
                  { value: '', label: 'All Teachers' },
                  ...teachers.map(teacher => ({
                    value: teacher._id,
                    label: teacher.name
                  }))
                ]}
              />
            </div>
          )}

          {reportType === 'teacher' && (
            <FormSelect
              label="Select Teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              options={[
                { value: '', label: 'Select a teacher...' },
                ...teachers.map(teacher => ({
                  value: teacher._id,
                  label: teacher.name
                }))
              ]}
              required
            />
          )}

          <div className="flex justify-between items-center">
            <Button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            
            <div className="space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleExportData('json')}
              >
                Export JSON
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleExportData('csv')}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {reportType === 'overview' && reportData.overview && (
            <OverviewReport data={reportData.overview} />
          )}
          
          {reportType === 'class' && reportData.classReport && (
            <ClassReport data={reportData.classReport} />
          )}
          
          {reportType === 'teacher' && reportData.teacherReport && (
            <TeacherReport data={reportData.teacherReport} />
          )}
          
          {reportType === 'attendance' && reportData.attendanceReport && (
            <AttendanceReport data={reportData.attendanceReport} />
          )}
        </div>
      )}
    </div>
  );
}

function OverviewReport({ data }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">System Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{data.totalAttendance}</p>
          <p className="text-gray-600">Total Attendance Records</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{data.attendanceByClass.length}</p>
          <p className="text-gray-600">Active Classes</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-600">{data.attendanceByTeacher.length}</p>
          <p className="text-gray-600">Active Teachers</p>
        </div>
      </div>

      {/* Attendance by Class */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Attendance by Class</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.attendanceByClass.slice(0, 10).map((cls) => (
                <tr key={cls._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cls.className}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cls.attendanceCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Trends */}
      {data.attendanceTrends && data.attendanceTrends.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Daily Attendance Trends</h3>
          <div className="h-64 flex items-end justify-between space-x-1">
            {data.attendanceTrends.map((day) => {
              const maxCount = Math.max(...data.attendanceTrends.map(d => d.count));
              const height = (day.count / maxCount) * 100;
              
              return (
                <div key={day._id} className="flex flex-col items-center">
                  <div
                    className="bg-blue-500 rounded-t min-w-[20px] transition-all hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`${day._id}: ${day.count} records`}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                    {new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassReport({ data }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Class Report</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium">{data.classDetails.name}</h3>
        <p className="text-gray-600">{data.classDetails.subject}</p>
        <p className="text-sm text-gray-500">Teacher: {data.classDetails.teacherId.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{data.enrolledStudents}</p>
          <p className="text-gray-600">Enrolled Students</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{data.totalAttendanceRecords}</p>
          <p className="text-gray-600">Total Attendance</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {data.enrolledStudents > 0 ? Math.round((data.totalAttendanceRecords / data.enrolledStudents) * 100) / 100 : 0}
          </p>
          <p className="text-gray-600">Avg Attendance per Student</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Student Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.studentStatistics.map((stat) => (
                <tr key={stat.student._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stat.student.name}</div>
                    <div className="text-sm text-gray-500">{stat.student.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.attendanceCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.lastAttendance ? new Date(stat.lastAttendance).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherReport({ data }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Teacher Report</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium">{data.teacher.name}</h3>
        <p className="text-gray-600">{data.teacher.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{data.totalClasses}</p>
          <p className="text-gray-600">Total Classes</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{data.totalAttendanceRecords}</p>
          <p className="text-gray-600">Total Attendance Records</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {data.totalClasses > 0 ? Math.round((data.totalAttendanceRecords / data.totalClasses) * 100) / 100 : 0}
          </p>
          <p className="text-gray-600">Avg Attendance per Class</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Classes Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.classesData.map((cls) => (
                <tr key={cls._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cls.className}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cls.attendanceCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendanceReport({ data }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Attendance Records</h2>
      
      <div className="mb-4">
        <p className="text-gray-600">Total Records: {data.totalRecords}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.records.map((record, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                  <div className="text-sm text-gray-500">{record.studentEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{record.className}</div>
                  <div className="text-sm text-gray-500">{record.subject}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.teacherName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(record.markedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}