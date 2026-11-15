import type { ThemePreference } from '@memory-journal/core';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';

import { Text } from '@/theme/themed';

import { useAuthStore } from '@/features/auth/authStore';
import { useTodayId } from '@/features/calendar/useTodayId';
import { signOut } from '@/platform/auth/google';

import { DeleteAccountSection } from './DeleteAccountSection';
import { exportAllData } from './exportService';
import { setReminderEnabled, setTheme } from './settingsService';
import { useSettings } from './useSettings';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

/**
 * Section 5.9: profile (read-only), reminder toggle, theme, export, delete account, sign out.
 * The 21:00 unlock time is not a setting.
 */
export function SettingsView() {
  const user = useAuthStore((s) => s.user);
  const todayId = useTodayId();
  const { status, settings } = useSettings();
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  if (!user) return null;
  const uid = user.uid;

  const save = (work: Promise<void>) => {
    setNotice(null);
    work.catch(() => setNotice('Could not save that change. Check your connection and try again.'));
  };

  const runExport = async () => {
    setNotice(null);
    setExporting(true);
    try {
      const result = await exportAllData(uid, todayId);
      if (result === 'delivered') setNotice('Your data was exported.');
    } catch {
      setNotice('Could not export your data. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
          Profile
        </Text>
        <Text>{user.displayName ?? 'No name'}</Text>
        <Text>{user.email ?? 'No email'}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
          Daily reminder
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1 }}>Remind me at 9:00 PM to write my day</Text>
          {status === 'loading' ? (
            <ActivityIndicator />
          ) : (
            <Switch
              accessibilityLabel="Daily 9 PM reminder"
              value={settings.reminderEnabled}
              onValueChange={(value) => save(setReminderEnabled(uid, value))}
            />
          )}
        </View>
        <Text>Today unlocks for writing at 9:00 PM. That time cannot be changed.</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
          Theme
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {THEMES.map((option) => {
            const selected = settings.theme === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => save(setTheme(uid, option.value))}
              >
                <Text style={{ fontWeight: selected ? '700' : '400' }}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
          Your data
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: exporting }}
          disabled={exporting}
          onPress={() => void runExport()}
        >
          <Text>{exporting ? 'Exporting…' : 'Export all data (JSON)'}</Text>
        </Pressable>
      </View>

      {notice ? <Text accessibilityRole="alert">{notice}</Text> : null}

      <DeleteAccountSection uid={uid} />

      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
