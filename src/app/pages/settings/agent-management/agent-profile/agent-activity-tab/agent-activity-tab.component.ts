import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
} from '@angular/core';
import { UserStatus } from '../../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// The category an activity belongs to — drives the Type badge colour and the Type filter.
type ActivityType = 'Ticket' | 'Auth' | 'Permission' | 'Account' | 'Profile';

// One row in the agent's activity log. `timestamp` is an ISO string so the Date column
// sorts chronologically and formats consistently.
interface ActivityRow {
  id: string;
  timestamp: string; // ISO 8601
  activity: string;
  type: ActivityType;
  detail: string;
  performedBy: string;
}

/**
 * The agent profile's Activity tab — the canonical Design System table driven by
 * table-init.js, isolated in its own component. The engine takes over the DOM and calls
 * for cdr.detach(); doing that on the parent profile would freeze its other tabs, so the
 * table lives here and detaches only ITS OWN detector.
 *
 * The engine binds every element by GLOBAL id (#main-table, #btn-filter, …) and adds
 * document listeners with no teardown, so only one such table can be in the DOM at a time.
 * The parent therefore mounts this tab only while it's active (inside the @switch) — see
 * AgentProfileComponent. The trade-off is that each re-open re-inits the engine, leaking a
 * few document listeners. TODO eng: wire engine teardown + a real audit-log source for
 * this agent on handoff.
 */
@Component({
  selector: 'app-agent-activity-tab',
  standalone: true,
  imports: [],
  templateUrl: './agent-activity-tab.component.html',
  styleUrl: './agent-activity-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentActivityTabComponent implements AfterViewInit, OnDestroy {
  constructor(private cdr: ChangeDetectorRef) {}

  /** The agent's status, passed from the parent profile. A Pending agent hasn't done anything
   *  yet (→ empty Activity state); Active and Inactive agents have history (an inactive agent
   *  was active at some point, so its history stands). */
  readonly agentStatus = input.required<UserStatus>();

  /** Rows to render: none for a Pending agent, the full audit history otherwise. Drives both
   *  the table / empty-state switch in the template and the engine-boot guard in ngAfterViewInit. */
  get rows(): ActivityRow[] {
    return this.agentStatus() === 'Pending' ? [] : this.ALL_ROWS;
  }

  // Mock audit history, newest first — read once during the initial render, after which
  // table-init.js owns the DOM. TODO eng: source from the real audit log for this agent.
  private readonly ALL_ROWS: ActivityRow[] = [
    { id: 'a1',  timestamp: '2026-06-20T09:14:00', activity: 'Signed in',                            type: 'Auth',       detail: 'Safari on macOS',                       performedBy: 'This agent' },
    { id: 'a2',  timestamp: '2026-06-19T16:42:00', activity: 'Closed ticket INC-1045',               type: 'Ticket',     detail: 'Monitor flickering — Room 102',         performedBy: 'This agent' },
    { id: 'a3',  timestamp: '2026-06-19T13:30:00', activity: 'Commented on ticket INC-1044',         type: 'Ticket',     detail: 'Awaiting replacement part from vendor', performedBy: 'This agent' },
    { id: 'a4',  timestamp: '2026-06-18T11:05:00', activity: 'Resolved ticket INC-1040',             type: 'Ticket',     detail: 'Wi-Fi drops in Library',                performedBy: 'This agent' },
    { id: 'a5',  timestamp: '2026-06-17T15:24:00', activity: 'Resolved ticket INC-1042',             type: 'Ticket',     detail: 'Password reset — North High School',    performedBy: 'This agent' },
    { id: 'a6',  timestamp: '2026-06-17T08:02:00', activity: 'Signed in',                            type: 'Auth',       detail: 'Chrome on Windows',                     performedBy: 'This agent' },
    { id: 'a7',  timestamp: '2026-06-16T13:11:00', activity: 'Moved ticket INC-1039 to In Progress', type: 'Ticket',     detail: 'Projector not connecting — Room 214',   performedBy: 'This agent' },
    { id: 'a8',  timestamp: '2026-06-15T17:55:00', activity: 'Password changed',                     type: 'Auth',       detail: 'From account settings',                 performedBy: 'This agent' },
    { id: 'a9',  timestamp: '2026-06-14T10:09:00', activity: 'Two-factor authentication enabled',    type: 'Auth',       detail: 'Authenticator app',                     performedBy: 'This agent' },
    { id: 'a10', timestamp: '2026-06-12T10:47:00', activity: 'Permission set changed',               type: 'Permission', detail: 'IT Support → IT Admin (IT module)',     performedBy: 'Devon Clark' },
    { id: 'a11', timestamp: '2026-06-12T10:45:00', activity: 'Added to team',                        type: 'Account',    detail: 'North Campus IT',                       performedBy: 'Devon Clark' },
    { id: 'a12', timestamp: '2026-06-10T14:20:00', activity: 'Assigned to module',                   type: 'Permission', detail: 'IT',                                    performedBy: 'Maria Lopez' },
    { id: 'a13', timestamp: '2026-06-09T09:30:00', activity: 'Took ownership of ticket INC-1031',    type: 'Ticket',     detail: "Laptop won't charge — Front Office",    performedBy: 'This agent' },
    { id: 'a14', timestamp: '2026-06-05T08:48:00', activity: 'Failed sign-in attempt',               type: 'Auth',       detail: 'Incorrect password',                    performedBy: 'System' },
    { id: 'a15', timestamp: '2026-06-02T16:18:00', activity: 'Updated profile',                      type: 'Profile',    detail: 'Phone number',                          performedBy: 'This agent' },
    { id: 'a16', timestamp: '2026-05-30T12:00:00', activity: 'Account activated',                    type: 'Account',    detail: 'Email verified',                        performedBy: 'This agent' },
    { id: 'a17', timestamp: '2026-05-29T09:15:00', activity: 'Role assigned',                        type: 'Account',    detail: 'Agent',                                 performedBy: 'Devon Clark' },
    { id: 'a18', timestamp: '2026-05-28T06:00:00', activity: 'Account created',                      type: 'Account',    detail: 'Synced from Active Directory',          performedBy: 'System' },
  ];

  // Type → DS label colour. Each type reads as a distinct pill (and matches the Type filter
  // swatches in `columns` below). Outline pills, consistent with the Tickets tab.
  private readonly TYPE_COLOR: Record<ActivityType, string> = {
    Ticket: 'blue',
    Auth: 'purple',
    Permission: 'yellow',
    Account: 'green',
    Profile: 'grey',
  };

  typeColor(type: ActivityType): string {
    return this.TYPE_COLOR[type];
  }

  // Date cell display — "Jun 17, 2026 · 3:24 PM" from the ISO timestamp.
  formatTimestamp(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  }

  // ── Column config for table-init.js (`name` MUST match each <th> label exactly) ───
  // Type is a badge column (checkbox filter from _badgeOptions); Performed by is a
  // low-cardinality text column flagged categorical so it also gets a checkbox filter;
  // Date generates a date-range filter. Activity/Details stay searchable free text.
  readonly columns = [
    { name: 'Date',         width: 200, type: 'date',  _categorical: false, _badgeOptions: null },
    { name: 'Activity',     width: 280, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Type',         width: 140, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Ticket', c: 'blue' }, { l: 'Auth', c: 'purple' }, { l: 'Permission', c: 'yellow' }, { l: 'Account', c: 'green' }, { l: 'Profile', c: 'grey' },
    ]},
    { name: 'Details',      width: 300, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Performed by', width: 170, type: 'text',  _categorical: true,  _badgeOptions: null },
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
    // The table always renders and the engine always boots — even with zero rows. An agent with
    // no activity gets the exact same table chrome; the DS empty state (template @if) shows where
    // the rows would be. The engine derives its filters from config.columns (not row data) and
    // its row ops no-op over an empty tbody, so booting empty is safe.

    // table-init.js relocates #cp-picker-overlay to <body> and never removes it, so a prior
    // table instance (the Tickets tab, or a /tickets page visit) can leave a stale duplicate.
    // The engine resolves elements by hardcoded id, so clear any orphan first to be sure it
    // binds to OUR picker overlay.
    document.querySelectorAll('body > #cp-picker-overlay').forEach((el) => el.remove());

    OnfloTableInit.initTable({
      entity: 'Activity',
      entityPlural: 'activities',
      columns: this.columns,
      features: {
        pivot: true, rowGroups: true, values: true,
        filter: true, columnPanel: true, contextMenu: true, paginator: false,
      },
      rows: [], // always empty — table-init.js reads rows from the rendered DOM
      extraFilterGroups: [],
    });
    // Hand full DOM control to table-init.js. Detaches THIS component only, so the parent
    // profile's tabs and change detection keep working.
    this.cdr.detach();
  }

  // Toolbar download — export the currently-visible rows (respects active filters/sort, which
  // the engine applies in the DOM) to CSV. The engine also exports via right-click → Export;
  // this is the discoverable toolbar entry point. TODO eng: wire to the real export endpoint.
  downloadCsv(): void {
    const table = document.getElementById('main-table');
    if (!table) return;
    const headers = Array.from(table.querySelectorAll('thead th .ds-table__header-label'))
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean);
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'))
      .filter((tr) => (tr as HTMLElement).offsetParent !== null) // skip rows the filter hid
      .map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').replace(/\s+/g, ' ').trim()),
      );
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [headers, ...bodyRows].map((r) => r.map(esc).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-activity.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Full-screen view ──────────────────────────────────────────────────────────
  // "Expand" promotes THIS wrapper to a viewport-filling modal (CSS .is-fullscreen) instead
  // of rendering a second table — table-init.js resolves every element by global id, so a
  // duplicate would collide. The engine's DOM is left alone; only the wrapper's box changes,
  // so active filters/sort/columns/scroll carry straight into full screen. Change detection
  // is detached (the engine owns the DOM), so — like downloadCsv — we toggle by hand.
  @ViewChild('tableRoot') private tableRoot?: ElementRef<HTMLElement>;
  @ViewChild('fsBtn') private fsBtn?: ElementRef<HTMLButtonElement>;

  private isFullscreen = false;
  private prevBodyOverflow = '';

  // Bound once so add/removeEventListener pair up. Esc exits full screen.
  private readonly onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.setFullscreen(false);
  };

  toggleFullscreen(): void {
    this.setFullscreen(!this.isFullscreen);
  }

  private setFullscreen(on: boolean): void {
    const root = this.tableRoot?.nativeElement;
    if (!root || on === this.isFullscreen) return;
    this.isFullscreen = on;
    root.classList.toggle('is-fullscreen', on);

    const btn = this.fsBtn?.nativeElement;
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Expand table to full screen');
    }

    if (on) {
      this.prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.onKeydown);
    } else {
      document.body.style.overflow = this.prevBodyOverflow;
      document.removeEventListener('keydown', this.onKeydown);
    }
  }

  ngOnDestroy(): void {
    // The tab can be switched away or closed while expanded — make sure we never leave the
    // body scroll locked or the Esc listener attached. (The engine's own document listeners
    // are a separate, known design-mode leak — see the class doc above.)
    if (this.isFullscreen) {
      document.body.style.overflow = this.prevBodyOverflow;
      document.removeEventListener('keydown', this.onKeydown);
    }
  }
}
