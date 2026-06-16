import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ModuleContextService } from '../../data/module-context.service';
import { TicketsService } from '../../data/tickets.service';
import { Ticket, CustomerRole, TicketPriority, TicketStatus } from '../../data/models';

// The four inbox views. Each maps to a predicate over the module-scoped ticket list
// (see `tabFilter`): everything but Closed shows open work, Closed is its own bucket.
type TicketTab = 'my' | 'team' | 'all' | 'closed';

interface TabDef {
  id: TicketTab;
  label: string;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.scss',
  host: { class: 'ds-page-content', role: 'main' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsComponent {
  private readonly moduleCtx = inject(ModuleContextService);
  private readonly ticketsSvc = inject(TicketsService);

  // The selected inbox view. Defaults to "My Tickets" — an agent's own open work.
  readonly activeTab = signal<TicketTab>('my');
  // Keyword search over subject + customer name (case-insensitive). Two-way bound to
  // the search field; clearing it via the clear button resets to all tab rows.
  readonly search = signal('');

  readonly tabs: TabDef[] = [
    { id: 'my', label: 'My Tickets' },
    { id: 'team', label: 'My Team' },
    { id: 'all', label: 'All Tickets' },
    { id: 'closed', label: 'Closed' },
  ];

  // Module-scoped tickets: the global switcher's current module narrows the set;
  // null (All Departments) shows everything. Recomputes when the switcher changes.
  private readonly moduleTickets = computed(() =>
    this.ticketsSvc.byModule(this.moduleCtx.currentModuleId()),
  );

  // Tab predicate. My / My Team / All exclude Closed (Closed is its own tab).
  private tabFilter(t: Ticket, tab: TicketTab): boolean {
    switch (tab) {
      case 'my':
        return t.isMyTicket && t.status !== 'Closed';
      case 'team':
        return t.isMyTeam && t.status !== 'Closed';
      case 'all':
        return t.status !== 'Closed';
      case 'closed':
        return t.status === 'Closed';
    }
  }

  // Per-tab counts over the module-scoped set, shown as badges on each tab.
  readonly counts = computed<Record<TicketTab, number>>(() => {
    const tickets = this.moduleTickets();
    return {
      my: tickets.filter(t => this.tabFilter(t, 'my')).length,
      team: tickets.filter(t => this.tabFilter(t, 'team')).length,
      all: tickets.filter(t => this.tabFilter(t, 'all')).length,
      closed: tickets.filter(t => this.tabFilter(t, 'closed')).length,
    };
  });

  // The rendered rows: module-scoped, narrowed by the active tab, then by the search
  // keyword (subject or customer name). Reactive to module switcher, tab, and search.
  readonly rows = computed<Ticket[]>(() => {
    const tab = this.activeTab();
    const term = this.search().trim().toLowerCase();
    return this.moduleTickets()
      .filter(t => this.tabFilter(t, tab))
      .filter(t =>
        !term ||
        t.subject.toLowerCase().includes(term) ||
        t.customerName.toLowerCase().includes(term),
      );
  });

  setTab(tab: TicketTab): void {
    this.activeTab.set(tab);
  }

  clearSearch(): void {
    this.search.set('');
  }

  // ── Cell display helpers ─────────────────────────────────────────────────────

  // Customer role → label color. Distinct hues so roles read at a glance.
  roleColor(role: CustomerRole): string {
    switch (role) {
      case 'Student':
        return 'blue';
      case 'Faculty':
        return 'teal';
      case 'Staff':
        return 'orange';
      case 'Parent/Guardian':
        return 'purple';
    }
  }

  // Priority → label color: P1 red (urgent), P2 orange, P3 grey (low).
  priorityColor(priority: TicketPriority): string {
    switch (priority) {
      case 'P1':
        return 'red';
      case 'P2':
        return 'orange';
      case 'P3':
        return 'grey';
    }
  }

  // Status → label color: Unopened grey, In Progress blue, Waiting yellow, Closed green.
  statusColor(status: TicketStatus): string {
    switch (status) {
      case 'Unopened':
        return 'grey';
      case 'In Progress':
        return 'blue';
      case 'Waiting':
        return 'yellow';
      case 'Closed':
        return 'green';
    }
  }

  // Owner avatar monogram — first letter of the first two name parts (e.g. "James
  // Carter" → "JC"). Falls back to the first character for single-word names.
  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // Static ISO receivedAt → "Jun 15, 9:20 AM". Local-time formatting via Intl; the
  // seed dates never change, so this is purely presentational.
  formatReceived(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
