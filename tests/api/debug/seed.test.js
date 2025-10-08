import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { POST, GET } from '@/app/api/debug/seed/route.js';
import Class from '@/models/Class.js';
import User from '@/models/User.js';
import Enrollment from '@/models/Enrollment.js';
import AttendanceSession from '@/models/AttendanceSession.js';
import AttendanceRecord from '@/models/AttendanceRecord.js';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, options = {}) => ({
      json: async () => data,
      status: options.status || 200,
      ok: options.status ? options.status < 400 : true
    })
  }
}));

describe('Debug Seed API', () => {
  let mongoServer;
  let testClass;
  let testTeacher;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up all collections
    await Promise.all([
      Class.deleteMany({}),
      User.deleteMany({}),
      Enrollment.deleteMany({}),
      AttendanceSession.deleteMany({}),
      AttendanceRecord.deleteMany({})
    ]);

    // Create test teacher
    testTeacher = await User.create({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      passwordHash: 'hashedpassword',
      role: 'teacher',
      isActive: true
    });

    // Create test class
    testClass = await Class.create({
      name: 'Test Class',
      subject: 'Computer Science',
      teacherId: testTeacher._id,
      location: {
        name: 'Room 101',
        lat: 40.7128,
        lng: -74.0060
      }
    });
  });

  describe('POST /api/debug/seed', () => {
    it('should validate required classId parameter', async () => {
      const mockRequest = {
        json: async () => ({
          studentCount: 5
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required parameter');
      expect(data.details).toBe('classId is required');
    });

    it('should validate classId format', async () => {
      const mockRequest = {
        json: async () => ({
          classId: 'invalid-id'
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid class ID format');
    });

    it('should validate class exists', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const mockRequest = {
        json: async () => ({
          classId: nonExistentId.toString()
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Class not found');
    });

    it('should validate studentCount parameter', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 0
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid student count');
      expect(data.details).toBe('Student count must be between 1 and 100');
    });

    it('should validate sessionCount parameter', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          sessionCount: 0
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid session count');
      expect(data.details).toBe('Session count must be between 1 and 50');
    });

    it('should validate attendanceRate parameter', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          attendanceRate: 1.5
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid attendance rate');
      expect(data.details).toBe('Attendance rate must be between 0 and 1');
    });

    it('should validate date range', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          dateRange: {
            startDate: new Date('2024-01-02'),
            endDate: new Date('2024-01-01') // End before start
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid date range');
      expect(data.details).toBe('Start date must be before end date');
    });

    it('should successfully seed data with default parameters', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString()
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Data seeding completed successfully');
      expect(data.data.classId).toBe(testClass._id.toString());
      expect(data.data.className).toBe('Test Class');
      expect(data.data.studentsCreated).toBe(10); // Default student count
      expect(data.data.enrollmentsCreated).toBe(10);
      expect(data.data.sessionsCreated).toBe(5); // Default session count
      expect(data.data.recordsCreated).toBeGreaterThan(0);

      // Verify data was created
      const students = await User.find({ role: 'student' });
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const records = await AttendanceRecord.find({});

      expect(students).toHaveLength(10);
      expect(enrollments).toHaveLength(10);
      expect(sessions).toHaveLength(5);
      expect(records.length).toBeGreaterThan(0);
    });

    it('should use existing students when available', async () => {
      // Create some existing students
      const existingStudents = await User.insertMany([
        {
          name: 'Existing Student 1',
          email: 'existing1@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        },
        {
          name: 'Existing Student 2',
          email: 'existing2@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        }
      ]);

      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 3
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.studentsUsed).toBe(2); // Used existing students
      expect(data.data.studentsCreated).toBe(1); // Created 1 new student
      expect(data.data.enrollmentsCreated).toBe(3);

      // Verify total students
      const allStudents = await User.find({ role: 'student' });
      expect(allStudents).toHaveLength(3);
    });

    it('should force create new students when forceCreate is true', async () => {
      // Create some existing students
      await User.insertMany([
        {
          name: 'Existing Student 1',
          email: 'existing1@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        },
        {
          name: 'Existing Student 2',
          email: 'existing2@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        }
      ]);

      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 3,
          forceCreate: true
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.studentsCreated).toBe(3); // Created all new students
      expect(data.data.studentsUsed).toBe(0); // Didn't use existing

      // Verify total students (2 existing + 3 new)
      const allStudents = await User.find({ role: 'student' });
      expect(allStudents).toHaveLength(5);
    });

    it('should create sessions within specified date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 3,
          sessionCount: 3,
          dateRange: {
            startDate,
            endDate
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify sessions are within date range
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      expect(sessions).toHaveLength(3);

      sessions.forEach(session => {
        expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(session.createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should respect attendance rate parameter', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 10,
          sessionCount: 2,
          attendanceRate: 0.5 // 50% attendance
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify attendance records match expected rate
      const records = await AttendanceRecord.find({});
      const expectedRecords = 10 * 2 * 0.5; // students * sessions * rate
      expect(records.length).toBeCloseTo(expectedRecords, 2); // Allow some variance due to rounding
    });

    it('should not create duplicate enrollments', async () => {
      // Create existing students and enrollments
      const existingStudents = await User.insertMany([
        {
          name: 'Student 1',
          email: 'student1@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        },
        {
          name: 'Student 2',
          email: 'student2@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        }
      ]);

      await Enrollment.create({
        studentId: existingStudents[0]._id,
        classId: testClass._id,
        isActive: true
      });

      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 2
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enrollmentsCreated).toBe(1); // Only 1 new enrollment

      // Verify total enrollments
      const enrollments = await Enrollment.find({ classId: testClass._id });
      expect(enrollments).toHaveLength(2);
    });

    it('should generate unique student emails', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 15 // More than the base name combinations
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify all emails are unique
      const students = await User.find({ role: 'student' });
      const emails = students.map(s => s.email);
      const uniqueEmails = [...new Set(emails)];
      expect(uniqueEmails).toHaveLength(emails.length);
    });

    it('should handle seeding errors gracefully', async () => {
      // Mock an error in student creation
      vi.spyOn(User, 'insertMany').mockRejectedValueOnce(new Error('Database error'));

      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 5
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Seeding process failed');
      expect(data.partialResults).toBeDefined();

      // Restore the mock
      vi.restoreAllMocks();
    });

    it('should handle malformed JSON', async () => {
      const mockRequest = {
        json: async () => {
          throw new Error('Invalid JSON');
        }
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET /api/debug/seed', () => {
    it('should validate classId parameter', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/debug/seed'
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid class ID required');
    });

    it('should validate classId format', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/debug/seed?classId=invalid-id'
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid class ID required');
    });

    it('should return error for non-existent class', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const mockRequest = {
        url: `http://localhost:3000/api/debug/seed?classId=${nonExistentId}`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Class not found');
    });

    it('should return seeding options and current state', async () => {
      // Create some existing data
      const existingStudents = await User.insertMany([
        {
          name: 'Student 1',
          email: 'student1@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        },
        {
          name: 'Student 2',
          email: 'student2@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        }
      ]);

      await Enrollment.create({
        studentId: existingStudents[0]._id,
        classId: testClass._id,
        isActive: true
      });

      const session = await AttendanceSession.create({
        classId: testClass._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true
      });

      await AttendanceRecord.create({
        sessionId: session._id,
        studentId: existingStudents[0]._id,
        markedAt: new Date(),
        studentLocation: {
          lat: testClass.location.lat,
          lng: testClass.location.lng
        }
      });

      const mockRequest = {
        url: `http://localhost:3000/api/debug/seed?classId=${testClass._id}`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.classInfo.id).toBe(testClass._id.toString());
      expect(data.data.classInfo.name).toBe('Test Class');
      expect(data.data.currentState.totalStudents).toBe(2);
      expect(data.data.currentState.enrolledStudents).toBe(1);
      expect(data.data.currentState.sessions).toBe(1);
      expect(data.data.currentState.attendanceRecords).toBe(1);
      expect(data.data.seedingOptions).toBeDefined();
      expect(data.data.seedingOptions.studentCount.default).toBe(10);
      expect(data.data.seedingOptions.sessionCount.default).toBe(5);
      expect(data.data.seedingOptions.attendanceRate.default).toBe(0.8);
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(Class, 'findById').mockRejectedValueOnce(new Error('Database error'));

      const mockRequest = {
        url: `http://localhost:3000/api/debug/seed?classId=${testClass._id}`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');

      // Restore the mock
      vi.restoreAllMocks();
    });
  });

  describe('Integration Tests', () => {
    it('should create realistic test data scenario', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 8,
          sessionCount: 4,
          attendanceRate: 0.75,
          dateRange: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            endDate: new Date()
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify realistic data structure
      const students = await User.find({ role: 'student' });
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const records = await AttendanceRecord.find({});

      expect(students).toHaveLength(8);
      expect(enrollments).toHaveLength(8);
      expect(sessions).toHaveLength(4);
      
      // Verify attendance records are within expected range (75% ± some variance)
      const expectedRecords = 8 * 4 * 0.75; // 24 records
      expect(records.length).toBeGreaterThanOrEqual(expectedRecords * 0.8);
      expect(records.length).toBeLessThanOrEqual(expectedRecords * 1.2);

      // Verify location data is realistic
      records.forEach(record => {
        expect(record.studentLocation.lat).toBeCloseTo(testClass.location.lat, 2);
        expect(record.studentLocation.lng).toBeCloseTo(testClass.location.lng, 2);
      });

      // Verify sessions have realistic timestamps
      sessions.forEach(session => {
        expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 7 * 24 * 60 * 60 * 1000);
        expect(session.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should handle large scale seeding', async () => {
      const mockRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 50,
          sessionCount: 20,
          attendanceRate: 0.8
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.studentsCreated).toBe(50);
      expect(data.data.sessionsCreated).toBe(20);

      // Verify data integrity at scale
      const students = await User.find({ role: 'student' });
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });

      expect(students).toHaveLength(50);
      expect(enrollments).toHaveLength(50);
      expect(sessions).toHaveLength(20);

      // Verify all students have unique emails
      const emails = students.map(s => s.email);
      const uniqueEmails = [...new Set(emails)];
      expect(uniqueEmails).toHaveLength(50);
    });
  });
});