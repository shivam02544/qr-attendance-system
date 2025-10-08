import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Import models
import User from '../../models/User.js';
import Class from '../../models/Class.js';
import Enrollment from '../../models/Enrollment.js';
import AttendanceSession from '../../models/AttendanceSession.js';
import AttendanceRecord from '../../models/AttendanceRecord.js';

// Import utilities
import { calculateDistance } from '../../lib/location.js';
import { generateQRData } from '../../lib/qrcode.js';
import { generateAttendanceReport } from '../../lib/attendanceReports.js';

describe('System Integration Tests - Final Validation', () => {
    let mongoServer;
    let teacherUser, studentUser, adminUser;

    beforeEach(async () => {
        // Start MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create test users with proper email format
        teacherUser = await User.create({
            email: 'teacher@example.com',
            name: 'Test Teacher',
            role: 'teacher',
            passwordHash: 'password123', // Will be hashed by pre-save hook
            isActive: true
        });

        studentUser = await User.create({
            email: 'student@example.com',
            name: 'Test Student',
            role: 'student',
            passwordHash: 'password123',
            isActive: true
        });

        adminUser = await User.create({
            email: 'admin@example.com',
            name: 'Test Admin',
            role: 'admin',
            passwordHash: 'password123',
            isActive: true
        });
    });

    afterEach(async () => {
        // Clean up database
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    it('should complete a full attendance workflow', async () => {
        // Create a class
        const testClass = await Class.create({
            name: 'Test Class',
            code: 'TEST101',
            teacher: teacherUser._id,
            location: {
                latitude: 40.7128,
                longitude: -74.0060,
                radius: 100
            },
            isActive: true
        });

        // Enroll student in class
        await Enrollment.create({
            student: studentUser._id,
            class: testClass._id,
            enrolledAt: new Date()
        });

        // Create attendance session
        const session = await AttendanceSession.create({
            class: testClass._id,
            teacher: teacherUser._id,
            startTime: new Date(),
            endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
            qrToken: 'test-token-123',
            isActive: true
        });

        // Generate QR data
        const qrData = generateQRData(session._id.toString(), testClass._id.toString());
        expect(qrData).toBeDefined();

        // Test location validation
        const studentLocation = { latitude: 40.7128, longitude: -74.0060 };
        const classLocation = { latitude: 40.7128, longitude: -74.0060 };
        const distance = calculateDistance(studentLocation, classLocation);
        expect(distance).toBeLessThan(testClass.location.radius);

        // Record attendance
        const attendanceRecord = await AttendanceRecord.create({
            student: studentUser._id,
            session: session._id,
            timestamp: new Date(),
            location: studentLocation,
            status: 'present'
        });

        expect(attendanceRecord).toBeDefined();
        expect(attendanceRecord.status).toBe('present');

        // Generate attendance report
        const report = await generateAttendanceReport(testClass._id, {
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endDate: new Date()
        });

        expect(report).toBeDefined();
        expect(report.totalSessions).toBe(1);
        expect(report.attendanceRecords).toHaveLength(1);
    });
});