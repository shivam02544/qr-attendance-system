import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Class from '../../../../models/Class';
import AttendanceSession from '../../../../models/AttendanceSession';
import AttendanceRecord from '../../../../models/AttendanceRecord';
import Enrollment from '../../../../models/Enrollment';
import User from '../../../../models/User';
import mongoose from 'mongoose';

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Helper function to generate recommendations based on data state
function generateRecommendations(classInfo, enrollmentInfo, sessionInfo, attendanceInfo) {
  const recommendations = [];
  
  if (!classInfo.exists) {
    recommendations.push('Class not found. Verify the class ID is correct.');
    return recommendations;
  }
  
  if (enrollmentInfo.count === 0) {
    recommendations.push('No students enrolled in this class. Add student enrollments to enable attendance tracking.');
  }
  
  if (sessionInfo.total === 0) {
    recommendations.push('No attendance sessions created. Create an attendance session to allow students to mark attendance.');
  } else if (sessionInfo.active === 0 && sessionInfo.expired > 0) {
    recommendations.push('All attendance sessions have expired. Create a new active session for current attendance tracking.');
  }
  
  if (attendanceInfo.totalRecords === 0 && sessionInfo.total > 0) {
    recommendations.push('Attendance sessions exist but no attendance records found. Students may need to scan QR codes to mark attendance.');
  }
  
  if (enrollmentInfo.count > 0 && sessionInfo.total > 0 && attendanceInfo.totalRecords > 0) {
    const attendanceRate = attendanceInfo.totalRecords / (enrollmentInfo.count * sessionInfo.total);
    if (attendanceRate < 0.5) {
      recommendations.push(`Low attendance rate (${Math.round(attendanceRate * 100)}%). Consider checking if students can access QR codes or if location requirements are too strict.`);
    }
  }
  
  if (sessionInfo.active > 1) {
    recommendations.push('Multiple active sessions detected. Consider deactivating old sessions to avoid confusion.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Data looks healthy! Class has enrollments, sessions, and attendance records.');
  }
  
  return recommendations;
}

export async function GET(request) {
  try {
    // Connect to database with error handling
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: 'Unable to connect to the database. Please check your connection settings.'
      }, { status: 503 });
    }
    
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || '68e576c7480c496ebda33b19';
    const action = searchParams.get('action') || 'check';
    
    // Validate class ID format
    if (!isValidObjectId(classId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid class ID format',
        details: 'Class ID must be a valid MongoDB ObjectId (24 character hex string)'
      }, { status: 400 });
    }
    
    if (action === 'check') {
      try {
        // Check class existence and get details
        const classDoc = await Class.findById(classId).populate('teacherId', 'name email');
        const classExists = !!classDoc;
        
        const classInfo = {
          exists: classExists,
          id: classId,
          name: classExists ? classDoc.name : null,
          subject: classExists ? classDoc.subject : null,
          teacherId: classExists ? classDoc.teacherId?._id : null,
          teacherName: classExists ? classDoc.teacherId?.name : null,
          teacherEmail: classExists ? classDoc.teacherId?.email : null,
          location: classExists ? classDoc.location : null,
          createdAt: classExists ? classDoc.createdAt : null
        };
        
        if (!classExists) {
          return NextResponse.json({
            success: true,
            data: {
              classInfo,
              enrollmentInfo: { count: 0, students: [] },
              sessionInfo: { total: 0, active: 0, expired: 0, sessions: [] },
              attendanceInfo: { totalRecords: 0, dateRange: null, records: [] },
              recommendations: generateRecommendations(classInfo, { count: 0 }, { total: 0, active: 0, expired: 0 }, { totalRecords: 0 })
            }
          });
        }
        
        // Get enrollment information
        const enrollments = await Enrollment.find({ classId, isActive: true })
          .populate('studentId', 'name email isActive')
          .sort({ enrolledAt: -1 });
        
        const enrollmentInfo = {
          count: enrollments.length,
          students: enrollments.map(e => ({
            enrollmentId: e._id,
            studentId: e.studentId._id,
            studentName: e.studentId.name,
            studentEmail: e.studentId.email,
            studentActive: e.studentId.isActive,
            enrolledAt: e.enrolledAt,
            isActive: e.isActive
          }))
        };
        
        // Get session information
        const allSessions = await AttendanceSession.find({ classId }).sort({ createdAt: -1 });
        const now = new Date();
        const activeSessions = allSessions.filter(s => s.isActive && s.expiresAt > now);
        const expiredSessions = allSessions.filter(s => !s.isActive || s.expiresAt <= now);
        
        const sessionInfo = {
          total: allSessions.length,
          active: activeSessions.length,
          expired: expiredSessions.length,
          sessions: allSessions.map(s => ({
            id: s._id,
            sessionToken: s.sessionToken.substring(0, 8) + '...', // Truncate for security
            isActive: s.isActive,
            isExpired: s.expiresAt <= now,
            isValid: s.isActive && s.expiresAt > now,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
            remainingMinutes: s.expiresAt > now ? Math.ceil((s.expiresAt - now) / (1000 * 60)) : 0
          }))
        };
        
        // Get attendance record information
        const attendanceRecords = await AttendanceRecord.findByClass(classId);
        let dateRange = null;
        
        if (attendanceRecords.length > 0) {
          const dates = attendanceRecords.map(r => new Date(r.markedAt));
          dateRange = {
            earliest: new Date(Math.min(...dates)),
            latest: new Date(Math.max(...dates))
          };
        }
        
        const attendanceInfo = {
          totalRecords: attendanceRecords.length,
          dateRange,
          records: attendanceRecords.slice(0, 20).map(r => ({
            id: r._id,
            studentId: r.student._id,
            studentName: r.student.name,
            studentEmail: r.student.email,
            sessionId: r.session._id,
            markedAt: r.markedAt,
            studentLocation: r.studentLocation,
            classLocation: r.class.location
          }))
        };
        
        // Generate recommendations
        const recommendations = generateRecommendations(classInfo, enrollmentInfo, sessionInfo, attendanceInfo);
        
        return NextResponse.json({
          success: true,
          data: {
            classInfo,
            enrollmentInfo,
            sessionInfo,
            attendanceInfo,
            recommendations
          }
        });
        
      } catch (queryError) {
        console.error('Database query error:', queryError);
        return NextResponse.json({
          success: false,
          error: 'Database query failed',
          details: 'An error occurred while retrieving attendance data. Please try again.'
        }, { status: 500 });
      }
    }
    
    if (action === 'seed') {
      try {
        // Validate class exists before seeding
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
          return NextResponse.json({
            success: false,
            error: 'Class not found',
            details: 'Cannot seed data for non-existent class. Please verify the class ID.'
          }, { status: 404 });
        }
        
        // Find existing students to use for testing (avoid creating new users)
        const existingStudents = await User.find({ role: 'student', isActive: true }).limit(3);
        
        if (existingStudents.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No existing students found',
            details: 'Please create some student users first before seeding attendance data'
          }, { status: 400 });
        }
        
        const testStudents = existingStudents;
        
        // Enroll students in the class
        let enrollmentsCreated = 0;
        for (const student of testStudents) {
          const existingEnrollment = await Enrollment.findOne({
            studentId: student._id,
            classId: classId
          });
          
          if (!existingEnrollment) {
            await Enrollment.create({
              studentId: student._id,
              classId: classId
            });
            enrollmentsCreated++;
          }
        }
        
        // Create test attendance session (active for now to allow record creation)
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        
        const session = await AttendanceSession.create({
          classId: classId,
          expiresAt: oneHourFromNow, // Active session to allow record creation
          isActive: true
        });
        
        // Create attendance records
        let recordsCreated = 0;
        for (const student of testStudents) {
          // Check if attendance record already exists for this student and session
          const existingRecord = await AttendanceRecord.findOne({
            sessionId: session._id,
            studentId: student._id
          });
          
          if (!existingRecord) {
            try {
              await AttendanceRecord.create({
                sessionId: session._id,
                studentId: student._id,
                markedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
                studentLocation: {
                  lat: classDoc.location.lat + (Math.random() - 0.5) * 0.001,
                  lng: classDoc.location.lng + (Math.random() - 0.5) * 0.001
                }
              });
              recordsCreated++;
            } catch (recordError) {
              console.error(`Failed to create attendance record for student ${student._id}:`, recordError);
              // Continue with other students even if one fails
            }
          }
        }
        
        // After creating records, deactivate the session to simulate expired state
        session.isActive = false;
        session.expiresAt = new Date(now.getTime() - 30 * 60 * 1000); // Set to 30 minutes ago
        await session.save();
        
        return NextResponse.json({
          success: true,
          message: 'Test data seeding completed',
          data: {
            classId: classId,
            className: classDoc.name,
            studentsProcessed: testStudents.length,
            enrollmentsCreated: enrollmentsCreated,
            sessionCreated: session._id,
            recordsCreated: recordsCreated,
            summary: `Created ${enrollmentsCreated} new enrollments and ${recordsCreated} attendance records for class "${classDoc.name}"`
          }
        });
        
      } catch (seedError) {
        console.error('Seeding error:', seedError);
        return NextResponse.json({
          success: false,
          error: 'Data seeding failed',
          details: seedError.message || 'An error occurred while creating test data'
        }, { status: 500 });
      }
    }
    
    // Invalid action
    return NextResponse.json({
      success: false,
      error: 'Invalid action parameter',
      details: 'Supported actions are: "check" (inspect data) or "seed" (create test data)'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: 'An unexpected error occurred. Please check server logs for details.'
    }, { status: 500 });
  }
}