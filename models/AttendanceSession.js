import mongoose from 'mongoose';
import crypto from 'crypto';

const attendanceSessionSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class ID is required']
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return crypto.randomBytes(32).toString('hex');
    }
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    default: function() {
      // Default to 30 minutes from now
      return new Date(Date.now() + 30 * 60 * 1000);
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
attendanceSessionSchema.index({ sessionToken: 1 }, { unique: true });
attendanceSessionSchema.index({ classId: 1 });
attendanceSessionSchema.index({ expiresAt: 1 });
attendanceSessionSchema.index({ isActive: 1 });
attendanceSessionSchema.index({ createdAt: 1 });

// TTL index to automatically delete expired sessions after 24 hours
attendanceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

// Virtual to check if session is expired
attendanceSessionSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual to check if session is valid (active and not expired)
attendanceSessionSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired;
});

// Virtual to get remaining time in minutes
attendanceSessionSchema.virtual('remainingMinutes').get(function() {
  if (this.isExpired) return 0;
  return Math.ceil((this.expiresAt - new Date()) / (1000 * 60));
});

// Pre-save middleware to ensure expiration time is in the future
attendanceSessionSchema.pre('save', function(next) {
  if (this.isNew && this.expiresAt <= new Date()) {
    return next(new Error('Expiration time must be in the future'));
  }
  next();
});

// Static method to find active sessions for a class
attendanceSessionSchema.statics.findActiveByClass = function(classId) {
  return this.find({
    classId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('classId', 'name subject location');
};

// Static method to find session by token
attendanceSessionSchema.statics.findByToken = function(sessionToken) {
  return this.findOne({ sessionToken })
    .populate('classId', 'name subject location teacherId');
};

// Static method to find valid session by token
attendanceSessionSchema.statics.findValidByToken = function(sessionToken) {
  return this.findOne({
    sessionToken,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('classId', 'name subject location teacherId');
};

// Static method to create new session (deactivates existing active sessions for the class)
attendanceSessionSchema.statics.createForClass = async function(classId, durationMinutes = 30) {
  // Deactivate any existing active sessions for this class
  await this.updateMany(
    { classId, isActive: true },
    { isActive: false }
  );
  
  // Create new session
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  return this.create({
    classId,
    expiresAt
  });
};

// Static method to cleanup expired sessions
attendanceSessionSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    {
      isActive: true,
      expiresAt: { $lte: new Date() }
    },
    { isActive: false }
  );
};

// Method to extend session duration
attendanceSessionSchema.methods.extend = function(additionalMinutes = 15) {
  if (this.isExpired) {
    throw new Error('Cannot extend expired session');
  }
  
  this.expiresAt = new Date(this.expiresAt.getTime() + additionalMinutes * 60 * 1000);
  return this.save();
};

// Method to deactivate session
attendanceSessionSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Method to get QR code data
attendanceSessionSchema.methods.getQRData = function() {
  if (!this.isValid) {
    throw new Error('Cannot generate QR data for invalid session');
  }
  
  return {
    sessionToken: this.sessionToken,
    classId: this.classId._id.toString(),
    className: this.classId.name,
    location: this.classId.location,
    expiresAt: this.expiresAt
  };
};

export default mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema);