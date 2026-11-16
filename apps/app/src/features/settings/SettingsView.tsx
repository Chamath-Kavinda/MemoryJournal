import type { ThemePreference } from '@memory-journal/core';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Bell,
  CloudOff,
  Download,
  LogOut,
  Moon,
  Palette,
  Smartphone,
  Sun,
  TriangleAlert,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';
import { useConfirm } from '@/components/useConfirm';
import { SPACING } from '@/theme/layout';
import { CONTENT_MAX_WIDTH } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
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

import { DeleteAccountSection } from './DeleteAccountSection';
import { EraseGuestSection } from './EraseGuestSection';
import { exportAllData, exportGuestData } from './exportService';
import { setReminderEnabled, setTheme } from './settingsService';
import { useSettings } from './useSettings';

/** Dark first and the default, then Light and System (section 15.7). */
const THEMES: readonly Segment<ThemePreference>[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Smartphone },
];

/** The version shown in the footer comes from the app config at runtime (section 15.11). */
function appVersion(): string | null {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.length > 0 ? version : null;
}

/** One grouped card of Settings: a leading icon, a heading, then its controls. */
function Group({
  icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <Card style={{ gap: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <Icon icon={icon} size="inline" color={palette.neonViolet} />
        <Text
          accessibilityRole="header"
          style={{ flex: 1, flexShrink: 1, color: palette.text, fontSize: 18, fontWeight: '600' }}
        >
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

/**
 * Section 5.9, docs sections 15.6 (points 11 and 12) and 15.11: grouped cards for profile, daily
 * reminder, theme and your data, then the danger card and Sign out. A signed-in person sees their
 * profile, Delete account and Sign out. A guest sees Guest with a cloud-off icon, a Sign in with
 * Google button and a note that the journal lives on this device only; Sign out is hidden and the
 * delete action is Erase guest data. The 21:00 unlock time is not a setting.
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

  const version = appVersion();

  return (
    <ScrollView contentContainerStyle={{ padding: SPACING.lg, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, gap: SPACING.md }}>
        <FadeUp index={0}>
          {user ? (
            <Group icon={User} title="Profile">
              <View style={{ gap: SPACING.xs }}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
                  {user.displayName ?? 'No name'}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 15 }}>
                  {user.email ?? 'No email'}
                </Text>
              </View>
            </Group>
          ) : (
            <Group icon={User} title="Profile">
              <View accessibilityRole="summary" style={{ gap: SPACING.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                  <Icon
                    icon={CloudOff}
                    size="inline"
                    color={palette.muted}
                    accessibilityLabel="Not backed up"
                  />
                  <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
                    Guest
                  </Text>
                </View>
                <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
                  Stored on this device only. Sign in to back it up. Uninstalling the app or
                  clearing its data removes a guest journal.
                </Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <Button label="Sign in with Google" onPress={() => router.push('/sign-in')} />
                </View>
              </View>
            </Group>
          )}
        </FadeUp>

        <FadeUp index={1}>
          <Group icon={Bell} title="Daily reminder">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              <Text style={{ flex: 1, flexShrink: 1, color: palette.text, fontSize: 16 }}>
                Remind me at 9:00 PM to write my day
              </Text>
              {status === 'loading' ? (
                <ActivityIndicator />
              ) : (
                <Toggle
                  testID="reminder-toggle"
                  accessibilityLabel="Daily 9 PM reminder"
                  value={settings.reminderEnabled}
                  onValueChange={(value) => save(setReminderEnabled(repository, value))}
                />
              )}
            </View>
            <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
              Today unlocks for writing at 9:00 PM. That time cannot be changed.
            </Text>
          </Group>
        </FadeUp>

        <FadeUp index={2}>
          <Group icon={Palette} title="Theme">
            <SegmentedControl
              testID="theme-control"
              accessibilityLabel="Theme"
              segments={THEMES}
              value={settings.theme}
              onChange={(value) => save(setTheme(repository, value))}
            />
          </Group>
        </FadeUp>

        <FadeUp index={3}>
          <Group icon={Download} title="Your data">
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                label={exporting ? 'Exporting…' : 'Export all data (JSON)'}
                accessibilityLabel={exporting ? 'Exporting…' : 'Export all data (JSON)'}
                icon={Download}
                variant="secondary"
                disabled={exporting}
                onPress={() => void runExport()}
              />
            </View>
          </Group>
        </FadeUp>

        {notice ? (
          <FadeUp>
            <Text accessibilityRole="alert" style={{ color: palette.text, fontSize: 15 }}>
              {notice}
            </Text>
          </FadeUp>
        ) : null}

        <FadeUp index={4}>
          {user ? (
            <DeleteAccountSection uid={user.uid} />
          ) : (
            <EraseGuestSection repository={repository} />
          )}
        </FadeUp>

        {user ? (
          <FadeUp index={5}>
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                label="Sign out"
                icon={LogOut}
                variant="secondary"
                onPress={() => void askSignOut()}
              />
            </View>
          </FadeUp>
        ) : null}

        <Text
          testID="settings-footer"
          style={{
            color: palette.muted,
            fontSize: 13,
            lineHeight: 18,
            textAlign: 'center',
            paddingVertical: SPACING.md,
          }}
        >
          {version ? `Memory Journal v${version}` : 'Memory Journal'}
        </Text>
      </View>
    </ScrollView>
  );
}
