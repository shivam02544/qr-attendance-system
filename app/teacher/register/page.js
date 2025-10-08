'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RegistrationForm from '../../../components/shared/RegistrationForm';

export default function TeacherRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        // Redirect to appropriate dashboard based on actual role
        switch (session.user.role) {
          case 'student':
            router.push('/student/dashboard');
            break;
          case 'admin':
            router.push('/admin/dashboard');
            break;
          default:
            router.push('/');
        }
      }
    }
  }, [session, status, router]);

  const handleRegistrationSuccess = (user) => {
    // Redirect to teacher login page after successful registration
    setTimeout(() => {
      router.push('/teacher/login');
    }, 2000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Registration
          </h1>
          <p className="text-gray-600">
            Create your teacher account to manage classes
          </p>
        </div>

        <RegistrationForm 
          onSuccess={handleRegistrationSuccess}
          allowedRoles={['teacher']}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have a teacher account?{' '}
            <Link 
              href="/teacher/login" 
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-3">
            Not a teacher?
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/student/register"
              className="text-xs text-green-600 hover:text-green-500 transition-colors"
            >
              Student Registration
            </Link>
            <Link 
              href="/admin/register"
              className="text-xs text-purple-600 hover:text-purple-500 transition-colors"
            >
              Admin Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}