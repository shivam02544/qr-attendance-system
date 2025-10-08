import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Import models
import User from '../../models/User.js';
import Class from '../../models/Class.js';
import Enrollment from '../../models/Enrollment.js';
import AttendanceSession from '../../models/AttendanceSession.js';
import AttendanceRecord from '../../models/AttendanceRecord.js';

// Import API handlers
import { POST as registerHandler } from '../../app/api/auth/register/route.js';
import { GET as teacherClassesGet, POST as teacherClassesPost } from '../../app/api/teacher/classes/route.js';
import { POST as createSessionHandler } from '../../app/api/teacher/classes/[id]/session/route.js';
import { GET as studentClassesHandler } from '../../app/api/student/classes/route.js';
import { POST as enrollHandler } from '../../app/api/student/enroll/route.js';
import { POST as markAttendanceHandler } from '../../app/api/student/attendance/route.js';
import { GET as adminDashboardHandler } from '../../app/api/admin/dashboard/route.js';
import { GET as adminUsersHandler, POST as adminCreateUserHandler } from '../../app/api/admin/users/route.js';
import { GET as adminReportsHandler } from '../../app/api/admin/reports/route.js';

// Import utilities
import { calculateDistance } from '../../lib/location.js';

describe('Final Integration Tests - Complete System Validation', () => {
  let mongoServer;
  let teacherUser, studentUser, adminUser;
  let testClass;
  let attendanceSession;

  beforeEach(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    teacherUser = await User.create({
      email: 'teacher@test.com',
      name: 'Test Teacher',
      role: 'teacher',
      passwordHash: hashedPassword,
      isActive: true
    });

    studentUser = await User.create({
      email: 'student@test.com',
      name: 'Test Student',
      role: 'student',
      passwordHash: hashedPassword,
      isActive: true
    });

    adminUser = await User.create({
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'admin',
      passwordHash: hashedPassword,
      isActive: true
    });

    // Mock NextAuth session
    vi.mock('next-auth/next', () => ({
      getServerSession: vi.fn()
    }));
  });

  afterEach(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    vi.clearAllMocks();
  });

  describe('Complete Teacher Workflow Integration', () => {
    it('should execute complete teacher workflow: create class → generate QR → view reports', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock teacher session
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      // Step 1: Teacher creates a class
      const createClassRequest = new NextRequest('http://localhost:3000/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Advanced Mathematics',
          subject: 'Mathematics',
          location: {
            lat: 40.7128,
            lng: -74.0060,
            name: 'Room 101, Mathematics Building'
          }
        })
      });

      const createClassResponse = await teacherClassesPost(createClassRequest);
      expect(createClassResponse.status).toBe(201);
      
      const classData = await createClassResponse.json();
      expect(classData.success).toBe(true);
      expect(classData.class.name).toBe('Advanced Mathematics');
      expect(classData.class.teacherId.toString()).toBe(teacherUser._id.toString());
      
      testClass = await Class.findById(classData.class._id);
      expect(testClass).toBeTruthy();
      expect(testClass.location.lat).toBe(40.7128);
      expect(testClass.location.lng).toBe(-74.0060);

      // Step 2: Teacher generates QR code for attendance
      const createSessionRequest = new NextRequest(`http://localhost:3000/api/teacher/classes/${testClass._id}/session`, {
        method: 'POST',
        body: JSON.stringify({})
      });

      const createSessionResponse = await createSessionHandler(createSessionRequest, {
        params: { id: testClass._id.toString() }
      });
      expect(createSessionResponse.status).toBe(201);
      
      const sessionData = await createSessionResponse.json();
      expect(sessionData.success).toBe(true);
      expect(sessionData.session.sessionToken).toBeTruthy();
      expect(sessionData.qrData).toBeTruthy();

      attendanceSession = await AttendanceSession.findById(sessionData.session._id);
      expect(attendanceSession.isActive).toBe(true);
      expect(attendanceSession.classId.toString()).toBe(testClass._id.toString());

      // Verify QR data structure
      const qrData = JSON.parse(sessionData.qrData);
      expect(qrData.sessionToken).toBe(attendanceSession.sessionToken);
      expect(qrData.classId).toBe(testClass._id.toString());
      expect(qrData.className).toBe('Advanced Mathematics');
      expect(qrData.location.lat).toBe(40.7128);
      expect(qrData.location.lng).toBe(-74.0060);
      expect(new Date(qrData.expiresAt)).toBeInstanceOf(Date);

      // Step 3: Teacher views attendance reports
      const { GET: getAttendanceHandler } = await import('../../app/api/teacher/classes/[id]/attendance/route.js');
      const reportsRequest = new NextRequest(`http://localhost:3000/api/teacher/classes/${testClass._id}/attendance`);
      
      const reportsResponse = await getAttendanceHandler(reportsRequest, {
        params: { id: testClass._id.toString() }
      });
      
      expect(reportsResponse.status).toBe(200);
      const reportsData = await reportsResponse.json();
      expect(reportsData.success).toBe(true);
      expect(Array.isArray(reportsData.attendance)).toBe(true);

      console.log('✅ Teacher workflow completed successfully');
    });
  });

  describe('Complete Student Workflow Integration', () => {
    beforeEach(async () => {
      // Create a test class for student workflow
      testClass = await Class.create({
        name: 'Physics Laboratory',
        subject: 'Physics',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Lab 201, Science Building'
        }
      });

      // Create an active attendance session
      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'student-workflow-session-123',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        isActive: true
      });
    });

    it('should execute complete student workflow: register → enroll → scan QR → mark attendance', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock student session
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Step 1: Student views available classes
      const availableClassesRequest = new NextRequest('http://localhost:3000/api/student/classes');
      const availableClassesResponse = await studentClassesHandler(availableClassesRequest);
      
      expect(availableClassesResponse.status).toBe(200);
      const availableClasses = await availableClassesResponse.json();
      expect(availableClasses.success).toBe(true);
      expect(availableClasses.classes).toHaveLength(1);
      expect(availableClasses.classes[0].name).toBe('Physics Laboratory');
      expect(availableClasses.classes[0].subject).toBe('Physics');

      // Step 2: Student enrolls in the class
      const enrollRequest = new NextRequest('http://localhost:3000/api/student/enroll', {
        method: 'POST',
        body: JSON.stringify({
          classId: testClass._id.toString()
        })
      });

      const enrollResponse = await enrollHandler(enrollRequest);
      expect(enrollResponse.status).toBe(201);
      
      const enrollData = await enrollResponse.json();
      expect(enrollData.success).toBe(true);
      expect(enrollData.enrollment.classId.toString()).toBe(testClass._id.toString());
      expect(enrollData.enrollment.studentId.toString()).toBe(studentUser._id.toString());

      // Verify enrollment was created in database
      const enrollment = await Enrollment.findOne({
        studentId: studentUser._id,
        classId: testClass._id
      });
      expect(enrollment).toBeTruthy();
      expect(enrollment.isActive).toBe(true);

      // Step 3: Student scans QR code and marks attendance
      const markAttendanceRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 40.7128, // Same location as classroom
            lng: -74.0060
          }
        })
      });

      const markAttendanceResponse = await markAttendanceHandler(markAttendanceRequest);
      expect(markAttendanceResponse.status).toBe(201);
      
      const attendanceData = await markAttendanceResponse.json();
      expect(attendanceData.success).toBe(true);
      expect(attendanceData.message).toBe('Attendance marked successfully');

      // Verify attendance record was created
      const attendanceRecord = await AttendanceRecord.findOne({
        sessionId: attendanceSession._id,
        studentId: studentUser._id
      });
      expect(attendanceRecord).toBeTruthy();
      expect(attendanceRecord.studentLocation.lat).toBe(40.7128);
      expect(attendanceRecord.studentLocation.lng).toBe(-74.0060);
      expect(attendanceRecord.markedAt).toBeInstanceOf(Date);

      // Step 4: Verify duplicate attendance prevention
      const duplicateAttendanceRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        })
      });

      const duplicateResponse = await markAttendanceHandler(duplicateAttendanceRequest);
      expect(duplicateResponse.status).toBe(400);
      
      const duplicateData = await duplicateResponse.json();
      expect(duplicateData.success).toBe(false);
      expect(duplicateData.message).toBe('Attendance already marked for this session');

      console.log('✅ Student workflow completed successfully');
    });
  });

  describe('Complete Admin Workflow Integration', () => {
    beforeEach(async () => {
      // Create comprehensive test data for admin to manage
      testClass = await Class.create({
        name: 'Chemistry Laboratory',
        subject: 'Chemistry',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Lab 301, Chemistry Building'
        }
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'admin-workflow-session',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      await AttendanceRecord.create({
        sessionId: attendanceSession._id,
        studentId: studentUser._id,
        studentLocation: {
          lat: 40.7128,
          lng: -74.0060
        }
      });
    });

    it('should execute complete admin workflow: view system data → manage users → generate reports', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock admin session
      getServerSession.mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' }
      });

      // Step 1: Admin views system dashboard
      const dashboardRequest = new NextRequest('http://localhost:3000/api/admin/dashboard');
      const dashboardResponse = await adminDashboardHandler(dashboardRequest);
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      expect(dashboardData.success).toBe(true);
      expect(dashboardData.stats.totalUsers).toBe(3); // teacher, student, admin
      expect(dashboardData.stats.totalClasses).toBe(1);
      expect(dashboardData.stats.totalAttendanceRecords).toBe(1);
      expect(dashboardData.stats.activeUsers).toBe(3);
      expect(dashboardData.stats.activeSessions).toBe(1);

      // Step 2: Admin views all users
      const usersRequest = new NextRequest('http://localhost:3000/api/admin/users');
      const usersResponse = await adminUsersHandler(usersRequest);
      
      expect(usersResponse.status).toBe(200);
      const usersData = await usersResponse.json();
      expect(usersData.success).toBe(true);
      expect(usersData.users).toHaveLength(3);
      
      const roles = usersData.users.map(user => user.role);
      expect(roles).toContain('teacher');
      expect(roles).toContain('student');
      expect(roles).toContain('admin');

      // Step 3: Admin creates a new user
      const newUserRequest = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newteacher@test.com',
          name: 'New Teacher',
          role: 'teacher',
          password: 'newpassword123'
        })
      });

      const newUserResponse = await adminCreateUserHandler(newUserRequest);
      expect(newUserResponse.status).toBe(201);
      
      const newUserData = await newUserResponse.json();
      expect(newUserData.success).toBe(true);
      expect(newUserData.user.email).toBe('newteacher@test.com');
      expect(newUserData.user.role).toBe('teacher');
      expect(newUserData.user.isActive).toBe(true);

      // Verify user was created in database
      const createdUser = await User.findById(newUserData.user._id);
      expect(createdUser).toBeTruthy();
      expect(createdUser.passwordHash).toBeTruthy();

      // Step 4: Admin manages existing users
      const { PUT: updateUserHandler } = await import('../../app/api/admin/users/[id]/route.js');
      
      const deactivateRequest = new NextRequest(`http://localhost:3000/api/admin/users/${studentUser._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: false
        })
      });

      const deactivateResponse = await updateUserHandler(deactivateRequest, {
        params: { id: studentUser._id.toString() }
      });
      
      expect(deactivateResponse.status).toBe(200);
      const deactivateData = await deactivateResponse.json();
      expect(deactivateData.success).toBe(true);
      expect(deactivateData.user.isActive).toBe(false);

      // Step 5: Admin generates comprehensive reports
      const reportsRequest = new NextRequest('http://localhost:3000/api/admin/reports');
      const reportsResponse = await adminReportsHandler(reportsRequest);
      
      expect(reportsResponse.status).toBe(200);
      const reportsData = await reportsResponse.json();
      expect(reportsData.success).toBe(true);
      expect(reportsData.reports.attendanceByClass).toHaveLength(1);
      expect(reportsData.reports.attendanceByClass[0].className).toBe('Chemistry Laboratory');
      expect(reportsData.reports.attendanceByClass[0].totalSessions).toBe(1);
      expect(reportsData.reports.attendanceByClass[0].totalAttendance).toBe(1);

      console.log('✅ Admin workflow completed successfully');
    });
  });

  describe('Location Verification Accuracy Tests', () => {
    it('should accurately verify location proximity', () => {
      // Test exact same location (0 meters)
      const distance1 = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance1).toBe(0);

      // Test very close location (~10 meters)
      const distance2 = calculateDistance(40.7128, -74.0060, 40.71281, -74.00601);
      expect(distance2).toBeLessThan(20);
      expect(distance2).toBeGreaterThan(0);

      // Test medium distance (~100 meters)
      const distance3 = calculateDistance(40.7128, -74.0060, 40.7138, -74.0060);
      expect(distance3).toBeGreaterThan(90);
      expect(distance3).toBeLessThan(120);

      // Test far distance (~1 km)
      const distance4 = calculateDistance(40.7128, -74.0060, 40.7218, -74.0060);
      expect(distance4).toBeGreaterThan(900);
      expect(distance4).toBeLessThan(1100);

      // Test cross-country distance (NY to LA)
      const distance5 = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance5).toBeGreaterThan(3900000); // ~3900 km
      expect(distance5).toBeLessThan(4000000);
    });

    it('should handle location verification in attendance marking', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Setup test data
      testClass = await Class.create({
        name: 'Location Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Test Location'
        }
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'location-test-session',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Test 1: Student within acceptable range (should succeed)
      const nearbyRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 40.7129, // ~10 meters away
            lng: -74.0061
          }
        })
      });

      const nearbyResponse = await markAttendanceHandler(nearbyRequest);
      expect(nearbyResponse.status).toBe(201);

      // Clear the attendance record for next test
      await AttendanceRecord.deleteMany({});

      // Test 2: Student too far away (should fail)
      const farRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 34.0522, // Los Angeles (very far)
            lng: -118.2437
          }
        })
      });

      const farResponse = await markAttendanceHandler(farRequest);
      expect(farResponse.status).toBe(400);
      
      const farData = await farResponse.json();
      expect(farData.success).toBe(false);
      expect(farData.message).toContain('too far from the classroom');
    });
  });

  describe('Multiple Concurrent Users Tests', () => {
    it('should handle multiple students marking attendance simultaneously', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Create additional test users
      const hashedPassword = await bcrypt.hash('password123', 12);
      const student2 = await User.create({
        email: 'student2@test.com',
        name: 'Test Student 2',
        role: 'student',
        passwordHash: hashedPassword,
        isActive: true
      });

      const student3 = await User.create({
        email: 'student3@test.com',
        name: 'Test Student 3',
        role: 'student',
        passwordHash: hashedPassword,
        isActive: true
      });

      // Create test class and session
      testClass = await Class.create({
        name: 'Concurrent Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Concurrent Test Room'
        }
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'concurrent-test-session',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      // Enroll all students
      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });
      await Enrollment.create({
        studentId: student2._id,
        classId: testClass._id,
        isActive: true
      });
      await Enrollment.create({
        studentId: student3._id,
        classId: testClass._id,
        isActive: true
      });

      // Simulate concurrent attendance marking
      const attendancePromises = [
        // Student 1
        (async () => {
          getServerSession.mockResolvedValue({
            user: { id: studentUser._id.toString(), role: 'student' }
          });
          const request = new NextRequest('http://localhost:3000/api/student/attendance', {
            method: 'POST',
            body: JSON.stringify({
              sessionToken: attendanceSession.sessionToken,
              location: { lat: 40.7128, lng: -74.0060 }
            })
          });
          return await markAttendanceHandler(request);
        })(),
        
        // Student 2
        (async () => {
          getServerSession.mockResolvedValue({
            user: { id: student2._id.toString(), role: 'student' }
          });
          const request = new NextRequest('http://localhost:3000/api/student/attendance', {
            method: 'POST',
            body: JSON.stringify({
              sessionToken: attendanceSession.sessionToken,
              location: { lat: 40.7129, lng: -74.0061 }
            })
          });
          return await markAttendanceHandler(request);
        })(),
        
        // Student 3
        (async () => {
          getServerSession.mockResolvedValue({
            user: { id: student3._id.toString(), role: 'student' }
          });
          const request = new NextRequest('http://localhost:3000/api/student/attendance', {
            method: 'POST',
            body: JSON.stringify({
              sessionToken: attendanceSession.sessionToken,
              location: { lat: 40.7127, lng: -74.0059 }
            })
          });
          return await markAttendanceHandler(request);
        })()
      ];

      // Wait for all attendance attempts
      const responses = await Promise.all(attendancePromises);

      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
      });

      // Verify all attendance records were created
      const attendanceRecords = await AttendanceRecord.find({
        sessionId: attendanceSession._id
      });
      expect(attendanceRecords).toHaveLength(3);

      // Verify each student has exactly one record
      const studentIds = attendanceRecords.map(record => record.studentId.toString());
      expect(studentIds).toContain(studentUser._id.toString());
      expect(studentIds).toContain(student2._id.toString());
      expect(studentIds).toContain(student3._id.toString());

      console.log('✅ Concurrent users test completed successfully');
    });

    it('should prevent race conditions in duplicate attendance marking', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Create test class and session
      testClass = await Class.create({
        name: 'Race Condition Test',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Race Test Room'
        }
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'race-condition-test',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      // Mock student session
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Simulate multiple simultaneous requests from the same student
      const duplicatePromises = Array(5).fill().map(() => {
        const request = new NextRequest('http://localhost:3000/api/student/attendance', {
          method: 'POST',
          body: JSON.stringify({
            sessionToken: attendanceSession.sessionToken,
            location: { lat: 40.7128, lng: -74.0060 }
          })
        });
        return markAttendanceHandler(request);
      });

      const responses = await Promise.all(duplicatePromises);

      // Only one should succeed (201), others should fail (400)
      const successCount = responses.filter(r => r.status === 201).length;
      const failureCount = responses.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(4);

      // Verify only one attendance record was created
      const attendanceRecords = await AttendanceRecord.find({
        sessionId: attendanceSession._id,
        studentId: studentUser._id
      });
      expect(attendanceRecords).toHaveLength(1);

      console.log('✅ Race condition prevention test completed successfully');
    });
  });

  describe('Error Scenario Handling Tests', () => {
    it('should handle all error scenarios gracefully', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Test 1: Expired session
      testClass = await Class.create({
        name: 'Error Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Error Test Room'
        }
      });

      const expiredSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'expired-session-token',
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        isActive: true
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      const expiredRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: expiredSession.sessionToken,
          location: { lat: 40.7128, lng: -74.0060 }
        })
      });

      const expiredResponse = await markAttendanceHandler(expiredRequest);
      expect(expiredResponse.status).toBe(400);
      
      const expiredData = await expiredResponse.json();
      expect(expiredData.success).toBe(false);
      expect(expiredData.message).toContain('expired');

      // Test 2: Non-enrolled student
      const nonEnrolledSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'non-enrolled-test',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      // Create a new student who is not enrolled
      const hashedPassword = await bcrypt.hash('password123', 12);
      const nonEnrolledStudent = await User.create({
        email: 'nonenrolled@test.com',
        name: 'Non-enrolled Student',
        role: 'student',
        passwordHash: hashedPassword,
        isActive: true
      });

      getServerSession.mockResolvedValue({
        user: { id: nonEnrolledStudent._id.toString(), role: 'student' }
      });

      const nonEnrolledRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: nonEnrolledSession.sessionToken,
          location: { lat: 40.7128, lng: -74.0060 }
        })
      });

      const nonEnrolledResponse = await markAttendanceHandler(nonEnrolledRequest);
      expect(nonEnrolledResponse.status).toBe(400);
      
      const nonEnrolledData = await nonEnrolledResponse.json();
      expect(nonEnrolledData.success).toBe(false);
      expect(nonEnrolledData.message).toContain('not enrolled');

      // Test 3: Invalid session token
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      const invalidTokenRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: 'invalid-session-token-12345',
          location: { lat: 40.7128, lng: -74.0060 }
        })
      });

      const invalidTokenResponse = await markAttendanceHandler(invalidTokenRequest);
      expect(invalidTokenResponse.status).toBe(400);
      
      const invalidTokenData = await invalidTokenResponse.json();
      expect(invalidTokenData.success).toBe(false);
      expect(invalidTokenData.message).toContain('Invalid or expired session');

      console.log('✅ Error scenario handling tests completed successfully');
    });

    it('should handle unauthorized access attempts', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Test unauthorized teacher access to admin endpoints
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      const unauthorizedAdminRequest = new NextRequest('http://localhost:3000/api/admin/dashboard');
      const unauthorizedResponse = await adminDashboardHandler(unauthorizedAdminRequest);
      
      expect(unauthorizedResponse.status).toBe(403);
      const unauthorizedData = await unauthorizedResponse.json();
      expect(unauthorizedData.success).toBe(false);
      expect(unauthorizedData.message).toContain('Access denied');

      console.log('✅ Authorization tests completed successfully');
    });
  });

  describe('System Integration Validation', () => {
    it('should validate complete system integration with all requirements', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Create a comprehensive test scenario
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      // Create additional users for comprehensive testing
      const teacher2 = await User.create({
        email: 'teacher2@test.com',
        name: 'Second Teacher',
        role: 'teacher',
        passwordHash: hashedPassword,
        isActive: true
      });

      const student2 = await User.create({
        email: 'student2@test.com',
        name: 'Second Student',
        role: 'student',
        passwordHash: hashedPassword,
        isActive: true
      });

      // Teacher 1 creates a class
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      const class1 = await Class.create({
        name: 'Integration Test Class 1',
        subject: 'Computer Science',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'CS Lab 1'
        }
      });

      // Teacher 2 creates another class
      getServerSession.mockResolvedValue({
        user: { id: teacher2._id.toString(), role: 'teacher' }
      });

      const class2 = await Class.create({
        name: 'Integration Test Class 2',
        subject: 'Data Science',
        teacherId: teacher2._id,
        location: {
          lat: 40.7130,
          lng: -74.0062,
          name: 'DS Lab 1'
        }
      });

      // Students enroll in classes
      await Enrollment.create({
        studentId: studentUser._id,
        classId: class1._id,
        isActive: true
      });

      await Enrollment.create({
        studentId: student2._id,
        classId: class1._id,
        isActive: true
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: class2._id,
        isActive: true
      });

      // Create attendance sessions
      const session1 = await AttendanceSession.create({
        classId: class1._id,
        sessionToken: 'integration-session-1',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      const session2 = await AttendanceSession.create({
        classId: class2._id,
        sessionToken: 'integration-session-2',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      // Students mark attendance
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Student 1 attends both classes
      await AttendanceRecord.create({
        sessionId: session1._id,
        studentId: studentUser._id,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await AttendanceRecord.create({
        sessionId: session2._id,
        studentId: studentUser._id,
        studentLocation: { lat: 40.7130, lng: -74.0062 }
      });

      // Student 2 attends only class 1
      await AttendanceRecord.create({
        sessionId: session1._id,
        studentId: student2._id,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      // Admin validates system state
      getServerSession.mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' }
      });

      const finalDashboardRequest = new NextRequest('http://localhost:3000/api/admin/dashboard');
      const finalDashboardResponse = await adminDashboardHandler(finalDashboardRequest);
      
      expect(finalDashboardResponse.status).toBe(200);
      const finalDashboardData = await finalDashboardResponse.json();
      expect(finalDashboardData.success).toBe(true);
      expect(finalDashboardData.stats.totalUsers).toBe(5); // 2 teachers, 2 students, 1 admin
      expect(finalDashboardData.stats.totalClasses).toBe(2);
      expect(finalDashboardData.stats.totalAttendanceRecords).toBe(3);
      expect(finalDashboardData.stats.activeSessions).toBe(2);

      // Validate reports
      const finalReportsRequest = new NextRequest('http://localhost:3000/api/admin/reports');
      const finalReportsResponse = await adminReportsHandler(finalReportsRequest);
      
      expect(finalReportsResponse.status).toBe(200);
      const finalReportsData = await finalReportsResponse.json();
      expect(finalReportsData.success).toBe(true);
      expect(finalReportsData.reports.attendanceByClass).toHaveLength(2);

      console.log('✅ Complete system integration validation completed successfully');
    });
  });
});