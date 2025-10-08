import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GET, POST } from '@/app/api/teacher/classes/route.js';
import User from '@/models/User.js';
import Class from '@/models/Class.js';
import Enrollment from '@/models/Enrollment.js';

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

describe('Teacher API Endpoints', () => {
  let mongoServer;
  let teacherId;
  let studentId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    const teacher = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      role: 'teacher',
      name: 'Test Teacher'
    });
    teacherId = teacher._id;

    const student = await User.create({
      email: 'student@example.com',
      passwordHash: 'password123',
      role: 'student',
      name: 'Test Student'
    });
    studentId = student._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Class.deleteMany({});
    await Enrollment.deleteMany({});
  });

  describe('GET /api/teacher/classes', () => {
    it('should return teacher classes with enrollment counts', async () => {
      // Mock session
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      // Create test classes
      const class1 = await Class.create({
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: { lat: 40.7128, lng: -74.0060, name: 'Room 101' }
      });

      const class2 = await Class.create({
        name: 'Physics 101',
        subject: 'Physics',
        teacherId,
        location: { lat: 40.7589, lng: -73.9851, name: 'Room 201' }
      });

      // Create enrollments
      await Enrollment.create({ studentId, classId: class1._id });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.classes).toHaveLength(2);
      expect(data.classes[0].enrollmentCount).toBeDefined();
      expect(data.classes.find(c => c._id.toString() === class1._id.toString()).enrollmentCount).toBe(1);
      expect(data.classes.find(c => c._id.toString() === class2._id.toString()).enrollmentCount).toBe(0);
    });

    it('should require teacher authentication', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should reject non-teacher users', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: studentId.toString(), role: 'student' }
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should return empty array for teacher with no classes', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.classes).toHaveLength(0);
    });
  });

  describe('POST /api/teacher/classes', () => {
    it('should create a new class successfully', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        location: {
          name: 'Room 101, Main Building',
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const mockRequest = {
        json: async () => classData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Class created successfully');
      expect(data.class.name).toBe('Mathematics 101');
      expect(data.class.subject).toBe('Mathematics');
      expect(data.class.location.name).toBe('Room 101, Main Building');
      expect(data.class.enrollmentCount).toBe(0);
    });

    it('should require teacher authentication', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue(null);

      const mockRequest = {
        json: async () => ({})
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should validate required fields', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const mockRequest = {
        json: async () => ({
          name: 'Mathematics 101'
          // Missing subject and location
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Name, subject, and location are required');
    });

    it('should validate location format', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const mockRequest = {
        json: async () => ({
          name: 'Mathematics 101',
          subject: 'Mathematics',
          location: {
            name: 'Room 101'
            // Missing lat and lng
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Location must include name, latitude, and longitude');
    });

    it('should validate latitude range', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const mockRequest = {
        json: async () => ({
          name: 'Mathematics 101',
          subject: 'Mathematics',
          location: {
            name: 'Room 101',
            lat: 95, // Invalid latitude
            lng: -74.0060
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Latitude must be between -90 and 90');
    });

    it('should validate longitude range', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const mockRequest = {
        json: async () => ({
          name: 'Mathematics 101',
          subject: 'Mathematics',
          location: {
            name: 'Room 101',
            lat: 40.7128,
            lng: 185 // Invalid longitude
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Longitude must be between -180 and 180');
    });

    it('should prevent duplicate class names for same teacher', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      // Create first class
      await Class.create({
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: { lat: 40.7128, lng: -74.0060, name: 'Room 101' }
      });

      const mockRequest = {
        json: async () => ({
          name: 'Mathematics 101', // Duplicate name
          subject: 'Advanced Mathematics',
          location: {
            name: 'Room 102',
            lat: 40.7128,
            lng: -74.0060
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('You already have a class with this name');
    });

    it('should trim whitespace from inputs', async () => {
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacherId.toString(), role: 'teacher' }
      });

      const mockRequest = {
        json: async () => ({
          name: '  Mathematics 101  ',
          subject: '  Mathematics  ',
          location: {
            name: '  Room 101  ',
            lat: 40.7128,
            lng: -74.0060
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.class.name).toBe('Mathematics 101');
      expect(data.class.subject).toBe('Mathematics');
      expect(data.class.location.name).toBe('Room 101');
    });

    it('should allow different teachers to have classes with same name', async () => {
      // Create another teacher
      const teacher2 = await User.create({
        email: 'teacher2@example.com',
        passwordHash: 'password123',
        role: 'teacher',
        name: 'Test Teacher 2'
      });

      // Create class for first teacher
      await Class.create({
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: { lat: 40.7128, lng: -74.0060, name: 'Room 101' }
      });

      // Try to create class with same name for second teacher
      const { getServerSession } = await import('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: teacher2._id.toString(), role: 'teacher' }
      });

      const mockRequest = {
        json: async () => ({
          name: 'Mathematics 101',
          subject: 'Mathematics',
          location: {
            name: 'Room 201',
            lat: 40.7589,
            lng: -73.9851
          }
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });
});