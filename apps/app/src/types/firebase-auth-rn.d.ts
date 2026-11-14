import type { Persistence } from 'firebase/auth';

// firebase/auth exports this only under the React Native bundle condition,
// so its TypeScript types do not declare it. Metro resolves it at runtime.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
