'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Button from '../shared/Button';
import FormSelect from '../shared/FormSelect';

export default function SystemAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    fetchAnalytics();
  }, [session, status, router, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage message={error} />
        <Button onClick={fetchAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!analyticsData) {
    return <div>No analytics data available</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Analytics</h1>
            <p className="text-gray-600">Usage statistics and performance metrics</p>
          </div>
          
          <div className="w-48">
            <FormSelect
              label="Time Period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: '365', label: 'Last year' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* System Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <HealthMetric
          title="User Utilization"
          value={`${Math.round(analyticsData.systemHealth.userUtilization)}%`}
          description="Active users vs total users"
          color="blue"
        />
        <HealthMetric
          title="Class Utilization"
          value={`${Math.round(analyticsData.systemHealth.classUtilization)}%`}
          description="Classes with attendance"
          color="green"
        />
        <HealthMetric
          title="Enrollment Rate"
          value={Math.round(analyticsData.systemHealth.enrollmentRate * 100) / 100}
          description="Avg enrollments per class"
          color="purple"
        />
        <HealthMetric
          title="Attendance Rate"
          value={`${Math.round(analyticsData.systemHealth.averageAttendanceRate)}%`}
          description="Average class attendance"
          color="orange"
        />
      </div>

      {/* Session Analytics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Session Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{analyticsData.sessions.totalSessions}</p>
            <p className="text-gray-600">Total Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{analyticsData.sessions.activeSessions}</p>
            <p className="text-gray-600">Currently Active</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {Math.round((analyticsData.sessions.avgSessionDuration || 0) / (1000 * 60))} min
            </p>
            <p className="text-gray-600">Avg Duration</p>
          </div>
        </div>
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* User Growth */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">User Registration Growth</h2>
          {analyticsData.growth.users.length > 0 ? (
            <GrowthChart data={analyticsData.growth.users} type="users" />
          ) : (
            <p className="text-gray-500 text-center py-8">No user registration data for this period</p>
          )}
        </div>

        {/* Attendance Growth */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Attendance Growth</h2>
          {analyticsData.growth.attendance.length > 0 ? (
            <SimpleChart data={analyticsData.growth.attendance} />
          ) : (
            <p className="text-gray-500 text-center py-8">No attendance data for this period</p>
          )}
        </div>
      </div>

      {/* Peak Usage Hours */}
      {analyticsData.usage.peakHours.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Peak Usage Hours</h2>
          <div className="grid grid-cols-12 gap-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourData = analyticsData.usage.peakHours.find(h => h._id === hour);
              const count = hourData ? hourData.count : 0;
              const maxCount = Math.max(...analyticsData.usage.peakHours.map(h => h.count));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={hour} className="flex flex-col items-center">
                  <div
                    className="bg-blue-500 rounded-t w-full min-h-[20px] transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 5)}px` }}
                    title={`${hour}:00 - ${count} records`}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{hour}</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-500 mt-2">Hours (24-hour format)</p>
        </div>
      )}

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Top Classes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Top Classes by Attendance Rate</h2>
          <div className="space-y-3">
            {analyticsData.usage.attendanceRates.slice(0, 5).map((cls, index) => (
              <div key={cls._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{cls.className}</p>
                  <p className="text-xs text-gray-600">{cls.subject}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{Math.round(cls.attendanceRate)}%</p>
                  <p className="text-xs text-gray-500">{cls.uniqueAttendees}/{cls.enrolledStudents}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Active Teachers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Most Active Teachers</h2>
          <div className="space-y-3">
            {analyticsData.usage.teacherActivity.slice(0, 5).map((teacher, index) => (
              <div key={teacher._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{teacher.teacherName}</p>
                  <p className="text-xs text-gray-600">{teacher.activeClasses} classes</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{teacher.sessionsCreated}</p>
                  <p className="text-xs text-gray-500">sessions</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Engaged Students */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Most Engaged Students</h2>
          <div className="space-y-3">
            {analyticsData.usage.studentEngagement.slice(0, 5).map((student, index) => (
              <div key={student._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{student.studentName}</p>
                  <p className="text-xs text-gray-600">
                    Last: {new Date(student.lastAttendance).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-purple-600">{student.attendanceCount}</p>
                  <p className="text-xs text-gray-500">attendance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthMetric({ title, value, description, color }) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${colorClasses[color]} mb-1`}>{value}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function GrowthChart({ data, type }) {
  // Group data by role for user growth
  const groupedData = data.reduce((acc, item) => {
    const date = item._id.date;
    const role = item._id.role;
    
    if (!acc[date]) {
      acc[date] = { date, teacher: 0, student: 0, admin: 0 };
    }
    acc[date][role] = item.count;
    return acc;
  }, {});

  const chartData = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) {
    return <p className="text-gray-500 text-center py-8">No data available</p>;
  }

  const maxValue = Math.max(...chartData.map(d => d.teacher + d.student + d.admin));

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Teachers</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Students</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span>Admins</span>
        </div>
      </div>
      
      <div className="h-48 flex items-end justify-between space-x-1">
        {chartData.map((day, index) => {
          const teacherHeight = maxValue > 0 ? (day.teacher / maxValue) * 100 : 0;
          const studentHeight = maxValue > 0 ? (day.student / maxValue) * 100 : 0;
          const adminHeight = maxValue > 0 ? (day.admin / maxValue) * 100 : 0;
          
          return (
            <div key={day.date} className="flex flex-col items-center flex-1 max-w-[30px]">
              <div className="w-full flex flex-col justify-end" style={{ height: '150px' }}>
                {day.admin > 0 && (
                  <div
                    className="bg-purple-500 w-full"
                    style={{ height: `${adminHeight}%` }}
                    title={`${day.date}: ${day.admin} admins`}
                  ></div>
                )}
                {day.teacher > 0 && (
                  <div
                    className="bg-blue-500 w-full"
                    style={{ height: `${teacherHeight}%` }}
                    title={`${day.date}: ${day.teacher} teachers`}
                  ></div>
                )}
                {day.student > 0 && (
                  <div
                    className="bg-green-500 w-full"
                    style={{ height: `${studentHeight}%` }}
                    title={`${day.date}: ${day.student} students`}
                  ></div>
                )}
              </div>
              <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimpleChart({ data }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No data available</p>;
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="h-48 flex items-end justify-between space-x-1">
      {data.map((day) => {
        const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
        
        return (
          <div key={day._id} className="flex flex-col items-center flex-1">
            <div
              className="bg-green-500 rounded-t w-full min-h-[5px] transition-all hover:bg-green-600"
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
  );
}