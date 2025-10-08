'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RegistrationForm from '../../../components/shared/RegistrationForm';

export default function StudentRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'student') {
        router.push('/student/dashboard');
      } else {
        // Redirect to appropriate dashboard based on actual role
        switch (session.user.role) {
          case 'teacher':
            router.push('/teacher/dashboard');
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
    // Redirect to student login page after successful registration
    setTimeout(() => {
      router.push('/student/login');
    }, 2000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Student Registration
          </h1>
          <p className="text-gray-600">
            Create your student account to join classes
          </p>
        </div>

        <RegistrationForm 
          onSuccess={handleRegistrationSuccess}
          allowedRoles={['student']}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have a student account?{' '}
            <Link 
              href="/student/login" 
              className="font-medium text-green-600 hover:text-green-500 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-3">
            Not a student?
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/teacher/register"
              className="text-xs text-blue-600 hover:text-blue-500 transition-colors"
            >
              Teacher Registration
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