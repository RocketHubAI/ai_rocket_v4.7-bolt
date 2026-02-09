/**
 * Feature Flags Configuration
 *
 * This file contains feature flags that control the visibility and availability
 * of features in the application. Use these flags to enable/disable features
 * without deleting code.
 */

export const FEATURES = {
  /**
   * Google Drive Sync
   *
   * When enabled: Users can connect Google Drive, select folders, and auto-sync documents
   * When disabled: Google Drive settings are hidden from UI with "Coming Soon" indicator
   *
   * To re-enable: Set to true
   */
  GOOGLE_DRIVE_SYNC_ENABLED: true,
} as const;
