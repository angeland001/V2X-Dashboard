/**
 * Settings Context
 *
 * Provides global settings state to the entire app using React Context + SWR.
 *
 * Architecture:
 * - SWR handles fetching, caching, and revalidation
 * - Context distributes the data to all components
 * - Optimistic updates for instant UI feedback
 *
 * Flow:
 *   Backend GET /api/settings/merged
 *           ↓
 *     SWR fetches on mount + revalidates on focus
 *           ↓
 *     SettingsContext.Provider (wraps app)
 *           ↓
 *     Components call useSettings() → access theme, timezone, etc.
 */

import React, { createContext, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import {
  settingsFetcher,
  updateUserSettings,
  updateGlobalSettings,
  MERGED_SETTINGS_URL,
} from '../services/settingsApi';

/**
 * Default settings used while loading or if fetch fails
 * These provide sensible defaults so the app doesn't break
 */
export const DEFAULT_SETTINGS = {
  // User-specific settings (dashboard.*, profile.*, data.*)
  user: {
    theme: 'system',           // 'light' | 'dark' | 'system'
    sidebarCollapsed: false,
    refreshInterval: 30,       // seconds
    exportFormat: 'csv',       // 'csv' | 'json' | 'xlsx'
    timezone: 'America/Chicago',
  },
  // Global settings (notifications.*, security.*)
  global: {
    alertThreshold: 80,
    emailNotifications: true,
    sessionTimeout: 30,        // minutes
  },
};

/**
 * The Context object
 * Initialized with null - actual value comes from Provider
 */
export const SettingsContext = createContext(null);

/**
 * Settings Provider Component
 *
 * Wrap your app with this to provide settings to all children.
 *
 * @example
 * <SettingsProvider>
 *   <App />
 * </SettingsProvider>
 */
export function SettingsProvider({ children }) {
  // SWR handles fetching, caching, revalidation, and error states
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(MERGED_SETTINGS_URL, settingsFetcher, {
    // Revalidate when window regains focus
    revalidateOnFocus: true,
    // Revalidate when network reconnects
    revalidateOnReconnect: true,
    // Keep previous data while revalidating
    keepPreviousData: true,
    // Don't retry too aggressively on error
    errorRetryCount: 3,
    // Fallback to defaults if no data
    fallbackData: { ...DEFAULT_SETTINGS, merged: { ...DEFAULT_SETTINGS.user, ...DEFAULT_SETTINGS.global } },
  });

  /**
   * Update user-specific settings
   * Uses optimistic updates for instant UI feedback
   */
  const updateUser = useCallback(async (newSettings) => {
    // Optimistic update - update UI immediately
    const optimisticData = {
      ...data,
      user: { ...data?.user, ...newSettings },
      merged: { ...data?.merged, ...newSettings },
    };

    try {
      await mutate(
        async () => {
          await updateUserSettings(newSettings);
          // Return optimistic data (SWR will revalidate after)
          return optimisticData;
        },
        {
          optimisticData,
          rollbackOnError: true,
          revalidate: true,
        }
      );
    } catch (err) {
      console.error('Failed to update user settings:', err);
      throw err;
    }
  }, [data, mutate]);

  /**
   * Update global settings (admin only)
   * Uses optimistic updates for instant UI feedback
   */
  const updateGlobal = useCallback(async (newSettings) => {
    const optimisticData = {
      ...data,
      global: { ...data?.global, ...newSettings },
      merged: { ...data?.merged, ...newSettings },
    };

    try {
      await mutate(
        async () => {
          await updateGlobalSettings(newSettings);
          return optimisticData;
        },
        {
          optimisticData,
          rollbackOnError: true,
          revalidate: true,
        }
      );
    } catch (err) {
      console.error('Failed to update global settings:', err);
      throw err;
    }
  }, [data, mutate]);

  /**
   * Force refresh settings from server
   */
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const value = useMemo(() => ({
    // The merged settings (user settings override global)
    settings: data?.merged ?? { ...DEFAULT_SETTINGS.user, ...DEFAULT_SETTINGS.global },

    // Separated settings if needed
    userSettings: data?.user ?? DEFAULT_SETTINGS.user,
    globalSettings: data?.global ?? DEFAULT_SETTINGS.global,

    // Loading states
    isLoading,
    isValidating,
    error,

    // Update functions
    updateUser,
    updateGlobal,
    refresh,
  }), [data, isLoading, isValidating, error, updateUser, updateGlobal, refresh]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
