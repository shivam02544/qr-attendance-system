'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Redirect based on user role
      switch (session.user.role) {
        case 'teacher':
          router.push('/teacher/dashboard');
          break;
        case 'student':
          router.push('/student/dashboard');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        default:
          break;
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            QR Attendance System
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Modern attendance tracking using QR codes with location verification. 
            Choose your portal below to get started.
          </p>
        </div>

        {/* Role-based portals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Teacher Portal */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Teacher Portal</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Create classes, generate QR codes, and track student attendance.
            </p>
            <div className="space-y-3">
              <Link 
                href="/teacher/login"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Teacher Login
              </Link>
              <Link 
                href="/teacher/register"
                className="block w-full border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Teacher Registration
              </Link>
            </div>
          </div>

          {/* Student Portal */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Student Portal</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Enroll in classes, scan QR codes, and view your attendance history.
            </p>
            <div className="space-y-3">
              <Link 
                href="/student/login"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Student Login
              </Link>
              <Link 
                href="/student/register"
                className="block w-full border border-green-600 text-green-600 hover:bg-green-50 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Student Registration
              </Link>
            </div>
          </div>

          {/* Admin Portal */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Admin Portal</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Manage users, view system reports, and oversee all attendance data.
            </p>
            <div className="space-y-3">
              <Link 
                href="/admin/login"
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Admin Login
              </Link>
              <Link 
                href="/admin/register"
                className="block w-full border border-purple-600 text-purple-600 hover:bg-purple-50 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Admin Registration
              </Link>
            </div>
          </div>
        </div>

        {/* General access */}
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Or use the general access:
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto">
            <Link 
              href="/login"
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md transition-colors text-center"
            >
              General Login
            </Link>
            <Link 
              href="/register"
              className="border border-gray-600 text-gray-600 hover:bg-gray-50 font-medium py-2 px-6 rounded-md transition-colors text-center"
            >
              General Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
