import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { POST as seedPost, GET as seedGet } from '@/app/api/debug/seed/route.js';
import { GET as debugGet } from '@/app/api/debug/attendance/route.js';
import Class from '@/models/Class.js';
import User from '@/models/User.js';
import Enrollment from '@/models/Enrollment.js';
import AttendanceSession from '@/models/AttendanceSession.js';
import AttendanceRecord from '@/models/AttendanceRecord.js';

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

describe('Seeding Integration Tests', () => {
  let mongoServer;
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
    // Clean up all collections
    await Promise.all([
      Class.deleteMany({}),
      User.deleteMany({}),
      Enrollment.deleteMany({}),
      AttendanceSession.deleteMany({}),
      AttendanceRecord.deleteMany({})
    ]);

    // Create test teacher
    testTeacher = await User.create({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      passwordHash: 'hashedpassword',
      role: 'teacher',
      isActive: true
    });

    // Create test class
    testClass = await Class.create({
      name: 'Integration Test Class',
      subject: 'Computer Science',
      teacherId: testTeacher._id,
      location: {
        name: 'Room 101',
        lat: 40.7128,
        lng: -74.0060
      }
    });
  });

  describe('End-to-End Seeding Workflow', () => {
    it('should complete full seeding workflow from empty to populated', async () => {
      // Step 1: Check initial empty state
      const initialCheckRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const initialCheck = await debugGet(initialCheckRequest);
      const initialData = await initialCheck.json();

      expect(initialData.success).toBe(true);
      expect(initialData.data.enrollmentInfo.count).toBe(0);
      expect(initialData.data.sessionInfo.total).toBe(0);
      expect(initialData.data.attendanceInfo.totalRecords).toBe(0);
      expect(initialData.data.recommendations).toContain('No students enrolled in this class');

      // Step 2: Get seeding options
      const optionsRequest = {
        url: `http://localhost:3000/api/debug/seed?classId=${testClass._id}`
      };

      const optionsResponse = await seedGet(optionsRequest);
      const optionsData = await optionsResponse.json();

      expect(optionsResponse.status).toBe(200);
      expect(optionsData.success).toBe(true);
      expect(optionsData.data.currentState.totalStudents).toBe(0);
      expect(optionsData.data.seedingOptions).toBeDefined();

      // Step 3: Perform seeding
      const seedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 5,
          sessionCount: 3,
          attendanceRate: 0.8,
          dateRange: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date()
          }
        })
      };

      const seedResponse = await seedPost(seedRequest);
      const seedData = await seedResponse.json();

      expect(seedResponse.status).toBe(200);
      expect(seedData.success).toBe(true);
      expect(seedData.data.studentsCreated).toBe(5);
      expect(seedData.data.enrollmentsCreated).toBe(5);
      expect(seedData.data.sessionsCreated).toBe(3);
      expect(seedData.data.recordsCreated).toBeGreaterThan(0);

      // Step 4: Verify seeded data with debug endpoint
      const finalCheckRequest = {
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      };

      const finalCheck = await debugGet(finalCheckRequest);
      const finalData = await finalCheck.json();

      expect(finalData.success).toBe(true);
      expect(finalData.data.enrollmentInfo.count).toBe(5);
      expect(finalData.data.sessionInfo.total).toBe(3);
      expect(finalData.data.attendanceInfo.totalRecords).toBeGreaterThan(0);
      expect(finalData.data.recommendations).toContain('Data looks healthy!');

      // Step 5: Verify actual database state
      const students = await User.find({ role: 'student' });
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const records = await AttendanceRecord.find({});

      expect(students).toHaveLength(5);
      expect(enrollments).toHaveLength(5);
      expect(sessions).toHaveLength(3);
      expect(records.length).toBeGreaterThan(0);

      // Verify data relationships
      enrollments.forEach(enrollment => {
        expect(enrollment.classId.toString()).toBe(testClass._id.toString());
        expect(students.some(s => s._id.toString() === enrollment.studentId.toString())).toBe(true);
      });

      sessions.forEach(session => {
        expect(session.classId.toString()).toBe(testClass._id.toString());
      });

      records.forEach(record => {
        expect(sessions.some(s => s._id.toString() === record.sessionId.toString())).toBe(true);
        expect(students.some(s => s._id.toString() === record.studentId.toString())).toBe(true);
      });
    });

    it('should handle incremental seeding correctly', async () => {
      // Step 1: Initial seeding with 3 students
      const initialSeedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 3,
          sessionCount: 2,
          attendanceRate: 0.7
        })
      };

      const initialSeed = await seedPost(initialSeedRequest);
      const initialSeedData = await initialSeed.json();

      expect(initialSeed.status).toBe(200);
      expect(initialSeedData.data.studentsCreated).toBe(3);

      // Step 2: Additional seeding with 2 more students
      const additionalSeedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 5, // Total desired, should create 2 more
          sessionCount: 1, // Additional session
          attendanceRate: 0.8
        })
      };

      const additionalSeed = await seedPost(additionalSeedRequest);
      const additionalSeedData = await additionalSeed.json();

      expect(additionalSeed.status).toBe(200);
      expect(additionalSeedData.data.studentsUsed).toBe(3); // Used existing
      expect(additionalSeedData.data.studentsCreated).toBe(2); // Created new

      // Step 3: Verify total state
      const finalStudents = await User.find({ role: 'student' });
      const finalEnrollments = await Enrollment.find({ classId: testClass._id });
      const finalSessions = await AttendanceSession.find({ classId: testClass._id });

      expect(finalStudents).toHaveLength(5);
      expect(finalEnrollments).toHaveLength(5);
      expect(finalSessions).toHaveLength(3); // 2 + 1 from additional seeding
    });

    it('should maintain data integrity across multiple seeding operations', async () => {
      const seedingOperations = [
        {
          studentCount: 2,
          sessionCount: 1,
          attendanceRate: 1.0
        },
        {
          studentCount: 4,
          sessionCount: 2,
          attendanceRate: 0.5
        },
        {
          studentCount: 6,
          sessionCount: 1,
          attendanceRate: 0.8
        }
      ];

      let totalExpectedStudents = 0;
      let totalExpectedSessions = 0;

      for (const [index, operation] of seedingOperations.entries()) {
        const seedRequest = {
          json: async () => ({
            classId: testClass._id.toString(),
            ...operation
          })
        };

        const seedResponse = await seedPost(seedRequest);
        const seedData = await seedResponse.json();

        expect(seedResponse.status).toBe(200);
        expect(seedData.success).toBe(true);

        // Update expectations
        const newStudents = Math.max(0, operation.studentCount - totalExpectedStudents);
        totalExpectedStudents = Math.max(totalExpectedStudents, operation.studentCount);
        totalExpectedSessions += operation.sessionCount;

        // Verify current state
        const currentStudents = await User.find({ role: 'student' });
        const currentEnrollments = await Enrollment.find({ classId: testClass._id });
        const currentSessions = await AttendanceSession.find({ classId: testClass._id });

        expect(currentStudents).toHaveLength(totalExpectedStudents);
        expect(currentEnrollments).toHaveLength(totalExpectedStudents);
        expect(currentSessions).toHaveLength(totalExpectedSessions);

        // Verify no duplicate enrollments
        const enrollmentStudentIds = currentEnrollments.map(e => e.studentId.toString());
        const uniqueEnrollmentIds = [...new Set(enrollmentStudentIds)];
        expect(uniqueEnrollmentIds).toHaveLength(enrollmentStudentIds.length);

        // Verify no duplicate student emails
        const studentEmails = currentStudents.map(s => s.email);
        const uniqueEmails = [...new Set(studentEmails)];
        expect(uniqueEmails).toHaveLength(studentEmails.length);
      }

      // Final integrity check
      const finalCheck = await debugGet({
        url: `http://localhost:3000/api/debug/attendance?classId=${testClass._id}&action=check`
      });
      const finalData = await finalCheck.json();

      expect(finalData.success).toBe(true);
      expect(finalData.data.enrollmentInfo.count).toBe(6);
      expect(finalData.data.sessionInfo.total).toBe(4);
      expect(finalData.data.recommendations).toContain('Data looks healthy!');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle partial failures gracefully', async () => {
      // Create a scenario where some operations might fail
      // First, create some students manually
      const existingStudents = await User.insertMany([
        {
          name: 'Existing Student 1',
          email: 'existing1@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        },
        {
          name: 'Existing Student 2',
          email: 'existing2@test.com',
          passwordHash: 'hashedpassword',
          role: 'student',
          isActive: true
        }
      ]);

      // Mock a failure in enrollment creation for one student
      const originalCreate = Enrollment.create;
      let createCallCount = 0;
      
      Enrollment.create = vi.fn().mockImplementation(async (data) => {
        createCallCount++;
        if (createCallCount === 2) {
          throw new Error('Simulated enrollment failure');
        }
        return originalCreate.call(Enrollment, data);
      });

      const seedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 2,
          sessionCount: 1,
          attendanceRate: 0.8
        })
      };

      const seedResponse = await seedPost(seedRequest);
      const seedData = await seedResponse.json();

      // Should still succeed with partial results
      expect(seedResponse.status).toBe(200);
      expect(seedData.success).toBe(true);

      // Verify partial enrollment creation
      const enrollments = await Enrollment.find({ classId: testClass._id });
      expect(enrollments.length).toBeLessThan(2); // Some failed

      // Restore original method
      Enrollment.create = originalCreate;
    });

    it('should handle concurrent seeding operations', async () => {
      // Create multiple concurrent seeding requests
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => ({
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 2 + i,
          sessionCount: 1,
          attendanceRate: 0.8
        })
      }));

      // Execute all requests concurrently
      const responses = await Promise.all(
        concurrentRequests.map(request => seedPost(request))
      );

      // All should succeed
      const results = await Promise.all(
        responses.map(response => response.json())
      );

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify final state is consistent
      const finalStudents = await User.find({ role: 'student' });
      const finalEnrollments = await Enrollment.find({ classId: testClass._id });
      const finalSessions = await AttendanceSession.find({ classId: testClass._id });

      // Should have maximum requested students (4 from last request)
      expect(finalStudents.length).toBeGreaterThan(0);
      expect(finalEnrollments.length).toBeGreaterThan(0);
      expect(finalSessions.length).toBeGreaterThan(0);

      // Verify no duplicates
      const studentEmails = finalStudents.map(s => s.email);
      const uniqueEmails = [...new Set(studentEmails)];
      expect(uniqueEmails).toHaveLength(studentEmails.length);
    });

    it('should handle large-scale seeding efficiently', async () => {
      const startTime = Date.now();

      const largeSeedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 50,
          sessionCount: 10,
          attendanceRate: 0.7
        })
      };

      const seedResponse = await seedPost(largeSeedRequest);
      const seedData = await seedResponse.json();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(seedResponse.status).toBe(200);
      expect(seedData.success).toBe(true);
      expect(seedData.data.studentsCreated).toBe(50);
      expect(seedData.data.sessionsCreated).toBe(10);

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(30000); // 30 seconds

      // Verify data integrity at scale
      const students = await User.find({ role: 'student' });
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const records = await AttendanceRecord.find({});

      expect(students).toHaveLength(50);
      expect(enrollments).toHaveLength(50);
      expect(sessions).toHaveLength(10);
      expect(records.length).toBeGreaterThan(0);

      // Verify all students have unique emails
      const emails = students.map(s => s.email);
      const uniqueEmails = [...new Set(emails)];
      expect(uniqueEmails).toHaveLength(50);

      // Verify attendance records are reasonable
      const expectedRecords = 50 * 10 * 0.7; // students * sessions * rate
      expect(records.length).toBeGreaterThanOrEqual(expectedRecords * 0.5);
      expect(records.length).toBeLessThanOrEqual(expectedRecords * 1.5);
    });
  });

  describe('Data Quality and Validation', () => {
    it('should create realistic and valid test data', async () => {
      const seedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 8,
          sessionCount: 5,
          attendanceRate: 0.75,
          dateRange: {
            startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            endDate: new Date()
          }
        })
      };

      const seedResponse = await seedPost(seedRequest);
      const seedData = await seedResponse.json();

      expect(seedResponse.status).toBe(200);
      expect(seedData.success).toBe(true);

      // Verify student data quality
      const students = await User.find({ role: 'student' });
      students.forEach(student => {
        expect(student.name).toMatch(/^[A-Za-z]+ [A-Za-z]+$/); // First Last format
        expect(student.email).toMatch(/^[a-z]+\.[a-z]+\d*@test\.edu$/); // Valid email format
        expect(student.role).toBe('student');
        expect(student.isActive).toBe(true);
        expect(student.passwordHash).toBeDefined();
      });

      // Verify enrollment data quality
      const enrollments = await Enrollment.find({ classId: testClass._id });
      enrollments.forEach(enrollment => {
        expect(enrollment.classId.toString()).toBe(testClass._id.toString());
        expect(enrollment.isActive).toBe(true);
        expect(enrollment.enrolledAt).toBeInstanceOf(Date);
        expect(enrollment.enrolledAt.getTime()).toBeLessThanOrEqual(Date.now());
      });

      // Verify session data quality
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      sessions.forEach(session => {
        expect(session.classId.toString()).toBe(testClass._id.toString());
        expect(session.sessionToken).toBeDefined();
        expect(session.sessionToken.length).toBeGreaterThan(10);
        expect(session.expiresAt).toBeInstanceOf(Date);
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 14 * 24 * 60 * 60 * 1000);
        expect(session.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      });

      // Verify attendance record data quality
      const records = await AttendanceRecord.find({});
      records.forEach(record => {
        expect(record.sessionId).toBeDefined();
        expect(record.studentId).toBeDefined();
        expect(record.markedAt).toBeInstanceOf(Date);
        expect(record.studentLocation).toBeDefined();
        expect(record.studentLocation.lat).toBeCloseTo(testClass.location.lat, 2);
        expect(record.studentLocation.lng).toBeCloseTo(testClass.location.lng, 2);
      });

      // Verify attendance rate is approximately correct
      const expectedRecords = 8 * 5 * 0.75; // 30 records
      expect(records.length).toBeGreaterThanOrEqual(expectedRecords * 0.7);
      expect(records.length).toBeLessThanOrEqual(expectedRecords * 1.3);
    });

    it('should maintain referential integrity', async () => {
      const seedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 6,
          sessionCount: 4,
          attendanceRate: 0.8
        })
      };

      await seedPost(seedRequest);

      // Get all data
      const students = await User.find({ role: 'student' });
      const enrollments = await Enrollment.find({ classId: testClass._id });
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const records = await AttendanceRecord.find({});

      // Verify all enrollments reference valid students and classes
      for (const enrollment of enrollments) {
        const student = students.find(s => s._id.toString() === enrollment.studentId.toString());
        expect(student).toBeDefined();
        expect(enrollment.classId.toString()).toBe(testClass._id.toString());
      }

      // Verify all sessions reference valid classes
      for (const session of sessions) {
        expect(session.classId.toString()).toBe(testClass._id.toString());
      }

      // Verify all attendance records reference valid sessions and students
      for (const record of records) {
        const session = sessions.find(s => s._id.toString() === record.sessionId.toString());
        const student = students.find(s => s._id.toString() === record.studentId.toString());
        
        expect(session).toBeDefined();
        expect(student).toBeDefined();
        
        // Verify student is enrolled in the class
        const enrollment = enrollments.find(e => 
          e.studentId.toString() === record.studentId.toString() &&
          e.classId.toString() === testClass._id.toString()
        );
        expect(enrollment).toBeDefined();
      }
    });

    it('should create diverse and realistic attendance patterns', async () => {
      const seedRequest = {
        json: async () => ({
          classId: testClass._id.toString(),
          studentCount: 10,
          sessionCount: 8,
          attendanceRate: 0.7
        })
      };

      await seedPost(seedRequest);

      const records = await AttendanceRecord.find({});
      const sessions = await AttendanceSession.find({ classId: testClass._id });
      const students = await User.find({ role: 'student' });

      // Analyze attendance patterns
      const attendanceByStudent = {};
      const attendanceBySession = {};

      records.forEach(record => {
        const studentId = record.studentId.toString();
        const sessionId = record.sessionId.toString();

        attendanceByStudent[studentId] = (attendanceByStudent[studentId] || 0) + 1;
        attendanceBySession[sessionId] = (attendanceBySession[sessionId] || 0) + 1;
      });

      // Verify attendance distribution
      const studentAttendanceCounts = Object.values(attendanceByStudent);
      const sessionAttendanceCounts = Object.values(attendanceBySession);

      // Should have some variation in attendance (not all students attend all sessions)
      expect(Math.max(...studentAttendanceCounts)).toBeGreaterThan(Math.min(...studentAttendanceCounts));
      expect(Math.max(...sessionAttendanceCounts)).toBeGreaterThan(Math.min(...sessionAttendanceCounts));

      // Overall attendance rate should be approximately correct
      const totalPossibleAttendance = students.length * sessions.length;
      const actualAttendanceRate = records.length / totalPossibleAttendance;
      expect(actualAttendanceRate).toBeGreaterThan(0.5);
      expect(actualAttendanceRate).toBeLessThan(0.9);
    });
  });
});