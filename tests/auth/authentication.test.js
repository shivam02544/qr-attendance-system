import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route.js';
import User from '@/models/User.js';

describe('Authentication System', () => {
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

  describe('Credentials Provider', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      });
    });

    it('should authenticate valid credentials', async () => {
      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await credentialsProvider.authorize(credentials);

      expect(result).toBeDefined();
      expect(result.id).toBe(testUser._id.toString());
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('student');
      expect(result.password).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      await expect(credentialsProvider.authorize(credentials)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should reject invalid password', async () => {
      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(credentialsProvider.authorize(credentials)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should reject missing email', async () => {
      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        password: 'password123'
      };

      await expect(credentialsProvider.authorize(credentials)).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should reject missing password', async () => {
      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        email: 'test@example.com'
      };

      await expect(credentialsProvider.authorize(credentials)).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should handle case insensitive email', async () => {
      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123'
      };

      const result = await credentialsProvider.authorize(credentials);

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should reject inactive users', async () => {
      // Create inactive user
      await User.create({
        email: 'inactive@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Inactive User',
        isActive: false
      });

      const credentialsProvider = authOptions.providers[0];
      
      const credentials = {
        email: 'inactive@example.com',
        password: 'password123'
      };

      await expect(credentialsProvider.authorize(credentials)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should authenticate different user roles', async () => {
      const users = [
        {
          email: 'teacher@example.com',
          passwordHash: 'password123',
          role: 'teacher',
          name: 'Test Teacher'
        },
        {
          email: 'admin@example.com',
          passwordHash: 'password123',
          role: 'admin',
          name: 'Test Admin'
        }
      ];

      for (const userData of users) {
        const user = await User.create(userData);
        
        const credentialsProvider = authOptions.providers[0];
        const credentials = {
          email: userData.email,
          password: 'password123'
        };

        const result = await credentialsProvider.authorize(credentials);

        expect(result.role).toBe(userData.role);
        expect(result.id).toBe(user._id.toString());
      }
    });
  });

  describe('JWT Callback', () => {
    it('should add user info to token on sign in', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student'
      };

      const token = {};

      const result = await authOptions.callbacks.jwt({ token, user });

      expect(result.role).toBe('student');
      expect(result.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should preserve existing token without user', async () => {
      const token = {
        role: 'teacher',
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      const result = await authOptions.callbacks.jwt({ token });

      expect(result.role).toBe('teacher');
      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Session Callback', () => {
    it('should add user info to session from token', async () => {
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const token = {
        id: '507f1f77bcf86cd799439011',
        role: 'student'
      };

      const result = await authOptions.callbacks.session({ session, token });

      expect(result.user.id).toBe('507f1f77bcf86cd799439011');
      expect(result.user.role).toBe('student');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
    });

    it('should handle session without token', async () => {
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const result = await authOptions.callbacks.session({ session });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.id).toBeUndefined();
      expect(result.user.role).toBeUndefined();
    });
  });

  describe('Redirect Callback', () => {
    const baseUrl = 'http://localhost:3000';

    it('should handle relative URLs', async () => {
      const url = '/dashboard';
      const result = await authOptions.callbacks.redirect({ url, baseUrl });
      expect(result).toBe('http://localhost:3000/dashboard');
    });

    it('should handle same origin URLs', async () => {
      const url = 'http://localhost:3000/dashboard';
      const result = await authOptions.callbacks.redirect({ url, baseUrl });
      expect(result).toBe('http://localhost:3000/dashboard');
    });

    it('should reject different origin URLs', async () => {
      const url = 'http://malicious-site.com/dashboard';
      const result = await authOptions.callbacks.redirect({ url, baseUrl });
      expect(result).toBe(baseUrl);
    });

    it('should handle root path', async () => {
      const url = '/';
      const result = await authOptions.callbacks.redirect({ url, baseUrl });
      expect(result).toBe('http://localhost:3000/');
    });
  });

  describe('Configuration', () => {
    it('should have correct session configuration', () => {
      expect(authOptions.session.strategy).toBe('jwt');
      expect(authOptions.session.maxAge).toBe(24 * 60 * 60); // 24 hours
    });

    it('should have correct JWT configuration', () => {
      expect(authOptions.jwt.maxAge).toBe(24 * 60 * 60); // 24 hours
    });

    it('should have correct pages configuration', () => {
      expect(authOptions.pages.signIn).toBe('/auth/login');
      expect(authOptions.pages.error).toBe('/auth/error');
    });

    it('should have trustHost enabled', () => {
      expect(authOptions.trustHost).toBe(true);
    });

    it('should have credentials provider configured', () => {
      expect(authOptions.providers).toHaveLength(1);
      expect(authOptions.providers[0].name).toBe('credentials');
    });
  });
});