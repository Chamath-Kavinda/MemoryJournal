import {
  DELETE_CONFIRM_WORD,
  isDeleteConfirmed,
  type JournalRepository,
} from '@memory-journal/core';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useConfirm } from '@/components/useConfirm';
import { Text } from '@/theme/themed';

import { eraseGuestData } from './eraseGuestService';

/**
 * "Erase guest data" with two confirmations (docs section 15.6, point 11), each one a dialog
 * (section 15.10): first a plain warning, then the person types the word DELETE. A guest has no
 * account, so there is no Google sign-in step and nothing is deleted from the cloud. When it
 * works the journal on this device is empty, so a short note says so.
 */
export function EraseGuestSection({ repository }: { repository: JournalRepository }) {
  const confirm = useConfirm();
  const [erasing, setErasing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    setMessage(null);

    const understood = await confirm({
      title: 'Erase guest data?',
      message:
        'This permanently erases everything stored on this device: every day and all its revisions, your movies and books, tags, and progress. It cannot be undone, and nothing is backed up. Export your data first if you want to keep a copy.',
      confirmLabel: 'Erase guest data',
      icon: TriangleAlert,
    });
    if (!understood) return;

    const typed = await confirm({
      title: 'Erase everything forever?',
      message: `Type ${DELETE_CONFIRM_WORD} to confirm.`,
      confirmLabel: 'Erase forever',
      typed: { label: `Type ${DELETE_CONFIRM_WORD} to confirm`, matches: isDeleteConfirmed },
    });
    if (!typed) return;

    setErasing(true);
    const result = await eraseGuestData(repository);
    setErasing(false);
    setMessage(
      result.status === 'erased'
        ? 'Guest data was erased from this device.'
        : `Could not erase the guest data. ${result.message}`,
    );
  };

  return (
    <View accessibilityRole="summary" style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
        Erase guest data
      </Text>

      {erasing ? (
        <View style={{ gap: 8 }}>
          <ActivityIndicator />
          <Text>Erasing your data. Keep the app open until this finishes.</Text>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => void start()}>
          <Text>Erase guest data</Text>
        </Pressable>
      )}

      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    </View>
  );
}
