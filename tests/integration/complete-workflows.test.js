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
import { generateQRData } from '../../lib/qrcode.js';

describe('Complete Workflow Integration Tests', () => {
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

  describe('Complete Teacher Workflow', () => {
    it('should complete full teacher workflow: create class → generate QR → view reports', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock teacher session
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      // Step 1: Teacher creates a class
      const createClassRequest = new NextRequest('http://localhost:3000/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Mathematics 101',
          subject: 'Mathematics',
          location: {
            lat: 40.7128,
            lng: -74.0060,
            name: 'Room 101, Main Building'
          }
        })
      });

      const createClassResponse = await teacherClassesPost(createClassRequest);
      expect(createClassResponse.status).toBe(201);
      
      const classData = await createClassResponse.json();
      expect(classData.success).toBe(true);
      expect(classData.class.name).toBe('Mathematics 101');
      
      testClass = await Class.findById(classData.class._id);
      expect(testClass).toBeTruthy();

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

      // Step 3: Verify QR data contains correct information
      const qrData = JSON.parse(sessionData.qrData);
      expect(qrData.sessionToken).toBe(attendanceSession.sessionToken);
      expect(qrData.classId).toBe(testClass._id.toString());
      expect(qrData.className).toBe('Mathematics 101');
      expect(qrData.location.lat).toBe(40.7128);
      expect(qrData.location.lng).toBe(-74.0060);

      // Step 4: Teacher views attendance reports (initially empty)
      const reportsRequest = new NextRequest(`http://localhost:3000/api/teacher/classes/${testClass._id}/attendance`);
      
      const { GET: getAttendanceHandler } = await import('../../app/api/teacher/classes/[id]/attendance/route.js');
      const reportsResponse = await getAttendanceHandler(reportsRequest, {
        params: { id: testClass._id.toString() }
      });
      
      expect(reportsResponse.status).toBe(200);
      const reportsData = await reportsResponse.json();
      expect(reportsData.success).toBe(true);
      expect(reportsData.attendance).toEqual([]);
    });
  });

  describe('Complete Student Workflow', () => {
    beforeEach(async () => {
      // Create a test class for student workflow
      testClass = await Class.create({
        name: 'Physics 101',
        subject: 'Physics',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 201, Science Building'
        }
      });

      // Create an active attendance session
      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'test-session-token-123',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        isActive: true
      });
    });

    it('should complete full student workflow: register → enroll → scan QR → mark attendance', async () => {
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
      expect(availableClasses.classes[0].name).toBe('Physics 101');

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

      // Verify enrollment was created
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

      // Step 4: Verify student cannot mark attendance twice
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
    });

    it('should reject attendance when student is too far from classroom', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock student session
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Enroll student first
      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      // Try to mark attendance from a distant location (Los Angeles)
      const markAttendanceRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 34.0522, // Los Angeles coordinates
            lng: -118.2437
          }
        })
      });

      const markAttendanceResponse = await markAttendanceHandler(markAttendanceRequest);
      expect(markAttendanceResponse.status).toBe(400);
      
      const attendanceData = await markAttendanceResponse.json();
      expect(attendanceData.success).toBe(false);
      expect(attendanceData.message).toContain('too far from the classroom');

      // Verify no attendance record was created
      const attendanceRecord = await AttendanceRecord.findOne({
        sessionId: attendanceSession._id,
        studentId: studentUser._id
      });
      expect(attendanceRecord).toBeFalsy();
    });
  });

  describe('Complete Admin Workflow', () => {
    beforeEach(async () => {
      // Create test data for admin to view
      testClass = await Class.create({
        name: 'Chemistry 101',
        subject: 'Chemistry',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 301, Science Building'
        }
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'admin-test-session',
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

    it('should complete full admin workflow: view system data → manage users → generate reports', async () => {
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

      // Verify user was created in database
      const createdUser = await User.findById(newUserData.user._id);
      expect(createdUser).toBeTruthy();
      expect(createdUser.isActive).toBe(true);

      // Step 4: Admin generates comprehensive reports
      const reportsRequest = new NextRequest('http://localhost:3000/api/admin/reports');
      const reportsResponse = await adminReportsHandler(reportsRequest);
      
      expect(reportsResponse.status).toBe(200);
      const reportsData = await reportsResponse.json();
      expect(reportsData.success).toBe(true);
      expect(reportsData.reports.attendanceByClass).toHaveLength(1);
      expect(reportsData.reports.attendanceByClass[0].className).toBe('Chemistry 101');
      expect(reportsData.reports.attendanceByClass[0].totalSessions).toBe(1);
      expect(reportsData.reports.attendanceByClass[0].totalAttendance).toBe(1);
    });

    it('should handle user management operations correctly', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock admin session
      getServerSession.mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' }
      });

      // Test user deactivation
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

      // Verify user was deactivated in database
      const updatedUser = await User.findById(studentUser._id);
      expect(updatedUser.isActive).toBe(false);

      // Test user reactivation
      const reactivateRequest = new NextRequest(`http://localhost:3000/api/admin/users/${studentUser._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: true
        })
      });

      const reactivateResponse = await updateUserHandler(reactivateRequest, {
        params: { id: studentUser._id.toString() }
      });
      
      expect(reactivateResponse.status).toBe(200);
      const reactivateData = await reactivateResponse.json();
      expect(reactivateData.success).toBe(true);
      expect(reactivateData.user.isActive).toBe(true);
    });
  });

  describe('Location Verification Accuracy', () => {
    it('should accurately calculate distances and verify proximity', () => {
      // Test exact same location
      const distance1 = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance1).toBe(0);

      // Test known distance (approximately 1 km)
      const distance2 = calculateDistance(40.7128, -74.0060, 40.7218, -74.0060);
      expect(distance2).toBeGreaterThan(900);
      expect(distance2).toBeLessThan(1100);

      // Test cross-country distance (NY to LA)
      const distance3 = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance3).toBeGreaterThan(3900000); // ~3900 km
      expect(distance3).toBeLessThan(4000000);

      // Test proximity verification
      const classLocation = { lat: 40.7128, lng: -74.0060 };
      const nearbyLocation = { lat: 40.7130, lng: -74.0062 }; // ~30 meters away
      const farLocation = { lat: 40.7200, lng: -74.0060 }; // ~800 meters away

      const nearbyDistance = calculateDistance(
        classLocation.lat, classLocation.lng,
        nearbyLocation.lat, nearbyLocation.lng
      );
      expect(nearbyDistance).toBeLessThan(100); // Within 100 meters

      const farDistance = calculateDistance(
        classLocation.lat, classLocation.lng,
        farLocation.lat, farLocation.lng
      );
      expect(farDistance).toBeGreaterThan(500); // More than 500 meters
    });

    it('should handle edge cases in location verification', () => {
      // Test with invalid coordinates
      expect(() => {
        calculateDistance(null, -74.0060, 40.7128, -74.0060);
      }).toThrow();

      expect(() => {
        calculateDistance(40.7128, null, 40.7128, -74.0060);
      }).toThrow();

      // Test with extreme coordinates
      const distance = calculateDistance(90, 180, -90, -180);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(25000000); // Less than Earth's circumference
    });
  });

  describe('Multiple Concurrent Users', () => {
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
          name: 'Test Room'
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
      responses.forEach(response => {
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
          name: 'Test Room'
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
    });
  });

  describe('Error Scenario Handling', () => {
    it('should handle expired session gracefully', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Create expired session
      testClass = await Class.create({
        name: 'Expired Session Test',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Test Room'
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

      const request = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: expiredSession.sessionToken,
          location: { lat: 40.7128, lng: -74.0060 }
        })
      });

      const response = await markAttendanceHandler(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('expired');
    });

    it('should handle non-enrolled student gracefully', async () => {
      const { getServerSession } = await import('next-auth/next');

      testClass = await Class.create({
        name: 'Non-enrolled Test',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Test Room'
        }
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'non-enrolled-test',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true
      });

      // Don't create enrollment for student

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

      const response = await markAttendanceHandler(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('not enrolled');
    });

    it('should handle invalid session token gracefully', async () => {
      const { getServerSession } = await import('next-auth/next');

      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      const request = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: 'invalid-session-token',
          location: { lat: 40.7128, lng: -74.0060 }
        })
      });

      const response = await markAttendanceHandler(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid or expired session');
    });

    it('should handle missing location data gracefully', async () => {
      const { getServerSession } = await import('next-auth/next');

      testClass = await Class.create({
        name: 'Missing Location Test',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Test Room'
        }
      });

      attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'missing-location-test',
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

      const request = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken
          // Missing location data
        })
      });

      const response = await markAttendanceHandler(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Location is required');
    });
  });
});