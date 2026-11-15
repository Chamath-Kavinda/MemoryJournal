import { ChevronLeft } from 'lucide-react-native';

import { useBackShortcut } from '@/navigation/shortcuts';

import { IconButton } from './IconButton';

export interface BackButtonProps {
  onBack: () => void;
}

/**
 * The one Back control of every stack screen (section 15.8): an icon only, with the
 * accessibility label Back. The word never appears as a text link. On the web build Alt+Left
 * and Esc do the same; phones use the hardware Back button.
 */
export function BackButton({ onBack }: BackButtonProps) {
  useBackShortcut(onBack);
  return <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={onBack} />;
}
