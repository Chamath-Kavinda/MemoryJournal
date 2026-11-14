import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayScreenView } from '@/features/day/DayScreenView';
import { useDayAccess } from '@/features/day/useDayAccess';

export default function DayRoute() {
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = Array.isArray(rawDayId) ? (rawDayId[0] ?? '') : (rawDayId ?? '');
  const router = useRouter();
  const access = useDayAccess(dayId);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <DayScreenView
          dayId={dayId}
          access={access}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
