import { TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

import { useConfirm } from '@/components/useConfirm';

interface Options {
  /** True while the screen holds changes that are not saved. */
  dirty: boolean;
  /** Goes back. Called straight away when nothing is unsaved, or after the person confirms. */
  leave: () => void;
  /** One sentence for the dialog that names what is lost, for example Your changes to Ravi. */
  message: string;
  /** Throws the unsaved changes away. Called after the person confirms and before `leave`. */
  onDiscard?: () => void;
}

/**
 * Asks to discard unsaved changes before leaving a screen (section 15.10). Use the function it
 * returns for the screen's Back button: the same function serves Esc and Alt+Left on the web
 * build, because the Back button wires those. On Android it also takes over the hardware Back
 * button while there are unsaved changes.
 */
export function useLeaveGuard({ dirty, leave, message, onDiscard }: Options): () => void {
  const confirm = useConfirm();
  const latest = useRef({ dirty, leave, message, onDiscard });
  latest.current = { dirty, leave, message, onDiscard };
  // A second Back while the dialog is open must not open a second dialog.
  const asking = useRef(false);

  const guardedLeave = useCallback(() => {
    const current = latest.current;
    if (!current.dirty) {
      current.leave();
      return;
    }
    if (asking.current) return;
    asking.current = true;
    void confirm({
      title: 'Discard changes?',
      message: current.message,
      confirmLabel: 'Discard changes',
      icon: TriangleAlert,
    }).then((confirmed) => {
      asking.current = false;
      if (!confirmed) return;
      current.onDiscard?.();
      current.leave();
    });
  }, [confirm]);

  useEffect(() => {
    if (!dirty || Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      guardedLeave();
      return true;
    });
    return () => subscription.remove();
  }, [dirty, guardedLeave]);

  return guardedLeave;
}
