import { Injectable, signal } from '@angular/core';

export type SnackbarKind = 'success' | 'error';

export interface SnackbarState {
  kind: SnackbarKind;
  message: string;
  /** Error snackbars carry a Retry action; when set, a Retry button is shown. */
  retry?: () => void;
}

/**
 * App-wide toast messages. One snackbar at a time, rendered top-center by the
 * SnackbarHostComponent that the shell mounts once. Success toasts auto-dismiss after
 * 3s; error toasts carry an optional Retry and never auto-dismiss (they stay until
 * dismissed or a retry runs) — matching the AI Voice handoff convention.
 *
 * Design mode: in-memory signal only; there is no backend. Pages that submit a mock
 * action call success()/error() from the action's simulated result.
 */
@Injectable({ providedIn: 'root' })
export class MessagingService {
  readonly snackbar = signal<SnackbarState | null>(null);
  private autoDismiss: ReturnType<typeof setTimeout> | undefined;

  /** Show a success toast; auto-dismisses after 3 seconds. */
  success(message: string): void {
    this.set({ kind: 'success', message });
    this.autoDismiss = setTimeout(() => this.dismiss(), 3000);
  }

  /** Show an error toast; stays until dismissed or a retry runs. */
  error(message: string, retry?: () => void): void {
    this.set({ kind: 'error', message, retry });
  }

  /** Run the current toast's retry action (if any), then clear the toast. */
  retry(): void {
    const action = this.snackbar()?.retry;
    this.dismiss();
    action?.();
  }

  dismiss(): void {
    clearTimeout(this.autoDismiss);
    this.snackbar.set(null);
  }

  private set(state: SnackbarState): void {
    clearTimeout(this.autoDismiss);
    this.snackbar.set(state);
  }
}
