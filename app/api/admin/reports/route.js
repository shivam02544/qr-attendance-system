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
    const reportType = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.markedAt = {};
      if (startDate) {
        dateFilter.markedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.markedAt.$lte = end;
      }
    }

    switch (reportType) {
      case 'overview':
        return await getOverviewReport(dateFilter);
      
      case 'class':
        return await getClassReport(classId, dateFilter);
      
      case 'teacher':
        return await getTeacherReport(teacherId, dateFilter);
      
      case 'attendance':
        return await getAttendanceReport(dateFilter, classId, teacherId);
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function getOverviewReport(dateFilter) {
  const [
    totalAttendance,
    attendanceByClass,
    attendanceByTeacher,
    attendanceTrends
  ] = await Promise.all([
    // Total attendance records
    AttendanceRecord.countDocuments(dateFilter),
    
    // Attendance by class
    AttendanceRecord.aggregate([
      { $match: dateFilter },
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
          attendanceCount: { $sum: 1 }
        }
      },
      { $sort: { attendanceCount: -1 } }
    ]),
    
    // Attendance by teacher
    AttendanceRecord.aggregate([
      { $match: dateFilter },
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
          attendanceCount: { $sum: 1 },
          classCount: { $addToSet: '$class._id' }
        }
      },
      {
        $addFields: {
          classCount: { $size: '$classCount' }
        }
      },
      { $sort: { attendanceCount: -1 } }
    ]),
    
    // Daily attendance trends
    AttendanceRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$markedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  return NextResponse.json({
    overview: {
      totalAttendance,
      attendanceByClass,
      attendanceByTeacher,
      attendanceTrends
    }
  });
}

async function getClassReport(classId, dateFilter) {
  if (!classId) {
    return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
  }

  // Get class details
  const classDetails = await Class.findById(classId)
    .populate('teacherId', 'name email');

  if (!classDetails) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  // Get enrolled students
  const enrollments = await Enrollment.find({ classId, isActive: true })
    .populate('studentId', 'name email');

  // Get attendance records for this class
  const attendanceRecords = await AttendanceRecord.aggregate([
    { $match: dateFilter },
    {
      $lookup: {
        from: 'attendancesessions',
        localField: 'sessionId',
        foreignField: '_id',
        as: 'session'
      }
    },
    { $unwind: '$session' },
    { $match: { 'session.classId': classDetails._id } },
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
      $project: {
        studentId: 1,
        studentName: '$student.name',
        studentEmail: '$student.email',
        markedAt: 1,
        sessionId: 1
      }
    },
    { $sort: { markedAt: -1 } }
  ]);

  // Calculate attendance statistics per student
  const studentStats = enrollments.map(enrollment => {
    const studentAttendance = attendanceRecords.filter(
      record => record.studentId.toString() === enrollment.studentId._id.toString()
    );
    
    return {
      student: enrollment.studentId,
      attendanceCount: studentAttendance.length,
      lastAttendance: studentAttendance.length > 0 ? studentAttendance[0].markedAt : null
    };
  });

  return NextResponse.json({
    classReport: {
      classDetails,
      enrolledStudents: enrollments.length,
      totalAttendanceRecords: attendanceRecords.length,
      studentStatistics: studentStats,
      recentAttendance: attendanceRecords.slice(0, 50) // Last 50 records
    }
  });
}

async function getTeacherReport(teacherId, dateFilter) {
  if (!teacherId) {
    return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
  }

  // Get teacher details
  const teacher = await User.findById(teacherId).select('-passwordHash');
  if (!teacher || teacher.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  // Get teacher's classes
  const classes = await Class.find({ teacherId });

  // Get attendance data for teacher's classes
  const attendanceData = await AttendanceRecord.aggregate([
    { $match: dateFilter },
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
    { $match: { 'class.teacherId': teacher._id } },
    {
      $group: {
        _id: '$class._id',
        className: { $first: '$class.name' },
        subject: { $first: '$class.subject' },
        attendanceCount: { $sum: 1 }
      }
    },
    { $sort: { attendanceCount: -1 } }
  ]);

  return NextResponse.json({
    teacherReport: {
      teacher,
      totalClasses: classes.length,
      classesData: attendanceData,
      totalAttendanceRecords: attendanceData.reduce((sum, cls) => sum + cls.attendanceCount, 0)
    }
  });
}

async function getAttendanceReport(dateFilter, classId, teacherId) {
  let pipeline = [
    { $match: dateFilter },
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
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' },
    {
      $lookup: {
        from: 'users',
        localField: 'class.teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' }
  ];

  // Add filters
  if (classId) {
    pipeline.push({ $match: { 'class._id': classId } });
  }
  if (teacherId) {
    pipeline.push({ $match: { 'teacher._id': teacherId } });
  }

  pipeline.push(
    {
      $project: {
        studentName: '$student.name',
        studentEmail: '$student.email',
        className: '$class.name',
        subject: '$class.subject',
        teacherName: '$teacher.name',
        markedAt: 1,
        studentLocation: 1
      }
    },
    { $sort: { markedAt: -1 } },
    { $limit: 1000 } // Limit to prevent large responses
  );

  const attendanceRecords = await AttendanceRecord.aggregate(pipeline);

  return NextResponse.json({
    attendanceReport: {
      records: attendanceRecords,
      totalRecords: attendanceRecords.length
    }
  });
}