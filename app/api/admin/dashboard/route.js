import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User';
import Class from '../../../../models/Class';
import AttendanceRecord from '../../../../models/AttendanceRecord';
import AttendanceSession from '../../../../models/AttendanceSession';
import Enrollment from '../../../../models/Enrollment';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get system-wide statistics
    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalEnrollments,
      totalAttendanceRecords,
      activeSessions
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      Class.countDocuments(),
      Enrollment.countDocuments({ isActive: true }),
      AttendanceRecord.countDocuments(),
      AttendanceSession.countDocuments({ isActive: true })
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      recentUsers,
      recentClasses,
      recentAttendance
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo }, isActive: true }),
      Class.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      AttendanceRecord.countDocuments({ markedAt: { $gte: sevenDaysAgo } })
    ]);

    // Get attendance trends for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceTrends = await AttendanceRecord.aggregate([
      {
        $match: {
          markedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$markedAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get top performing classes (by attendance rate)
    const classPerformance = await AttendanceRecord.aggregate([
      {
        $lookup: {
          from: 'attendancesessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $unwind: '$session'
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'session.classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $unwind: '$class'
      },
      {
        $group: {
          _id: '$class._id',
          className: { $first: '$class.name' },
          subject: { $first: '$class.subject' },
          attendanceCount: { $sum: 1 }
        }
      },
      {
        $sort: { attendanceCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const dashboardData = {
      statistics: {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalClasses,
        totalEnrollments,
        totalAttendanceRecords,
        activeSessions
      },
      recentActivity: {
        newUsers: recentUsers,
        newClasses: recentClasses,
        attendanceMarked: recentAttendance
      },
      trends: {
        attendance: attendanceTrends
      },
      topClasses: classPerformance
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}