import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AttendanceRecord from '@/models/AttendanceRecord.js';
import AttendanceSession from '@/models/AttendanceSession.js';
import Enrollment from '@/models/Enrollment.js';
import Class from '@/models/Class.js';
import User from '@/models/User.js';

describe('AttendanceRecord Model', () => {
  let mongoServer;
  let studentId;
  let teacherId;
  let classId;
  let sessionId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test data
    const student = await User.create({
      email: 'student@example.com',
      passwordHash: 'password123',
      role: 'student',
      name: 'Test Student'
    });
    studentId = student._id;

    const teacher = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      role: 'teacher',
      name: 'Test Teacher'
    });
    teacherId = teacher._id;

    const classDoc = await Class.create({
      name: 'Mathematics 101',
      subject: 'Mathematics',
      teacherId,
      location: {
        lat: 40.7128,
        lng: -74.0060,
        name: 'Room 101'
      }
    });
    classId = classDoc._id;

    // Enroll student in class
    await Enrollment.create({ studentId, classId });

    // Create attendance session
    const session = await AttendanceSession.create({
      classId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });
    sessionId = session._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await AttendanceRecord.deleteMany({});
  });

  describe('AttendanceRecord Creation', () => {
    it('should create a valid attendance record', async () => {
      const recordData = {
        sessionId,
        studentId,
        studentLocation: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const record = new AttendanceRecord(recordData);
      const savedRecord = await record.save();

      expect(savedRecord._id).toBeDefined();
      expect(savedRecord.sessionId.toString()).toBe(sessionId.toString());
      expect(savedRecord.studentId.toString()).toBe(studentId.toString());
      expect(savedRecord.studentLocation.lat).toBe(40.7128);
      expect(savedRecord.studentLocation.lng).toBe(-74.0060);
      expect(savedRecord.markedAt).toBeDefined();
      expect(savedRecord.createdAt).toBeDefined();
    });

    it('should require session ID', async () => {
      const record = new AttendanceRecord({
        studentId,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Session ID is required');
    });

    it('should require student ID', async () => {
      const record = new AttendanceRecord({
        sessionId,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Student ID is required');
    });

    it('should require student location', async () => {
      const record = new AttendanceRecord({
        sessionId,
        studentId
      });

      await expect(record.save()).rejects.toThrow();
    });

    it('should validate latitude range', async () => {
      const record = new AttendanceRecord({
        sessionId,
        studentId,
        studentLocation: {
          lat: 95, // Invalid latitude
          lng: -74.0060
        }
      });

      await expect(record.save()).rejects.toThrow('Latitude must be between -90 and 90');
    });

    it('should validate longitude range', async () => {
      const record = new AttendanceRecord({
        sessionId,
        studentId,
        studentLocation: {
          lat: 40.7128,
          lng: 185 // Invalid longitude
        }
      });

      await expect(record.save()).rejects.toThrow('Longitude must be between -180 and 180');
    });

    it('should prevent duplicate attendance for same session', async () => {
      const recordData = {
        sessionId,
        studentId,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      };

      await AttendanceRecord.create(recordData);
      
      const duplicateRecord = new AttendanceRecord(recordData);
      await expect(duplicateRecord.save()).rejects.toThrow();
    });

    it('should only allow students to mark attendance', async () => {
      const record = new AttendanceRecord({
        sessionId,
        studentId: teacherId, // Using teacher ID
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Only students can mark attendance');
    });

    it('should not allow inactive students to mark attendance', async () => {
      const inactiveStudent = await User.create({
        email: 'inactive@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Inactive Student',
        isActive: false
      });

      const record = new AttendanceRecord({
        sessionId,
        studentId: inactiveStudent._id,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Inactive student cannot mark attendance');
    });

    it('should require student to be enrolled in class', async () => {
      const unenrolledStudent = await User.create({
        email: 'unenrolled@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Unenrolled Student'
      });

      const record = new AttendanceRecord({
        sessionId,
        studentId: unenrolledStudent._id,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Student is not enrolled in this class');
    });

    it('should not allow attendance for inactive session', async () => {
      const inactiveSession = await AttendanceSession.create({
        classId,
        isActive: false,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      const record = new AttendanceRecord({
        sessionId: inactiveSession._id,
        studentId,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Attendance session is not active');
    });

    it('should not allow attendance for expired session', async () => {
      const expiredSession = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() - 60 * 1000) // 1 minute ago
      });

      // Manually update to bypass pre-save validation
      await AttendanceSession.updateOne(
        { _id: expiredSession._id },
        { expiresAt: new Date(Date.now() - 60 * 1000) }
      );

      const record = new AttendanceRecord({
        sessionId: expiredSession._id,
        studentId,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await expect(record.save()).rejects.toThrow('Attendance session has expired');
    });
  });

  describe('AttendanceRecord Methods', () => {
    let record;

    beforeEach(async () => {
      record = await AttendanceRecord.create({
        sessionId,
        studentId,
        studentLocation: {
          lat: 40.7589, // Slightly different location
          lng: -73.9851
        }
      });
    });

    it('should calculate distance from class location', async () => {
      const distance = await record.distanceFromClass();
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10000); // Should be less than 10km
    });

    it('should calculate zero distance for same location', async () => {
      const sameLocationRecord = await AttendanceRecord.create({
        sessionId,
        studentId: (await User.create({
          email: 'student2@example.com',
          passwordHash: 'password123',
          role: 'student',
          name: 'Student 2'
        }))._id,
        studentLocation: {
          lat: 40.7128, // Same as class location
          lng: -74.0060
        }
      });

      // Enroll the new student
      await Enrollment.create({
        studentId: sameLocationRecord.studentId,
        classId
      });

      const distance = await sameLocationRecord.distanceFromClass();
      expect(distance).toBeLessThan(1); // Should be very close to 0
    });
  });

  describe('AttendanceRecord Static Methods', () => {
    let student2Id;
    let session2Id;

    beforeEach(async () => {
      // Create additional test data
      const student2 = await User.create({
        email: 'student2@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test Student 2'
      });
      student2Id = student2._id;

      await Enrollment.create({ studentId: student2Id, classId });

      const session2 = await AttendanceSession.create({
        classId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });
      session2Id = session2._id;

      // Create attendance records
      await AttendanceRecord.create([
        {
          sessionId,
          studentId,
          studentLocation: { lat: 40.7128, lng: -74.0060 },
          markedAt: new Date('2024-01-01T10:00:00Z')
        },
        {
          sessionId,
          studentId: student2Id,
          studentLocation: { lat: 40.7128, lng: -74.0060 },
          markedAt: new Date('2024-01-01T10:05:00Z')
        },
        {
          sessionId: session2Id,
          studentId,
          studentLocation: { lat: 40.7128, lng: -74.0060 },
          markedAt: new Date('2024-01-02T10:00:00Z')
        }
      ]);
    });

    it('should find attendance by student', async () => {
      const records = await AttendanceRecord.findByStudent(studentId);
      expect(records).toHaveLength(2);
      expect(records.every(r => r.studentId.toString() === studentId.toString())).toBe(true);
    });

    it('should find attendance by student with date range', async () => {
      const records = await AttendanceRecord.findByStudent(
        studentId,
        '2024-01-01T00:00:00Z',
        '2024-01-01T23:59:59Z'
      );
      expect(records).toHaveLength(1);
    });

    it('should find attendance by session', async () => {
      const records = await AttendanceRecord.findBySession(sessionId);
      expect(records).toHaveLength(2);
      expect(records.every(r => r.sessionId.toString() === sessionId.toString())).toBe(true);
    });

    it('should find attendance by class', async () => {
      const records = await AttendanceRecord.findByClass(classId);
      expect(records).toHaveLength(3);
    });

    it('should find attendance by class with date range', async () => {
      const records = await AttendanceRecord.findByClass(
        classId,
        '2024-01-01T00:00:00Z',
        '2024-01-01T23:59:59Z'
      );
      expect(records).toHaveLength(2);
    });

    it('should get class attendance statistics', async () => {
      const stats = await AttendanceRecord.getClassStats(classId);
      expect(stats).toHaveLength(2); // Two students
      expect(stats[0].attendanceCount).toBeGreaterThan(0);
      expect(stats[0].studentName).toBeDefined();
    });

    it('should check if student has attended session', async () => {
      const hasAttended = await AttendanceRecord.hasStudentAttended(sessionId, studentId);
      expect(hasAttended).toBe(true);

      const fakeStudentId = new mongoose.Types.ObjectId();
      const hasNotAttended = await AttendanceRecord.hasStudentAttended(sessionId, fakeStudentId);
      expect(hasNotAttended).toBe(false);
    });
  });
});