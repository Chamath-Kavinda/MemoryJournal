import { DELETE_CONFIRM_WORD, isDeleteConfirmed } from '@memory-journal/core';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text, TextInput } from '@/theme/themed';

import { deleteAccount } from './deleteService';

type Step = 'idle' | 'warning' | 'typing' | 'deleting';

/**
 * "Delete account and all data" with two confirmations (section 5.9): first a plain warning,
 * then the person has to type the word DELETE. Only then does the app ask for a Google sign-in
 * and start deleting. When it works the account is gone and the app returns to the sign-in
 * screen by itself, so nothing needs to be shown for success.
 */
export function DeleteAccountSection({ uid }: { uid: string }) {
  const [step, setStep] = useState<Step>('idle');
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const reset = () => {
    setStep('idle');
    setTyped('');
  };

  const run = async () => {
    setMessage(null);
    setStep('deleting');
    const result = await deleteAccount(uid);
    if (result.status === 'deleted') return;
    reset();
    if (result.status === 'error') setMessage(`Could not delete the account. ${result.message}`);
    else setMessage('Deleting was cancelled. Nothing was deleted.');
  };

  return (
    <View accessibilityRole="summary" style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontWeight: '600' }}>
        Delete account
      </Text>

      {step === 'idle' ? (
        <Pressable accessibilityRole="button" onPress={() => setStep('warning')}>
          <Text>Delete account and all data</Text>
        </Pressable>
      ) : null}

      {step === 'warning' ? (
        <View style={{ gap: 8 }}>
          <Text>
            This permanently deletes your account and everything in it: every day and all its
            revisions, your movies and books, tags, and progress. It cannot be undone. Export your
            data first if you want to keep a copy.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setStep('typing')}>
            <Text>Continue</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={reset}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'typing' ? (
        <View style={{ gap: 8 }}>
          <Text>{`Type ${DELETE_CONFIRM_WORD} to confirm. You will then be asked to sign in with Google once more.`}</Text>
          <TextInput
            accessibilityLabel={`Type ${DELETE_CONFIRM_WORD} to confirm`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{ borderWidth: 1, padding: 8 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isDeleteConfirmed(typed) }}
            disabled={!isDeleteConfirmed(typed)}
            onPress={() => void run()}
          >
            <Text style={{ opacity: isDeleteConfirmed(typed) ? 1 : 0.4 }}>Delete forever</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={reset}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'deleting' ? (
        <View style={{ gap: 8 }}>
          <ActivityIndicator />
          <Text>Deleting your data. Keep the app open until this finishes.</Text>
        </View>
      ) : null}

      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    </View>
  );
}
