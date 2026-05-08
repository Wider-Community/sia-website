/**
 * Notification Preferences Panel
 *
 * UI component for users to manage their notification channel preferences
 * per category. Supports global mute, quiet hours, and per-category
 * channel toggles.
 */

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BellOff, Bell } from "lucide-react";
import { useNotificationPreferences } from "../hooks";
import {
  ALL_CHANNELS,
  PRIORITY_ORDER,
} from "../notification-preferences";
import type { NotificationChannel, NotificationPriority } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NotificationPreferencesPanelProps {
  userId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationPreferencesPanel({
  userId,
}: NotificationPreferencesPanelProps) {
  const {
    preferences,
    loading,
    saving,
    updatePreferences,
    toggleCategoryChannel,
    updateCategoryPriority,
  } = useNotificationPreferences(userId);

  const [quietStart, setQuietStart] = useState(
    preferences?.quietHoursStart ?? "",
  );
  const [quietEnd, setQuietEnd] = useState(
    preferences?.quietHoursEnd ?? "",
  );

  const handleToggleGlobalMute = useCallback(async () => {
    if (!preferences) return;
    await updatePreferences({ globalMute: !preferences.globalMute });
  }, [preferences, updatePreferences]);

  const handleSaveQuietHours = useCallback(async () => {
    await updatePreferences({
      quietHoursStart: quietStart || undefined,
      quietHoursEnd: quietEnd || undefined,
    });
  }, [quietStart, quietEnd, updatePreferences]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to load notification preferences.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Global Mute */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Notification Preferences</h3>
          <p className="text-xs text-muted-foreground">
            Control which notifications you receive and how.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {preferences.globalMute ? (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          <Switch
            checked={preferences.globalMute}
            onCheckedChange={handleToggleGlobalMute}
            disabled={saving}
          />
          <Label className="text-sm">
            {preferences.globalMute ? "Muted" : "Active"}
          </Label>
        </div>
      </div>

      {preferences.globalMute && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          All non-critical notifications are currently muted.
        </div>
      )}

      {/* Channel Preferences per Category */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Category</TableHead>
              {ALL_CHANNELS.map((ch) => (
                <TableHead key={ch} className="text-center text-xs min-w-[80px]">
                  {ch.replace("_", " ")}
                </TableHead>
              ))}
              <TableHead className="min-w-[120px]">Min Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preferences.categories.map((cat) => (
              <TableRow key={cat.category}>
                <TableCell className="font-medium capitalize">
                  {cat.category.replace(/-/g, " ")}
                </TableCell>
                {ALL_CHANNELS.map((ch) => (
                  <TableCell key={ch} className="text-center">
                    <Switch
                      checked={cat.enabledChannels.includes(ch)}
                      onCheckedChange={(enabled) =>
                        toggleCategoryChannel(cat.category, ch, enabled)
                      }
                      disabled={saving || preferences.globalMute}
                      className="mx-auto"
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Select
                    value={cat.minimumPriority}
                    onValueChange={(v) =>
                      updateCategoryPriority(
                        cat.category,
                        v as NotificationPriority,
                      )
                    }
                    disabled={saving || preferences.globalMute}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_ORDER.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className="capitalize">{p}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3 rounded-md border p-4">
        <h4 className="text-sm font-medium">Quiet Hours</h4>
        <p className="text-xs text-muted-foreground">
          Suppress non-critical notifications during these hours.
        </p>
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Start</Label>
            <Input
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              className="h-8 w-32"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End</Label>
            <Input
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              className="h-8 w-32"
              disabled={saving}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveQuietHours}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Default Channels */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Default Channels</h4>
        <p className="text-xs text-muted-foreground">
          Used when no category-specific preference exists.
        </p>
        <div className="flex flex-wrap gap-2">
          {preferences.defaultChannels.map((ch) => (
            <Badge key={ch} variant="secondary">
              {ch.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
