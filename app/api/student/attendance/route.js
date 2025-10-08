import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import AttendanceSession from '../../../../models/AttendanceSession';
import AttendanceRecord from '../../../../models/AttendanceRecord';
import Enrollment from '../../../../models/Enrollment';
import { createAttendanceRecord, getStudentAttendanceStats } from '../../../../lib/attendance';
import { 
  withAttendanceSecurity, 
  withValidation, 
  validationSchemas,
  logUserActivity 
} from '../../../../lib/securityMiddleware';
import { 
  logAttendanceEvent, 
  logSuspiciousActivity,
  logUnauthorizedAccess,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from '../../../../lib/securityLogger';
import { sanitizeObject } from '../../../../lib/security';

// GET endpoint to retrieve student's attendance records
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Unauthorized - Student access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Get student user
    const student = await User.findOne({ 
      email: session.user.email,
      role: 'student',
      isActive: true 
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student account not found' },
        { status: 404 }
      );
    }

    // Get attendance records
    let attendanceRecords;
    
    if (classId) {
      // Get attendance for specific class
      attendanceRecords = await AttendanceRecord.findByClass(classId, startDate, endDate);
      // Filter for this student only
      attendanceRecords = attendanceRecords.filter(record => 
        record.studentId.toString() === student._id.toString()
      );
    } else {
      // Get all attendance for student
      attendanceRecords = await AttendanceRecord.findByStudent(student._id, startDate, endDate);
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedRecords = attendanceRecords.slice(skip, skip + limit);

    // Calculate basic statistics
    const totalRecords = attendanceRecords.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const response = {
      success: true,
      data: {
        records: paginatedRecords,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    };

    // Include detailed statistics if requested
    if (includeStats) {
      const stats = await getStudentAttendanceStats(student._id, {
        startDate,
        endDate,
        classId
      });
      
      response.data.statistics = stats;
    } else {
      // Include basic statistics
      const uniqueClasses = [...new Set(attendanceRecords.map(record => 
        record.sessionId?.classId?._id?.toString() || record.class?._id?.toString()
      ))];

      response.data.statistics = {
        totalAttendance: totalRecords,
        uniqueClasses: uniqueClasses.length,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply security middleware to POST endpoint
const securePostHandler = withAttendanceSecurity(
  withValidation(validationSchemas.attendance)(
    async function postHandler(request) {
      try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user.role !== 'student') {
          await logUnauthorizedAccess(
            session?.user?.id || null,
            'student_attendance',
            {
              ip: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
              url: request.url
            }
          );
          
          return NextResponse.json(
            { error: 'Unauthorized - Student access required' },
            { status: 401 }
          );
        }

        await dbConnect();

        // Get sanitized and validated data
        const { sessionToken, studentLocation } = request.validatedData;

        // Input validation is handled by middleware

        // Get student user
        const student = await User.findOne({ 
          email: session.user.email,
          role: 'student',
          isActive: true 
        });

        if (!student) {
          await logUnauthorizedAccess(
            session.user.id,
            'student_attendance',
            {
              reason: 'student_not_found_or_inactive',
              email: session.user.email,
              ip: request.headers.get('x-forwarded-for') || 'unknown'
            }
          );
          
          return NextResponse.json(
            { error: 'Student account not found or inactive' },
            { status: 404 }
          );
        }

        // Log attendance attempt
        logUserActivity(
          student._id.toString(),
          'attendance_attempt',
          {
            sessionToken: sessionToken.substring(0, 8) + '...',
            location: studentLocation,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        );

        // Find the attendance session
        const attendanceSession = await AttendanceSession.findValidByToken(sessionToken);

        if (!attendanceSession) {
          // Log invalid QR scan attempt
          await logAttendanceEvent(
            false,
            student._id.toString(),
            {
              reason: 'invalid_session_token',
              sessionToken: sessionToken.substring(0, 8) + '...',
              location: studentLocation,
              ip: request.headers.get('x-forwarded-for') || 'unknown'
            }
          );

          // Check for more specific error messages
          const expiredSession = await AttendanceSession.findByToken(sessionToken);
          if (expiredSession) {
            if (!expiredSession.isActive) {
              return NextResponse.json(
                { error: 'This attendance session has been ended by the teacher' },
                { status: 400 }
              );
            }
            if (expiredSession.isExpired) {
              return NextResponse.json(
                { error: 'This QR code has expired. Please ask your teacher for a new one.' },
                { status: 400 }
              );
            }
          }
          return NextResponse.json(
            { error: 'Invalid QR code. Please scan a valid attendance QR code.' },
            { status: 400 }
          );
        }

        // Use utility function to create attendance record with all validations
        const result = await createAttendanceRecord({
          sessionId: attendanceSession._id,
          studentId: student._id,
          studentLocation,
          validateLocation: true,
          maxDistance: 50
        });

        if (!result.success) {
          // Log failed attendance attempt
          await logAttendanceEvent(
            false,
            student._id.toString(),
            {
              reason: result.error,
              distance: result.distance,
              maxDistance: result.maxDistance,
              className: result.className,
              location: studentLocation,
              ip: request.headers.get('x-forwarded-for') || 'unknown'
            }
          );

          // Check for suspicious location patterns
          if (result.error.includes('too far') && result.distance > 1000) {
            await logSuspiciousActivity(
              'potential_location_spoofing',
              student._id.toString(),
              {
                distance: result.distance,
                maxDistance: result.maxDistance,
                studentLocation,
                classLocation: result.classLocation,
                ip: request.headers.get('x-forwarded-for') || 'unknown'
              }
            );
          }

          // Determine appropriate status code based on error type
          let statusCode = 400;
          if (result.error.includes('not enrolled')) {
            statusCode = 403;
          } else if (result.error.includes('not configured')) {
            statusCode = 500;
          }

          return NextResponse.json(
            { 
              error: result.error,
              distance: result.distance,
              maxDistance: result.maxDistance,
              className: result.className
            },
            { status: statusCode }
          );
        }

        // Log successful attendance
        await logAttendanceEvent(
          true,
          student._id.toString(),
          {
            className: result.session.classId.name,
            distance: result.distance,
            location: studentLocation,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );

        // Log user activity for pattern detection
        logUserActivity(
          student._id.toString(),
          'attendance_marked',
          {
            location: studentLocation,
            distance: result.distance,
            className: result.session.classId.name,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );

        // Return success response
        return NextResponse.json({
          success: true,
          message: 'Attendance marked successfully',
          attendance: {
            id: result.record._id,
            className: result.session.classId.name,
            subject: result.session.classId.subject,
            markedAt: result.record.markedAt,
            distance: result.distance,
            sessionExpiresAt: result.session.expiresAt,
            studentName: student.name
          }
        });

      } catch (error) {
        console.error('Error marking attendance:', error);
        
        // Enhanced security logging
        await logAttendanceEvent(
          false,
          session?.user?.id || 'unknown',
          {
            error: error.message,
            stack: error.stack,
            userEmail: session?.user?.email,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        );
        
        return NextResponse.json(
          { error: 'Internal server error. Please try again.' },
          { status: 500 }
        );
      }
    }
  )
);

export const POST = securePostHandler;

