import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ConfirmDialog, type ConfirmOptions } from './ConfirmDialog';

/** Resolves to true when the person confirms and to false for every other way of closing. */
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

interface Pending {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Shows one confirmation dialog at a time. Mount it once near the root, inside the theme.
 * Asking again while a dialog is open closes the open one as cancelled.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const open = useRef<Pending | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    const current = open.current;
    if (!current) return;
    open.current = null;
    setPending(null);
    current.resolve(confirmed);
  }, []);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        open.current?.resolve(false);
        const next = { options, resolve };
        open.current = next;
        setPending(next);
      }),
    [],
  );

  // Nothing waits forever if the provider goes away with a dialog open.
  useEffect(
    () => () => {
      open.current?.resolve(false);
      open.current = null;
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <ConfirmDialog
          // A new key gives a second dialog in a row its own entrance and its own typed text.
          key={pending.options.title + pending.options.confirmLabel}
          {...pending.options}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

/**
 * `const confirm = useConfirm();` then `if (await confirm({ ... })) deleteIt();`.
 * Every delete, remove, discard, erase and sign-out goes through this (section 15.10).
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm needs a ConfirmProvider above it.');
  return confirm;
}
