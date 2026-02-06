export function toErrorMessage(error, fallback = 'Unknown error') {
  if (!error) return fallback;
  if (typeof error.message === 'string' && error.message) return error.message;
  return String(error);
}
