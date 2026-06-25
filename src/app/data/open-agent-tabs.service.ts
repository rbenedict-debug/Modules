import { Injectable, signal } from '@angular/core';

/**
 * Open agent profile tabs — the browser-style document tabs that sit in the top nav.
 *
 * Opening an agent profile spawns a `ds-nav-tab` beside the section tab; the tabs are pinned, so
 * they persist as you move around the app until you close them (the prod ticket-tab behavior).
 * This service owns only the ordered SET of open agent ids; the shell (`app.ts` / `app.html`)
 * renders the strip and derives the *active* tab from the router URL — so the URL stays the single
 * source of truth for which agent you're viewing.
 *
 * 🟡 In-memory for the session: survives navigation, resets on a full browser reload.
 * TODO eng: persist open tabs across reloads (e.g. session storage) if product wants that.
 */
@Injectable({ providedIn: 'root' })
export class OpenAgentTabsService {
  /** Ordered ids of agents currently open as top-nav tabs (left → right). */
  readonly ids = signal<string[]>([]);

  /**
   * Open an agent tab. Idempotent — re-opening an already-open agent is a no-op here; the caller
   * navigates to it, which focuses the existing tab (never a duplicate).
   */
  open(id: string): void {
    if (!id) return;
    const list = this.ids();
    if (!list.includes(id)) this.ids.set([...list, id]);
  }

  /** Close an agent tab. Which tab to activate next is the shell's concern (it owns the router). */
  close(id: string): void {
    this.ids.set(this.ids().filter((x) => x !== id));
  }

  /** Close every agent tab at once (the overflow panel's "Close all tabs"). */
  closeAll(): void {
    this.ids.set([]);
  }
}
