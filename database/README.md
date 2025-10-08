# Database Setup

This directory contains all database-related files for the QR Attendance System.

## Files Overview

- **`../lib/mongodb.js`** - MongoDB connection utility with connection caching
- **`../models/`** - Mongoose models for all collections
- **`seed.js`** - Database seeding script with sample data
- **`helpers.js`** - Helper functions for common database operations
- **`utils.js`** - Database utility functions and maintenance scripts
- **`test-connection.js`** - Database connection test script

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your MongoDB connection:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set your MongoDB URI:

```env
MONGODB_URI=mongodb://localhost:27017/qr-attendance-system
```

### 2. Test Database Connection

Before proceeding, test your database connection:

```bash
npm run test-db
```

### 3. Seed Sample Data

Populate the database with sample data for development:

```bash
npm run seed
```

This will create:
- 1 Admin user
- 2 Teacher users  
- 5 Student users
- 3 Classes with different locations
- Student enrollments
- Sample attendance sessions and records

## Sample Login Credentials

After seeding, you can use these credentials:

**Admin:**
- Email: `admin@school.edu`
- Password: `admin123`

**Teachers:**
- Email: `john.doe@school.edu` / Password: `teacher123`
- Email: `jane.smith@school.edu` / Password: `teacher123`

**Students:**
- Email: `alice.johnson@student.edu` / Password: `student123`
- Email: `bob.wilson@student.edu` / Password: `student123`
- (and 3 more students)

## Database Schema

### Collections

1. **users** - User accounts (teachers, students, admins)
2. **classes** - Class information with location data
3. **enrollments** - Student-class relationships
4. **attendancesessions** - QR code sessions for attendance
5. **attendancerecords** - Individual attendance records

### Key Features

- **Automatic password hashing** using bcrypt
- **Location validation** for coordinates
- **Compound indexes** for performance
- **Data integrity validation** with pre-save hooks
- **TTL indexes** for automatic cleanup of expired sessions
- **Geospatial queries** for location-based features

## Helper Functions

The `helpers.js` file provides convenient functions for:

- User authentication and management
- Class creation and management
- Student enrollment operations
- Attendance session management
- Attendance record operations
- Dashboard statistics

Example usage:

```javascript
import { userHelpers, attendanceHelpers } from './database/helpers.js';

// Authenticate user
const user = await userHelpers.authenticate(email, password);

// Mark attendance
const record = await attendanceHelpers.markAttendance(
  sessionToken, 
  studentId, 
  { lat: 40.7128, lng: -74.0060 }
);
```

## Maintenance

### Cleanup Expired Sessions

```javascript
import { cleanupExpiredSessions } from './database/utils.js';
await cleanupExpiredSessions();
```

### Get System Statistics

```javascript
import { getSystemStats } from './database/utils.js';
const stats = await getSystemStats();
```

### Validate Data Integrity

```javascript
import { validateDataIntegrity } from './database/utils.js';
const validation = await validateDataIntegrity();
```

## MongoDB Indexes

The following indexes are automatically created:

**Users:**
- `email` (unique)
- `role`
- `isActive`

**Classes:**
- `teacherId`
- `name`
- `subject`
- `location.lat, location.lng` (geospatial)

**Enrollments:**
- `studentId, classId` (compound, unique)
- `studentId, isActive`
- `classId, isActive`

**Attendance Sessions:**
- `sessionToken` (unique)
- `classId`
- `expiresAt` (TTL)
- `isActive`

**Attendance Records:**
- `sessionId, studentId` (compound, unique)
- `studentId`
- `sessionId`
- `markedAt`
- `studentLocation.lat, studentLocation.lng`

## Error Handling

All models include comprehensive validation and error handling:

- Email format validation
- Password strength requirements
- Role validation
- Location coordinate validation
- Enrollment duplicate prevention
- Session expiration checks
- Distance validation for attendance

## Performance Considerations

- Connection pooling with Mongoose
- Efficient aggregation pipelines for reports
- Proper indexing for fast queries
- TTL indexes for automatic cleanup
- Geospatial indexes for location queries