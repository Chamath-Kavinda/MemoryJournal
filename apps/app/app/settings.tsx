import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsView } from '@/features/settings/SettingsView';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SettingsView />
    </SafeAreaView>
  );
}
