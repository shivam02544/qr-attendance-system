import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class ID is required']
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique enrollment per student per class
enrollmentSchema.index({ studentId: 1, classId: 1 }, { unique: true });

// Additional indexes for faster queries
enrollmentSchema.index({ studentId: 1, isActive: 1 });
enrollmentSchema.index({ classId: 1, isActive: 1 });
enrollmentSchema.index({ enrolledAt: 1 });

// Pre-save validation to ensure student role
enrollmentSchema.pre('save', async function(next) {
  try {
    const User = mongoose.model('User');
    const student = await User.findById(this.studentId);
    
    if (!student) {
      return next(new Error('Student not found'));
    }
    
    if (student.role !== 'student') {
      return next(new Error('Only students can be enrolled in classes'));
    }
    
    if (!student.isActive) {
      return next(new Error('Cannot enroll inactive student'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find enrollments by student
enrollmentSchema.statics.findByStudent = function(studentId, activeOnly = true) {
  const query = { studentId };
  if (activeOnly) query.isActive = true;
  
  return this.find(query)
    .populate('classId', 'name subject location')
    .populate('studentId', 'name email');
};

// Static method to find enrollments by class
enrollmentSchema.statics.findByClass = function(classId, activeOnly = true) {
  const query = { classId };
  if (activeOnly) query.isActive = true;
  
  return this.find(query)
    .populate('studentId', 'name email')
    .populate('classId', 'name subject');
};

// Static method to check if student is enrolled in class
enrollmentSchema.statics.isStudentEnrolled = async function(studentId, classId) {
  const enrollment = await this.findOne({
    studentId,
    classId,
    isActive: true
  });
  return !!enrollment;
};

// Static method to get enrollment count for a class
enrollmentSchema.statics.getClassEnrollmentCount = function(classId) {
  return this.countDocuments({ classId, isActive: true });
};

// Static method to get student's active enrollments count
enrollmentSchema.statics.getStudentEnrollmentCount = function(studentId) {
  return this.countDocuments({ studentId, isActive: true });
};

// Method to deactivate enrollment
enrollmentSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Method to reactivate enrollment
enrollmentSchema.methods.reactivate = function() {
  this.isActive = true;
  return this.save();
};

export default mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);