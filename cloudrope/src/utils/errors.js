export function extractErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.non_field_errors) return data.non_field_errors[0];
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) return `${data[firstKey][0]}`;
  return 'Something went wrong. Please try again.';
}

export function extractFieldErrors(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const fieldErrors = {};
  Object.entries(data).forEach(([key, val]) => {
    if (key !== 'non_field_errors' && key !== 'detail' && key !== 'error') {
      fieldErrors[key] = Array.isArray(val) ? val[0] : val;
    }
  });
  return fieldErrors;
}
