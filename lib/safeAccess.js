/**
 * Safely access nested object properties
 * @param {Object} obj - The object to access
 * @param {string} path - The path to the property (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} The property value or default value
 */
export function safeGet(obj, path, defaultValue = null) {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Safely format a date
 * @param {string|Date} date - The date to format
 * @param {string} defaultValue - Default value if date is invalid
 * @returns {string} Formatted date or default value
 */
export function safeFormatDate(date, defaultValue = 'Unknown') {
  try {
    if (!date) return defaultValue;
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return defaultValue;
    return dateObj.toLocaleDateString();
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Safely access class data with fallbacks
 * @param {Object} classItem - The class object
 * @returns {Object} Safe class data with fallbacks
 */
export function safeClassData(classItem) {
  if (!classItem) return null;
  
  return {
    name: classItem.name || 'Unnamed Class',
    subject: classItem.subject || 'Unknown Subject',
    teacherName: safeGet(classItem, 'teacherId.name', 'Unknown Teacher'),
    locationName: safeGet(classItem, 'location.name', 'Unknown Location'),
    enrollmentCount: classItem.enrollmentCount || 0,
    createdAt: safeFormatDate(classItem.createdAt)
  };
}