import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GET as getTeacherClasses } from '@/app/api/teacher/classes/route.js';
import { GET as getStudentClasses } from '@/app/api/student/classes/route.js';
import { GET as getAdminDashboard } from '@/app/api/admin/dashboard/route.js';
import User from '@/models/User.js';

// Mock NextAuth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

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

describe('Authorization System', () => {
  let mongoServer;
  let teacherUser;
  let studentUser;
  let adminUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users with different roles
    teacherUser = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      role: 'teacher',
      name: 'Test Teacher'
    });

    studentUser = await User.create({
      email: 'student@example.com',
      passwordHash: 'password123',
      role: 'student',
      name: 'Test Student'
    });

    adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: 'password123',
      role: 'admin',
      name: 'Test Admin'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Teacher Endpoints Authorization', () => {
    it('should allow teacher access to teacher endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: teacherUser._id.toString(),
          role: 'teacher',
          email: 'teacher@example.com'
        }
      });

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should deny student access to teacher endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: studentUser._id.toString(),
          role: 'student',
          email: 'student@example.com'
        }
      });

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should deny admin access to teacher endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          role: 'admin',
          email: 'admin@example.com'
        }
      });

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should deny unauthenticated access to teacher endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });
  });

  describe('Student Endpoints Authorization', () => {
    it('should allow student access to student endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: studentUser._id.toString(),
          role: 'student',
          email: 'student@example.com'
        }
      });

      const response = await getStudentClasses();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should deny teacher access to student endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: teacherUser._id.toString(),
          role: 'teacher',
          email: 'teacher@example.com'
        }
      });

      const response = await getStudentClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should deny admin access to student endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          role: 'admin',
          email: 'admin@example.com'
        }
      });

      const response = await getStudentClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should deny unauthenticated access to student endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const response = await getStudentClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Admin Endpoints Authorization', () => {
    it('should allow admin access to admin endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          role: 'admin',
          email: 'admin@example.com'
        }
      });

      const response = await getAdminDashboard();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should deny teacher access to admin endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: teacherUser._id.toString(),
          role: 'teacher',
          email: 'teacher@example.com'
        }
      });

      const response = await getAdminDashboard();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should deny student access to admin endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: studentUser._id.toString(),
          role: 'student',
          email: 'student@example.com'
        }
      });

      const response = await getAdminDashboard();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should deny unauthenticated access to admin endpoints', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const response = await getAdminDashboard();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Session Validation', () => {
    it('should handle malformed session objects', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          // Missing required fields
          email: 'test@example.com'
        }
      });

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should handle session with invalid role', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: {
          id: teacherUser._id.toString(),
          role: 'invalid-role',
          email: 'teacher@example.com'
        }
      });

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should handle session with missing user object', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        // Missing user object
        expires: new Date().toISOString()
      });

      const response = await getTeacherClasses();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });
  });

  describe('Role-Based Access Control', () => {
    const testCases = [
      {
        endpoint: 'teacher',
        handler: getTeacherClasses,
        allowedRoles: ['teacher'],
        deniedRoles: ['student', 'admin']
      },
      {
        endpoint: 'student',
        handler: getStudentClasses,
        allowedRoles: ['student'],
        deniedRoles: ['teacher', 'admin']
      },
      {
        endpoint: 'admin',
        handler: getAdminDashboard,
        allowedRoles: ['admin'],
        deniedRoles: ['teacher', 'student']
      }
    ];

    testCases.forEach(({ endpoint, handler, allowedRoles, deniedRoles }) => {
      describe(`${endpoint} endpoint`, () => {
        allowedRoles.forEach(role => {
          it(`should allow ${role} role`, async () => {
            const { getServerSession } = await import('next-auth/next');
            getServerSession.mockResolvedValue({
              user: {
                id: 'test-id',
                role,
                email: `${role}@example.com`
              }
            });

            const response = await handler();
            expect(response.status).toBe(200);
          });
        });

        deniedRoles.forEach(role => {
          it(`should deny ${role} role`, async () => {
            const { getServerSession } = await import('next-auth/next');
            getServerSession.mockResolvedValue({
              user: {
                id: 'test-id',
                role,
                email: `${role}@example.com`
              }
            });

            const response = await handler();
            expect(response.status).toBe(401);
          });
        });
      });
    });
  });

  describe('Cross-Role Access Attempts', () => {
    it('should consistently deny cross-role access', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Student trying to access teacher endpoint
      getServerSession.mockResolvedValue({
        user: {
          id: studentUser._id.toString(),
          role: 'student',
          email: 'student@example.com'
        }
      });

      const teacherResponse = await getTeacherClasses();
      expect(teacherResponse.status).toBe(401);

      // Teacher trying to access admin endpoint
      getServerSession.mockResolvedValue({
        user: {
          id: teacherUser._id.toString(),
          role: 'teacher',
          email: 'teacher@example.com'
        }
      });

      const adminResponse = await getAdminDashboard();
      expect(adminResponse.status).toBe(401);

      // Admin trying to access student endpoint
      getServerSession.mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          role: 'admin',
          email: 'admin@example.com'
        }
      });

      const studentResponse = await getStudentClasses();
      expect(studentResponse.status).toBe(401);
    });
  });
});