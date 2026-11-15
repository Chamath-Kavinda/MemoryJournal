let inProgress = false;

/**
 * True while an account is being deleted. The profile sync checks it so that it does not create
 * a fresh `users/{uid}` document in the middle of the deletion (it would otherwise see the
 * document missing and make a new one).
 */
export const isDeletionInProgress = (): boolean => inProgress;

export function setDeletionInProgress(value: boolean): void {
  inProgress = value;
}
