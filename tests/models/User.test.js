import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/models/User.js';

describe('User Model', () => {
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

  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.role).toBe('student');
      expect(savedUser.name).toBe('Test User');
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.passwordHash).not.toBe('password123');
      expect(savedUser.passwordHash.length).toBeGreaterThan(20);
    });

    it('should require email', async () => {
      const userData = {
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Email is required');
    });

    it('should require valid email format', async () => {
      const userData = {
        email: 'invalid-email',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Please enter a valid email');
    });

    it('should require unique email', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      };

      await new User(userData).save();
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should require valid role', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'invalid-role',
        name: 'Test User'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Role must be either teacher, student, or admin');
    });

    it('should require minimum password length', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: '123',
        role: 'student',
        name: 'Test User'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Password must be at least 6 characters');
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test User'
      };
      user = await new User(userData).save();
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should return safe object without password', () => {
      const safeUser = user.toSafeObject();
      expect(safeUser.passwordHash).toBeUndefined();
      expect(safeUser.email).toBe('test@example.com');
      expect(safeUser.name).toBe('Test User');
    });
  });

  describe('User Static Methods', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'teacher1@example.com',
          passwordHash: 'password123',
          role: 'teacher',
          name: 'Teacher One',
          isActive: true
        },
        {
          email: 'student1@example.com',
          passwordHash: 'password123',
          role: 'student',
          name: 'Student One',
          isActive: true
        },
        {
          email: 'student2@example.com',
          passwordHash: 'password123',
          role: 'student',
          name: 'Student Two',
          isActive: false
        }
      ]);
    });

    it('should find active users', async () => {
      const activeUsers = await User.findActive();
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.isActive)).toBe(true);
    });

    it('should find users by role', async () => {
      const students = await User.findByRole('student');
      expect(students).toHaveLength(1);
      expect(students[0].role).toBe('student');
      expect(students[0].isActive).toBe(true);

      const teachers = await User.findByRole('teacher');
      expect(teachers).toHaveLength(1);
      expect(teachers[0].role).toBe('teacher');
    });
  });
});