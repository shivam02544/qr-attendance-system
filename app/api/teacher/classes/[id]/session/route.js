import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import connectDB from '../../../../../../lib/mongodb';
import AttendanceSession from '../../../../../../models/AttendanceSession';
import Class from '../../../../../../models/Class';
import { 
  withQRSecurity, 
  withGeneralSecurity,
  logUserActivity 
} from '../../../../../../lib/securityMiddleware';
import { 
  logSecurityEvent,
  logUnauthorizedAccess,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from '../../../../../../lib/securityLogger';
import { validateObjectId } from '../../../../../../lib/security';

// Apply security middleware to POST endpoint
const securePostHandler = withQRSecurity(
  async function postHandler(request, { params }) {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session || session.user.role !== 'teacher') {
        await logUnauthorizedAccess(
          session?.user?.id || null,
          'qr_generation',
          {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            url: request.url
          }
        );
        
        return NextResponse.json(
          { error: 'Unauthorized. Teacher access required.' },
          { status: 401 }
        );
      }

      await connectDB();
      
      const { id: classId } = await params;
      
      // Validate classId format
      if (!validateObjectId(classId)) {
        await logSecurityEvent(
          SECURITY_EVENTS.INVALID_INPUT,
          LOG_LEVELS.MEDIUM,
          {
            input: classId,
            endpoint: '/api/teacher/classes/[id]/session',
            userId: session.user.id,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );
        
        return NextResponse.json(
          { error: 'Invalid class ID format' },
          { status: 400 }
        );
      }
      
      const body = await request.json();
      const { durationMinutes = 30 } = body;

      // Validate duration
      if (typeof durationMinutes !== 'number' || durationMinutes < 5 || durationMinutes > 180) {
        await logSecurityEvent(
          SECURITY_EVENTS.INVALID_INPUT,
          LOG_LEVELS.MEDIUM,
          {
            input: { durationMinutes },
            endpoint: '/api/teacher/classes/[id]/session',
            userId: session.user.id,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );
        
        return NextResponse.json(
          { error: 'Duration must be a number between 5 and 180 minutes' },
          { status: 400 }
        );
      }

      // Verify the class exists and belongs to the teacher
      const classDoc = await Class.findOne({
        _id: classId,
        teacherId: session.user.id
      });

      if (!classDoc) {
        await logUnauthorizedAccess(
          session.user.id,
          'class_access',
          {
            classId,
            reason: 'class_not_found_or_unauthorized',
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );
        
        return NextResponse.json(
          { error: 'Class not found or access denied' },
          { status: 404 }
        );
      }

    // Check if there's already an active session for this class
    const existingSession = await AttendanceSession.findOne({
      classId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (existingSession) {
      return NextResponse.json(
        { 
          error: 'An active attendance session already exists for this class',
          existingSession: {
            id: existingSession._id,
            sessionToken: existingSession.sessionToken,
            expiresAt: existingSession.expiresAt,
            remainingMinutes: existingSession.remainingMinutes
          }
        },
        { status: 409 }
      );
    }

      // Create new attendance session
      const attendanceSession = await AttendanceSession.createForClass(classId, durationMinutes);
      
      // Populate class data for QR generation
      await attendanceSession.populate('classId', 'name subject location');

      // Log QR generation
      await logSecurityEvent(
        SECURITY_EVENTS.QR_GENERATED,
        LOG_LEVELS.LOW,
        {
          classId,
          className: attendanceSession.classId.name,
          durationMinutes,
          sessionToken: attendanceSession.sessionToken.substring(0, 8) + '...',
          teacherId: session.user.id,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      );

      // Log user activity for pattern detection
      logUserActivity(
        session.user.id,
        'qr_generated',
        {
          classId,
          className: attendanceSession.classId.name,
          durationMinutes,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      );

      // Generate QR data
      const qrData = attendanceSession.getQRData();

      return NextResponse.json({
        success: true,
        session: {
          id: attendanceSession._id,
          sessionToken: attendanceSession.sessionToken,
          classId: attendanceSession.classId._id,
          className: attendanceSession.classId.name,
          expiresAt: attendanceSession.expiresAt,
          remainingMinutes: attendanceSession.remainingMinutes,
          isActive: attendanceSession.isActive
        },
        qrData
      });

    } catch (error) {
      console.error('Error starting attendance session:', error);
      
      await logSecurityEvent(
        SECURITY_EVENTS.SYSTEM_ERROR,
        LOG_LEVELS.MEDIUM,
        {
          error: error.message,
          stack: error.stack,
          userId: session?.user?.id,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          endpoint: '/api/teacher/classes/[id]/session'
        }
      );
      
      return NextResponse.json(
        { error: 'Failed to start attendance session' },
        { status: 500 }
      );
    }
  }
);

// Apply security middleware to GET endpoint
const secureGetHandler = withGeneralSecurity(
  async function getHandler(request, { params }) {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session || session.user.role !== 'teacher') {
        await logUnauthorizedAccess(
          session?.user?.id || null,
          'qr_session_access',
          {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            url: request.url
          }
        );
        
        return NextResponse.json(
          { error: 'Unauthorized. Teacher access required.' },
          { status: 401 }
        );
      }

      await connectDB();
      
      const { id: classId } = await params;

      // Validate classId format
      if (!validateObjectId(classId)) {
        await logSecurityEvent(
          SECURITY_EVENTS.INVALID_INPUT,
          LOG_LEVELS.MEDIUM,
          {
            input: classId,
            endpoint: '/api/teacher/classes/[id]/session',
            userId: session.user.id,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );
        
        return NextResponse.json(
          { error: 'Invalid class ID format' },
          { status: 400 }
        );
      }

      // Verify the class belongs to the teacher
      const classDoc = await Class.findOne({
        _id: classId,
        teacherId: session.user.id
      });

      if (!classDoc) {
        await logUnauthorizedAccess(
          session.user.id,
          'class_access',
          {
            classId,
            reason: 'class_not_found_or_unauthorized',
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        );
        
        return NextResponse.json(
          { error: 'Class not found or access denied' },
          { status: 404 }
        );
      }

      // Find active session for this class
      const activeSession = await AttendanceSession.findOne({
        classId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).populate('classId', 'name subject location');

      if (!activeSession) {
        return NextResponse.json({
          success: true,
          session: null
        });
      }

      // Generate QR data
      const qrData = activeSession.getQRData();

      return NextResponse.json({
        success: true,
        session: {
          id: activeSession._id,
          sessionToken: activeSession.sessionToken,
          classId: activeSession.classId._id,
          className: activeSession.classId.name,
          expiresAt: activeSession.expiresAt,
          remainingMinutes: activeSession.remainingMinutes,
          isActive: activeSession.isActive
        },
        qrData
      });

    } catch (error) {
      console.error('Error getting attendance session:', error);
      
      await logSecurityEvent(
        SECURITY_EVENTS.SYSTEM_ERROR,
        LOG_LEVELS.MEDIUM,
        {
          error: error.message,
          stack: error.stack,
          userId: session?.user?.id,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          endpoint: '/api/teacher/classes/[id]/session'
        }
      );
      
      return NextResponse.json(
        { error: 'Failed to get attendance session' },
        { status: 500 }
      );
    }
  }
);

export const POST = securePostHandler;
export const GET = secureGetHandler;