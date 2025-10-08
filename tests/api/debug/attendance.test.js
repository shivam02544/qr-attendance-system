import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GET } from '@/app/api/debug/attendance/route.js';
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

// Mock the database connection to use our test database
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(true)
}));

describe('Debug Attendance API', () => {
  let mongoServer;
  let testClass;
  let testTeacher;
  let testStudents;

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
    // Ensure we're connected
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    }

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

    // Create test students
    testStudents = await User.insertMany([
      {
        name: 'Student One',
        email: 'student1@test.com',
        passwordHash: 'hashedpassword',
        role: 'student',
        isActive: true
      },
      {
        name: 'Student Two',
        email: 'student2@test.com',
        passwordHash: 'hashedpassword',
        role: 'student',
        isActive: true
      },
      {
        name: 'Student Three',
        email: 'student3@test.com',
        passwordHash: 'hashedpassword',
        role: 'student',
        isActive: true
      }
    ]);
  });

  describe('GET /api/debug/attendance - Check Action', () => {
    it('should return class not found for invalid class ID format', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/debug/attendance?classId=invalid-id&action=check'
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid class ID format');
    });

    it('should return class not found for non-existent class', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${nonExistentId}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.classInfo.exists).toBe(false);
      expect(data.data.recommendations).toContain('Class not found. Verify the class ID is correct.');
    });

    it('should return empty data state for class with no enrollments', async () => {
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.classInfo.exists).toBe(true);
      expect(data.data.classInfo.name).toBe('Test Class');
      expect(data.data.enrollmentInfo.count).toBe(0);
      expect(data.data.sessionInfo.total).toBe(0);
      expect(data.data.attendanceInfo.totalRecords).toBe(0);
      expect(data.data.recommendations).toContain('No students enrolled in this class. Add student enrollments to enable attendance tracking.');
    });

    it('should return enrollment data but no sessions', async () => {
      // Create enrollments
      await Enrollment.insertMany(
        testStudents.map(student => ({
          studentId: student._id,
          classId: testClass._id,
          isActive: true
        }))
      );

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enrollmentInfo.count).toBe(3);
      expect(data.data.enrollmentInfo.students).toHaveLength(3);
      expect(data.data.sessionInfo.total).toBe(0);
      expect(data.data.recommendations).toContain('No attendance sessions created. Create an attendance session to allow students to mark attendance.');
    });

    it('should return sessions but no attendance records', async () => {
      // Create enrollments
      await Enrollment.insertMany(
        testStudents.map(student => ({
          studentId: student._id,
          classId: testClass._id,
          isActive: true
        }))
      );

      // Create attendance session
      await AttendanceSession.create({
        classId: testClass._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isActive: true
      });

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enrollmentInfo.count).toBe(3);
      expect(data.data.sessionInfo.total).toBe(1);
      expect(data.data.sessionInfo.active).toBe(1);
      expect(data.data.attendanceInfo.totalRecords).toBe(0);
      expect(data.data.recommendations).toContain('Attendance sessions exist but no attendance records found. Students may need to scan QR codes to mark attendance.');
    });

    it('should return complete data with healthy recommendations', async () => {
      // Create enrollments
      const enrollments = await Enrollment.insertMany(
        testStudents.map(student => ({
          studentId: student._id,
          classId: testClass._id,
          isActive: true
        }))
      );

      // Create attendance session
      const session = await AttendanceSession.create({
        classId: testClass._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true
      });

      // Create attendance records for all students
      await AttendanceRecord.insertMany(
        testStudents.map(student => ({
          sessionId: session._id,
          studentId: student._id,
          markedAt: new Date(),
          studentLocation: {
            lat: testClass.location.lat + 0.0001,
            lng: testClass.location.lng + 0.0001
          }
        }))
      );

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enrollmentInfo.count).toBe(3);
      expect(data.data.sessionInfo.total).toBe(1);
      expect(data.data.sessionInfo.active).toBe(1);
      expect(data.data.attendanceInfo.totalRecords).toBe(3);
      expect(data.data.recommendations).toContain('Data looks healthy! Class has enrollments, sessions, and attendance records.');
    });

    it('should detect low attendance rate', async () => {
      // Create enrollments for 10 students
      const moreStudents = await User.insertMany(
        Array.from({ length: 7 }, (_, i) => ({
          name: `Student ${i + 4}`,
          email: `student${i + 4}@test.com`,
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        }))
      );

      const allStudents = [...testStudents, ...moreStudents];
      
      await Enrollment.insertMany(
        allStudents.map(student => ({
          studentId: student._id,
          classId: testClass._id,
          isActive: true
        }))
      );

      // Create multiple sessions
      const sessions = await AttendanceSession.insertMany([
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
          isActive: false
        },
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() - 30 * 60 * 1000), // Expired
          isActive: false
        }
      ]);

      // Create attendance records for only 2 students out of 10 (20% attendance)
      await AttendanceRecord.insertMany([
        {
          sessionId: sessions[0]._id,
          studentId: allStudents[0]._id,
          markedAt: new Date(),
          studentLocation: { lat: testClass.location.lat, lng: testClass.location.lng }
        },
        {
          sessionId: sessions[1]._id,
          studentId: allStudents[1]._id,
          markedAt: new Date(),
          studentLocation: { lat: testClass.location.lat, lng: testClass.location.lng }
        }
      ]);

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendations.some(r => r.includes('Low attendance rate'))).toBe(true);
    });

    it('should detect multiple active sessions', async () => {
      // Create multiple active sessions
      await AttendanceSession.insertMany([
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isActive: true
        },
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isActive: true
        },
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          isActive: true
        }
      ]);

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionInfo.active).toBe(3);
      expect(data.data.recommendations).toContain('Multiple active sessions detected. Consider deactivating old sessions to avoid confusion.');
    });

    it('should detect expired sessions only', async () => {
      await Enrollment.insertMany(
        testStudents.map(student => ({
          studentId: student._id,
          classId: testClass._id,
          isActive: true
        }))
      );

      // Create only expired sessions
      await AttendanceSession.insertMany([
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          isActive: false
        },
        {
          classId: testClass._id,
          expiresAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          isActive: false
        }
      ]);

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionInfo.active).toBe(0);
      expect(data.data.sessionInfo.expired).toBe(2);
      expect(data.data.recommendations).toContain('All attendance sessions have expired. Create a new active session for current attendance tracking.');
    });

    it('should use default class ID when none provided', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/debug/attendance?action=check'
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.classInfo.exists).toBe(false); // Default ID won't exist
    });

    it('should handle database connection errors', async () => {
      // Mock database connection failure
      const dbConnect = await import('@/lib/mongodb');
      dbConnect.default.mockRejectedValueOnce(new Error('Connection failed'));

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');

      // Restore the mock
      dbConnect.default.mockResolvedValue(true);
    });
  });

  describe('GET /api/debug/attendance - Seed Action', () => {
    it('should return error for non-existent class', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${nonExistentId}&action=seed`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Class not found');
    });

    it('should return error when no existing students found', async () => {
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=seed`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No existing students found');
    });

    it('should successfully seed test data', async () => {
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=seed`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Test data seeding completed');
      expect(data.data.classId).toBe(testClass._id.toString());
      expect(data.data.className).toBe('Test Class');
      expect(data.data.studentsProcessed).toBe(3);
      expect(data.data.enrollmentsCreated).toBe(3);
      expect(data.data.recordsCreated).toBe(3);

      // Verify data was actually created
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const records = await AttendanceRecord.find({});

      expect(enrollments).toHaveLength(3);
      expect(sessions).toHaveLength(1);
      expect(records).toHaveLength(3);

      // Verify session is expired after seeding
      expect(sessions[0].isActive).toBe(false);
      expect(sessions[0].expiresAt).toBeLessThan(new Date());
    });

    it('should not create duplicate enrollments', async () => {
      // Create some enrollments first
      await Enrollment.create({
        studentId: testStudents[0]._id,
        classId: testClass._id,
        isActive: true
      });

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=seed`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enrollmentsCreated).toBe(2); // Only 2 new enrollments

      // Verify total enrollments
      const enrollments = await Enrollment.find({ classId: testClass._id });
      expect(enrollments).toHaveLength(3); // Still only 3 total
    });

    it('should not create duplicate attendance records', async () => {
      // First seeding
      await GET({
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=seed`
      });

      // Second seeding attempt
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=seed`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recordsCreated).toBe(0); // No new records created

      // Verify total records
      const records = await AttendanceRecord.find({});
      expect(records).toHaveLength(3); // Still only 3 from first seeding
    });
  });

  describe('GET /api/debug/attendance - Invalid Actions', () => {
    it('should return error for invalid action', async () => {
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=invalid`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action parameter');
      expect(data.details).toBe('Supported actions are: "check" (inspect data) or "seed" (create test data)');
    });

    it('should handle missing action parameter', async () => {
      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      // Should default to 'check' action
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock a database error by using an invalid operation
      vi.spyOn(Class, 'findById').mockRejectedValueOnce(new Error('Database error'));

      const mockRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database query failed');

      // Restore the mock
      vi.restoreAllMocks();
    });

    it('should handle malformed request URLs', async () => {
      const mockRequest = {
        url: 'invalid-url'
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});