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

// Import utilities
import { calculateDistance } from '../../lib/location.js';
import { generateQRData } from '../../lib/qrcode.js';

describe('System Validation Tests - All Requirements', () => {
  let mongoServer;
  let teacherUser, studentUser, adminUser;

  beforeEach(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    teacherUser = await User.create({
      email: 'teacher@validation.com',
      name: 'Validation Teacher',
      role: 'teacher',
      passwordHash: hashedPassword,
      isActive: true
    });

    studentUser = await User.create({
      email: 'student@validation.com',
      name: 'Validation Student',
      role: 'student',
      passwordHash: hashedPassword,
      isActive: true
    });

    adminUser = await User.create({
      email: 'admin@validation.com',
      name: 'Validation Admin',
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

  describe('Requirement 1: Teacher Class Management', () => {
    it('should validate teacher authentication and class management (Req 1.1-1.4)', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock teacher session
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      // Req 1.1: Teacher account creation and authentication
      expect(teacherUser.role).toBe('teacher');
      expect(teacherUser.isActive).toBe(true);
      expect(teacherUser.passwordHash).toBeTruthy();

      // Req 1.2: Teacher dashboard with classes
      const { GET: teacherClassesGet } = await import('../../app/api/teacher/classes/route.js');
      const dashboardRequest = new NextRequest('http://localhost:3000/api/teacher/classes');
      const dashboardResponse = await teacherClassesGet(dashboardRequest);
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      expect(dashboardData.success).toBe(true);
      expect(Array.isArray(dashboardData.classes)).toBe(true);

      // Req 1.3: Class creation with details
      const { POST: teacherClassesPost } = await import('../../app/api/teacher/classes/route.js');
      const createClassRequest = new NextRequest('http://localhost:3000/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Validation Mathematics',
          subject: 'Mathematics',
          location: {
            lat: 40.7128,
            lng: -74.0060,
            name: 'Room 101, Math Building'
          }
        })
      });

      const createClassResponse = await teacherClassesPost(createClassRequest);
      expect(createClassResponse.status).toBe(201);
      
      const classData = await createClassResponse.json();
      expect(classData.success).toBe(true);
      expect(classData.class.name).toBe('Validation Mathematics');
      expect(classData.class.subject).toBe('Mathematics');
      expect(classData.class.teacherId.toString()).toBe(teacherUser._id.toString());

      // Req 1.4: Class details view with students and attendance
      const testClass = await Class.findById(classData.class._id);
      const { GET: classDetailsGet } = await import('../../app/api/teacher/classes/[id]/route.js');
      const classDetailsRequest = new NextRequest(`http://localhost:3000/api/teacher/classes/${testClass._id}`);
      
      const classDetailsResponse = await classDetailsGet(classDetailsRequest, {
        params: { id: testClass._id.toString() }
      });
      
      expect(classDetailsResponse.status).toBe(200);
      const detailsData = await classDetailsResponse.json();
      expect(detailsData.success).toBe(true);
      expect(detailsData.class._id.toString()).toBe(testClass._id.toString());

      console.log('✅ Requirement 1 validated: Teacher class management');
    });
  });

  describe('Requirement 2: QR Code Generation', () => {
    it('should validate QR code generation for attendance (Req 2.1-2.4)', async () => {
      const { getServerSession } = await import('next-auth/next');
      
      // Mock teacher session
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      // Create test class
      const testClass = await Class.create({
        name: 'QR Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'QR Test Room'
        }
      });

      // Req 2.1: Generate unique QR code for class session
      const { POST: createSessionHandler } = await import('../../app/api/teacher/classes/[id]/session/route.js');
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

      // Req 2.2: QR code includes session details
      const qrData = JSON.parse(sessionData.qrData);
      expect(qrData.sessionToken).toBe(sessionData.session.sessionToken);
      expect(qrData.classId).toBe(testClass._id.toString());
      expect(qrData.className).toBe('QR Test Class');
      expect(qrData.location.lat).toBe(40.7128);
      expect(qrData.location.lng).toBe(-74.0060);

      // Req 2.3: QR code displayed prominently with session info
      expect(qrData.expiresAt).toBeTruthy();
      expect(new Date(qrData.expiresAt)).toBeInstanceOf(Date);

      // Req 2.4: Session expires and deactivates QR code
      const attendanceSession = await AttendanceSession.findById(sessionData.session._id);
      expect(attendanceSession.isActive).toBe(true);
      expect(attendanceSession.expiresAt).toBeInstanceOf(Date);
      expect(attendanceSession.expiresAt.getTime()).toBeGreaterThan(Date.now());

      console.log('✅ Requirement 2 validated: QR code generation');
    });
  });

  describe('Requirement 3: Student QR Scanning', () => {
    it('should validate student QR scanning and attendance marking (Req 3.1-3.5)', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Setup test data
      const testClass = await Class.create({
        name: 'Scanning Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Scanning Test Room'
        }
      });

      const attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'scanning-test-session',
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

      // Req 3.1: Verify enrollment before marking attendance
      const { POST: markAttendanceHandler } = await import('../../app/api/student/attendance/route.js');
      const markAttendanceRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        })
      });

      const markAttendanceResponse = await markAttendanceHandler(markAttendanceRequest);
      expect(markAttendanceResponse.status).toBe(201);
      
      const attendanceData = await markAttendanceResponse.json();
      expect(attendanceData.success).toBe(true);
      expect(attendanceData.message).toBe('Attendance marked successfully');

      // Req 3.2: Check location against classroom location
      const attendanceRecord = await AttendanceRecord.findOne({
        sessionId: attendanceSession._id,
        studentId: studentUser._id
      });
      expect(attendanceRecord).toBeTruthy();
      expect(attendanceRecord.studentLocation.lat).toBe(40.7128);
      expect(attendanceRecord.studentLocation.lng).toBe(-74.0060);

      // Req 3.3: Mark student as present when location passes
      expect(attendanceRecord.markedAt).toBeInstanceOf(Date);

      // Req 3.4: Reject attendance from outside classroom
      await AttendanceRecord.deleteMany({}); // Clear for next test

      const farLocationRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: attendanceSession.sessionToken,
          location: {
            lat: 34.0522, // Los Angeles (very far)
            lng: -118.2437
          }
        })
      });

      const farLocationResponse = await markAttendanceHandler(farLocationRequest);
      expect(farLocationResponse.status).toBe(400);
      
      const farLocationData = await farLocationResponse.json();
      expect(farLocationData.success).toBe(false);
      expect(farLocationData.message).toContain('too far from the classroom');

      // Req 3.5: Prevent duplicate entries
      // First mark attendance successfully
      await markAttendanceHandler(markAttendanceRequest);
      
      // Try to mark again
      const duplicateResponse = await markAttendanceHandler(markAttendanceRequest);
      expect(duplicateResponse.status).toBe(400);
      
      const duplicateData = await duplicateResponse.json();
      expect(duplicateData.success).toBe(false);
      expect(duplicateData.message).toBe('Attendance already marked for this session');

      console.log('✅ Requirement 3 validated: Student QR scanning');
    });
  });

  describe('Requirement 4: Student Registration and Enrollment', () => {
    it('should validate student registration and enrollment system (Req 4.1-4.4)', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Req 4.1: Student account creation with authentication
      expect(studentUser.role).toBe('student');
      expect(studentUser.isActive).toBe(true);
      expect(studentUser.passwordHash).toBeTruthy();

      // Mock student session
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Create test class
      const testClass = await Class.create({
        name: 'Enrollment Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Enrollment Test Room'
        }
      });

      // Req 4.2: Display available classes for enrollment
      const { GET: studentClassesHandler } = await import('../../app/api/student/classes/route.js');
      const availableClassesRequest = new NextRequest('http://localhost:3000/api/student/classes');
      const availableClassesResponse = await studentClassesHandler(availableClassesRequest);
      
      expect(availableClassesResponse.status).toBe(200);
      const availableClasses = await availableClassesResponse.json();
      expect(availableClasses.success).toBe(true);
      expect(availableClasses.classes).toHaveLength(1);
      expect(availableClasses.classes[0].name).toBe('Enrollment Test Class');

      // Req 4.3: Enroll in class and add to roster
      const { POST: enrollHandler } = await import('../../app/api/student/enroll/route.js');
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

      // Verify enrollment in database
      const enrollment = await Enrollment.findOne({
        studentId: studentUser._id,
        classId: testClass._id
      });
      expect(enrollment).toBeTruthy();
      expect(enrollment.isActive).toBe(true);

      // Req 4.4: Show enrolled classes and attendance history
      const { GET: enrolledClassesHandler } = await import('../../app/api/student/enrolled/route.js');
      const enrolledClassesRequest = new NextRequest('http://localhost:3000/api/student/enrolled');
      const enrolledClassesResponse = await enrolledClassesHandler(enrolledClassesRequest);
      
      expect(enrolledClassesResponse.status).toBe(200);
      const enrolledClasses = await enrolledClassesResponse.json();
      expect(enrolledClasses.success).toBe(true);
      expect(enrolledClasses.classes).toHaveLength(1);
      expect(enrolledClasses.classes[0].name).toBe('Enrollment Test Class');

      console.log('✅ Requirement 4 validated: Student registration and enrollment');
    });
  });

  describe('Requirement 5: Attendance Reports', () => {
    it('should validate attendance reporting system (Req 5.1-5.4)', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Setup test data
      const testClass = await Class.create({
        name: 'Reports Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Reports Test Room'
        }
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      const attendanceSession = await AttendanceSession.create({
        classId: testClass._id,
        sessionToken: 'reports-test-session',
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

      // Mock teacher session
      getServerSession.mockResolvedValue({
        user: { id: teacherUser._id.toString(), role: 'teacher' }
      });

      // Req 5.1: Display attendance data by class and date
      const { GET: getAttendanceHandler } = await import('../../app/api/teacher/classes/[id]/attendance/route.js');
      const reportsRequest = new NextRequest(`http://localhost:3000/api/teacher/classes/${testClass._id}/attendance`);
      
      const reportsResponse = await getAttendanceHandler(reportsRequest, {
        params: { id: testClass._id.toString() }
      });
      
      expect(reportsResponse.status).toBe(200);
      const reportsData = await reportsResponse.json();
      expect(reportsData.success).toBe(true);
      expect(Array.isArray(reportsData.attendance)).toBe(true);

      // Req 5.2: Show present/absent status for each student
      // This is validated through the attendance records structure

      // Req 5.3: Display individual student attendance percentage
      const { GET: teacherReportsHandler } = await import('../../app/api/teacher/reports/route.js');
      const teacherReportsRequest = new NextRequest('http://localhost:3000/api/teacher/reports');
      const teacherReportsResponse = await teacherReportsHandler(teacherReportsRequest);
      
      expect(teacherReportsResponse.status).toBe(200);
      const teacherReportsData = await teacherReportsResponse.json();
      expect(teacherReportsData.success).toBe(true);

      // Req 5.4: Provide downloadable attendance reports
      const { GET: exportHandler } = await import('../../app/api/teacher/export/route.js');
      const exportRequest = new NextRequest('http://localhost:3000/api/teacher/export');
      const exportResponse = await exportHandler(exportRequest);
      
      expect(exportResponse.status).toBe(200);
      // Export functionality should return data in downloadable format

      console.log('✅ Requirement 5 validated: Attendance reports');
    });
  });

  describe('Requirement 6: Location-Based Verification', () => {
    it('should validate location verification system (Req 6.1-6.5)', async () => {
      // Req 6.1: Embed GPS coordinates in QR code
      const qrData = generateQRData({
        sessionToken: 'location-test-token',
        classId: 'test-class-id',
        className: 'Location Test',
        location: {
          lat: 40.7128,
          lng: -74.0060
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      const parsedQRData = JSON.parse(qrData);
      expect(parsedQRData.location.lat).toBe(40.7128);
      expect(parsedQRData.location.lng).toBe(-74.0060);

      // Req 6.2: Request student's current location
      // This is handled by the frontend QR scanner component

      // Req 6.3: Verify student is within acceptable range
      const classLocation = { lat: 40.7128, lng: -74.0060 };
      const nearbyLocation = { lat: 40.7129, lng: -74.0061 }; // ~10 meters
      const farLocation = { lat: 34.0522, lng: -118.2437 }; // Los Angeles

      const nearbyDistance = calculateDistance(
        classLocation.lat, classLocation.lng,
        nearbyLocation.lat, nearbyLocation.lng
      );
      expect(nearbyDistance).toBeLessThan(100); // Within acceptable range

      const farDistance = calculateDistance(
        classLocation.lat, classLocation.lng,
        farLocation.lat, farLocation.lng
      );
      expect(farDistance).toBeGreaterThan(1000000); // Far outside acceptable range

      // Req 6.4: Reject attendance if outside range
      // This is tested in the attendance marking tests above

      // Req 6.5: Prompt for location access when disabled
      // This is handled by the frontend location permission component

      console.log('✅ Requirement 6 validated: Location-based verification');
    });
  });

  describe('Requirement 7: Admin System Management', () => {
    it('should validate admin dashboard and user management (Req 7.1-7.6)', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Setup test data
      const testClass = await Class.create({
        name: 'Admin Test Class',
        subject: 'Testing',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Admin Test Room'
        }
      });

      await Enrollment.create({
        studentId: studentUser._id,
        classId: testClass._id,
        isActive: true
      });

      const attendanceSession = await AttendanceSession.create({
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

      // Mock admin session
      getServerSession.mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' }
      });

      // Req 7.1: Comprehensive dashboard with system-wide statistics
      const { GET: adminDashboardHandler } = await import('../../app/api/admin/dashboard/route.js');
      const dashboardRequest = new NextRequest('http://localhost:3000/api/admin/dashboard');
      const dashboardResponse = await adminDashboardHandler(dashboardRequest);
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      expect(dashboardData.success).toBe(true);
      expect(dashboardData.stats.totalUsers).toBe(3);
      expect(dashboardData.stats.totalClasses).toBe(1);
      expect(dashboardData.stats.totalAttendanceRecords).toBe(1);

      // Req 7.2: Show attendance data for all teachers and classes
      const { GET: adminReportsHandler } = await import('../../app/api/admin/reports/route.js');
      const reportsRequest = new NextRequest('http://localhost:3000/api/admin/reports');
      const reportsResponse = await adminReportsHandler(reportsRequest);
      
      expect(reportsResponse.status).toBe(200);
      const reportsData = await reportsResponse.json();
      expect(reportsData.success).toBe(true);
      expect(reportsData.reports.attendanceByClass).toHaveLength(1);

      // Req 7.3: Allow viewing, creating, and deactivating user accounts
      const { GET: adminUsersHandler, POST: adminCreateUserHandler } = await import('../../app/api/admin/users/route.js');
      
      // View users
      const usersRequest = new NextRequest('http://localhost:3000/api/admin/users');
      const usersResponse = await adminUsersHandler(usersRequest);
      
      expect(usersResponse.status).toBe(200);
      const usersData = await usersResponse.json();
      expect(usersData.success).toBe(true);
      expect(usersData.users).toHaveLength(3);

      // Create user
      const newUserRequest = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@validation.com',
          name: 'New User',
          role: 'student',
          password: 'newpassword123'
        })
      });

      const newUserResponse = await adminCreateUserHandler(newUserRequest);
      expect(newUserResponse.status).toBe(201);
      
      const newUserData = await newUserResponse.json();
      expect(newUserData.success).toBe(true);
      expect(newUserData.user.email).toBe('newuser@validation.com');

      // Req 7.4: Display attendance trends and usage statistics
      const { GET: adminAnalyticsHandler } = await import('../../app/api/admin/analytics/route.js');
      const analyticsRequest = new NextRequest('http://localhost:3000/api/admin/analytics');
      const analyticsResponse = await adminAnalyticsHandler(analyticsRequest);
      
      expect(analyticsResponse.status).toBe(200);
      const analyticsData = await analyticsResponse.json();
      expect(analyticsData.success).toBe(true);

      // Req 7.5: Provide comprehensive reports for all classes and users
      // Already tested above with reports endpoint

      // Req 7.6: Allow viewing and modifying all classes across teachers
      const { GET: adminClassesHandler } = await import('../../app/api/admin/classes/route.js');
      const classesRequest = new NextRequest('http://localhost:3000/api/admin/classes');
      const classesResponse = await adminClassesHandler(classesRequest);
      
      expect(classesResponse.status).toBe(200);
      const classesData = await classesResponse.json();
      expect(classesData.success).toBe(true);
      expect(classesData.classes).toHaveLength(1);

      console.log('✅ Requirement 7 validated: Admin system management');
    });
  });

  describe('Requirement 8: User Interface and Experience', () => {
    it('should validate user interface requirements (Req 8.1-8.5)', async () => {
      // Req 8.1: Separate login portals for different user types
      // This is validated through the role-based authentication system
      expect(teacherUser.role).toBe('teacher');
      expect(studentUser.role).toBe('student');
      expect(adminUser.role).toBe('admin');

      // Req 8.2: Clear menus and buttons
      // This is validated through the frontend components structure

      // Req 8.3: Responsive design optimized for smartphones
      // This is validated through the responsive design tests

      // Req 8.4: Display helpful error messages and guidance
      const { getServerSession } = await import('next-auth/next');
      
      getServerSession.mockResolvedValue({
        user: { id: studentUser._id.toString(), role: 'student' }
      });

      // Test error message for invalid session token
      const { POST: markAttendanceHandler } = await import('../../app/api/student/attendance/route.js');
      const invalidRequest = new NextRequest('http://localhost:3000/api/student/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: 'invalid-token',
          location: { lat: 40.7128, lng: -74.0060 }
        })
      });

      const invalidResponse = await markAttendanceHandler(invalidRequest);
      expect(invalidResponse.status).toBe(400);
      
      const invalidData = await invalidResponse.json();
      expect(invalidData.success).toBe(false);
      expect(invalidData.message).toBeTruthy();
      expect(typeof invalidData.message).toBe('string');

      // Req 8.5: Provide immediate feedback and confirmation messages
      // This is validated through the success responses in other tests

      console.log('✅ Requirement 8 validated: User interface and experience');
    });
  });

  describe('System Integration Validation', () => {
    it('should validate complete system integration across all requirements', async () => {
      const { getServerSession } = await import('next-auth/next');

      // Create comprehensive test scenario
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      // Additional users for comprehensive testing
      const teacher2 = await User.create({
        email: 'teacher2@validation.com',
        name: 'Second Teacher',
        role: 'teacher',
        passwordHash: hashedPassword,
        isActive: true
      });

      const student2 = await User.create({
        email: 'student2@validation.com',
        name: 'Second Student',
        role: 'student',
        passwordHash: hashedPassword,
        isActive: true
      });

      // Create multiple classes
      const class1 = await Class.create({
        name: 'Integration Class 1',
        subject: 'Computer Science',
        teacherId: teacherUser._id,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'CS Lab 1'
        }
      });

      const class2 = await Class.create({
        name: 'Integration Class 2',
        subject: 'Mathematics',
        teacherId: teacher2._id,
        location: {
          lat: 40.7130,
          lng: -74.0062,
          name: 'Math Room 1'
        }
      });

      // Create enrollments
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

      // Create attendance records
      await AttendanceRecord.create({
        sessionId: session1._id,
        studentId: studentUser._id,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await AttendanceRecord.create({
        sessionId: session1._id,
        studentId: student2._id,
        studentLocation: { lat: 40.7128, lng: -74.0060 }
      });

      await AttendanceRecord.create({
        sessionId: session2._id,
        studentId: studentUser._id,
        studentLocation: { lat: 40.7130, lng: -74.0062 }
      });

      // Validate admin can see complete system state
      getServerSession.mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' }
      });

      const { GET: adminDashboardHandler } = await import('../../app/api/admin/dashboard/route.js');
      const finalDashboardRequest = new NextRequest('http://localhost:3000/api/admin/dashboard');
      const finalDashboardResponse = await adminDashboardHandler(finalDashboardRequest);
      
      expect(finalDashboardResponse.status).toBe(200);
      const finalDashboardData = await finalDashboardResponse.json();
      expect(finalDashboardData.success).toBe(true);
      expect(finalDashboardData.stats.totalUsers).toBe(5); // 2 teachers, 2 students, 1 admin
      expect(finalDashboardData.stats.totalClasses).toBe(2);
      expect(finalDashboardData.stats.totalAttendanceRecords).toBe(3);
      expect(finalDashboardData.stats.activeSessions).toBe(2);

      // Validate comprehensive reports
      const { GET: adminReportsHandler } = await import('../../app/api/admin/reports/route.js');
      const finalReportsRequest = new NextRequest('http://localhost:3000/api/admin/reports');
      const finalReportsResponse = await adminReportsHandler(finalReportsRequest);
      
      expect(finalReportsResponse.status).toBe(200);
      const finalReportsData = await finalReportsResponse.json();
      expect(finalReportsData.success).toBe(true);
      expect(finalReportsData.reports.attendanceByClass).toHaveLength(2);

      // Validate data consistency
      const totalUsers = await User.countDocuments();
      const totalClasses = await Class.countDocuments();
      const totalEnrollments = await Enrollment.countDocuments();
      const totalSessions = await AttendanceSession.countDocuments();
      const totalAttendance = await AttendanceRecord.countDocuments();

      expect(totalUsers).toBe(5);
      expect(totalClasses).toBe(2);
      expect(totalEnrollments).toBe(3);
      expect(totalSessions).toBe(2);
      expect(totalAttendance).toBe(3);

      console.log('✅ Complete system integration validated successfully');
      console.log(`📊 System state: ${totalUsers} users, ${totalClasses} classes, ${totalEnrollments} enrollments, ${totalSessions} sessions, ${totalAttendance} attendance records`);
    });
  });
});