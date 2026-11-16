import type { ThemePreference } from '@memory-journal/core';
import { useRouter } from 'expo-router';
import { CloudOff, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';

import { useConfirm } from '@/components/useConfirm';
import { Text } from '@/theme/themed';

import { startAuthListener, useAuthStore } from '@/features/auth/authStore';
import {
  signOutAndWipe,
  signOutDialog,
  waitForPendingWrites,
} from '@/features/auth/signOutService';
import { useTodayId } from '@/features/calendar/useTodayId';
import { clearUserDrafts } from '@/features/day/draftStorage';
import { remindersSupported, syncReminder } from '@/features/reminder/reminderService';
import { shutDownFirebase } from '@/lib/firebase';
import { forgetAccountRepository, getJournalRepository, useJournalRepository } from '@/lib/journal';
import { signOut } from '@/platform/auth/google';
import { useTheme } from '@/theme/ThemeProvider';

import { DeleteAccountSection } from './DeleteAccountSection';
import { EraseGuestSection } from './EraseGuestSection';
import { exportAllData, exportGuestData } from './exportService';
import { setReminderEnabled, setTheme } from './settingsService';
import { useSettings } from './useSettings';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

/**
 * Section 5.9 and docs section 15.6 (points 11 and 12): profile, reminder toggle, theme, export,
 * and the end-of-journal actions. A signed-in person sees their profile, Delete account and Sign
 * out. A guest sees Guest with a cloud-off icon, a Sign in with Google button and a note that the
 * journal lives on this device only; Sign out is hidden and the delete action is Erase guest
 * data. The 21:00 unlock time is not a setting.
 */
export function SettingsView() {
  const user = useAuthStore((s) => s.user);
  const todayId = useTodayId();
  const router = useRouter();
  const { palette } = useTheme();
  const confirm = useConfirm();
  const { status, settings } = useSettings();
  const repository = useJournalRepository();
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // The repository is null only while the app is still working out who is using it.
  if (!repository) return null;

  const save = (work: Promise<void>) => {
    setNotice(null);
    work.catch(() => setNotice('Could not save that change. Check your connection and try again.'));
  };

  const runExport = async () => {
    setNotice(null);
    setExporting(true);
    try {
      const result = user
        ? await exportAllData(user.uid, todayId)
        : await exportGuestData(repository, todayId);
      if (result === 'delivered') setNotice('Your data was exported.');
    } catch {
      setNotice(
        user
          ? 'Could not export your data. Check your connection and try again.'
          : 'Could not export your data. Try again.',
      );
    } finally {
      setExporting(false);
    }
  };

  const askSignOut = async () => {
    if (!user) return;
    // Give pending writes up to 5 seconds to upload, then say how many are still waiting.
    const current = getJournalRepository(user.uid);
    const pending = await waitForPendingWrites({
      pendingWriteCount: () =>
        'pendingWriteCount' in current && typeof current.pendingWriteCount === 'function'
          ? (current.pendingWriteCount as () => number)()
          : 0,
    });
    const confirmed = await confirm({ ...signOutDialog(user.email, pending), icon: TriangleAlert });
    if (!confirmed) return;

    setNotice(null);
    const result = await signOutAndWipe({
      signOut,
      shutDown: shutDownFirebase,
      clearDrafts: () => clearUserDrafts(user.uid),
      clearReminder: async () => {
        if (remindersSupported) await syncReminder(false).catch(() => undefined);
      },
      forgetRepository: forgetAccountRepository,
      restartAuthListener: () => {
        startAuthListener();
      },
    });
    if (result.status === 'error') setNotice(`Sign-out did not finish. ${result.message}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
      {user ? (
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
            Profile
          </Text>
          <Text>{user.displayName ?? 'No name'}</Text>
          <Text>{user.email ?? 'No email'}</Text>
        </View>
      ) : (
        <View accessibilityRole="summary" style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
            Profile
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CloudOff accessibilityLabel="Not backed up" size={20} color={palette.textMuted} />
            <Text>Guest</Text>
          </View>
          <Text>
            Stored on this device only. Sign in to back it up. Uninstalling the app or clearing its
            data removes a guest journal.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            onPress={() => router.push('/sign-in')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ fontWeight: '600' }}>Sign in with Google</Text>
          </Pressable>
        </View>
      )}

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
              onValueChange={(value) => save(setReminderEnabled(repository, value))}
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
                onPress={() => save(setTheme(repository, option.value))}
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

      {user ? (
        <>
          <DeleteAccountSection uid={user.uid} />

          <Pressable accessibilityRole="button" onPress={() => void askSignOut()}>
            <Text>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <EraseGuestSection repository={repository} />
      )}
    </ScrollView>
  );
}
