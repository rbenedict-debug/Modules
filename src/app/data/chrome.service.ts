import { Injectable, signal } from '@angular/core';

/** Action handlers for the contextual save bar a takeover view asks the shell to render. */
export interface SaveBarConfig {
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Shell chrome UI state shared across the router-outlet boundary. The subnav drawer is
 * owned by the root App (it binds `ds-subnav.is-collapsed` and the `ds-nav-expand` toggle),
 * but full-area takeover views that live deep in the routed tree — e.g. the permission-set
 * editor — need to collapse it on entry and restore it on exit. They drive it through
 * `setEditorOpen()` rather than reaching across the component tree.
 */
@Injectable({ providedIn: 'root' })
export class ChromeService {
  /** Whether the section subnav drawer is expanded. App binds the drawer + toggle to this. */
  readonly subNavOpen = signal(true);

  // The drawer state captured when a takeover view opened, restored when it closes.
  // null = no takeover view is currently forcing the drawer collapsed.
  private _restoreTo: boolean | null = null;

  /**
   * Called by a full-area takeover view (the permission-set editor) as it opens/closes.
   * On open: remember the current drawer state, then collapse. On close: restore it.
   * The user can still manually re-expand while open — only entry auto-collapses.
   */
  setEditorOpen(open: boolean): void {
    if (open) {
      if (this._restoreTo === null) this._restoreTo = this.subNavOpen();
      this.subNavOpen.set(false);
    } else if (this._restoreTo !== null) {
      this.subNavOpen.set(this._restoreTo);
      this._restoreTo = null;
    }
  }

  // ── Contextual save bar ──────────────────────────────────────────────────────────
  // A takeover view (the permission-set editor) asks the shell to dock a save bar at the bottom
  // of the content area — outside the routed page — and supplies the button handlers. null = hidden.
  readonly saveBar = signal<SaveBarConfig | null>(null);

  showSaveBar(config: SaveBarConfig): void { this.saveBar.set(config); }
  hideSaveBar(): void { this.saveBar.set(null); }
}
