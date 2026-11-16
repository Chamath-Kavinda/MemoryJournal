import { LogIn } from 'lucide-react-native';

import { Button } from '@/components/Button';

import { useAuthStore } from './authStore';

interface Props {
  onPress: () => void;
}

/**
 * The Sign in pill of the top bar (section 15.8). It shows for a guest only: nothing while the
 * app is still working out who is signed in, and nothing for a signed-in user.
 */
export function SignInPill({ onPress }: Props) {
  const status = useAuthStore((s) => s.status);
  if (status !== 'signed-out') return null;
  return <Button label="Sign in" icon={LogIn} variant="secondary" pill onPress={onPress} />;
}
