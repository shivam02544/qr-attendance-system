import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [100, 'Class name cannot exceed 100 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required']
  },
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      maxlength: [200, 'Location name cannot exceed 200 characters']
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
classSchema.index({ teacherId: 1 });
classSchema.index({ name: 1 });
classSchema.index({ subject: 1 });
classSchema.index({ 'location.lat': 1, 'location.lng': 1 }); // Geospatial index for location queries

// Virtual for getting enrolled students count
classSchema.virtual('enrollmentCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'classId',
  count: true,
  match: { isActive: true }
});

// Static method to find classes by teacher
classSchema.statics.findByTeacher = function(teacherId) {
  return this.find({ teacherId }).populate('teacherId', 'name email');
};

// Static method to find classes within a certain distance
classSchema.statics.findNearLocation = function(lat, lng, maxDistance = 1000) {
  return this.find({
    'location.lat': {
      $gte: lat - (maxDistance / 111000), // Rough conversion: 1 degree ≈ 111km
      $lte: lat + (maxDistance / 111000)
    },
    'location.lng': {
      $gte: lng - (maxDistance / (111000 * Math.cos(lat * Math.PI / 180))),
      $lte: lng + (maxDistance / (111000 * Math.cos(lat * Math.PI / 180)))
    }
  });
};

// Method to calculate distance from a point
classSchema.methods.distanceFrom = function(lat, lng) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat - this.location.lat) * Math.PI / 180;
  const dLng = (lng - this.location.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

export default mongoose.models.Class || mongoose.model('Class', classSchema);