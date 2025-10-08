import { connectDB } from './mongodb';
import User from '../models/User';

/**
 * Create a new user account
 * @param {Object} userData - User data object
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password (will be hashed)
 * @param {string} userData.name - User name
 * @param {string} userData.role - User role (teacher, student, admin)
 * @returns {Object} - Created user object (without password)
 */
export async function createUser(userData) {
  await connectDB();
  
  const { email, password, name, role } = userData;
  
  // Check if user already exists
  const existingUser = await User.findOne({ 
    email: email.toLowerCase() 
  });
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Create new user
  const user = new User({
    email: email.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save hook
    name: name.trim(),
    role
  });
  
  await user.save();
  return user.toSafeObject();
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Object|null} - User object or null if not found
 */
export async function findUserByEmail(email) {
  await connectDB();
  
  const user = await User.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });
  
  return user;
}

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} - User object or null if not found
 */
export async function findUserById(userId) {
  await connectDB();
  
  const user = await User.findById(userId).select('-passwordHash');
  return user;
}

/**
 * Update user information
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated user object
 */
export async function updateUser(userId, updateData) {
  await connectDB();
  
  // Remove sensitive fields that shouldn't be updated directly
  const { passwordHash, ...safeUpdateData } = updateData;
  
  const user = await User.findByIdAndUpdate(
    userId,
    safeUpdateData,
    { new: true, runValidators: true }
  ).select('-passwordHash');
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} - True if password was changed successfully
 */
export async function changePassword(userId, currentPassword, newPassword) {
  await connectDB();
  
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify current password
  const isValidPassword = await user.comparePassword(currentPassword);
  
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }
  
  // Update password (will be hashed by pre-save hook)
  user.passwordHash = newPassword;
  await user.save();
  
  return true;
}

/**
 * Deactivate user account
 * @param {string} userId - User ID
 * @returns {Object} - Updated user object
 */
export async function deactivateUser(userId) {
  await connectDB();
  
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  ).select('-passwordHash');
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

/**
 * Activate user account
 * @param {string} userId - User ID
 * @returns {Object} - Updated user object
 */
export async function activateUser(userId) {
  await connectDB();
  
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: true },
    { new: true }
  ).select('-passwordHash');
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

/**
 * Get users by role
 * @param {string} role - User role (teacher, student, admin)
 * @param {boolean} activeOnly - Whether to return only active users
 * @returns {Array} - Array of user objects
 */
export async function getUsersByRole(role, activeOnly = true) {
  await connectDB();
  
  const query = { role };
  if (activeOnly) {
    query.isActive = true;
  }
  
  const users = await User.find(query).select('-passwordHash');
  return users;
}

/**
 * Get all users with pagination
 * @param {number} page - Page number (starting from 1)
 * @param {number} limit - Number of users per page
 * @param {Object} filters - Additional filters
 * @returns {Object} - Object containing users array and pagination info
 */
export async function getAllUsers(page = 1, limit = 10, filters = {}) {
  await connectDB();
  
  const skip = (page - 1) * limit;
  
  const users = await User.find(filters)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await User.countDocuments(filters);
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}