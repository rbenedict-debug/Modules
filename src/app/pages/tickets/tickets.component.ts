import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  signal,
} from '@angular/core';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// Local view types for the mock inbox. Kept self-contained — the table is a static
// design-mode visual driven by table-init.js, not wired to the live TicketsService.
type TicketStatus = 'Unopened' | 'In Progress' | 'Pending Details' | 'Closed';
type CustomerRole = 'Student' | 'Faculty' | 'Staff' | 'Parent/Guardian';
type TicketPriority = 'Critical' | 'P1 High' | 'P2 Normal' | 'P3 Low';

interface TicketRow {
  id: string;
  number: string;
  status: TicketStatus;
  subject: string;
  customerName: string;
  role: CustomerRole;
  priority: TicketPriority;
  ownerName: string;
  submitted: string;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.scss',
  host: { class: 'ds-page-content', role: 'main' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsComponent implements AfterViewInit {
  constructor(private cdr: ChangeDetectorRef) {}

  // Representative inbox rows. Static mock data — "no tickets need to come" — chosen to
  // exercise every column variant (each status / role / priority / owner appears).
  readonly items = signal<TicketRow[]>([
    { id: '1',  number: '#48291', status: 'Unopened',        subject: 'Unable to access enrollment portal after password reset', customerName: 'Emily Johnson',   role: 'Student',         priority: 'P2 Normal', ownerName: 'Cindy Smith',  submitted: 'Apr 14, 2026' },
    { id: '2',  number: '#75934', status: 'Unopened',        subject: 'Charged twice for the April lunch balance',               customerName: 'Michael Lee',     role: 'Parent/Guardian', priority: 'P2 Normal', ownerName: 'James Carter', submitted: 'Apr 13, 2026' },
    { id: '3',  number: '#86420', status: 'In Progress',     subject: 'Cafeteria card reader not accepting my student ID',       customerName: 'Sophia Martinez', role: 'Student',         priority: 'P1 High',   ownerName: 'Cindy Smith',  submitted: 'Apr 13, 2026' },
    { id: '4',  number: '#31567', status: 'In Progress',     subject: 'District-wide SSO outage affecting all staff logins',     customerName: 'David Kim',       role: 'Staff',           priority: 'Critical',  ownerName: 'Priya Patel',  submitted: 'Apr 12, 2026' },
    { id: '5',  number: '#92753', status: 'Pending Details', subject: 'Broken link on the district website contact form',        customerName: 'Olivia Brown',    role: 'Faculty',         priority: 'P3 Low',    ownerName: 'Marcus Lee',   submitted: 'Apr 11, 2026' },
    { id: '6',  number: '#10482', status: 'In Progress',     subject: 'Chromebook will not connect to school Wi-Fi',             customerName: 'James Wilson',    role: 'Student',         priority: 'P3 Low',    ownerName: 'James Carter', submitted: 'Apr 10, 2026' },
    { id: '7',  number: '#67895', status: 'Pending Details', subject: 'Need copy of IEP documents from last school year',        customerName: 'Isabella Garcia', role: 'Parent/Guardian', priority: 'P2 Normal', ownerName: 'Cindy Smith',  submitted: 'Apr 9, 2026'  },
    { id: '8',  number: '#53218', status: 'In Progress',     subject: 'Payroll direct deposit did not process for April 5',      customerName: 'Liam Davis',      role: 'Staff',           priority: 'P2 Normal', ownerName: 'Priya Patel',  submitted: 'Apr 8, 2026'  },
    { id: '9',  number: '#74639', status: 'In Progress',     subject: 'Gradebook not syncing with state reporting system',       customerName: 'Mia Rodriguez',   role: 'Faculty',         priority: 'P1 High',   ownerName: 'Marcus Lee',   submitted: 'Apr 7, 2026'  },
    { id: '10', number: '#28947', status: 'Closed',          subject: 'Update emergency contact in the student record',          customerName: 'Noah Thompson',   role: 'Parent/Guardian', priority: 'P3 Low',    ownerName: 'James Carter', submitted: 'Apr 6, 2026'  },
    { id: '11', number: '#47216', status: 'In Progress',     subject: 'Missing Chromebook from device inventory audit',          customerName: 'Robert Nguyen',   role: 'Staff',           priority: 'P2 Normal', ownerName: 'Cindy Smith',  submitted: 'Apr 15, 2026' },
    { id: '12', number: '#36104', status: 'Closed',          subject: 'Spring semester grade report shows incomplete',           customerName: 'Anita Patel',     role: 'Parent/Guardian', priority: 'P1 High',   ownerName: 'Priya Patel',  submitted: 'Apr 16, 2026' },
  ]);

  // Column config for table-init.js. `name` MUST match the <th> header labels exactly.
  // Owner is intentionally non-categorical: its cell holds an avatar whose initials would
  // otherwise pollute the auto-derived filter values (filters read cell textContent).
  readonly columns = [
    { name: 'Ticket #',  width: 110, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Status',    width: 160, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Unopened', c: 'blue' }, { l: 'In Progress', c: 'orange' }, { l: 'Pending Details', c: 'purple' }, { l: 'Closed', c: 'grey' },
    ]},
    { name: 'Subject',   width: 380, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Customer',  width: 190, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Role',      width: 150, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Student', c: 'blue' }, { l: 'Faculty', c: 'teal' }, { l: 'Staff', c: 'orange' }, { l: 'Parent/Guardian', c: 'purple' },
    ]},
    { name: 'Priority',  width: 130, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Critical', c: 'red' }, { l: 'P1 High', c: 'orange' }, { l: 'P2 Normal', c: 'blue' }, { l: 'P3 Low', c: 'grey' },
    ]},
    { name: 'Owner',     width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Submitted', width: 140, type: 'date',  _categorical: false, _badgeOptions: null },
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
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
    // Hand full DOM control to table-init.js after Angular's initial render.
    this.cdr.detach();
  }

  // ── Cell display helpers (run during the initial render, before detach) ──────────

  statusColor(status: TicketStatus): string {
    switch (status) {
      case 'Unopened':        return 'blue';
      case 'In Progress':     return 'orange';
      case 'Pending Details': return 'purple';
      case 'Closed':          return 'grey';
    }
  }

  roleColor(role: CustomerRole): string {
    switch (role) {
      case 'Student':         return 'blue';
      case 'Faculty':         return 'teal';
      case 'Staff':           return 'orange';
      case 'Parent/Guardian': return 'purple';
    }
  }

  priorityColor(priority: TicketPriority): string {
    switch (priority) {
      case 'Critical':  return 'red';
      case 'P1 High':   return 'orange';
      case 'P2 Normal': return 'blue';
      case 'P3 Low':    return 'grey';
    }
  }

  // Owner avatar monogram — first + last initial (e.g. "James Carter" → "JC").
  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // Tab selection. The component view is detached after ngAfterViewInit (table-init.js
  // owns the DOM), so signal-bound classes wouldn't refresh — toggle the selected state
  // directly on the DOM instead. Visual only; row filtering is the eng team's concern.
  selectTab(ev: Event): void {
    const clicked = ev.currentTarget as HTMLElement;
    const group = clicked.closest('.inbox-tabs');
    if (!group) return;
    group.querySelectorAll('.ds-tabs__tab').forEach((btn) => {
      const selected = btn === clicked;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-selected', String(selected));
      btn.setAttribute('tabindex', selected ? '0' : '-1');
    });
  }
}
