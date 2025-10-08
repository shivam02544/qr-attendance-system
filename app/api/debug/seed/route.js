import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Class from '../../../../models/Class';
import User from '../../../../models/User';
import Enrollment from '../../../../models/Enrollment';
import AttendanceSession from '../../../../models/AttendanceSession';
import AttendanceRecord from '../../../../models/AttendanceRecord';
import mongoose from 'mongoose';

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Helper function to generate test student data
function generateTestStudentData(index) {
  const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index > 9 ? index : ''}@test.edu`;
  
  return {
    name: `${firstName} ${lastName}`,
    email: email,
    role: 'student',
    passwordHash: 'testpassword123', // Will be hashed by the model
    isActive: true
  };
}

// Helper function to generate random location near class location
function generateNearbyLocation(classLocation, maxDistanceMeters = 100) {
  // Convert meters to approximate degrees (rough conversion)
  const latOffset = (Math.random() - 0.5) * 2 * (maxDistanceMeters / 111000);
  const lngOffset = (Math.random() - 0.5) * 2 * (maxDistanceMeters / (111000 * Math.cos(classLocation.lat * Math.PI / 180)));
  
  return {
    lat: classLocation.lat + latOffset,
    lng: classLocation.lng + lngOffset
  };
}

// Helper function to create test students
async function createTestStudents(count, existingStudents = []) {
  const studentsToCreate = [];
  const existingEmails = new Set(existingStudents.map(s => s.email));
  
  let created = 0;
  let index = 0;
  
  while (created < count && index < count * 2) { // Prevent infinite loop
    const studentData = generateTestStudentData(index);
    
    if (!existingEmails.has(studentData.email)) {
      studentsToCreate.push(studentData);
      existingEmails.add(studentData.email);
      created++;
    }
    index++;
  }
  
  if (studentsToCreate.length === 0) {
    return [];
  }
  
  try {
    const createdStudents = await User.insertMany(studentsToCreate);
    return createdStudents;
  } catch (error) {
    console.error('Error creating test students:', error);
    // Try creating one by one if bulk insert fails
    const individuallyCreated = [];
    for (const studentData of studentsToCreate) {
      try {
        const student = await User.create(studentData);
        individuallyCreated.push(student);
      } catch (individualError) {
        console.error(`Failed to create student ${studentData.email}:`, individualError);
      }
    }
    return individuallyCreated;
  }
}

// Helper function to create enrollments
async function createEnrollments(classId, students) {
  const enrollmentsToCreate = [];
  const existingEnrollments = await Enrollment.find({ classId }).select('studentId');
  const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId.toString()));
  
  for (const student of students) {
    if (!existingStudentIds.has(student._id.toString())) {
      enrollmentsToCreate.push({
        studentId: student._id,
        classId: classId,
        enrolledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        isActive: true
      });
    }
  }
  
  if (enrollmentsToCreate.length === 0) {
    return [];
  }
  
  try {
    const createdEnrollments = await Enrollment.insertMany(enrollmentsToCreate);
    return createdEnrollments;
  } catch (error) {
    console.error('Error creating enrollments:', error);
    return [];
  }
}

// Helper function to create attendance sessions
async function createAttendanceSessions(classId, sessionCount, dateRange) {
  const sessionsToCreate = [];
  const { startDate, endDate } = dateRange;
  const timeSpan = endDate.getTime() - startDate.getTime();
  
  for (let i = 0; i < sessionCount; i++) {
    const sessionDate = new Date(startDate.getTime() + (timeSpan * i / (sessionCount - 1)));
    const sessionStart = new Date(sessionDate);
    sessionStart.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60)); // Random time between 9 AM and 5 PM
    
    const sessionEnd = new Date(sessionStart.getTime() + 30 * 60 * 1000); // 30 minutes duration
    const isExpired = sessionEnd < new Date();
    
    sessionsToCreate.push({
      classId: classId,
      expiresAt: sessionEnd,
      isActive: !isExpired, // Only active if not expired
      createdAt: sessionStart,
      updatedAt: sessionStart
    });
  }
  
  try {
    const createdSessions = await AttendanceSession.insertMany(sessionsToCreate);
    return createdSessions;
  } catch (error) {
    console.error('Error creating attendance sessions:', error);
    return [];
  }
}

// Helper function to create attendance records
async function createAttendanceRecords(sessions, enrolledStudents, classLocation, attendanceRate) {
  const recordsToCreate = [];
  
  for (const session of sessions) {
    // Determine how many students attended this session
    const attendingCount = Math.floor(enrolledStudents.length * attendanceRate);
    const attendingStudents = enrolledStudents
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, attendingCount);
    
    for (const student of attendingStudents) {
      // Check if record already exists
      const existingRecord = await AttendanceRecord.findOne({
        sessionId: session._id,
        studentId: student._id
      });
      
      if (!existingRecord) {
        const recordTime = new Date(session.createdAt.getTime() + Math.random() * 25 * 60 * 1000); // Within first 25 minutes of session
        
        recordsToCreate.push({
          sessionId: session._id,
          studentId: student._id,
          markedAt: recordTime,
          studentLocation: generateNearbyLocation(classLocation, 50), // Within 50 meters
          createdAt: recordTime,
          updatedAt: recordTime
        });
      }
    }
  }
  
  if (recordsToCreate.length === 0) {
    return [];
  }
  
  try {
    // Create records in batches to avoid overwhelming the database
    const batchSize = 50;
    const createdRecords = [];
    
    for (let i = 0; i < recordsToCreate.length; i += batchSize) {
      const batch = recordsToCreate.slice(i, i + batchSize);
      try {
        const batchResult = await AttendanceRecord.insertMany(batch);
        createdRecords.push(...batchResult);
      } catch (batchError) {
        console.error(`Error creating attendance records batch ${i}-${i + batchSize}:`, batchError);
        // Try creating individually for this batch
        for (const record of batch) {
          try {
            const individualRecord = await AttendanceRecord.create(record);
            createdRecords.push(individualRecord);
          } catch (individualError) {
            console.error(`Failed to create individual attendance record:`, individualError);
          }
        }
      }
    }
    
    return createdRecords;
  } catch (error) {
    console.error('Error creating attendance records:', error);
    return [];
  }
}

export async function POST(request) {
  try {
    // Connect to database
    await dbConnect();
    
    const body = await request.json();
    const {
      classId,
      studentCount = 10,
      sessionCount = 5,
      attendanceRate = 0.8,
      dateRange = {
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        endDate: new Date()
      },
      forceCreate = false // If true, create new students even if existing ones are available
    } = body;
    
    // Validate required parameters
    if (!classId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter',
        details: 'classId is required'
      }, { status: 400 });
    }
    
    if (!isValidObjectId(classId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid class ID format',
        details: 'Class ID must be a valid MongoDB ObjectId'
      }, { status: 400 });
    }
    
    // Validate parameters
    if (studentCount < 1 || studentCount > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid student count',
        details: 'Student count must be between 1 and 100'
      }, { status: 400 });
    }
    
    if (sessionCount < 1 || sessionCount > 50) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session count',
        details: 'Session count must be between 1 and 50'
      }, { status: 400 });
    }
    
    if (attendanceRate < 0 || attendanceRate > 1) {
      return NextResponse.json({
        success: false,
        error: 'Invalid attendance rate',
        details: 'Attendance rate must be between 0 and 1'
      }, { status: 400 });
    }
    
    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return NextResponse.json({
        success: false,
        error: 'Class not found',
        details: 'Cannot seed data for non-existent class'
      }, { status: 404 });
    }
    
    // Parse date range
    const parsedDateRange = {
      startDate: new Date(dateRange.startDate),
      endDate: new Date(dateRange.endDate)
    };
    
    if (parsedDateRange.startDate >= parsedDateRange.endDate) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date range',
        details: 'Start date must be before end date'
      }, { status: 400 });
    }
    
    const results = {
      classId: classId,
      className: classDoc.name,
      studentsCreated: 0,
      studentsUsed: 0,
      enrollmentsCreated: 0,
      sessionsCreated: 0,
      recordsCreated: 0,
      errors: []
    };
    
    try {
      // Step 1: Get or create students
      let studentsToUse = [];
      
      if (!forceCreate) {
        // Try to use existing students first
        const existingStudents = await User.find({ 
          role: 'student', 
          isActive: true 
        }).limit(studentCount);
        
        if (existingStudents.length >= studentCount) {
          studentsToUse = existingStudents.slice(0, studentCount);
          results.studentsUsed = studentsToUse.length;
        } else {
          // Use existing students and create additional ones
          studentsToUse = [...existingStudents];
          const additionalNeeded = studentCount - existingStudents.length;
          
          const newStudents = await createTestStudents(additionalNeeded, existingStudents);
          studentsToUse.push(...newStudents);
          results.studentsCreated = newStudents.length;
          results.studentsUsed = existingStudents.length;
        }
      } else {
        // Force create new students
        const existingStudents = await User.find({ role: 'student' }).select('email');
        const newStudents = await createTestStudents(studentCount, existingStudents);
        studentsToUse = newStudents;
        results.studentsCreated = newStudents.length;
      }
      
      if (studentsToUse.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No students available',
          details: 'Could not create or find students for seeding'
        }, { status: 500 });
      }
      
      // Step 2: Create enrollments
      const enrollments = await createEnrollments(classId, studentsToUse);
      results.enrollmentsCreated = enrollments.length;
      
      // Get all enrolled students (including existing ones)
      const allEnrollments = await Enrollment.find({ classId, isActive: true })
        .populate('studentId');
      const enrolledStudents = allEnrollments.map(e => e.studentId);
      
      // Step 3: Create attendance sessions
      const sessions = await createAttendanceSessions(classId, sessionCount, parsedDateRange);
      results.sessionsCreated = sessions.length;
      
      if (sessions.length === 0) {
        results.errors.push('Failed to create attendance sessions');
      }
      
      // Step 4: Create attendance records
      if (sessions.length > 0 && enrolledStudents.length > 0) {
        const records = await createAttendanceRecords(
          sessions, 
          enrolledStudents, 
          classDoc.location, 
          attendanceRate
        );
        results.recordsCreated = records.length;
      }
      
      // Generate summary
      const summary = [
        `Seeded data for class "${classDoc.name}"`,
        `Students: ${results.studentsCreated} created, ${results.studentsUsed} existing used`,
        `Enrollments: ${results.enrollmentsCreated} created`,
        `Sessions: ${results.sessionsCreated} created`,
        `Attendance records: ${results.recordsCreated} created`
      ].join(' | ');
      
      return NextResponse.json({
        success: true,
        message: 'Data seeding completed successfully',
        data: {
          ...results,
          summary,
          configuration: {
            studentCount,
            sessionCount,
            attendanceRate,
            dateRange: parsedDateRange,
            forceCreate
          }
        }
      });
      
    } catch (seedingError) {
      console.error('Seeding process error:', seedingError);
      return NextResponse.json({
        success: false,
        error: 'Seeding process failed',
        details: seedingError.message,
        partialResults: results
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Seed API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: 'An unexpected error occurred during seeding'
    }, { status: 500 });
  }
}

// GET method for retrieving seeding configuration options
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    if (!classId || !isValidObjectId(classId)) {
      return NextResponse.json({
        success: false,
        error: 'Valid class ID required',
        details: 'Provide a valid MongoDB ObjectId as classId parameter'
      }, { status: 400 });
    }
    
    // Check class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return NextResponse.json({
        success: false,
        error: 'Class not found',
        details: 'Cannot get seeding options for non-existent class'
      }, { status: 404 });
    }
    
    // Get current data state
    const existingStudents = await User.countDocuments({ role: 'student', isActive: true });
    const existingEnrollments = await Enrollment.countDocuments({ classId, isActive: true });
    const existingSessions = await AttendanceSession.countDocuments({ classId });
    const existingRecords = await AttendanceRecord.aggregate([
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
        $match: {
          'session.classId': new mongoose.Types.ObjectId(classId)
        }
      },
      {
        $count: 'total'
      }
    ]);
    
    const recordCount = existingRecords.length > 0 ? existingRecords[0].total : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        classInfo: {
          id: classDoc._id,
          name: classDoc.name,
          subject: classDoc.subject,
          location: classDoc.location
        },
        currentState: {
          totalStudents: existingStudents,
          enrolledStudents: existingEnrollments,
          sessions: existingSessions,
          attendanceRecords: recordCount
        },
        seedingOptions: {
          studentCount: {
            min: 1,
            max: 100,
            default: 10,
            description: 'Number of students to create/use for seeding'
          },
          sessionCount: {
            min: 1,
            max: 50,
            default: 5,
            description: 'Number of attendance sessions to create'
          },
          attendanceRate: {
            min: 0,
            max: 1,
            default: 0.8,
            description: 'Percentage of students attending each session (0.0 to 1.0)'
          },
          dateRange: {
            default: {
              startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              endDate: new Date()
            },
            description: 'Date range for creating attendance sessions'
          },
          forceCreate: {
            default: false,
            description: 'Force creation of new students instead of using existing ones'
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Seed options API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: 'Failed to retrieve seeding options'
    }, { status: 500 });
  }
}