// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

console.log('Loading environment variables from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('Warning: Could not load .env.local file:', result.error.message);
  console.log('Attempting to use system environment variables...');
}

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('\nPlease ensure your .env.local file exists and contains all required variables.');
  console.error('You can copy .env.local.example to .env.local and update the values.');
  process.exit(1);
}

console.log('Environment variables loaded successfully');
console.log('MongoDB URI configured:', process.env.MONGODB_URI ? 'Yes' : 'No');

// Import mongoose directly for standalone connection
import mongoose from 'mongoose';

// Import models (these don't check env vars at import time)
import User from '../models/User.js';
import Class from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';

// Standalone database connection function for seeding
async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (mongoose.connection.readyState === 1) {
    console.log('Using existing database connection');
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    console.log('New database connection established');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

async function seedDatabase() {
  try {
    console.log('\n=== Database Seeding Started ===');
    console.log('Connecting to database...');
    
    try {
      await connectToDatabase();
      console.log('✓ Database connection established');
    } catch (dbError) {
      console.error('✗ Database connection failed:', dbError.message);
      console.error('Please check your MONGODB_URI and ensure MongoDB is running.');
      throw dbError;
    }
    
    console.log('\nClearing existing data...');
    const deleteResults = await Promise.all([
      AttendanceRecord.deleteMany({}),
      AttendanceSession.deleteMany({}),
      Enrollment.deleteMany({}),
      Class.deleteMany({}),
      User.deleteMany({})
    ]);
    
    const totalDeleted = deleteResults.reduce((sum, result) => sum + result.deletedCount, 0);
    console.log(`✓ Cleared ${totalDeleted} existing records`);
    
    console.log('\nCreating users...');
    // Create admin user
    const admin = await User.create({
      email: 'admin@school.edu',
      name: 'System Administrator',
      role: 'admin',
      passwordHash: 'admin123' // Will be hashed by pre-save middleware
    });
    console.log('✓ Created admin user:', admin.email);
    
    // Create teachers
    const teacher1 = await User.create({
      email: 'john.doe@school.edu',
      name: 'John Doe',
      role: 'teacher',
      passwordHash: 'teacher123'
    });
    console.log('✓ Created teacher:', teacher1.email);
    
    const teacher2 = await User.create({
      email: 'jane.smith@school.edu',
      name: 'Jane Smith',
      role: 'teacher',
      passwordHash: 'teacher123'
    });
    console.log('✓ Created teacher:', teacher2.email);   
 
    // Create students
    const students = await User.create([
      {
        email: 'alice.johnson@student.edu',
        name: 'Alice Johnson',
        role: 'student',
        passwordHash: 'student123'
      },
      {
        email: 'bob.wilson@student.edu',
        name: 'Bob Wilson',
        role: 'student',
        passwordHash: 'student123'
      },
      {
        email: 'carol.brown@student.edu',
        name: 'Carol Brown',
        role: 'student',
        passwordHash: 'student123'
      },
      {
        email: 'david.davis@student.edu',
        name: 'David Davis',
        role: 'student',
        passwordHash: 'student123'
      },
      {
        email: 'eva.martinez@student.edu',
        name: 'Eva Martinez',
        role: 'student',
        passwordHash: 'student123'
      }
    ]);
    console.log(`✓ Created ${students.length} students`);
    
    console.log('\nCreating classes...');
    // Create classes
    const class1 = await Class.create({
      name: 'Introduction to Computer Science',
      subject: 'Computer Science',
      teacherId: teacher1._id,
      location: {
        lat: 40.7128,
        lng: -74.0060,
        name: 'Room 101, Computer Science Building'
      }
    });
    console.log('✓ Created class:', class1.name);
    
    const class2 = await Class.create({
      name: 'Advanced Mathematics',
      subject: 'Mathematics',
      teacherId: teacher1._id,
      location: {
        lat: 40.7130,
        lng: -74.0058,
        name: 'Room 205, Mathematics Building'
      }
    });
    console.log('✓ Created class:', class2.name);
    
    const class3 = await Class.create({
      name: 'Physics Laboratory',
      subject: 'Physics',
      teacherId: teacher2._id,
      location: {
        lat: 40.7125,
        lng: -74.0062,
        name: 'Lab 301, Physics Building'
      }
    });
    console.log('✓ Created class:', class3.name);
    
    console.log('\nCreating enrollments...');
    // Create enrollments
    const enrollments = [];
    
    // Enroll students in classes
    for (const student of students) {
      // Each student enrolls in 2-3 classes
      const classesToEnroll = [class1, class2, class3].slice(0, Math.floor(Math.random() * 2) + 2);
      
      for (const classToEnroll of classesToEnroll) {
        enrollments.push({
          studentId: student._id,
          classId: classToEnroll._id
        });
      }
    }
    
    await Enrollment.create(enrollments);
    console.log(`✓ Created ${enrollments.length} enrollments`);
    
    console.log('\nCreating sample attendance sessions...');
    // Create some sample attendance sessions (some active, some expired)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    const session1 = await AttendanceSession.create({
      classId: class1._id,
      expiresAt: oneHourFromNow, // Active session
      isActive: true
    });
    console.log('✓ Created active session for:', class1.name);
    
    // For expired session, we need to create it with a future expiration first, then update it
    const session2 = await AttendanceSession.create({
      classId: class2._id,
      expiresAt: oneHourFromNow, // Create with future expiration first
      isActive: false
    });
    
    // Now update it to be expired
    await AttendanceSession.findByIdAndUpdate(session2._id, {
      expiresAt: oneHourAgo,
      createdAt: twoHoursAgo,
      isActive: false
    });
    console.log('✓ Created expired session for:', class2.name);
    
    console.log('\nCreating sample attendance records...');
    // Create some attendance records for the expired session
    // We need to bypass validation for seeding, so we'll use insertMany with validation disabled
    const attendanceRecords = [];
    const enrolledStudents = students.slice(0, 3); // First 3 students
    
    for (const student of enrolledStudents) {
      attendanceRecords.push({
        sessionId: session2._id,
        studentId: student._id,
        markedAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000), // 5 minutes after session started
        studentLocation: {
          lat: class2.location.lat + (Math.random() - 0.5) * 0.001, // Within ~50m of class
          lng: class2.location.lng + (Math.random() - 0.5) * 0.001
        },
        createdAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000),
        updatedAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000)
      });
    }
    
    // Use insertMany to bypass pre-save validation for seeding
    await AttendanceRecord.collection.insertMany(attendanceRecords);
    console.log(`✓ Created ${attendanceRecords.length} attendance records`);
    
    console.log('\n=== Database Seeding Completed Successfully! ===');
    console.log('\n📋 Summary:');
    console.log(`   • Users: 1 admin, 2 teachers, ${students.length} students`);
    console.log(`   • Classes: 3 classes created`);
    console.log(`   • Enrollments: ${enrollments.length} student enrollments`);
    console.log(`   • Sessions: 1 active, 1 expired`);
    console.log(`   • Records: ${attendanceRecords.length} attendance records`);
    
    console.log('\n🔑 Sample login credentials:');
    console.log('   Admin: admin@school.edu / admin123');
    console.log('   Teacher: john.doe@school.edu / teacher123');
    console.log('   Teacher: jane.smith@school.edu / teacher123');
    console.log('   Student: alice.johnson@student.edu / student123');
    console.log('   Student: bob.wilson@student.edu / student123');
    
    console.log('\n📊 Test Data Available:');
    console.log('   • Active attendance session for "Introduction to Computer Science"');
    console.log('   • Historical attendance data for "Advanced Mathematics"');
    console.log('   • Multiple student enrollments across classes');
    
    const result = {
      success: true,
      summary: {
        users: students.length + 3, // students + admin + 2 teachers
        classes: 3,
        enrollments: enrollments.length,
        sessions: 2,
        records: attendanceRecords.length
      }
    };
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Database seeding failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.message.includes('connection')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   • Check if MongoDB is running');
      console.error('   • Verify MONGODB_URI in .env.local');
      console.error('   • Ensure network connectivity');
    } else if (error.code === 11000) {
      console.error('\n💡 This appears to be a duplicate key error.');
      console.error('   • The database may already contain some of this data');
      console.error('   • Try clearing the database first or use different test data');
    }
    
    const result = {
      success: false,
      error: error.message
    };
    
    return result;
  } finally {
    // Only close connection and exit if running as standalone script
    if (currentFile === executedFile) {
      console.log('\n🔄 Closing database connection...');
      process.exit(0);
    }
  }
}

// Run the seed function if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1];

if (currentFile === executedFile) {
  console.log('Starting seed function...');
  seedDatabase().catch(error => {
    console.error('Seed function failed:', error);
    process.exit(1);
  });
}

export default seedDatabase;