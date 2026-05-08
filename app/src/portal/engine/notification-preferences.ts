/**
 * Dynamic Component Engine — Notification Preferences
 *
 * Allows users to opt-in/out of notification channels per category.
 * Preferences are stored as REGULAR nodes in Mujarrad under the
 * 'notification-preferences' resource.
 */

import type { NotificationChannel, NotificationPriority } from './types';
import type { EntityControlLayer } from '../lib/entity-control-layer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A user's preference for a single notification category */
export interface CategoryPreference {
  /** Notification category slug (e.g. 'deal-alerts', 'system-updates') */
  category: string;
  /** Channels the user has opted into */
  enabledChannels: NotificationChannel[];
  /** Minimum priority level the user wants to receive ('low' = all) */
  minimumPriority: NotificationPriority;
}

/** Full preferences document for a single user */
export interface NotificationPreferences {
  id: string;
  userId: string;
  /** Global mute — suppresses all non-critical notifications */
  globalMute: boolean;
  /** Per-category channel preferences */
  categories: CategoryPreference[];
  /** Default channels used when no category-specific preference exists */
  defaultChannels: NotificationChannel[];
  /** Quiet hours (ISO time strings, e.g. '22:00'–'07:00') */
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Default categories (used to seed preferences for new users)
// ---------------------------------------------------------------------------

export const DEFAULT_CATEGORIES: CategoryPreference[] = [
  {
    category: 'deal-alerts',
    enabledChannels: ['in_app', 'email'],
    minimumPriority: 'medium',
  },
  {
    category: 'flow-updates',
    enabledChannels: ['in_app'],
    minimumPriority: 'medium',
  },
  {
    category: 'system-notifications',
    enabledChannels: ['in_app', 'email'],
    minimumPriority: 'high',
  },
  {
    category: 'match-alerts',
    enabledChannels: ['in_app', 'email', 'push'],
    minimumPriority: 'low',
  },
  {
    category: 'escalations',
    enabledChannels: ['in_app', 'email', 'sms'],
    minimumPriority: 'critical',
  },
];

export const ALL_CHANNELS: NotificationChannel[] = [
  'in_app',
  'email',
  'push',
  'sms',
  'webhook',
  'slack',
];

export const PRIORITY_ORDER: NotificationPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

// ---------------------------------------------------------------------------
// NotificationPreferencesManager
// ---------------------------------------------------------------------------

export class NotificationPreferencesManager {
  constructor(private entityLayer: EntityControlLayer) {}

  /**
   * Get preferences for a user. Returns null if none exist yet.
   */
  async getPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const result = await this.entityLayer.listEntities(
        'notification-preferences',
      );
      const match = result.data.find((r) => r.userId === userId);
      if (!match) return null;
      return this.toPreferences(match);
    } catch {
      return null;
    }
  }

  /**
   * Create default preferences for a user (first-time setup).
   */
  async createDefaults(userId: string): Promise<NotificationPreferences> {
    const record = await this.entityLayer.createEntity(
      'notification-preferences',
      {
        userId,
        globalMute: false,
        categories: DEFAULT_CATEGORIES,
        defaultChannels: ['in_app', 'email'],
        updatedAt: new Date().toISOString(),
      },
    );
    return this.toPreferences(record);
  }

  /**
   * Get preferences or create defaults if none exist.
   */
  async getOrCreatePreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId);
    if (existing) return existing;
    return this.createDefaults(userId);
  }

  /**
   * Update preferences for a user.
   */
  async updatePreferences(
    prefsId: string,
    updates: Partial<
      Omit<NotificationPreferences, 'id' | 'userId'>
    >,
  ): Promise<NotificationPreferences> {
    const record = await this.entityLayer.updateEntity(
      'notification-preferences',
      prefsId,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    );
    return this.toPreferences(record);
  }

  /**
   * Toggle a specific channel for a specific category.
   */
  async toggleCategoryChannel(
    prefsId: string,
    currentPrefs: NotificationPreferences,
    category: string,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreferences> {
    const categories = currentPrefs.categories.map((cat) => {
      if (cat.category !== category) return cat;

      const channels = enabled
        ? [...new Set([...cat.enabledChannels, channel])]
        : cat.enabledChannels.filter((ch) => ch !== channel);

      return { ...cat, enabledChannels: channels };
    });

    return this.updatePreferences(prefsId, { categories });
  }

  /**
   * Check if a notification should be delivered based on user preferences.
   */
  shouldDeliver(
    prefs: NotificationPreferences,
    category: string,
    channel: NotificationChannel,
    priority: NotificationPriority,
  ): boolean {
    // Critical notifications always get through
    if (priority === 'critical') return true;

    // Global mute blocks everything except critical
    if (prefs.globalMute) return false;

    // Check quiet hours
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
      if (this.isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
        return false;
      }
    }

    // Find category-specific preferences
    const catPref = prefs.categories.find((c) => c.category === category);

    if (catPref) {
      // Check channel opt-in
      if (!catPref.enabledChannels.includes(channel)) return false;

      // Check minimum priority
      const priorityIndex = PRIORITY_ORDER.indexOf(priority);
      const minIndex = PRIORITY_ORDER.indexOf(catPref.minimumPriority);
      if (priorityIndex < minIndex) return false;

      return true;
    }

    // Fall back to default channels
    return prefs.defaultChannels.includes(channel);
  }

  private isInQuietHours(start: string, end: string): boolean {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const current = h * 60 + m;

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (startMin <= endMin) {
      return current >= startMin && current < endMin;
    }
    // Wraps midnight
    return current >= startMin || current < endMin;
  }

  private toPreferences(
    record: Record<string, unknown>,
  ): NotificationPreferences {
    return {
      id: record.id as string,
      userId: record.userId as string,
      globalMute: (record.globalMute as boolean) ?? false,
      categories: (record.categories as CategoryPreference[]) ?? [],
      defaultChannels:
        (record.defaultChannels as NotificationChannel[]) ?? ['in_app'],
      quietHoursStart: record.quietHoursStart as string | undefined,
      quietHoursEnd: record.quietHoursEnd as string | undefined,
      updatedAt: (record.updatedAt as string) ?? new Date().toISOString(),
    };
  }
}
