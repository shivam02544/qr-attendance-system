import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: [true, 'Session ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  studentLocation: {
    lat: {
      type: Number,
      required: [true, 'Student latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    lng: {
      type: Number,
      required: [true, 'Student longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  }
}, {
  timestamps: true
});

// Compound index to ensure unique attendance per student per session
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

// Additional indexes for faster queries
attendanceRecordSchema.index({ studentId: 1 });
attendanceRecordSchema.index({ sessionId: 1 });
attendanceRecordSchema.index({ markedAt: 1 });
attendanceRecordSchema.index({ 'studentLocation.lat': 1, 'studentLocation.lng': 1 });

// Pre-save validation
attendanceRecordSchema.pre('save', async function(next) {
  try {
    // Validate student exists and is active
    const User = mongoose.model('User');
    const student = await User.findById(this.studentId);
    
    if (!student) {
      return next(new Error('Student not found'));
    }
    
    if (student.role !== 'student') {
      return next(new Error('Only students can mark attendance'));
    }
    
    if (!student.isActive) {
      return next(new Error('Inactive student cannot mark attendance'));
    }
    
    // Validate session exists and is valid
    const AttendanceSession = mongoose.model('AttendanceSession');
    const session = await AttendanceSession.findById(this.sessionId).populate('classId');
    
    if (!session) {
      return next(new Error('Attendance session not found'));
    }
    
    if (!session.isActive) {
      return next(new Error('Attendance session is not active'));
    }
    
    if (session.isExpired) {
      return next(new Error('Attendance session has expired'));
    }
    
    // Validate student is enrolled in the class
    const Enrollment = mongoose.model('Enrollment');
    const isEnrolled = await Enrollment.isStudentEnrolled(this.studentId, session.classId._id);
    
    if (!isEnrolled) {
      return next(new Error('Student is not enrolled in this class'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find attendance by student
attendanceRecordSchema.statics.findByStudent = function(studentId, startDate, endDate) {
  const query = { studentId };
  
  if (startDate || endDate) {
    query.markedAt = {};
    if (startDate) query.markedAt.$gte = new Date(startDate);
    if (endDate) query.markedAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate({
      path: 'sessionId',
      populate: {
        path: 'classId',
        select: 'name subject location'
      }
    })
    .populate('studentId', 'name email')
    .sort({ markedAt: -1 });
};

// Static method to find attendance by session
attendanceRecordSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId })
    .populate('studentId', 'name email')
    .populate({
      path: 'sessionId',
      populate: {
        path: 'classId',
        select: 'name subject'
      }
    })
    .sort({ markedAt: 1 });
};

// Static method to find attendance by class
attendanceRecordSchema.statics.findByClass = function(classId, startDate, endDate) {
  const pipeline = [
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
    }
  ];
  
  if (startDate || endDate) {
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) dateMatch.$lte = new Date(endDate);
    pipeline.push({
      $match: {
        markedAt: dateMatch
      }
    });
  }
  
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student'
      }
    },
    {
      $unwind: '$student'
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
      $sort: { markedAt: -1 }
    }
  );
  
  return this.aggregate(pipeline);
};

// Static method to get attendance statistics for a class
attendanceRecordSchema.statics.getClassStats = async function(classId, startDate, endDate) {
  const pipeline = [
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
    }
  ];
  
  if (startDate || endDate) {
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) dateMatch.$lte = new Date(endDate);
    pipeline.push({
      $match: {
        markedAt: dateMatch
      }
    });
  }
  
  pipeline.push(
    {
      $group: {
        _id: '$studentId',
        attendanceCount: { $sum: 1 },
        lastAttendance: { $max: '$markedAt' },
        firstAttendance: { $min: '$markedAt' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'student'
      }
    },
    {
      $unwind: '$student'
    },
    {
      $project: {
        studentId: '$_id',
        studentName: '$student.name',
        studentEmail: '$student.email',
        attendanceCount: 1,
        lastAttendance: 1,
        firstAttendance: 1
      }
    },
    {
      $sort: { attendanceCount: -1 }
    }
  );
  
  return this.aggregate(pipeline);
};

// Static method to check if student has already marked attendance for a session
attendanceRecordSchema.statics.hasStudentAttended = async function(sessionId, studentId) {
  const record = await this.findOne({ sessionId, studentId });
  return !!record;
};

// Method to calculate distance from class location
attendanceRecordSchema.methods.distanceFromClass = async function() {
  const session = await mongoose.model('AttendanceSession')
    .findById(this.sessionId)
    .populate('classId');
  
  if (!session || !session.classId) {
    throw new Error('Session or class not found');
  }
  
  const classLocation = session.classId.location;
  const studentLocation = this.studentLocation;
  
  // Haversine formula to calculate distance
  const R = 6371000; // Earth's radius in meters
  const dLat = (studentLocation.lat - classLocation.lat) * Math.PI / 180;
  const dLng = (studentLocation.lng - classLocation.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(classLocation.lat * Math.PI / 180) * Math.cos(studentLocation.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

export default mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);