import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsView } from '@/features/settings/SettingsView';
import { ScreenHeader } from '@/features/tags/ui';

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader
        title="Settings"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
      />
      <SettingsView />
    </SafeAreaView>
  );
}
