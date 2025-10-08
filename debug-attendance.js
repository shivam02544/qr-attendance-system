import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

import connectDB from './lib/mongodb.js';
import Class from './models/Class.js';
import AttendanceSession from './models/AttendanceSession.js';
import AttendanceRecord from './models/AttendanceRecord.js';
import Enrollment from './models/Enrollment.js';
import User from './models/User.js';

async function debugAttendance() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    const classId = '68e576c7480c496ebda33b19';
    console.log(`\nChecking data for class ID: ${classId}`);
    
    // Check if class exists
    const classDoc = await Class.findById(classId);
    console.log('Class found:', classDoc ? classDoc.name : 'NOT FOUND');
    
    if (classDoc) {
      // Check enrollments
      const enrollments = await Enrollment.find({ classId }).populate('studentId', 'name email');
      console.log(`Enrollments: ${enrollments.length}`);
      enrollments.forEach(e => console.log(`  - ${e.studentId.name} (${e.studentId.email})`));
      
      // Check attendance sessions
      const sessions = await AttendanceSession.find({ classId });
      console.log(`\nAttendance Sessions: ${sessions.length}`);
      sessions.forEach(s => console.log(`  - ${s._id} (Active: ${s.isActive}, Expires: ${s.expiresAt})`));
      
      // Check attendance records
      const records = await AttendanceRecord.findByClass(classId);
      console.log(`\nAttendance Records: ${records.length}`);
      records.forEach(r => console.log(`  - Student: ${r.student?.name}, Session: ${r.sessionId}, Date: ${r.markedAt}`));
      
      // Test the API method directly
      console.log('\nTesting API methods...');
      const startDate = '2025-09-07';
      const endDate = '2025-10-07';
      
      const attendanceData = await AttendanceRecord.findByClass(classId, startDate, endDate);
      console.log(`API findByClass result: ${attendanceData.length} records`);
      
      const classStats = await AttendanceRecord.getClassStats(classId, startDate, endDate);
      console.log(`API getClassStats result: ${classStats.length} stats`);
    }
    
    // List all classes
    console.log('\nAll classes in database:');
    const allClasses = await Class.find({});
    allClasses.forEach(c => console.log(`  - ${c._id}: ${c.name} (Teacher: ${c.teacherId})`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugAttendance();