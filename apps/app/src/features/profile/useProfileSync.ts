import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/authStore';

import { syncUserProfile } from './profileService';

/** Creates the profile after sign-in and refreshes the time zone whenever the app comes back. */
export function useProfileSync(): void {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    void syncUserProfile(user);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncUserProfile(user);
    });
    return () => subscription.remove();
  }, [user]);
}
