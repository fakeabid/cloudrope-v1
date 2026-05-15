export default function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;

  // Axios response errors
  if (error.response?.data) {
    const data = error.response.data;

    // DRF detail field
    if (typeof data.detail === 'string') {
      return data.detail;
    }

    // General message field
    if (typeof data.message === 'string') {
      return data.message;
    }

    // Serializer field errors
    const firstKey = Object.keys(data)[0];

    if (firstKey) {
      const value = data[firstKey];

      if (Array.isArray(value)) {
        return value[0];
      }

      if (typeof value === 'string') {
        return value;
      }
    }
  }

  // Network errors
  if (error.message) {
    if (error.message.includes('status code')) {
      return fallback;
    }
    
    return error.message;
  }

  return fallback;
}