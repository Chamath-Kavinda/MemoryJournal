const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * A new document id: 20 letters and digits, the same shape Firestore makes for its own ids.
 * It is used where an id is needed before anything is stored, for a guest and an account alike.
 * It only has to be unlikely to repeat, not secret, so `random` can be replaced in tests.
 */
export function newId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 20; i += 1) {
    id += ALPHABET.charAt(Math.min(ALPHABET.length - 1, Math.floor(random() * ALPHABET.length)));
  }
  return id;
}
