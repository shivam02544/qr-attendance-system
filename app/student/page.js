'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import StudentDashboard from '../../components/student/StudentDashboard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function StudentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/student/login');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (!session || session.user.role !== 'student') {
    return <LoadingSpinner />;
  }

  return <StudentDashboard />;
}