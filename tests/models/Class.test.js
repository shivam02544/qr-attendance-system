import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Class from '@/models/Class.js';
import User from '@/models/User.js';

describe('Class Model', () => {
  let mongoServer;
  let teacherId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a teacher for testing
    const teacher = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      role: 'teacher',
      name: 'Test Teacher'
    });
    teacherId = teacher._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Class.deleteMany({});
  });

  describe('Class Creation', () => {
    it('should create a valid class', async () => {
      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 101, Main Building'
        }
      };

      const classDoc = new Class(classData);
      const savedClass = await classDoc.save();

      expect(savedClass._id).toBeDefined();
      expect(savedClass.name).toBe('Mathematics 101');
      expect(savedClass.subject).toBe('Mathematics');
      expect(savedClass.teacherId.toString()).toBe(teacherId.toString());
      expect(savedClass.location.lat).toBe(40.7128);
      expect(savedClass.location.lng).toBe(-74.0060);
      expect(savedClass.location.name).toBe('Room 101, Main Building');
      expect(savedClass.createdAt).toBeDefined();
      expect(savedClass.updatedAt).toBeDefined();
    });

    it('should require class name', async () => {
      const classData = {
        subject: 'Mathematics',
        teacherId,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 101'
        }
      };

      const classDoc = new Class(classData);
      await expect(classDoc.save()).rejects.toThrow('Class name is required');
    });

    it('should require subject', async () => {
      const classData = {
        name: 'Mathematics 101',
        teacherId,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 101'
        }
      };

      const classDoc = new Class(classData);
      await expect(classDoc.save()).rejects.toThrow('Subject is required');
    });

    it('should require teacher ID', async () => {
      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 101'
        }
      };

      const classDoc = new Class(classData);
      await expect(classDoc.save()).rejects.toThrow('Teacher ID is required');
    });

    it('should require location coordinates', async () => {
      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: {
          name: 'Room 101'
        }
      };

      const classDoc = new Class(classData);
      await expect(classDoc.save()).rejects.toThrow();
    });

    it('should validate latitude range', async () => {
      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: {
          lat: 95, // Invalid latitude
          lng: -74.0060,
          name: 'Room 101'
        }
      };

      const classDoc = new Class(classData);
      await expect(classDoc.save()).rejects.toThrow('Latitude must be between -90 and 90');
    });

    it('should validate longitude range', async () => {
      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: {
          lat: 40.7128,
          lng: 185, // Invalid longitude
          name: 'Room 101'
        }
      };

      const classDoc = new Class(classData);
      await expect(classDoc.save()).rejects.toThrow('Longitude must be between -180 and 180');
    });
  });

  describe('Class Methods', () => {
    let classDoc;

    beforeEach(async () => {
      const classData = {
        name: 'Mathematics 101',
        subject: 'Mathematics',
        teacherId,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: 'Room 101, Main Building'
        }
      };
      classDoc = await new Class(classData).save();
    });

    it('should calculate distance from a point', () => {
      // Distance from New York (40.7128, -74.0060) to Los Angeles (34.0522, -118.2437)
      const distance = classDoc.distanceFrom(34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // Approximately 3900+ km
      expect(distance).toBeLessThan(4000000);
    });

    it('should calculate distance to same location as zero', () => {
      const distance = classDoc.distanceFrom(40.7128, -74.0060);
      expect(distance).toBeLessThan(1); // Should be very close to 0
    });
  });

  describe('Class Static Methods', () => {
    beforeEach(async () => {
      // Create multiple classes for testing
      await Class.create([
        {
          name: 'Mathematics 101',
          subject: 'Mathematics',
          teacherId,
          location: {
            lat: 40.7128,
            lng: -74.0060,
            name: 'Room 101'
          }
        },
        {
          name: 'Physics 101',
          subject: 'Physics',
          teacherId,
          location: {
            lat: 40.7589,
            lng: -73.9851,
            name: 'Room 201'
          }
        }
      ]);
    });

    it('should find classes by teacher', async () => {
      const classes = await Class.findByTeacher(teacherId);
      expect(classes).toHaveLength(2);
      expect(classes.every(cls => cls.teacherId.toString() === teacherId.toString())).toBe(true);
    });

    it('should find classes near location', async () => {
      // Search near New York coordinates
      const nearbyClasses = await Class.findNearLocation(40.7128, -74.0060, 10000); // 10km radius
      expect(nearbyClasses.length).toBeGreaterThan(0);
    });

    it('should not find classes far from location', async () => {
      // Search near Los Angeles coordinates (far from our test classes)
      const nearbyClasses = await Class.findNearLocation(34.0522, -118.2437, 1000); // 1km radius
      expect(nearbyClasses).toHaveLength(0);
    });
  });
});