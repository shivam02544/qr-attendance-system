# Data Seeding API Documentation

The seeding API provides comprehensive functionality for creating test data in the QR Attendance System. This is particularly useful for development, testing, and debugging purposes.

## Endpoints

### GET /api/debug/seed

Retrieves seeding configuration options and current data state for a class.

**Parameters:**
- `classId` (required): MongoDB ObjectId of the class

**Response:**
```json
{
  "success": true,
  "data": {
    "classInfo": {
      "id": "class_id",
      "name": "Class Name",
      "subject": "Subject",
      "location": { "lat": 40.7128, "lng": -74.0060, "name": "Location" }
    },
    "currentState": {
      "totalStudents": 5,
      "enrolledStudents": 3,
      "sessions": 2,
      "attendanceRecords": 10
    },
    "seedingOptions": {
      "studentCount": { "min": 1, "max": 100, "default": 10 },
      "sessionCount": { "min": 1, "max": 50, "default": 5 },
      "attendanceRate": { "min": 0, "max": 1, "default": 0.8 },
      "dateRange": { "default": { "startDate": "...", "endDate": "..." } },
      "forceCreate": { "default": false }
    }
  }
}
```

### POST /api/debug/seed

Creates test data for a class including students, enrollments, sessions, and attendance records.

**Request Body:**
```json
{
  "classId": "required_class_id",
  "studentCount": 10,
  "sessionCount": 5,
  "attendanceRate": 0.8,
  "dateRange": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-15T00:00:00.000Z"
  },
  "forceCreate": false
}
```

**Parameters:**
- `classId` (required): MongoDB ObjectId of the class
- `studentCount` (optional): Number of students to create/use (1-100, default: 10)
- `sessionCount` (optional): Number of attendance sessions to create (1-50, default: 5)
- `attendanceRate` (optional): Percentage of students attending each session (0.0-1.0, default: 0.8)
- `dateRange` (optional): Date range for creating sessions (default: last 14 days)
- `forceCreate` (optional): Force creation of new students instead of using existing ones (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Data seeding completed successfully",
  "data": {
    "classId": "class_id",
    "className": "Class Name",
    "studentsCreated": 2,
    "studentsUsed": 8,
    "enrollmentsCreated": 5,
    "sessionsCreated": 5,
    "recordsCreated": 20,
    "summary": "Seeded data for class...",
    "configuration": {
      "studentCount": 10,
      "sessionCount": 5,
      "attendanceRate": 0.8,
      "dateRange": { "startDate": "...", "endDate": "..." },
      "forceCreate": false
    }
  }
}
```

## Features

### Duplicate Prevention
- **Students**: Checks for existing email addresses before creating new students
- **Enrollments**: Prevents duplicate enrollments for the same student-class combination
- **Attendance Records**: Prevents duplicate attendance records for the same student-session combination

### Data Integrity
- **Validation**: All parameters are validated for proper ranges and formats
- **Relationships**: Ensures proper relationships between students, classes, enrollments, sessions, and records
- **Location Data**: Generates realistic location data near the class location for attendance records
- **Timestamps**: Creates realistic timestamps for sessions and attendance records within the specified date range

### Configurable Parameters
- **Student Count**: Control how many students to create or use
- **Session Count**: Control how many attendance sessions to create
- **Attendance Rate**: Control what percentage of students attend each session
- **Date Range**: Control the time period for creating sessions
- **Force Create**: Option to create new students instead of using existing ones

### Error Handling
- **Graceful Failures**: Continues processing even if individual operations fail
- **Partial Results**: Returns information about what was successfully created even if some operations fail
- **Detailed Error Messages**: Provides specific error information for debugging

## Usage Examples

### Basic Seeding
```bash
curl -X POST http://localhost:3000/api/debug/seed \
  -H "Content-Type: application/json" \
  -d '{"classId": "your_class_id"}'
```

### Custom Configuration
```bash
curl -X POST http://localhost:3000/api/debug/seed \
  -H "Content-Type: application/json" \
  -d '{
    "classId": "your_class_id",
    "studentCount": 15,
    "sessionCount": 8,
    "attendanceRate": 0.9,
    "dateRange": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    }
  }'
```

### Get Seeding Options
```bash
curl "http://localhost:3000/api/debug/seed?classId=your_class_id"
```

## Data Generated

### Students
- Realistic names using predefined first and last name combinations
- Unique email addresses in the format: `firstname.lastname@test.edu`
- Proper password hashing using bcrypt
- Active status set to true

### Enrollments
- Links students to the specified class
- Sets enrollment date to a random date within the last 30 days
- Active status set to true

### Attendance Sessions
- Distributed evenly across the specified date range
- Random times between 9 AM and 5 PM
- 30-minute duration
- Proper active/expired status based on current time

### Attendance Records
- Created for a percentage of enrolled students based on attendance rate
- Realistic timestamps within the first 25 minutes of each session
- Location data within 50 meters of the class location
- Proper relationships to sessions and students

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "error": "Invalid student count",
  "details": "Student count must be between 1 and 100"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "error": "Class not found",
  "details": "Cannot seed data for non-existent class"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "error": "Seeding process failed",
  "details": "Error message",
  "partialResults": {
    "studentsCreated": 2,
    "enrollmentsCreated": 0,
    "sessionsCreated": 0,
    "recordsCreated": 0
  }
}
```

## Best Practices

1. **Start Small**: Begin with small numbers (5-10 students, 2-3 sessions) to test the functionality
2. **Check Existing Data**: Use the GET endpoint to understand the current state before seeding
3. **Use Realistic Rates**: Keep attendance rates between 0.6-0.9 for realistic data
4. **Date Ranges**: Use reasonable date ranges (1-4 weeks) to avoid creating too much historical data
5. **Monitor Performance**: Large seeding operations may take time, especially with many students and sessions

## Security Considerations

- This API should only be available in development environments
- Consider adding authentication/authorization for production debugging
- The API excludes sensitive information from debug responses
- Session tokens are truncated in responses for security