import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ConfirmDialog, type ConfirmOptions } from './ConfirmDialog';

/** Resolves to true when the person confirms and to false for every other way of closing. */
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

/** Which button closed a dialog that has a third button. Every other way of closing is cancel. */
export type ConfirmChoice = 'confirm' | 'alternative' | 'cancel';
export type Choose = (options: ConfirmOptions) => Promise<ConfirmChoice>;

interface Pending {
  options: ConfirmOptions;
  resolve: (choice: ConfirmChoice) => void;
}

interface ConfirmApi {
  confirm: Confirm;
  choose: Choose;
}

const ConfirmContext = createContext<ConfirmApi | null>(null);

/**
 * Shows one confirmation dialog at a time. Mount it once near the root, inside the theme.
 * Asking again while a dialog is open closes the open one as cancelled.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const open = useRef<Pending | null>(null);

  const settle = useCallback((choice: ConfirmChoice) => {
    const current = open.current;
    if (!current) return;
    open.current = null;
    setPending(null);
    current.resolve(choice);
  }, []);

  const choose = useCallback<Choose>(
    (options) =>
      new Promise<ConfirmChoice>((resolve) => {
        open.current?.resolve('cancel');
        const next = { options, resolve };
        open.current = next;
        setPending(next);
      }),
    [],
  );

  const api = useMemo<ConfirmApi>(
    () => ({
      choose,
      confirm: async (options) => (await choose(options)) === 'confirm',
    }),
    [choose],
  );

  // Nothing waits forever if the provider goes away with a dialog open.
  useEffect(
    () => () => {
      open.current?.resolve('cancel');
      open.current = null;
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {pending ? (
        <ConfirmDialog
          // A new key gives a second dialog in a row its own entrance and its own typed text.
          key={pending.options.title + pending.options.confirmLabel}
          {...pending.options}
          onConfirm={() => settle('confirm')}
          onAlternative={() => settle('alternative')}
          onCancel={() => settle('cancel')}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

function useConfirmApi(): ConfirmApi {
  const api = useContext(ConfirmContext);
  if (!api) throw new Error('useConfirm needs a ConfirmProvider above it.');
  return api;
}

/**
 * `const confirm = useConfirm();` then `if (await confirm({ ... })) deleteIt();`.
 * Every delete, remove, discard, erase and sign-out goes through this (section 15.10).
 */
export function useConfirm(): Confirm {
  return useConfirmApi().confirm;
}

/**
 * Like `useConfirm`, for a dialog with a third button (`alternativeLabel`), such as the guest
 * merge dialog: Cancel, Export guest data and Merge and sign in.
 */
export function useChoice(): Choose {
  return useConfirmApi().choose;
}
