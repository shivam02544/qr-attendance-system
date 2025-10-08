'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import ClassDetails from '../../../../components/teacher/ClassDetails';

export default function ClassDetailsPage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const resolvedParams = use(params);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/teacher/login');
      return;
    }

    if (session.user.role !== 'teacher') {
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'teacher') {
    return null;
  }

  return <ClassDetails classId={resolvedParams.id} user={session.user} />;
}