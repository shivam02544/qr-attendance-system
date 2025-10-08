import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb.js';
import AttendanceRecord from '../../../../models/AttendanceRecord';
import AttendanceSession from '../../../../models/AttendanceSession';
import Class from '../../../../models/Class';
import User from '../../../../models/User';
import Enrollment from '../../../../models/Enrollment';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // System usage analytics
    const [
      userGrowth,
      classGrowth,
      attendanceGrowth,
      sessionAnalytics,
      peakUsageHours,
      attendanceRates,
      teacherActivity,
      studentEngagement
    ] = await Promise.all([
      // User registration growth
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              role: "$role"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]),

      // Class creation growth
      Class.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Attendance marking growth
      AttendanceRecord.aggregate([
        {
          $match: {
            markedAt: { $gte: startDate }
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
        { $sort: { _id: 1 } }
      ]),

      // Session analytics
      AttendanceSession.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
            },
            avgSessionDuration: {
              $avg: {
                $subtract: [
                  { $ifNull: ["$expiresAt", new Date()] },
                  "$createdAt"
                ]
              }
            }
          }
        }
      ]),

      // Peak usage hours
      AttendanceRecord.aggregate([
        {
          $match: {
            markedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $hour: "$markedAt"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Attendance rates by class
      AttendanceRecord.aggregate([
        {
          $match: {
            markedAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'attendancesessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session'
          }
        },
        { $unwind: '$session' },
        {
          $lookup: {
            from: 'classes',
            localField: 'session.classId',
            foreignField: '_id',
            as: 'class'
          }
        },
        { $unwind: '$class' },
        {
          $group: {
            _id: '$class._id',
            className: { $first: '$class.name' },
            subject: { $first: '$class.subject' },
            attendanceCount: { $sum: 1 },
            uniqueStudents: { $addToSet: '$studentId' }
          }
        },
        {
          $lookup: {
            from: 'enrollments',
            let: { classId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$classId', '$$classId'] },
                      { $eq: ['$isActive', true] }
                    ]
                  }
                }
              }
            ],
            as: 'enrollments'
          }
        },
        {
          $addFields: {
            enrolledStudents: { $size: '$enrollments' },
            uniqueAttendees: { $size: '$uniqueStudents' },
            attendanceRate: {
              $cond: [
                { $gt: [{ $size: '$enrollments' }, 0] },
                {
                  $multiply: [
                    { $divide: [{ $size: '$uniqueStudents' }, { $size: '$enrollments' }] },
                    100
                  ]
                },
                0
              ]
            }
          }
        },
        { $sort: { attendanceRate: -1 } }
      ]),

      // Teacher activity
      AttendanceSession.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'classId',
            foreignField: '_id',
            as: 'class'
          }
        },
        { $unwind: '$class' },
        {
          $lookup: {
            from: 'users',
            localField: 'class.teacherId',
            foreignField: '_id',
            as: 'teacher'
          }
        },
        { $unwind: '$teacher' },
        {
          $group: {
            _id: '$teacher._id',
            teacherName: { $first: '$teacher.name' },
            teacherEmail: { $first: '$teacher.email' },
            sessionsCreated: { $sum: 1 },
            classesUsed: { $addToSet: '$class._id' }
          }
        },
        {
          $addFields: {
            activeClasses: { $size: '$classesUsed' }
          }
        },
        { $sort: { sessionsCreated: -1 } }
      ]),

      // Student engagement
      AttendanceRecord.aggregate([
        {
          $match: {
            markedAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $group: {
            _id: '$student._id',
            studentName: { $first: '$student.name' },
            studentEmail: { $first: '$student.email' },
            attendanceCount: { $sum: 1 },
            classesAttended: { $addToSet: '$sessionId' },
            lastAttendance: { $max: '$markedAt' }
          }
        },
        {
          $addFields: {
            uniqueSessions: { $size: '$classesAttended' }
          }
        },
        { $sort: { attendanceCount: -1 } },
        { $limit: 20 }
      ])
    ]);

    // Calculate system health metrics
    const totalUsers = await User.countDocuments({ isActive: true });
    const activeTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const activeStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalClasses = await Class.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments({ isActive: true });

    const systemHealth = {
      userUtilization: totalUsers > 0 ? (activeTeachers + activeStudents) / totalUsers * 100 : 0,
      classUtilization: totalClasses > 0 ? (attendanceRates.length / totalClasses) * 100 : 0,
      enrollmentRate: totalClasses > 0 ? totalEnrollments / totalClasses : 0,
      averageAttendanceRate: attendanceRates.length > 0 
        ? attendanceRates.reduce((sum, cls) => sum + cls.attendanceRate, 0) / attendanceRates.length 
        : 0
    };

    const analytics = {
      period: periodDays,
      growth: {
        users: userGrowth,
        classes: classGrowth,
        attendance: attendanceGrowth
      },
      sessions: sessionAnalytics[0] || {
        totalSessions: 0,
        activeSessions: 0,
        avgSessionDuration: 0
      },
      usage: {
        peakHours: peakUsageHours,
        attendanceRates: attendanceRates.slice(0, 10), // Top 10 classes
        teacherActivity: teacherActivity.slice(0, 10), // Top 10 teachers
        studentEngagement: studentEngagement.slice(0, 10) // Top 10 students
      },
      systemHealth
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}