import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GET } from '@/app/api/debug/session/route.js';
import { POST } from '@/app/api/student/enroll/route.js';
import User from '@/models/User.js';
import Class from '@/models/Class.js';
import Enrollment from '@/models/Enrollment.js';

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

// Mock NextAuth session
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// Mock database connection
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(true)
}));

describe('Enrollment Debugging Tests', () => {
  let mongoServer;
  let testUser;
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
    // Clean up collections
    await Promise.all([
      User.deleteMany({}),
      Class.deleteMany({}),
      Enrollment.deleteMany({})
    ]);

    // Create test teacher
    testTeacher = await User.create({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      passwordHash: 'hashedpassword',
      role: 'teacher',
      isActive: true
    });

    // Create test student
    testUser = await User.create({
      name: 'Test Student',
      email: 'student@test.com',
      passwordHash: 'hashedpassword',
      role: 'student',
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

    vi.clearAllMocks();
  });

  describe('Session Debug Endpoint', () => {
    it('should return session debug info for authenticated user', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
          name: testUser.name,
          role: testUser.role
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.user.id).toBe(testUser._id.toString());
      expect(data.dbUser).toBeDefined();
      expect(data.dbUser.id.toString()).toBe(testUser._id.toString());
      expect(data.debug.dbUserExists).toBe(true);
      expect(data.debug.dbUserRole).toBe('student');
      expect(data.debug.dbUserActive).toBe(true);
    });

    it('should handle missing session', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No session found');
      expect(data.session).toBeNull();
      expect(data.user).toBeNull();
    });

    it('should handle user not found in database', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: nonExistentId.toString(),
          email: 'nonexistent@test.com',
          name: 'Non Existent',
          role: 'student'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.dbUser).toBeNull();
      expect(data.debug.dbUserExists).toBe(false);
    });
  });

  describe('Enrollment Error Handling', () => {
    it('should handle student not found error', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: nonExistentId.toString(),
          email: 'nonexistent@test.com',
          name: 'Non Existent',
          role: 'student'
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Your user account was not found');
      expect(data.debug.error).toBe('Student not found in database');
    });

    it('should handle non-student role error', async () => {
      // Create a teacher user
      const teacherUser = await User.create({
        name: 'Another Teacher',
        email: 'teacher2@test.com',
        passwordHash: 'hashedpassword',
        role: 'teacher',
        isActive: true
      });

      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: teacherUser._id.toString(),
          email: teacherUser.email,
          name: teacherUser.name,
          role: teacherUser.role
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      // The API first checks for student role in session, so it returns 401 for non-students
      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should handle inactive student error', async () => {
      // Create inactive student
      const inactiveStudent = await User.create({
        name: 'Inactive Student',
        email: 'inactive@test.com',
        passwordHash: 'hashedpassword',
        role: 'student',
        isActive: false
      });

      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: inactiveStudent._id.toString(),
          email: inactiveStudent.email,
          name: inactiveStudent.name,
          role: inactiveStudent.role
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.message).toContain('Your account is inactive');
      expect(data.debug.error).toBe('User account is inactive');
    });

    it('should handle successful enrollment', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
          name: testUser.name,
          role: testUser.role
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Successfully enrolled in class');
      expect(data.enrollment).toBeDefined();

      // Verify enrollment was created
      const enrollment = await Enrollment.findOne({
        studentId: testUser._id,
        classId: testClass._id
      });
      expect(enrollment).toBeDefined();
      expect(enrollment.isActive).toBe(true);
    });

    it('should handle duplicate enrollment', async () => {
      // Create existing enrollment
      await Enrollment.create({
        studentId: testUser._id,
        classId: testClass._id,
        isActive: true
      });

      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
          name: testUser.name,
          role: testUser.role
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('You are already enrolled in this class');
    });

    it('should handle missing class ID', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
          name: testUser.name,
          role: testUser.role
        }
      });

      const mockRequest = {
        json: async () => ({}) // Missing classId
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Class ID is required');
    });

    it('should handle non-existent class', async () => {
      const nonExistentClassId = new mongoose.Types.ObjectId();
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: testUser._id.toString(),
          email: testUser.email,
          name: testUser.name,
          role: testUser.role
        }
      });

      const mockRequest = {
        json: async () => ({ classId: nonExistentClassId.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe('Class not found');
    });

    it('should handle unauthorized access', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null); // No session

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful error messages with debug information', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: nonExistentId.toString(),
          email: 'test@test.com',
          name: 'Test User',
          role: 'student'
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.message).toContain('try logging out and logging back in');
      expect(data.debug).toBeDefined();
      expect(data.debug.sessionUserId).toBe(nonExistentId.toString());
      expect(data.debug.error).toBe('Student not found in database');
    });

    it('should provide role-specific error messages', async () => {
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@test.com',
        passwordHash: 'hashedpassword',
        role: 'admin',
        isActive: true
      });

      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        }
      });

      const mockRequest = {
        json: async () => ({ classId: testClass._id.toString() })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      // The API first checks for student role in session, so non-students get 401
      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });
  });
});