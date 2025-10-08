'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Button from '../shared/Button';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
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
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { statistics, recentActivity, trends, topClasses } = dashboardData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={statistics.totalUsers}
          subtitle={`${statistics.totalTeachers} teachers, ${statistics.totalStudents} students`}
          icon="👥"
        />
        <StatCard
          title="Total Classes"
          value={statistics.totalClasses}
          subtitle={`${statistics.totalEnrollments} enrollments`}
          icon="📚"
        />
        <StatCard
          title="Attendance Records"
          value={statistics.totalAttendanceRecords}
          subtitle="Total attendance marked"
          icon="✅"
        />
        <StatCard
          title="Active Sessions"
          value={statistics.activeSessions}
          subtitle="Currently running"
          icon="🔴"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity (Last 7 Days)</h2>
          <div className="space-y-4">
            <ActivityItem
              label="New Users"
              value={recentActivity.newUsers}
              icon="👤"
            />
            <ActivityItem
              label="New Classes"
              value={recentActivity.newClasses}
              icon="📖"
            />
            <ActivityItem
              label="Attendance Marked"
              value={recentActivity.attendanceMarked}
              icon="✓"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Classes</h2>
          <div className="space-y-3">
            {topClasses.slice(0, 5).map((cls, index) => (
              <div key={cls._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{cls.className}</p>
                  <p className="text-sm text-gray-600">{cls.subject}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{cls.attendanceCount}</p>
                  <p className="text-xs text-gray-500">attendance records</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Trends Chart */}
      {trends.attendance && trends.attendance.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Attendance Trends (Last 30 Days)</h2>
          <div className="h-64 flex items-end justify-between space-x-1">
            {trends.attendance.map((day, index) => {
              const maxCount = Math.max(...trends.attendance.map(d => d.count));
              const height = (day.count / maxCount) * 100;
              
              return (
                <div key={day._id} className="flex flex-col items-center">
                  <div
                    className="bg-blue-500 rounded-t min-w-[20px] transition-all hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`${day._id}: ${day.count} attendance records`}
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

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => router.push('/admin/users')}
            className="flex items-center justify-center space-x-2"
          >
            <span>👥</span>
            <span>Manage Users</span>
          </Button>
          <Button
            onClick={() => router.push('/admin/classes')}
            className="flex items-center justify-center space-x-2"
            variant="secondary"
          >
            <span>📚</span>
            <span>View Classes</span>
          </Button>
          <Button
            onClick={() => router.push('/admin/reports')}
            className="flex items-center justify-center space-x-2"
            variant="secondary"
          >
            <span>📊</span>
            <span>Reports</span>
          </Button>
          <Button
            onClick={() => router.push('/admin/analytics')}
            className="flex items-center justify-center space-x-2"
            variant="secondary"
          >
            <span>📈</span>
            <span>Analytics</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function ActivityItem({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="font-semibold text-blue-600">{value}</span>
    </div>
  );
}