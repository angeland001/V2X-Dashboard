/**
 * Settings API Service
 *
 * Handles all API communication for settings.
 * Separated from React components for clean architecture.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';
const SETTINGS_ENDPOINT = `${API_BASE}/api/settings`;

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Default headers for API requests
 */
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`,
});

/**
 * SWR Fetcher function
 * SWR calls this with the URL to fetch data
 *
 * @param {string} url - The endpoint to fetch
 * @returns {Promise<object>} - The settings data
 */
export const settingsFetcher = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = new Error('Failed to fetch settings');
    error.status = response.status;
    throw error;
  }

  return response.json();
};

/**
 * Update global settings (admin only)
 *
 * @param {object} settings - Settings to update
 * @returns {Promise<object>} - Updated settings
 */
export const updateGlobalSettings = async (settings) => {
  const response = await fetch(`${SETTINGS_ENDPOINT}/global`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = new Error('Failed to update global settings');
    error.status = response.status;
    throw error;
  }

  return response.json();
};

/**
 * Update user-specific settings
 *
 * @param {object} settings - Settings to update
 * @returns {Promise<object>} - Updated settings
 */
export const updateUserSettings = async (settings) => {
  const response = await fetch(`${SETTINGS_ENDPOINT}/user`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = new Error('Failed to update user settings');
    error.status = response.status;
    throw error;
  }

  return response.json();
};


export const fetchUserProfile = async (userId) => {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch user profile (${res.status})`);
  return res.json();
};

export const updateUserProfile = async (userId, data) => {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update user profile (${res.status})`);
  return res.json();
};

export const uploadProfilePicture = async (userId, file) => {
  const token = localStorage.getItem('authToken');
  const formData = new FormData();
  formData.append('profile_picture', file);

  const res = await fetch(`${API_BASE}/api/users/${userId}/profile-picture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload profile picture (${res.status})`);
  return res.json();
};

/**
 * API endpoint for SWR to use
 * Returns the merged settings endpoint
 */
export const MERGED_SETTINGS_URL = `${SETTINGS_ENDPOINT}/merged`;
