import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { SignInProgressCard } from '@/features/auth/SignInProgressCard';
import { useGuestSignIn } from '@/features/auth/useGuestSignIn';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

/** The sign-in form is a narrow column in the middle of the window, not as wide as the window. */
const FORM_MAX_WIDTH = 420;

export default function SignInScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { state, start, exportGuest } = useGuestSignIn();

  // Signing in is optional, so this screen can always be left for Home.
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  // When the sign-in (and any merge) has finished, Home shows the account's data.
  useEffect(() => {
    if (state.phase === 'finished') router.replace('/home');
  }, [state.phase, router]);

  const running = state.phase === 'running';

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      <View style={{ position: 'absolute', top: 16, right: 16 }}>
        <IconButton icon={X} accessibilityLabel="Close" onPress={leave} disabled={running} />
      </View>
      <View style={{ width: '100%', maxWidth: FORM_MAX_WIDTH, gap: 16 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 28, fontWeight: '600', textAlign: 'center' }}
        >
          Memory Journal
        </Text>
        <Text style={{ textAlign: 'center', color: palette.muted }}>
          Back up your journal and use it on your other devices
        </Text>

        {running ? <SignInProgressCard current={state.step} /> : null}

        {state.phase === 'problem' ? (
          <Card testID="sign-in-problem">
            <View style={{ gap: 8 }}>
              <Text accessibilityRole="alert" style={{ color: palette.danger }}>
                {state.message}
              </Text>
              {state.notAdded.length > 0 ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Not added:</Text>
                  {state.notAdded.map((line) => (
                    <Text key={line} style={{ color: palette.muted }}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Button label="Retry" onPress={() => void start()} />
              <Button
                label="Export guest data (JSON)"
                variant="secondary"
                onPress={() => void exportGuest().catch(() => undefined)}
              />
            </View>
          </Card>
        ) : null}

        {running ? null : (
          <>
            <Button
              label={
                state.phase === 'problem' ? 'Continue with Google again' : 'Continue with Google'
              }
              accessibilityLabel="Continue with Google"
              variant={state.phase === 'problem' ? 'secondary' : 'primary'}
              onPress={() => void start()}
              fullWidth
            />
            <Button label="Maybe later" variant="ghost" onPress={leave} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
