import { Redirect } from 'expo-router';

import { useAuthStore } from '@/features/auth/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={status === 'signed-in' ? '/home' : '/sign-in'} />;
}
