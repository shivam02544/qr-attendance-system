'use client';

import { useState } from 'react';
import ErrorMessage from '../shared/ErrorMessage';

export default function ClassEnrollment({ classes, onEnrollmentSuccess }) {
  const [enrollingClassId, setEnrollingClassId] = useState(null);
  const [error, setError] = useState('');

  const handleEnroll = async (classId) => {
    try {
      setEnrollingClassId(classId);
      setError('');

      const response = await fetch('/api/student/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Provide more specific error messages based on status code
        let errorMessage = data.message || 'Failed to enroll in class';
        
        if (response.status === 401) {
          errorMessage = 'You must be logged in as a student to enroll in classes.';
        } else if (response.status === 403) {
          errorMessage = data.message || 'You do not have permission to enroll in classes.';
        } else if (response.status === 404) {
          errorMessage = 'The class you are trying to enroll in was not found.';
        } else if (response.status === 400) {
          errorMessage = data.message || 'There was a problem with your enrollment request.';
        }
        
        throw new Error(errorMessage);
      }

      // Show success message and refresh data
      alert('Successfully enrolled in class!');
      onEnrollmentSuccess();

    } catch (error) {
      console.error('Error enrolling in class:', error);
      setError(error.message);
    } finally {
      setEnrollingClassId(null);
    }
  };

  const availableClasses = classes.filter(cls => !cls.isEnrolled);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Available Classes for Enrollment
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse and enroll in classes offered by teachers.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
          <div className="mt-2 text-sm text-gray-600">
            Having trouble enrolling? <a href="/debug/enrollment" className="text-blue-600 hover:text-blue-800 underline">Visit the debug page</a> to troubleshoot.
          </div>
        </div>
      )}

      {availableClasses.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className="text-gray-400 text-lg mb-2">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Available Classes
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">
            You are already enrolled in all available classes, or no classes have been created yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableClasses.filter(classItem => classItem && classItem._id).map((classItem) => (
            <div
              key={classItem._id}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {classItem.name || 'Unnamed Class'}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Subject:</span> {classItem.subject || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Teacher:</span> {classItem.teacherId?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {classItem.location?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Students:</span> {classItem.enrollmentCount || 0}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div className="text-xs text-gray-500">
                  Created {classItem.createdAt ? new Date(classItem.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
                <button
                  onClick={() => handleEnroll(classItem._id)}
                  disabled={enrollingClassId === classItem._id}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {enrollingClassId === classItem._id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enrolling...
                    </div>
                  ) : (
                    'Enroll'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}