'use client';

import { ResponsiveGrid, ResponsiveCard } from './ResponsiveLayout';

export default function DashboardStats({ stats = [] }) {
  if (!stats.length) return null;

  return (
    <ResponsiveGrid cols={stats.length <= 2 ? 2 : 3} className="mb-6 sm:mb-8">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </ResponsiveGrid>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  trend = null, 
  subtitle = null,
  onClick = null 
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  const CardWrapper = onClick ? 'button' : 'div';
  const cardProps = onClick ? { 
    onClick, 
    className: 'w-full text-left hover:shadow-lg transition-shadow cursor-pointer' 
  } : {};

  return (
    <ResponsiveCard className={onClick ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''}>
      <CardWrapper {...cardProps}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ${colorClasses[color]} rounded-full flex items-center justify-center`}>
              {icon || (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
            </div>
          </div>
          <div className="ml-3 sm:ml-4 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {trend && (
                <span className={`text-xs sm:text-sm font-medium ${trendColors[trend.direction]}`}>
                  {trend.direction === 'up' && '↗'}
                  {trend.direction === 'down' && '↘'}
                  {trend.direction === 'neutral' && '→'}
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-2xs sm:text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </CardWrapper>
    </ResponsiveCard>
  );
}

// Predefined stat configurations for common use cases
export const StatConfigs = {
  classes: {
    title: 'Total Classes',
    color: 'blue',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  students: {
    title: 'Total Students',
    color: 'green',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    )
  },
  attendance: {
    title: 'Attendance Rate',
    color: 'purple',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  sessions: {
    title: 'Active Sessions',
    color: 'yellow',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  enrolled: {
    title: 'Enrolled Classes',
    color: 'blue',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  available: {
    title: 'Available Classes',
    color: 'green',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
};