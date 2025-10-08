import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Enrollment from '@/models/Enrollment.js';
import User from '@/models/User.js';
import Class from '@/models/Class.js';

describe('Enrollment Model', () => {
  let mongoServer;
  let studentId;
  let teacherId;
  let classId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users and class
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Enrollment.deleteMany({});
  });

  describe('Enrollment Creation', () => {
    it('should create a valid enrollment', async () => {
      const enrollmentData = {
        studentId,
        classId
      };

      const enrollment = new Enrollment(enrollmentData);
      const savedEnrollment = await enrollment.save();

      expect(savedEnrollment._id).toBeDefined();
      expect(savedEnrollment.studentId.toString()).toBe(studentId.toString());
      expect(savedEnrollment.classId.toString()).toBe(classId.toString());
      expect(savedEnrollment.isActive).toBe(true);
      expect(savedEnrollment.enrolledAt).toBeDefined();
      expect(savedEnrollment.createdAt).toBeDefined();
    });

    it('should require student ID', async () => {
      const enrollment = new Enrollment({ classId });
      await expect(enrollment.save()).rejects.toThrow('Student ID is required');
    });

    it('should require class ID', async () => {
      const enrollment = new Enrollment({ studentId });
      await expect(enrollment.save()).rejects.toThrow('Class ID is required');
    });

    it('should prevent duplicate enrollments', async () => {
      await Enrollment.create({ studentId, classId });
      
      const duplicateEnrollment = new Enrollment({ studentId, classId });
      await expect(duplicateEnrollment.save()).rejects.toThrow();
    });

    it('should only allow students to enroll', async () => {
      const enrollment = new Enrollment({
        studentId: teacherId, // Using teacher ID instead of student
        classId
      });

      await expect(enrollment.save()).rejects.toThrow('Only students can be enrolled in classes');
    });

    it('should not allow inactive students to enroll', async () => {
      // Create inactive student
      const inactiveStudent = await User.create({
        email: 'inactive@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Inactive Student',
        isActive: false
      });

      const enrollment = new Enrollment({
        studentId: inactiveStudent._id,
        classId
      });

      await expect(enrollment.save()).rejects.toThrow('Cannot enroll inactive student');
    });

    it('should reject enrollment for non-existent student', async () => {
      const fakeStudentId = new mongoose.Types.ObjectId();
      const enrollment = new Enrollment({
        studentId: fakeStudentId,
        classId
      });

      await expect(enrollment.save()).rejects.toThrow('Student not found');
    });
  });

  describe('Enrollment Methods', () => {
    let enrollment;

    beforeEach(async () => {
      enrollment = await Enrollment.create({ studentId, classId });
    });

    it('should deactivate enrollment', async () => {
      await enrollment.deactivate();
      expect(enrollment.isActive).toBe(false);
    });

    it('should reactivate enrollment', async () => {
      await enrollment.deactivate();
      await enrollment.reactivate();
      expect(enrollment.isActive).toBe(true);
    });
  });

  describe('Enrollment Static Methods', () => {
    beforeEach(async () => {
      // Create additional test data
      const student2 = await User.create({
        email: 'student2@example.com',
        passwordHash: 'password123',
        role: 'student',
        name: 'Test Student 2'
      });

      const class2 = await Class.create({
        name: 'Physics 101',
        subject: 'Physics',
        teacherId,
        location: {
          lat: 40.7589,
          lng: -73.9851,
          name: 'Room 201'
        }
      });

      await Enrollment.create([
        { studentId, classId, isActive: true },
        { studentId: student2._id, classId, isActive: true },
        { studentId, classId: class2._id, isActive: false }, // Inactive enrollment
        { studentId: student2._id, classId: class2._id, isActive: true }
      ]);
    });

    it('should find enrollments by student', async () => {
      const enrollments = await Enrollment.findByStudent(studentId);
      expect(enrollments).toHaveLength(1); // Only active enrollments
      expect(enrollments[0].studentId.toString()).toBe(studentId.toString());
      expect(enrollments[0].isActive).toBe(true);
    });

    it('should find all enrollments by student including inactive', async () => {
      const enrollments = await Enrollment.findByStudent(studentId, false);
      expect(enrollments).toHaveLength(2); // Active and inactive
    });

    it('should find enrollments by class', async () => {
      const enrollments = await Enrollment.findByClass(classId);
      expect(enrollments).toHaveLength(2); // Two active enrollments for this class
      expect(enrollments.every(e => e.classId.toString() === classId.toString())).toBe(true);
      expect(enrollments.every(e => e.isActive)).toBe(true);
    });

    it('should check if student is enrolled', async () => {
      const isEnrolled = await Enrollment.isStudentEnrolled(studentId, classId);
      expect(isEnrolled).toBe(true);

      const fakeStudentId = new mongoose.Types.ObjectId();
      const isNotEnrolled = await Enrollment.isStudentEnrolled(fakeStudentId, classId);
      expect(isNotEnrolled).toBe(false);
    });

    it('should get class enrollment count', async () => {
      const count = await Enrollment.getClassEnrollmentCount(classId);
      expect(count).toBe(2); // Two active enrollments
    });

    it('should get student enrollment count', async () => {
      const count = await Enrollment.getStudentEnrollmentCount(studentId);
      expect(count).toBe(1); // One active enrollment
    });
  });
});