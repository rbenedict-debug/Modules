import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
} from '@angular/core';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// One ticket row, pre-shaped by the parent profile (label colors + formatted date resolved
// there) so this component stays a dumb host for the canonical Design System table.
export interface AgentTicketRow {
  id: string;
  number: string;
  subject: string;
  status: string;
  statusColor: string;
  priority: string;
  priorityColor: string;
  moduleName: string;
  received: string;
}

/**
 * The agent profile's Tickets tab — the canonical Design System table driven by
 * table-init.js, isolated in its own component on purpose. The engine takes over the DOM
 * and calls for cdr.detach(); doing that on the parent profile would freeze its other
 * tabs, so the table lives here and detaches only ITS OWN change detector.
 *
 * The engine also adds permanent document listeners and relocates #cp-picker-overlay to
 * <body> with no teardown, so re-creating it on every tab switch would leak. The parent
 * therefore mounts this lazily on first open and keeps it alive (hidden, never destroyed)
 * — the engine initializes exactly once. See AgentProfileComponent for the mount logic.
 */
@Component({
  selector: 'app-agent-tickets-table',
  standalone: true,
  imports: [],
  templateUrl: './agent-tickets-table.component.html',
  styleUrl: './agent-tickets-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentTicketsTableComponent implements AfterViewInit {
  constructor(private cdr: ChangeDetectorRef) {}

  // Pre-shaped rows from the parent. Read once during the initial render — table-init.js
  // owns the DOM after ngAfterViewInit, so later input changes won't re-render. The profile
  // mounts a fresh instance per agent visit, so that's fine in practice. TODO eng: source
  // the agent's full ticket history (every ticket they've been part of, not just owned).
  @Input({ required: true }) rows: AgentTicketRow[] = [];

  // Column config for table-init.js. `name` MUST match the <th> header labels exactly.
  // Status/Priority are categorical badges (checkbox filters); Module is a low-cardinality
  // text column opted into the filter panel; Received drives a date-range filter.
  readonly columns = [
    { name: 'Ticket',   width: 120, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Subject',  width: 360, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Status',   width: 150, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Unopened', c: 'grey' }, { l: 'In Progress', c: 'blue' }, { l: 'Waiting', c: 'yellow' }, { l: 'Closed', c: 'green' },
    ]},
    { name: 'Priority', width: 120, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'P1', c: 'red' }, { l: 'P2', c: 'orange' }, { l: 'P3', c: 'grey' },
    ]},
    { name: 'Module',   width: 180, type: 'text',  _categorical: true,  _badgeOptions: null },
    { name: 'Received', width: 150, type: 'date',  _categorical: false, _badgeOptions: null },
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
    // table-init.js relocates #cp-picker-overlay to <body> and never removes it, so a
    // previously-visited table page (e.g. /tickets) can leave a stale duplicate behind.
    // The engine resolves elements by hardcoded id, so clear any orphan first to be sure
    // it binds to OUR picker overlay.
    document.querySelectorAll('body > #cp-picker-overlay').forEach((el) => el.remove());

    OnfloTableInit.initTable({
      entity: 'Ticket',
      entityPlural: 'tickets',
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
    a.download = 'agent-tickets.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
