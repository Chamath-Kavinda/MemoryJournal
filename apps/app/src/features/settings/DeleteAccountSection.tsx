import { DELETE_CONFIRM_WORD, isDeleteConfirmed } from '@memory-journal/core';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useConfirm } from '@/components/useConfirm';
import { Text } from '@/theme/themed';

import { deleteAccount } from './deleteService';

/**
 * "Delete account and all data" with two confirmations (section 5.9), each one a dialog (section
 * 15.10): first a plain warning, then the person has to type the word DELETE. Only then does the
 * app ask for a Google sign-in and start deleting. When it works the account is gone and the app
 * returns to the sign-in screen by itself, so nothing needs to be shown for success.
 */
export function DeleteAccountSection({ uid }: { uid: string }) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    setMessage(null);

    const understood = await confirm({
      title: 'Delete your account?',
      message:
        'This permanently deletes your account and everything in it: every day and all its revisions, your movies and books, tags, and progress. It cannot be undone. Export your data first if you want to keep a copy.',
      confirmLabel: 'Delete account',
      icon: TriangleAlert,
    });
    if (!understood) return;

    const typed = await confirm({
      title: 'Delete everything forever?',
      message: `Type ${DELETE_CONFIRM_WORD} to confirm. You will then be asked to sign in with Google once more.`,
      confirmLabel: 'Delete forever',
      typed: { label: `Type ${DELETE_CONFIRM_WORD} to confirm`, matches: isDeleteConfirmed },
    });
    if (!typed) return;

    setDeleting(true);
    const result = await deleteAccount(uid);
    if (result.status === 'deleted') return;
    setDeleting(false);
    if (result.status === 'error') setMessage(`Could not delete the account. ${result.message}`);
    else setMessage('Deleting was cancelled. Nothing was deleted.');
  };

  return (
    <View accessibilityRole="summary" style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
        Delete account
      </Text>

      {deleting ? (
        <View style={{ gap: 8 }}>
          <ActivityIndicator />
          <Text>Deleting your data. Keep the app open until this finishes.</Text>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => void start()}>
          <Text>Delete account and all data</Text>
        </Pressable>
      )}

      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    </View>
  );
}
