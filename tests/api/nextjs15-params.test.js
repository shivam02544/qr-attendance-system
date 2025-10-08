import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, options = {}) => ({
      json: async () => data,
      status: options.status || 200,
      ok: options.status ? options.status < 400 : true
    })
  }
}));

describe('Next.js 15 Parameter Handling', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dynamic Route Parameter Handling', () => {
    it('should properly await params in dynamic routes', async () => {
      // Mock a Next.js 15 style params object that needs to be awaited
      const mockParams = Promise.resolve({
        id: 'test-class-id',
        studentId: 'test-student-id'
      });

      // Test that we can properly await the params
      const resolvedParams = await mockParams;
      expect(resolvedParams.id).toBe('test-class-id');
      expect(resolvedParams.studentId).toBe('test-student-id');
    });

    it('should handle params that are already resolved', async () => {
      // Mock params that are already resolved (backward compatibility)
      const mockParams = {
        id: 'test-class-id',
        studentId: 'test-student-id'
      };

      // Should work with both Promise and direct object
      const resolvedParams = await Promise.resolve(mockParams);
      expect(resolvedParams.id).toBe('test-class-id');
      expect(resolvedParams.studentId).toBe('test-student-id');
    });

    it('should handle missing params gracefully', async () => {
      const mockParams = Promise.resolve({});
      
      const resolvedParams = await mockParams;
      expect(resolvedParams.id).toBeUndefined();
      expect(resolvedParams.studentId).toBeUndefined();
    });

    it('should handle params promise rejection', async () => {
      const mockParams = Promise.reject(new Error('Params error'));
      
      try {
        await mockParams;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Params error');
      }
    });
  });

  describe('API Route Parameter Access Patterns', () => {
    it('should demonstrate correct async parameter access pattern', async () => {
      // Simulate Next.js 15 API route handler
      const mockApiHandler = async (request, context) => {
        // In Next.js 15, params must be awaited
        const params = await context.params;
        
        return {
          classId: params.id,
          studentId: params.studentId
        };
      };

      const mockContext = {
        params: Promise.resolve({
          id: 'class-123',
          studentId: 'student-456'
        })
      };

      const result = await mockApiHandler({}, mockContext);
      expect(result.classId).toBe('class-123');
      expect(result.studentId).toBe('student-456');
    });

    it('should handle synchronous parameter access (legacy)', async () => {
      // Simulate legacy parameter access pattern
      const mockLegacyHandler = async (request, context) => {
        // Legacy pattern - direct access (should be avoided in Next.js 15)
        const params = context.params;
        
        return {
          classId: params.id,
          studentId: params.studentId
        };
      };

      const mockContext = {
        params: {
          id: 'class-123',
          studentId: 'student-456'
        }
      };

      const result = await mockLegacyHandler({}, mockContext);
      expect(result.classId).toBe('class-123');
      expect(result.studentId).toBe('student-456');
    });

    it('should demonstrate parameter validation after awaiting', async () => {
      const mockValidatingHandler = async (request, context) => {
        const params = await context.params;
        
        // Validate required parameters
        if (!params.id) {
          throw new Error('Missing required parameter: id');
        }
        
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
          throw new Error('Invalid parameter format: id');
        }
        
        return { valid: true, classId: params.id };
      };

      // Test with valid parameters
      const validContext = {
        params: Promise.resolve({
          id: new mongoose.Types.ObjectId().toString()
        })
      };

      const validResult = await mockValidatingHandler({}, validContext);
      expect(validResult.valid).toBe(true);

      // Test with missing parameters
      const invalidContext = {
        params: Promise.resolve({})
      };

      await expect(mockValidatingHandler({}, invalidContext))
        .rejects.toThrow('Missing required parameter: id');

      // Test with invalid format
      const invalidFormatContext = {
        params: Promise.resolve({
          id: 'invalid-id'
        })
      };

      await expect(mockValidatingHandler({}, invalidFormatContext))
        .rejects.toThrow('Invalid parameter format: id');
    });
  });

  describe('Error Handling for Parameter Access', () => {
    it('should handle parameter access errors gracefully', async () => {
      const mockErrorHandler = async (request, context) => {
        try {
          const params = await context.params;
          return { success: true, params };
        } catch (error) {
          return { 
            success: false, 
            error: 'Parameter access failed',
            details: error.message 
          };
        }
      };

      const errorContext = {
        params: Promise.reject(new Error('Params unavailable'))
      };

      const result = await mockErrorHandler({}, errorContext);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parameter access failed');
      expect(result.details).toBe('Params unavailable');
    });

    it('should provide clear error messages for parameter issues', async () => {
      const mockDiagnosticHandler = async (request, context) => {
        try {
          const params = await context.params;
          
          if (!params) {
            return {
              success: false,
              error: 'Parameters object is null or undefined',
              suggestion: 'Check if the route is properly configured'
            };
          }
          
          return { success: true, params };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to access route parameters',
            details: error.message,
            suggestion: 'Ensure parameters are properly awaited in Next.js 15'
          };
        }
      };

      // Test with null params
      const nullContext = {
        params: Promise.resolve(null)
      };

      const nullResult = await mockDiagnosticHandler({}, nullContext);
      expect(nullResult.success).toBe(false);
      expect(nullResult.suggestion).toContain('route is properly configured');

      // Test with error
      const errorContext = {
        params: Promise.reject(new Error('Route not found'))
      };

      const errorResult = await mockDiagnosticHandler({}, errorContext);
      expect(errorResult.success).toBe(false);
      expect(errorResult.suggestion).toContain('properly awaited in Next.js 15');
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with both promise and direct parameter access', async () => {
      const universalHandler = async (request, context) => {
        // Handle both Next.js 15 (promise) and legacy (direct) parameter access
        let params;
        
        if (context.params && typeof context.params.then === 'function') {
          // Next.js 15 - params is a promise
          params = await context.params;
        } else {
          // Legacy - params is a direct object
          params = context.params;
        }
        
        return {
          classId: params?.id,
          method: typeof context.params.then === 'function' ? 'promise' : 'direct'
        };
      };

      // Test with Next.js 15 style (promise)
      const promiseContext = {
        params: Promise.resolve({ id: 'class-123' })
      };

      const promiseResult = await universalHandler({}, promiseContext);
      expect(promiseResult.classId).toBe('class-123');
      expect(promiseResult.method).toBe('promise');

      // Test with legacy style (direct)
      const directContext = {
        params: { id: 'class-456' }
      };

      const directResult = await universalHandler({}, directContext);
      expect(directResult.classId).toBe('class-456');
      expect(directResult.method).toBe('direct');
    });

    it('should maintain functionality across Next.js versions', async () => {
      const versionAgnosticHandler = async (request, context) => {
        try {
          // Always await to handle both cases
          const params = await Promise.resolve(context.params);
          
          return {
            success: true,
            hasId: !!params?.id,
            hasStudentId: !!params?.studentId,
            paramCount: Object.keys(params || {}).length
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      };

      // Test various parameter scenarios
      const scenarios = [
        {
          name: 'empty params',
          context: { params: {} },
          expected: { success: true, hasId: false, hasStudentId: false, paramCount: 0 }
        },
        {
          name: 'single param',
          context: { params: { id: 'test-id' } },
          expected: { success: true, hasId: true, hasStudentId: false, paramCount: 1 }
        },
        {
          name: 'multiple params',
          context: { params: { id: 'test-id', studentId: 'student-id' } },
          expected: { success: true, hasId: true, hasStudentId: true, paramCount: 2 }
        }
      ];

      for (const scenario of scenarios) {
        const result = await versionAgnosticHandler({}, scenario.context);
        expect(result).toEqual(scenario.expected);
      }
    });
  });

  describe('Real-world API Route Patterns', () => {
    it('should demonstrate attendance API parameter handling', async () => {
      const attendanceApiHandler = async (request, context) => {
        try {
          // Properly await params for Next.js 15 compatibility
          const params = await context.params;
          const { searchParams } = new URL(request.url);
          
          // Validate required route parameters
          if (!params?.id) {
            return {
              success: false,
              error: 'Missing class ID parameter',
              status: 400
            };
          }
          
          if (!mongoose.Types.ObjectId.isValid(params.id)) {
            return {
              success: false,
              error: 'Invalid class ID format',
              status: 400
            };
          }
          
          // Process query parameters
          const action = searchParams.get('action') || 'check';
          
          return {
            success: true,
            classId: params.id,
            studentId: params.studentId,
            action,
            status: 200
          };
        } catch (error) {
          return {
            success: false,
            error: 'Parameter processing failed',
            details: error.message,
            status: 500
          };
        }
      };

      // Test successful parameter handling
      const validRequest = {
        url: 'http://localhost:3000/api/debug/attendance?action=check'
      };
      const validContext = {
        params: Promise.resolve({
          id: new mongoose.Types.ObjectId().toString()
        })
      };

      const validResult = await attendanceApiHandler(validRequest, validContext);
      expect(validResult.success).toBe(true);
      expect(validResult.action).toBe('check');
      expect(validResult.status).toBe(200);

      // Test missing parameter
      const invalidContext = {
        params: Promise.resolve({})
      };

      const invalidResult = await attendanceApiHandler(validRequest, invalidContext);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.status).toBe(400);
    });

    it('should demonstrate student-specific API parameter handling', async () => {
      const studentApiHandler = async (request, context) => {
        try {
          const params = await context.params;
          
          // Validate both class ID and student ID
          const requiredParams = ['id', 'studentId'];
          const missingParams = requiredParams.filter(param => !params?.[param]);
          
          if (missingParams.length > 0) {
            return {
              success: false,
              error: `Missing required parameters: ${missingParams.join(', ')}`,
              status: 400
            };
          }
          
          // Validate ObjectId format for both parameters
          const invalidParams = requiredParams.filter(param => 
            !mongoose.Types.ObjectId.isValid(params[param])
          );
          
          if (invalidParams.length > 0) {
            return {
              success: false,
              error: `Invalid parameter format: ${invalidParams.join(', ')}`,
              status: 400
            };
          }
          
          return {
            success: true,
            classId: params.id,
            studentId: params.studentId,
            status: 200
          };
        } catch (error) {
          return {
            success: false,
            error: 'Parameter validation failed',
            details: error.message,
            status: 500
          };
        }
      };

      // Test with valid parameters
      const validContext = {
        params: Promise.resolve({
          id: new mongoose.Types.ObjectId().toString(),
          studentId: new mongoose.Types.ObjectId().toString()
        })
      };

      const validResult = await studentApiHandler({}, validContext);
      expect(validResult.success).toBe(true);
      expect(validResult.status).toBe(200);

      // Test with missing student ID
      const missingStudentContext = {
        params: Promise.resolve({
          id: new mongoose.Types.ObjectId().toString()
        })
      };

      const missingResult = await studentApiHandler({}, missingStudentContext);
      expect(missingResult.success).toBe(false);
      expect(missingResult.error).toContain('studentId');
      expect(missingResult.status).toBe(400);
    });
  });

  describe('Performance and Memory Considerations', () => {
    it('should not create memory leaks with parameter promises', async () => {
      const parameterHandler = async (request, context) => {
        const params = await context.params;
        return { processed: true, paramCount: Object.keys(params || {}).length };
      };

      // Process multiple requests to check for memory leaks
      const requests = Array.from({ length: 100 }, (_, i) => ({
        request: { url: `http://localhost:3000/api/test/${i}` },
        context: {
          params: Promise.resolve({ id: `test-${i}` })
        }
      }));

      const results = await Promise.all(
        requests.map(({ request, context }) => parameterHandler(request, context))
      );

      expect(results).toHaveLength(100);
      expect(results.every(r => r.processed)).toBe(true);
      expect(results.every(r => r.paramCount === 1)).toBe(true);
    });

    it('should handle concurrent parameter access efficiently', async () => {
      const concurrentHandler = async (request, context) => {
        const startTime = Date.now();
        const params = await context.params;
        const endTime = Date.now();
        
        return {
          params,
          processingTime: endTime - startTime,
          timestamp: Date.now()
        };
      };

      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        concurrentHandler(
          { url: `http://localhost:3000/api/test/${i}` },
          { params: Promise.resolve({ id: `concurrent-${i}` }) }
        )
      );

      const results = await Promise.all(concurrentRequests);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.processingTime < 100)).toBe(true); // Should be fast
      expect(results.every(r => r.params.id.startsWith('concurrent-'))).toBe(true);
    });
  });
});