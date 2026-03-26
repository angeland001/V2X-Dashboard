/**
 * useSettings Hook
 *
 * Clean interface for components to access settings.
 *
 * @example
 * function MyComponent() {
 *   const { settings, updateUser, isLoading } = useSettings();
 *
 *   // Read a setting
 *   const theme = settings.theme;
 *
 *   // Update a setting
 *   const toggleTheme = () => {
 *     updateUser({ theme: theme === 'dark' ? 'light' : 'dark' });
 *   };
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <button onClick={toggleTheme}>Current: {theme}</button>;
 * }
 */

import { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';

/**
 * Access settings from anywhere in the app
 *
 * @returns {object} Settings context value containing:
 *   - settings: The merged settings object (user overrides global)
 *   - userSettings: User-specific settings only
 *   - globalSettings: Global settings only
 *   - isLoading: True during initial fetch
 *   - isValidating: True when revalidating in background
 *   - error: Error object if fetch failed
 *   - updateUser: Function to update user settings
 *   - updateGlobal: Function to update global settings (admin only)
 *   - refresh: Function to force refresh from server
 *
 * @throws {Error} If used outside of SettingsProvider
 */
export function useSettings() {
  const context = useContext(SettingsContext);

  if (context === null) {
    throw new Error(
      'useSettings must be used within a SettingsProvider. ' +
      'Make sure your component is wrapped in <SettingsProvider>.'
    );
  }

  return context;
}

/**
 * Convenience hook to get just the theme
 * Useful for components that only care about theming
 *
 * @example
 * const { theme, setTheme } = useTheme();
 */
export function useTheme() {
  const { settings, updateUser } = useSettings();

  return {
    theme: settings.theme,
    setTheme: (theme) => updateUser({ theme }),
  };
}
