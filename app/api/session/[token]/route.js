import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import AttendanceSession from '../../../../models/AttendanceSession';

// GET /api/session/[token] - Validate session token and get session info
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Find session by token and populate class data
    const session = await AttendanceSession.findByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 404 }
      );
    }

    // Check if session is valid (active and not expired)
    const isValid = session.isValid;
    const isExpired = session.isExpired;

    return NextResponse.json({
      success: true,
      session: {
        id: session._id,
        sessionToken: session.sessionToken,
        classId: session.classId._id,
        className: session.classId.name,
        classSubject: session.classId.subject,
        location: session.classId.location,
        teacherId: session.classId.teacherId,
        expiresAt: session.expiresAt,
        remainingMinutes: session.remainingMinutes,
        isActive: session.isActive,
        isExpired,
        isValid,
        createdAt: session.createdAt
      },
      qrData: isValid ? session.getQRData() : null
    });

  } catch (error) {
    console.error('Error validating session token:', error);
    return NextResponse.json(
      { error: 'Failed to validate session token' },
      { status: 500 }
    );
  }
}