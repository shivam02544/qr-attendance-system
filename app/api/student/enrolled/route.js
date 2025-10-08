import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Enrollment from '../../../../models/Enrollment';

// GET /api/student/enrolled - Get student's enrolled classes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find all active enrollments for this student
    const enrollments = await Enrollment.find({
      studentId: session.user.id,
      isActive: true
    })
    .populate({
      path: 'classId',
      select: 'name subject location teacherId',
      populate: {
        path: 'teacherId',
        select: 'name email'
      }
    })
    .sort({ enrolledAt: -1 });

    // Get attendance statistics for each enrolled class
    const enrolledClassesWithStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Debug: Log classes with missing teacher data
        if (!enrollment.classId?.teacherId) {
          console.warn(`Enrolled class ${enrollment.classId?._id} (${enrollment.classId?.name}) has no teacher assigned`);
        }

        // Get attendance count for this student in this class
        const AttendanceRecord = (await import('../../../../models/AttendanceRecord.js')).default;
        const AttendanceSession = (await import('../../../../models/AttendanceSession.js')).default;
        
        // Get all sessions for this class
        const sessions = await AttendanceSession.find({ 
          classId: enrollment.classId._id 
        });
        
        // Get attendance records for this student in this class
        const attendanceRecords = await AttendanceRecord.find({
          studentId: session.user.id,
          sessionId: { $in: sessions.map(s => s._id) }
        }).sort({ markedAt: -1 });

        // Get total enrollment count for this class
        const totalEnrollments = await Enrollment.countDocuments({
          classId: enrollment.classId._id,
          isActive: true
        });

        return {
          enrollmentId: enrollment._id,
          enrolledAt: enrollment.enrolledAt,
          attendanceCount: attendanceRecords.length,
          lastAttendance: attendanceRecords.length > 0 ? attendanceRecords[0].markedAt : null,
          totalSessions: sessions.length,
          attendanceRate: sessions.length > 0 ? Math.round((attendanceRecords.length / sessions.length) * 100) : 0,
          class: {
            ...enrollment.classId.toObject(),
            enrollmentCount: totalEnrollments
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      enrolledClasses: enrolledClassesWithStats
    });

  } catch (error) {
    console.error('Error fetching enrolled classes:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}