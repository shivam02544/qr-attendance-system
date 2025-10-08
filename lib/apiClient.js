// API client with comprehensive error handling and retry logic

import { 
  AppError, 
  NetworkError, 
  AuthenticationError, 
  handleApiResponse,
  withErrorHandling,
  logError 
} from './errorHandling';

class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    };

    return withErrorHandling(
      async () => {
        // Check if we're online
        if (!navigator.onLine) {
          throw new NetworkError('You are currently offline. Please check your internet connection.');
        }

        let response;
        try {
          response = await fetch(url, config);
        } catch (fetchError) {
          // Handle network errors
          const errorMessage = fetchError?.message || 'Network request failed';
          
          if (fetchError?.name === 'TypeError' || errorMessage.includes('fetch') || errorMessage.includes('network')) {
            throw new NetworkError('Unable to connect to the server. Please check your internet connection.');
          }
          
          if (errorMessage.includes('timeout')) {
            throw new NetworkError('Request timed out. Please try again.');
          }
          
          throw new NetworkError(errorMessage);
        }

        // Handle HTTP errors
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `Request failed with status ${response.status}` };
          }

          // Handle specific status codes
          switch (response.status) {
            case 401:
              throw new AuthenticationError(errorData.error || 'Authentication required');
            case 403:
              // Check if this is an enrollment-related error
              const errorMessage = errorData.error || 'Access denied';
              const lowerMessage = errorMessage.toLowerCase();
              
              if (lowerMessage.includes('not enrolled') || lowerMessage.includes('student not enrolled')) {
                throw new AppError(errorMessage, 403, 'NOT_ENROLLED');
              }
              
              if (lowerMessage.includes('enrollment closed')) {
                throw new AppError(errorMessage, 403, 'ENROLLMENT_CLOSED');
              }
              
              throw new AppError(errorMessage, 403, 'AUTHORIZATION_ERROR');
            case 404:
              throw new AppError(errorData.error || 'Resource not found', 404, 'NOT_FOUND');
            case 422:
              throw new AppError(errorData.error || 'Validation failed', 422, 'VALIDATION_ERROR');
            case 429:
              throw new AppError(errorData.error || 'Too many requests', 429, 'RATE_LIMIT');
            case 500:
              throw new AppError(errorData.error || 'Internal server error', 500, 'INTERNAL_ERROR');
            default:
              throw new AppError(
                errorData.error || `Request failed with status ${response.status}`,
                response.status,
                'API_ERROR'
              );
          }
        }

        return response.json();
      },
      {
        retries: 2,
        retryDelay: 1000,
        onError: (error, attempt) => {
          // Ensure we have a valid error object before logging
          const errorToLog = error || new Error('Unknown API error');
          logError(errorToLog, { 
            endpoint, 
            attempt, 
            method: config.method || 'GET',
            url 
          });
        }
      }
    );
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Convenience functions for common API operations
export const api = {
  // Student APIs
  student: {
    getClasses: () => apiClient.get('/api/student/classes'),
    enroll: (classId) => apiClient.post('/api/student/enroll', { classId }),
    getEnrolled: () => apiClient.get('/api/student/enrolled'),
    markAttendance: (sessionToken, studentLocation) => 
      apiClient.post('/api/student/attendance', { sessionToken, studentLocation }),
    getAttendanceHistory: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/student/attendance/history?${searchParams}`);
    }
  },

  // Teacher APIs
  teacher: {
    getClasses: () => apiClient.get('/api/teacher/classes'),
    createClass: (classData) => apiClient.post('/api/teacher/classes', classData),
    getClass: (classId) => apiClient.get(`/api/teacher/classes/${classId}`),
    updateClass: (classId, classData) => apiClient.put(`/api/teacher/classes/${classId}`, classData),
    deleteClass: (classId) => apiClient.delete(`/api/teacher/classes/${classId}`),
    
    startSession: (classId, durationMinutes) => 
      apiClient.post(`/api/teacher/classes/${classId}/session`, { durationMinutes }),
    endSession: (sessionId) => apiClient.delete(`/api/teacher/sessions/${sessionId}`),
    extendSession: (sessionId, additionalMinutes) => 
      apiClient.put(`/api/teacher/sessions/${sessionId}`, { additionalMinutes }),
    
    getAttendanceReports: (classId, params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/teacher/classes/${classId}/attendance?${searchParams}`);
    },
    exportAttendance: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/teacher/export?${searchParams}`);
    }
  },

  // Admin APIs
  admin: {
    getDashboard: () => apiClient.get('/api/admin/dashboard'),
    getUsers: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/admin/users?${searchParams}`);
    },
    createUser: (userData) => apiClient.post('/api/admin/users', userData),
    updateUser: (userId, userData) => apiClient.put(`/api/admin/users/${userId}`, userData),
    deleteUser: (userId) => apiClient.delete(`/api/admin/users/${userId}`),
    
    getClasses: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/admin/classes?${searchParams}`);
    },
    getReports: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/admin/reports?${searchParams}`);
    },
    getAnalytics: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/admin/analytics?${searchParams}`);
    },
    exportData: (params = {}) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/admin/export?${searchParams}`);
    }
  },

  // Session validation
  validateSession: (token) => apiClient.get(`/api/session/${token}`)
};

export default apiClient;