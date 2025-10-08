import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/models/User.js';
import Class from '@/models/Class.js';
import Enrollment from '@/models/Enrollment.js';
import AttendanceSession from '@/models/AttendanceSession.js';
import AttendanceRecord from '@/models/AttendanceRecord.js';
import { createAttendanceRecord } from '@/lib/attendance.js';

describe('Attendance Flow Integration Tests', () => {
  let mongoServer;
  let teacher;
  let student;
  let classDoc;
  let enrollment;

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
    await User.deleteMany({});
    await Class.deleteMany({});
    await Enrollment.deleteMany({});
    await AttendanceSession.deleteMany({});
    await AttendanceRecord.deleteMany({});

    // Create test data
    teacher = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      role: 'teacher',
      name: 'Test Teacher'
    });

    student = await User.create({
      email: 'student@example.com',
      passwordHash: 'password123',
      role: 'student',
      name: 'Test Student'
    });

    classDoc = await Class.create({
      name: 'Mathematics 101',
      subject: 'Mathematics',
      teacherId: teacher._id,
      location: {
        lat: 40.7128,
        lng: -74.0060,
        name: 'Room 101, Main Building'
      }
    });

    enrollment = await Enrollment.create({
      studentId: student._id,
      classId: classDoc._id
    });
  });

  describe('Complete Attendance Flow', () => {
    it('should complete full attendance marking flow', async () => {
      // Step 1: Teacher creates attendance session
      const session = await AttendanceSession.createForClass(classDoc._id, 30);
      
      expect(session).toBeDefined();
      expect(session.classId.toString()).toBe(classDoc._id.toString());
      expect(session.isActive).toBe(true);
      expect(session.sessionToken).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);

      // Step 2: Verify session is valid
      const validSession = await AttendanceSession.findValidByToken(session.sessionToken);
      expect(validSession).toBeDefined();
      expect(validSession.isValid).toBe(true);

      // Step 3: Student marks attendance
      const studentLocation = {
        lat: 40.7128, // Same as class location
        lng: -74.0060
      };

      const result = await createAttendanceRecord({
        sessionId: session._id,
        studentId: student._id,
        studentLocation,
        validateLocation: true,
        maxDistance: 50
      });

      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.distance).toBeLessThan(50);

      // Step 4: Verify attendance record was created
      const attendanceRecord = await AttendanceRecord.findById(result.record._id);
      expect(attendanceRecord).toBeDefined();
      expect(attendanceRecord.sessionId.toString()).toBe(session._id.toString());
      expect(attendanceRecord.studentId.toString()).toBe(student._id.toString());
      expect(attendanceRecord.studentLocation.lat).toBe(40.7128);
      expect(attendanceRecord.studentLocation.lng).toBe(-74.0060);

      // Step 5: Verify duplicate attendance is prevented
      const duplicateResult = await createAttendanceRecord({
        sessionId: session._id,
        studentId: student._id,
        studentLocation,
        validateLocation: true,
        maxDistance: 50
      });

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('already marked attendance');
    });

    it('should reject attendance from too far away', async () => {
      const session = await AttendanceSession.createForClass(classDoc._id, 30);

      // Student location far from class (Los Angeles vs New York)
      const studentLocation = {
        lat: 34.0522,
        lng: -118.2437
      };

      const result = await createAttendanceRecord({
        sessionId: session._id,
        studentId: student._id,
        studentLocation,
        validateLocation: true,
        maxDistance: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('too far from the classroom');
      expect(result.distance).toBeGreaterThan(50);
    });

    it('should reject attendance for expired session', async () => {
      // Create session that expires immediately
      const session = await AttendanceSession.create({
        classId: classDoc._id,
        expiresAt: new Date(Date.now() + 1000) // 1 second from now
      });

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      const result = await createAttendanceRecord({
        sessionId: session._id,
        studentId: student._id,
        studentLocation,
        validateLocation: true,
        maxDistance: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject attendance for unenrolled student', async () => {
      // Create another student not enrolled in the class
      const unenrolledStudent = await User.create({
        email: 'unenrolled@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Unenrolled Student'
      });

      const session = await AttendanceSession.createForClass(classDoc._id, 30);

      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      const result = await createAttendanceRecord({
        sessionId: session._id,
        studentId: unenrolledStudent._id,
        studentLocation,
        validateLocation: true,
        maxDistance: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enrolled');
    });

    it('should handle multiple students marking attendance', async () => {
      // Create additional students and enroll them
      const student2 = await User.create({
        email: 'student2@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test Student 2'
      });

      const student3 = await User.create({
        email: 'student3@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test Student 3'
      });

      await Enrollment.create([
        { studentId: student2._id, classId: classDoc._id },
        { studentId: student3._id, classId: classDoc._id }
      ]);

      const session = await AttendanceSession.createForClass(classDoc._id, 30);

      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      // All students mark attendance
      const results = await Promise.all([
        createAttendanceRecord({
          sessionId: session._id,
          studentId: student._id,
          studentLocation,
          validateLocation: true,
          maxDistance: 50
        }),
        createAttendanceRecord({
          sessionId: session._id,
          studentId: student2._id,
          studentLocation,
          validateLocation: true,
          maxDistance: 50
        }),
        createAttendanceRecord({
          sessionId: session._id,
          studentId: student3._id,
          studentLocation,
          validateLocation: true,
          maxDistance: 50
        })
      ]);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Verify all records were created
      const attendanceRecords = await AttendanceRecord.findBySession(session._id);
      expect(attendanceRecords).toHaveLength(3);
    });

    it('should handle session deactivation', async () => {
      const session = await AttendanceSession.createForClass(classDoc._id, 30);

      // Deactivate session
      await session.deactivate();

      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      const result = await createAttendanceRecord({
        sessionId: session._id,
        studentId: student._id,
        studentLocation,
        validateLocation: true,
        maxDistance: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should create new session and deactivate old ones', async () => {
      // Create first session
      const session1 = await AttendanceSession.createForClass(classDoc._id, 30);
      expect(session1.isActive).toBe(true);

      // Create second session for same class
      const session2 = await AttendanceSession.createForClass(classDoc._id, 45);
      expect(session2.isActive).toBe(true);

      // First session should be deactivated
      const updatedSession1 = await AttendanceSession.findById(session1._id);
      expect(updatedSession1.isActive).toBe(false);

      // Only second session should be valid
      const validSession1 = await AttendanceSession.findValidByToken(session1.sessionToken);
      const validSession2 = await AttendanceSession.findValidByToken(session2.sessionToken);

      expect(validSession1).toBeNull();
      expect(validSession2).toBeDefined();
    });
  });

  describe('Attendance Statistics and Reporting', () => {
    it('should generate accurate attendance statistics', async () => {
      // Create multiple sessions and attendance records
      const session1 = await AttendanceSession.createForClass(classDoc._id, 30);
      const session2 = await AttendanceSession.createForClass(classDoc._id, 30);

      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      // Student attends first session
      await createAttendanceRecord({
        sessionId: session1._id,
        studentId: student._id,
        studentLocation,
        validateLocation: false
      });

      // Create second student and enroll
      const student2 = await User.create({
        email: 'student2@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test Student 2'
      });

      await Enrollment.create({
        studentId: student2._id,
        classId: classDoc._id
      });

      // Both students attend second session
      await createAttendanceRecord({
        sessionId: session2._id,
        studentId: student._id,
        studentLocation,
        validateLocation: false
      });

      await createAttendanceRecord({
        sessionId: session2._id,
        studentId: student2._id,
        studentLocation,
        validateLocation: false
      });

      // Get class statistics
      const stats = await AttendanceRecord.getClassStats(classDoc._id);

      expect(stats).toHaveLength(2);
      
      const student1Stats = stats.find(s => s.studentId.toString() === student._id.toString());
      const student2Stats = stats.find(s => s.studentId.toString() === student2._id.toString());

      expect(student1Stats.attendanceCount).toBe(2);
      expect(student2Stats.attendanceCount).toBe(1);
    });

    it('should find attendance by various criteria', async () => {
      const session = await AttendanceSession.createForClass(classDoc._id, 30);

      const studentLocation = {
        lat: 40.7128,
        lng: -74.0060
      };

      await createAttendanceRecord({
        sessionId: session._id,
        studentId: student._id,
        studentLocation,
        validateLocation: false
      });

      // Find by student
      const studentRecords = await AttendanceRecord.findByStudent(student._id);
      expect(studentRecords).toHaveLength(1);

      // Find by session
      const sessionRecords = await AttendanceRecord.findBySession(session._id);
      expect(sessionRecords).toHaveLength(1);

      // Find by class
      const classRecords = await AttendanceRecord.findByClass(classDoc._id);
      expect(classRecords).toHaveLength(1);
    });
  });
});