import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AttendanceSession from '@/models/AttendanceSession.js';
import Class from '@/models/Class.js';
import User from '@/models/User.js';

describe('AttendanceSession Model', () => {
  let mongoServer;
  let classId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a teacher and class for testing
    const teacher = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      role: 'teacher',
      name: 'Test Teacher'
    });

    const classDoc = await Class.create({
      name: 'Mathematics 101',
      subject: 'Mathematics',
      teacherId: teacher._id,
      location: {
        lat: 40.7128,
        lng: -74.0060,
        name: 'Room 101'
      }
    });
    classId = classDoc._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await AttendanceSession.deleteMany({});
  });

  describe('AttendanceSession Creation', () => {
    it('should create a valid attendance session', async () => {
      const sessionData = {
        classId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };

      const session = new AttendanceSession(sessionData);
      const savedSession = await session.save();

      expect(savedSession._id).toBeDefined();
      expect(savedSession.classId.toString()).toBe(classId.toString());
      expect(savedSession.sessionToken).toBeDefined();
      expect(savedSession.sessionToken.length).toBe(64); // 32 bytes = 64 hex chars
      expect(savedSession.expiresAt).toBeDefined();
      expect(savedSession.isActive).toBe(true);
      expect(savedSession.createdAt).toBeDefined();
    });

    it('should generate unique session token', async () => {
      const session1 = await AttendanceSession.create({ classId });
      const session2 = await AttendanceSession.create({ classId });

      expect(session1.sessionToken).not.toBe(session2.sessionToken);
    });

    it('should set default expiration time', async () => {
      const session = await AttendanceSession.create({ classId });
      const expectedExpiry = new Date(Date.now() + 30 * 60 * 1000);
      const timeDiff = Math.abs(session.expiresAt - expectedExpiry);
      
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should require class ID', async () => {
      const session = new AttendanceSession({
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      await expect(session.save()).rejects.toThrow('Class ID is required');
    });

    it('should reject past expiration time', async () => {
      const session = new AttendanceSession({
        classId,
        expiresAt: new Date(Date.now() - 60 * 1000) // 1 minute ago
      });

      await expect(session.save()).rejects.toThrow('Expiration time must be in the future');
    });
  });

  describe('AttendanceSession Virtuals', () => {
    it('should correctly identify expired session', async () => {
      const expiredSession = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() - 60 * 1000) // 1 minute ago (bypassing validation)
      });

      // Manually set expiration to past (bypassing pre-save validation)
      await AttendanceSession.updateOne(
        { _id: expiredSession._id },
        { expiresAt: new Date(Date.now() - 60 * 1000) }
      );

      const session = await AttendanceSession.findById(expiredSession._id);
      expect(session.isExpired).toBe(true);
      expect(session.isValid).toBe(false);
    });

    it('should correctly identify valid session', async () => {
      const session = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      expect(session.isExpired).toBe(false);
      expect(session.isValid).toBe(true);
    });

    it('should calculate remaining minutes correctly', async () => {
      const session = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
      });

      expect(session.remainingMinutes).toBeGreaterThan(14);
      expect(session.remainingMinutes).toBeLessThanOrEqual(15);
    });
  });

  describe('AttendanceSession Methods', () => {
    let session;

    beforeEach(async () => {
      session = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });
    });

    it('should extend session duration', async () => {
      const originalExpiry = session.expiresAt;
      await session.extend(15); // Add 15 minutes

      expect(session.expiresAt.getTime()).toBe(originalExpiry.getTime() + 15 * 60 * 1000);
    });

    it('should not extend expired session', async () => {
      // Manually expire the session
      await AttendanceSession.updateOne(
        { _id: session._id },
        { expiresAt: new Date(Date.now() - 60 * 1000) }
      );

      const expiredSession = await AttendanceSession.findById(session._id);
      await expect(expiredSession.extend(15)).rejects.toThrow('Cannot extend expired session');
    });

    it('should deactivate session', async () => {
      await session.deactivate();
      expect(session.isActive).toBe(false);
    });

    it('should get QR data for valid session', async () => {
      // Populate the class data
      await session.populate('classId');
      const qrData = session.getQRData();

      expect(qrData.sessionToken).toBe(session.sessionToken);
      expect(qrData.classId).toBe(classId.toString());
      expect(qrData.className).toBe('Mathematics 101');
      expect(qrData.location).toBeDefined();
      expect(qrData.expiresAt).toBeDefined();
    });

    it('should not get QR data for invalid session', async () => {
      await session.deactivate();
      expect(() => session.getQRData()).toThrow('Cannot generate QR data for invalid session');
    });
  });

  describe('AttendanceSession Static Methods', () => {
    beforeEach(async () => {
      // Create multiple sessions for testing
      await AttendanceSession.create([
        {
          classId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          isActive: true
        },
        {
          classId,
          expiresAt: new Date(Date.now() - 60 * 1000), // Expired
          isActive: true
        },
        {
          classId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          isActive: false // Inactive
        }
      ]);
    });

    it('should find active sessions by class', async () => {
      const activeSessions = await AttendanceSession.findActiveByClass(classId);
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].isActive).toBe(true);
      expect(activeSessions[0].expiresAt > new Date()).toBe(true);
    });

    it('should find session by token', async () => {
      const session = await AttendanceSession.create({ classId });
      const foundSession = await AttendanceSession.findByToken(session.sessionToken);

      expect(foundSession).toBeDefined();
      expect(foundSession.sessionToken).toBe(session.sessionToken);
    });

    it('should find valid session by token', async () => {
      const validSession = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      const foundSession = await AttendanceSession.findValidByToken(validSession.sessionToken);
      expect(foundSession).toBeDefined();
      expect(foundSession.sessionToken).toBe(validSession.sessionToken);
    });

    it('should not find invalid session by token', async () => {
      const invalidSession = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: false
      });

      const foundSession = await AttendanceSession.findValidByToken(invalidSession.sessionToken);
      expect(foundSession).toBeNull();
    });

    it('should create new session and deactivate existing ones', async () => {
      // Create initial active session
      const existingSession = await AttendanceSession.create({
        classId,
        isActive: true
      });

      // Create new session for same class
      const newSession = await AttendanceSession.createForClass(classId, 45);

      // Check that existing session is deactivated
      const updatedExistingSession = await AttendanceSession.findById(existingSession._id);
      expect(updatedExistingSession.isActive).toBe(false);

      // Check that new session is active
      expect(newSession.isActive).toBe(true);
      expect(newSession.classId.toString()).toBe(classId.toString());
    });

    it('should cleanup expired sessions', async () => {
      // Create expired but still active session
      const expiredSession = await AttendanceSession.create({
        classId,
        isActive: true
      });

      // Manually set expiration to past
      await AttendanceSession.updateOne(
        { _id: expiredSession._id },
        { expiresAt: new Date(Date.now() - 60 * 1000) }
      );

      await AttendanceSession.cleanupExpired();

      const updatedSession = await AttendanceSession.findById(expiredSession._id);
      expect(updatedSession.isActive).toBe(false);
    });
  });
});