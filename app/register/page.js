'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RegistrationForm from '../../components/shared/RegistrationForm';

export default function RegisterPage() {
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
          router.push('/');
      }
    }
  }, [session, status, router]);

  const handleRegistrationSuccess = (user) => {
    // Redirect to login page after successful registration
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">
            Join the QR Attendance System
          </p>
        </div>

        <RegistrationForm onSuccess={handleRegistrationSuccess} />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-4">
            Role-specific registration:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Link 
              href="/teacher/register"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-center transition-colors"
            >
              Teacher
            </Link>
            <Link 
              href="/student/register"
              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-md text-center transition-colors"
            >
              Student
            </Link>
            <Link 
              href="/admin/register"
              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-md text-center transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}