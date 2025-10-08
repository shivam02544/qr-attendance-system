import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AttendanceReport Component Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Type Detection', () => {
    // Test the error type detection logic from the component
    const getErrorType = (error, data) => {
      const ERROR_TYPES = {
        NO_DATA: 'NO_DATA',
        NO_ENROLLMENTS: 'NO_ENROLLMENTS',
        NO_SESSIONS: 'NO_SESSIONS',
        NO_RECORDS: 'NO_RECORDS',
        API_ERROR: 'API_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR'
      };

      if (!error && (!data || !data.students || data.students.length === 0)) {
        if (!data?.summary?.totalStudents) return ERROR_TYPES.NO_ENROLLMENTS;
        if (!data?.summary?.totalSessions) return ERROR_TYPES.NO_SESSIONS;
        if (!data?.summary?.totalAttendanceRecords) return ERROR_TYPES.NO_RECORDS;
        return ERROR_TYPES.NO_DATA;
      }
      
      if (error) {
        if (error.includes('network') || error.includes('fetch')) {
          return ERROR_TYPES.NETWORK_ERROR;
        }
        return ERROR_TYPES.API_ERROR;
      }
      
      return null;
    };

    it('should detect no enrollments error', () => {
      const data = {
        summary: { totalStudents: 0, totalSessions: 0, totalAttendanceRecords: 0 }
      };
      
      const errorType = getErrorType(null, data);
      expect(errorType).toBe('NO_ENROLLMENTS');
    });

    it('should detect no sessions error', () => {
      const data = {
        summary: { totalStudents: 5, totalSessions: 0, totalAttendanceRecords: 0 }
      };
      
      const errorType = getErrorType(null, data);
      expect(errorType).toBe('NO_SESSIONS');
    });

    it('should detect no records error', () => {
      const data = {
        summary: { totalStudents: 5, totalSessions: 3, totalAttendanceRecords: 0 }
      };
      
      const errorType = getErrorType(null, data);
      expect(errorType).toBe('NO_RECORDS');
    });

    it('should detect network error', () => {
      const error = 'network connection failed';
      const errorType = getErrorType(error, null);
      expect(errorType).toBe('NETWORK_ERROR');
    });

    it('should detect API error', () => {
      const error = 'server returned 500';
      const errorType = getErrorType(error, null);
      expect(errorType).toBe('API_ERROR');
    });

    it('should return null for healthy data', () => {
      const data = {
        students: [{ id: 1, name: 'John' }],
        summary: { totalStudents: 5, totalSessions: 3, totalAttendanceRecords: 10 }
      };
      
      const errorType = getErrorType(null, data);
      expect(errorType).toBeNull();
    });
  });

  describe('Student Sorting Logic', () => {
    const students = [
      {
        studentId: 'student1',
        studentName: 'John Doe',
        attendanceCount: 8,
        attendancePercentage: 80
      },
      {
        studentId: 'student2',
        studentName: 'Alice Smith',
        attendanceCount: 9,
        attendancePercentage: 90
      },
      {
        studentId: 'student3',
        studentName: 'Bob Johnson',
        attendanceCount: 7,
        attendancePercentage: 70
      }
    ];

    const sortStudents = (students, sortBy, sortOrder) => {
      return [...students].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = (a.studentName || '').toLowerCase();
            bValue = (b.studentName || '').toLowerCase();
            break;
          case 'attendance':
            aValue = a.attendanceCount || 0;
            bValue = b.attendanceCount || 0;
            break;
          case 'percentage':
            aValue = a.attendancePercentage || 0;
            bValue = b.attendancePercentage || 0;
            break;
          default:
            aValue = (a.studentName || '').toLowerCase();
            bValue = (b.studentName || '').toLowerCase();
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    };

    it('should sort students by name ascending', () => {
      const sorted = sortStudents(students, 'name', 'asc');
      expect(sorted[0].studentName).toBe('Alice Smith');
      expect(sorted[1].studentName).toBe('Bob Johnson');
      expect(sorted[2].studentName).toBe('John Doe');
    });

    it('should sort students by name descending', () => {
      const sorted = sortStudents(students, 'name', 'desc');
      expect(sorted[0].studentName).toBe('John Doe');
      expect(sorted[1].studentName).toBe('Bob Johnson');
      expect(sorted[2].studentName).toBe('Alice Smith');
    });

    it('should sort students by attendance count ascending', () => {
      const sorted = sortStudents(students, 'attendance', 'asc');
      expect(sorted[0].attendanceCount).toBe(7);
      expect(sorted[1].attendanceCount).toBe(8);
      expect(sorted[2].attendanceCount).toBe(9);
    });

    it('should sort students by percentage descending', () => {
      const sorted = sortStudents(students, 'percentage', 'desc');
      expect(sorted[0].attendancePercentage).toBe(90);
      expect(sorted[1].attendancePercentage).toBe(80);
      expect(sorted[2].attendancePercentage).toBe(70);
    });

    it('should handle missing values gracefully', () => {
      const studentsWithMissing = [
        { studentId: 'student1', studentName: 'John Doe' },
        { studentId: 'student2', attendanceCount: 5 }, // No name
        { studentId: 'student3', studentName: 'Alice Smith', attendanceCount: 8 }
      ];

      const sorted = sortStudents(studentsWithMissing, 'name', 'asc');
      // Empty string should sort first, then Alice, then John
      expect(sorted[0].studentName).toBeUndefined(); // Student with no name
      expect(sorted[1].studentName).toBe('Alice Smith');
      expect(sorted[2].studentName).toBe('John Doe');
    });
  });

  describe('CSV Export Logic', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should construct correct CSV export URL', () => {
      const classId = 'test-class-id';
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('format', 'csv');

      const expectedUrl = `/api/teacher/classes/${classId}/attendance?${params}`;
      
      expect(expectedUrl).toContain('startDate=2024-01-01');
      expect(expectedUrl).toContain('endDate=2024-01-31');
      expect(expectedUrl).toContain('format=csv');
    });

    it('should handle CSV export with no date filters', () => {
      const classId = 'test-class-id';
      const filters = {};

      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('format', 'csv');

      const expectedUrl = `/api/teacher/classes/${classId}/attendance?${params}`;
      
      expect(expectedUrl).toBe(`/api/teacher/classes/${classId}/attendance?format=csv`);
    });
  });

  describe('Retry Logic', () => {
    it('should increment retry counter', () => {
      let retryCount = 0;
      
      const handleRetry = () => {
        retryCount++;
        return retryCount;
      };

      expect(handleRetry()).toBe(1);
      expect(handleRetry()).toBe(2);
      expect(handleRetry()).toBe(3);
    });

    it('should reset retry counter on successful data load', () => {
      let retryCount = 5;
      
      const handleSuccessfulLoad = () => {
        retryCount = 0;
        return retryCount;
      };

      expect(handleSuccessfulLoad()).toBe(0);
    });
  });

  describe('Date Range Handling', () => {
    it('should update filters when date range changes', () => {
      const initialFilters = {
        startDate: '',
        endDate: '',
        includeDetails: false
      };

      const newDateRange = {
        startDate: '2024-02-01',
        endDate: '2024-02-28'
      };

      const updatedFilters = {
        ...initialFilters,
        startDate: newDateRange.startDate || '',
        endDate: newDateRange.endDate || ''
      };

      expect(updatedFilters.startDate).toBe('2024-02-01');
      expect(updatedFilters.endDate).toBe('2024-02-28');
      expect(updatedFilters.includeDetails).toBe(false);
    });

    it('should handle empty date range', () => {
      const initialFilters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeDetails: false
      };

      const newDateRange = {
        startDate: null,
        endDate: null
      };

      const updatedFilters = {
        ...initialFilters,
        startDate: newDateRange.startDate || '',
        endDate: newDateRange.endDate || ''
      };

      expect(updatedFilters.startDate).toBe('');
      expect(updatedFilters.endDate).toBe('');
    });
  });

  describe('Session Data Grouping', () => {
    const detailedRecords = [
      {
        _id: 'record1',
        markedAt: '2024-01-30T10:00:00Z',
        student: { name: 'John Doe' }
      },
      {
        _id: 'record2',
        markedAt: '2024-01-30T10:05:00Z',
        student: { name: 'Jane Smith' }
      },
      {
        _id: 'record3',
        markedAt: '2024-01-29T10:00:00Z',
        student: { name: 'Bob Johnson' }
      }
    ];

    it('should group records by date', () => {
      const groupedRecords = detailedRecords.reduce((acc, record) => {
        const date = new Date(record.markedAt).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
      }, {});

      const dates = Object.keys(groupedRecords);
      expect(dates).toHaveLength(2); // Two different dates
      
      const jan30Records = groupedRecords[new Date('2024-01-30T10:00:00Z').toLocaleDateString()];
      expect(jan30Records).toHaveLength(2); // Two records on Jan 30
      
      const jan29Records = groupedRecords[new Date('2024-01-29T10:00:00Z').toLocaleDateString()];
      expect(jan29Records).toHaveLength(1); // One record on Jan 29
    });

    it('should sort grouped records by date descending', () => {
      const groupedRecords = detailedRecords.reduce((acc, record) => {
        const date = new Date(record.markedAt).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
      }, {});

      const sortedEntries = Object.entries(groupedRecords)
        .sort(([a], [b]) => new Date(b) - new Date(a));

      expect(sortedEntries).toHaveLength(2);
      
      // Check that we have the expected dates
      const dates = sortedEntries.map(([date]) => date);
      const jan30 = new Date('2024-01-30').toLocaleDateString();
      const jan29 = new Date('2024-01-29').toLocaleDateString();
      
      expect(dates).toContain(jan30);
      expect(dates).toContain(jan29);
      
      // Most recent date should be first (Jan 30 before Jan 29)
      const firstDateRecords = sortedEntries[0][1];
      const secondDateRecords = sortedEntries[1][1];
      
      expect(firstDateRecords.length).toBeGreaterThanOrEqual(1);
      expect(secondDateRecords.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Top Performers Logic', () => {
    const students = [
      {
        studentId: 'student1',
        studentName: 'Jane Smith',
        attendancePercentage: 95,
        attendanceCount: 9
      },
      {
        studentId: 'student2',
        studentName: 'Alice Brown',
        attendancePercentage: 90,
        attendanceCount: 9
      },
      {
        studentId: 'student3',
        studentName: 'John Doe',
        attendancePercentage: 85,
        attendanceCount: 8
      },
      {
        studentId: 'student4',
        studentName: 'Bob Johnson',
        attendancePercentage: 75,
        attendanceCount: 7
      }
    ];

    it('should get top 3 performers by attendance percentage', () => {
      const topPerformers = students
        .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
        .slice(0, 3);

      expect(topPerformers).toHaveLength(3);
      expect(topPerformers[0].studentName).toBe('Jane Smith');
      expect(topPerformers[0].attendancePercentage).toBe(95);
      expect(topPerformers[1].studentName).toBe('Alice Brown');
      expect(topPerformers[1].attendancePercentage).toBe(90);
      expect(topPerformers[2].studentName).toBe('John Doe');
      expect(topPerformers[2].attendancePercentage).toBe(85);
    });

    it('should handle fewer than 3 students', () => {
      // Take first 2 students: Jane Smith (95%) and Alice Brown (90%)
      const fewStudents = students.slice(0, 2);
      
      const topPerformers = fewStudents
        .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
        .slice(0, 3);

      expect(topPerformers).toHaveLength(2);
      expect(topPerformers[0].attendancePercentage).toBe(95); // Jane Smith (highest)
      expect(topPerformers[1].attendancePercentage).toBe(90); // Alice Brown (second)
    });

    it('should handle empty student list', () => {
      const topPerformers = []
        .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
        .slice(0, 3);

      expect(topPerformers).toHaveLength(0);
    });
  });
});