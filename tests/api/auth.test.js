import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { POST } from '@/app/api/auth/register/route.js';
import User from '@/models/User.js';

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

describe('Auth API Endpoints', () => {
  let mongoServer;

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
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const requestData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'student'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('User registered successfully');
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.name).toBe('Test User');
      expect(data.user.role).toBe('student');
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('should validate required fields', async () => {
      const requestData = {
        email: 'test@example.com',
        // Missing password, name, role
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('All fields are required');
    });

    it('should validate email format', async () => {
      const requestData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        role: 'student'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Please enter a valid email address');
    });

    it('should validate password length', async () => {
      const requestData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
        role: 'student'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password must be at least 6 characters long');
    });

    it('should validate role', async () => {
      const requestData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'invalid-role'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid role specified');
    });

    it('should prevent duplicate email registration', async () => {
      // Create first user
      await User.create({
        email: 'test@example.com',
        passwordHash: 'password123',
        name: 'First User',
        role: 'student'
      });

      const requestData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Second User',
        role: 'teacher'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('User with this email already exists');
    });

    it('should handle case insensitive emails', async () => {
      // Create first user with lowercase email
      await User.create({
        email: 'test@example.com',
        passwordHash: 'password123',
        name: 'First User',
        role: 'student'
      });

      const requestData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        name: 'Second User',
        role: 'teacher'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('User with this email already exists');
    });

    it('should create users with different roles', async () => {
      const roles = ['student', 'teacher', 'admin'];

      for (const role of roles) {
        const requestData = {
          email: `${role}@example.com`,
          password: 'password123',
          name: `Test ${role}`,
          role
        };

        const mockRequest = {
          json: async () => requestData
        };

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.user.role).toBe(role);
      }
    });

    it('should trim whitespace from name', async () => {
      const requestData = {
        email: 'test@example.com',
        password: 'password123',
        name: '  Test User  ',
        role: 'student'
      };

      const mockRequest = {
        json: async () => requestData
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.name).toBe('Test User');
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
      expect(data.error).toBe('Internal server error');
    });
  });
});