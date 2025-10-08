import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import AttendanceSession from '../../../../../models/AttendanceSession';
import Class from '../../../../../models/Class';

// DELETE /api/teacher/sessions/[id] - End attendance session
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized. Teacher access required.' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { id: sessionId } = await params;

    // Find the attendance session and populate class data
    const attendanceSession = await AttendanceSession.findById(sessionId)
      .populate('classId', 'teacherId name');

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Attendance session not found' },
        { status: 404 }
      );
    }

    // Verify the session belongs to a class owned by the teacher
    if (attendanceSession.classId.teacherId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied. This session does not belong to your class.' },
        { status: 403 }
      );
    }

    // Check if session is already inactive
    if (!attendanceSession.isActive) {
      return NextResponse.json(
        { error: 'Session is already inactive' },
        { status: 400 }
      );
    }

    // Deactivate the session
    await attendanceSession.deactivate();

    return NextResponse.json({
      success: true,
      message: 'Attendance session ended successfully',
      session: {
        id: attendanceSession._id,
        sessionToken: attendanceSession.sessionToken,
        classId: attendanceSession.classId._id,
        className: attendanceSession.classId.name,
        isActive: false,
        endedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error ending attendance session:', error);
    return NextResponse.json(
      { error: 'Failed to end attendance session' },
      { status: 500 }
    );
  }
}

// PUT /api/teacher/sessions/[id] - Extend attendance session
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized. Teacher access required.' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { id: sessionId } = await params;
    const body = await request.json();
    const { additionalMinutes = 15 } = body;

    // Validate additional minutes
    if (additionalMinutes < 1 || additionalMinutes > 60) {
      return NextResponse.json(
        { error: 'Additional minutes must be between 1 and 60' },
        { status: 400 }
      );
    }

    // Find the attendance session and populate class data
    const attendanceSession = await AttendanceSession.findById(sessionId)
      .populate('classId', 'teacherId name');

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Attendance session not found' },
        { status: 404 }
      );
    }

    // Verify the session belongs to a class owned by the teacher
    if (attendanceSession.classId.teacherId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied. This session does not belong to your class.' },
        { status: 403 }
      );
    }

    // Check if session is active
    if (!attendanceSession.isActive) {
      return NextResponse.json(
        { error: 'Cannot extend inactive session' },
        { status: 400 }
      );
    }

    // Extend the session
    await attendanceSession.extend(additionalMinutes);

    // Generate updated QR data
    const qrData = attendanceSession.getQRData();

    return NextResponse.json({
      success: true,
      message: `Session extended by ${additionalMinutes} minutes`,
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
    console.error('Error extending attendance session:', error);
    return NextResponse.json(
      { error: 'Failed to extend attendance session' },
      { status: 500 }
    );
  }
}

// GET /api/teacher/sessions/[id] - Get session details
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized. Teacher access required.' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { id: sessionId } = await params;

    // Find the attendance session and populate class data
    const attendanceSession = await AttendanceSession.findById(sessionId)
      .populate('classId', 'teacherId name subject location');

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Attendance session not found' },
        { status: 404 }
      );
    }

    // Verify the session belongs to a class owned by the teacher
    if (attendanceSession.classId.teacherId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied. This session does not belong to your class.' },
        { status: 403 }
      );
    }

    let qrData = null;
    if (attendanceSession.isValid) {
      qrData = attendanceSession.getQRData();
    }

    return NextResponse.json({
      success: true,
      session: {
        id: attendanceSession._id,
        sessionToken: attendanceSession.sessionToken,
        classId: attendanceSession.classId._id,
        className: attendanceSession.classId.name,
        expiresAt: attendanceSession.expiresAt,
        remainingMinutes: attendanceSession.remainingMinutes,
        isActive: attendanceSession.isActive,
        isExpired: attendanceSession.isExpired,
        isValid: attendanceSession.isValid,
        createdAt: attendanceSession.createdAt
      },
      qrData
    });

  } catch (error) {
    console.error('Error getting session details:', error);
    return NextResponse.json(
      { error: 'Failed to get session details' },
      { status: 500 }
    );
  }
}