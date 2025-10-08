import QRCode from 'qrcode';

/**
 * Generate QR code data URL from session data
 * @param {Object} sessionData - The session data to encode
 * @param {Object} options - QR code generation options
 * @returns {Promise<string>} - Data URL of the QR code image
 */
export async function generateQRCode(sessionData, options = {}) {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    };

    const qrOptions = { ...defaultOptions, ...options };
    
    // Convert session data to JSON string
    const dataString = JSON.stringify(sessionData);
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(dataString, qrOptions);
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as SVG string
 * @param {Object} sessionData - The session data to encode
 * @param {Object} options - QR code generation options
 * @returns {Promise<string>} - SVG string of the QR code
 */
export async function generateQRCodeSVG(sessionData, options = {}) {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    };

    const qrOptions = { ...defaultOptions, ...options };
    
    // Convert session data to JSON string
    const dataString = JSON.stringify(sessionData);
    
    // Generate QR code as SVG
    const qrCodeSVG = await QRCode.toString(dataString, { 
      ...qrOptions, 
      type: 'svg' 
    });
    
    return qrCodeSVG;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Validate QR code data structure
 * @param {Object} qrData - The QR data to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateQRData(qrData) {
  if (!qrData || typeof qrData !== 'object') {
    return false;
  }

  const requiredFields = ['sessionToken', 'classId', 'className', 'location', 'expiresAt'];
  
  for (const field of requiredFields) {
    if (!(field in qrData)) {
      return false;
    }
  }

  // Validate location structure
  if (!qrData.location || 
      typeof qrData.location.lat !== 'number' || 
      typeof qrData.location.lng !== 'number') {
    return false;
  }

  // Validate expiration date
  if (!qrData.expiresAt || isNaN(new Date(qrData.expiresAt).getTime())) {
    return false;
  }

  return true;
}

/**
 * Parse QR code data from scanned string
 * @param {string} qrString - The scanned QR code string
 * @returns {Object|null} - Parsed QR data or null if invalid
 */
export function parseQRData(qrString) {
  try {
    const qrData = JSON.parse(qrString);
    
    if (!validateQRData(qrData)) {
      return null;
    }
    
    return qrData;
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
}

/**
 * Check if QR code data is expired
 * @param {Object} qrData - The QR data to check
 * @returns {boolean} - True if expired, false otherwise
 */
export function isQRDataExpired(qrData) {
  if (!qrData || !qrData.expiresAt) {
    return true;
  }
  
  return new Date() > new Date(qrData.expiresAt);
}

/**
 * Get remaining time for QR code in minutes
 * @param {Object} qrData - The QR data to check
 * @returns {number} - Remaining minutes (0 if expired)
 */
export function getQRRemainingMinutes(qrData) {
  if (!qrData || !qrData.expiresAt || isQRDataExpired(qrData)) {
    return 0;
  }
  
  const now = new Date();
  const expiresAt = new Date(qrData.expiresAt);
  const diffMs = expiresAt - now;
  
  return Math.ceil(diffMs / (1000 * 60));
}