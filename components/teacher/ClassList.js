'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClassList({ classes, onClassDeleted, onRefresh }) {
  const [deletingClass, setDeletingClass] = useState(null);
  const router = useRouter();

  const handleDeleteClass = async (classId) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingClass(classId);
      const response = await fetch(`/api/teacher/classes/${classId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete class');
      }

      onClassDeleted(classId);
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class. Please try again.');
    } finally {
      setDeletingClass(null);
    }
  };

  const handleViewClass = (classId) => {
    router.push(`/teacher/classes/${classId}`);
  };

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No classes</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first class.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {classes.map((classItem) => (
        <div key={classItem._id} className="bg-gray-50 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="mb-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{classItem.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{classItem.subject}</p>
              </div>
              <div className="flex sm:hidden flex-col space-y-1 ml-2">
                <button
                  onClick={() => handleViewClass(classItem._id)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeleteClass(classItem._id)}
                  disabled={deletingClass === classItem._id}
                  className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                >
                  {deletingClass === classItem._id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{classItem.location.name}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                {classItem.enrollmentCount || 0} students enrolled
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex flex-col space-y-2 mt-3">
              <button
                onClick={() => handleViewClass(classItem._id)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium text-left"
              >
                View Details
              </button>
              <button
                onClick={() => handleDeleteClass(classItem._id)}
                disabled={deletingClass === classItem._id}
                className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 text-left"
              >
                {deletingClass === classItem._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          <div className="border-t pt-3 sm:pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <span className="text-xs text-gray-500">
                Created {new Date(classItem.createdAt).toLocaleDateString()}
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleViewClass(classItem._id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:py-1 rounded text-xs sm:text-xs font-medium transition-colors text-center"
                >
                  Manage
                </button>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:py-1 rounded text-xs sm:text-xs font-medium transition-colors text-center"
                  onClick={() => router.push(`/teacher/classes/${classItem._id}/attendance`)}
                >
                  Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}