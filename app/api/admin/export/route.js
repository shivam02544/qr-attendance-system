import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb.js';
import AttendanceRecord from '../../../../models/AttendanceRecord';
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
    const exportType = searchParams.get('type') || 'attendance';
    const format = searchParams.get('format') || 'json';
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

    let data;
    let filename;

    switch (exportType) {
      case 'attendance':
        data = await exportAttendanceData(dateFilter, classId, teacherId);
        filename = `attendance_export_${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'users':
        data = await exportUsersData();
        filename = `users_export_${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'classes':
        data = await exportClassesData();
        filename = `classes_export_${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'enrollments':
        data = await exportEnrollmentsData();
        filename = `enrollments_export_${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'comprehensive':
        data = await exportComprehensiveData(dateFilter);
        filename = `comprehensive_export_${new Date().toISOString().split('T')[0]}`;
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data, exportType);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });
    }

    // Default to JSON
    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}.json"`
      }
    });
  } catch (error) {
    console.error('Admin export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

async function exportAttendanceData(dateFilter, classId, teacherId) {
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
        attendanceId: '$_id',
        studentName: '$student.name',
        studentEmail: '$student.email',
        className: '$class.name',
        subject: '$class.subject',
        teacherName: '$teacher.name',
        teacherEmail: '$teacher.email',
        markedAt: 1,
        sessionCreatedAt: '$session.createdAt',
        studentLocation: 1,
        classLocation: '$class.location'
      }
    },
    { $sort: { markedAt: -1 } }
  );

  return await AttendanceRecord.aggregate(pipeline);
}

async function exportUsersData() {
  return await User.find({})
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean();
}

async function exportClassesData() {
  return await Class.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
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
        teacher: { $arrayElemAt: ['$teacher', 0] },
        enrollmentCount: { $size: '$enrollments' }
      }
    },
    {
      $project: {
        name: 1,
        subject: 1,
        location: 1,
        createdAt: 1,
        updatedAt: 1,
        enrollmentCount: 1,
        teacherName: '$teacher.name',
        teacherEmail: '$teacher.email'
      }
    },
    { $sort: { createdAt: -1 } }
  ]);
}

async function exportEnrollmentsData() {
  return await Enrollment.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student'
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
    {
      $lookup: {
        from: 'users',
        let: { teacherId: { $arrayElemAt: ['$class.teacherId', 0] } },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$teacherId'] } } }
        ],
        as: 'teacher'
      }
    },
    {
      $addFields: {
        student: { $arrayElemAt: ['$student', 0] },
        class: { $arrayElemAt: ['$class', 0] },
        teacher: { $arrayElemAt: ['$teacher', 0] }
      }
    },
    {
      $project: {
        enrollmentId: '$_id',
        studentName: '$student.name',
        studentEmail: '$student.email',
        className: '$class.name',
        subject: '$class.subject',
        teacherName: '$teacher.name',
        teacherEmail: '$teacher.email',
        enrolledAt: 1,
        isActive: 1
      }
    },
    { $sort: { enrolledAt: -1 } }
  ]);
}

async function exportComprehensiveData(dateFilter) {
  const [
    attendanceData,
    usersData,
    classesData,
    enrollmentsData
  ] = await Promise.all([
    exportAttendanceData(dateFilter),
    exportUsersData(),
    exportClassesData(),
    exportEnrollmentsData()
  ]);

  return {
    exportDate: new Date().toISOString(),
    summary: {
      totalAttendanceRecords: attendanceData.length,
      totalUsers: usersData.length,
      totalClasses: classesData.length,
      totalEnrollments: enrollmentsData.length
    },
    data: {
      attendance: attendanceData,
      users: usersData,
      classes: classesData,
      enrollments: enrollmentsData
    }
  };
}

function convertToCSV(data, exportType) {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  let csvData = data;
  
  // Handle comprehensive export
  if (exportType === 'comprehensive' && data.data) {
    // For comprehensive export, we'll export attendance data as the main CSV
    csvData = data.data.attendance;
  }

  if (!Array.isArray(csvData) || csvData.length === 0) {
    return 'No data available';
  }

  // Get headers from the first object
  const headers = Object.keys(csvData[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...csvData.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          if (value instanceof Date) {
            value = value.toISOString();
          } else {
            value = JSON.stringify(value);
          }
        }
        
        // Escape commas and quotes in CSV
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }
        
        return value || '';
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}