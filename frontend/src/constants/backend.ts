// Backend endpoint configuration for the React frontend.
export const BACKEND_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000';

export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;
