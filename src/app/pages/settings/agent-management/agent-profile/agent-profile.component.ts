import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Ticket, User, UserStatus, fullName } from '../../../../data/models';
import { UsersService } from '../../../../data/users.service';
import { ModulesService } from '../../../../data/modules.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TicketsService } from '../../../../data/tickets.service';
import { ChromeService } from '../../../../data/chrome.service';

// A Basic-Information row: a label with one value, several stacked values, or a set
// of values rendered as chips (roles / locations / topics). Mirrors the User-Explorer
// profile's field model so the template stays data-driven.
interface InfoField {
  label: string;
  value: string | string[];
  chips?: boolean;
  chipColor?: 'blue' | 'grey';
}

// One module the agent belongs to, with its permission set + the teams scoped to it.
interface ModulePermissionCard {
  id: string;
  name: string;
  icon: string;
  accent: string;
  permissionSetName: string;
  teams: string[];
}

interface TicketStat {
  icon: string;
  label: string;
  value: string;
  tone: 'blue' | 'orange' | 'grey';
}

interface MockAsset {
  name: string;
  assetId: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'grey';
}

interface AgentNote {
  author: string;
  initials: string;
  timestamp: string;
  body: string;
}

// Status → DS label colour (matches the agents table + the former drawer).
const STATUS_COLOR: Record<UserStatus, 'green' | 'yellow' | 'grey' | 'purple'> = {
  Active: 'green',
  Unverified: 'yellow',
  Inactive: 'grey',
  Pending: 'purple',
};

/**
 * Full-page agent profile — the page that replaced the slide-out profile drawer.
 * Reached at /settings/agent-management/:id from an Agents-table row click. The
 * layout mirrors the User-Explorer end-user profile (full-width hero + basic info
 * over a 70/30 split) so agents and end users read the same way; the section
 * content is agent-specific (module permissions, owned tickets).
 */
@Component({
  selector: 'app-agent-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agent-profile.component.html',
  styleUrl: './agent-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ds-page-content', role: 'main' },
})
export class AgentProfileComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly usersSvc = inject(UsersService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly permissionSetsSvc = inject(PermissionSetsService);
  private readonly ticketsSvc = inject(TicketsService);
  // Collapses the section subnav while this full-area profile is on screen and restores it
  // on leave — the same shell mechanism the permission-set editor uses for its takeover view.
  private readonly chrome = inject(ChromeService);

  // Agent id from the route; reactive so navigating between profiles updates the view.
  private readonly agentId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly user = computed<User | undefined>(() =>
    this.usersSvc.users().find((u) => u.id === this.agentId()),
  );

  ngOnInit(): void {
    // Full-area takeover view: collapse the subnav on open, restore it on leave.
    this.chrome.setEditorOpen(true);
  }

  ngOnDestroy(): void {
    this.chrome.setEditorOpen(false);
  }

  // ── Hero helpers ─────────────────────────────────────────────────────────────
  readonly fullName = computed(() => {
    const u = this.user();
    return u ? fullName(u) : '';
  });

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  });

  readonly statusColor = computed(() => {
    const u = this.user();
    return u ? STATUS_COLOR[u.status] : 'grey';
  });

  readonly isAgent = computed(() => !!this.user()?.roles.includes('Agent'));

  // Identity line under the name: roles · primary location (the full lists live in
  // Basic Information below).
  readonly subtitle = computed(() => {
    const u = this.user();
    if (!u) return '';
    const roles = u.roles.length ? u.roles.join(', ') : 'No role';
    const location = u.locations[0] ?? '—';
    return `${roles} · ${location}`;
  });

  // ── Basic Information ─────────────────────────────────────────────────────────
  // TODO eng: render the agent's real field set (standard + custom).
  readonly basicInfo = computed<InfoField[]>(() => {
    const u = this.user();
    if (!u) return [];
    const chipField = (
      label: string,
      values: string[],
      chipColor: 'blue' | 'grey',
    ): InfoField => (values.length ? { label, value: values, chips: true, chipColor } : { label, value: '—' });

    return [
      { label: 'Email', value: u.email },
      { label: 'Phone', value: u.phone || '—' },
      chipField('Roles', u.roles, 'blue'),
      { label: 'Source', value: u.source },
      { label: 'Job Title', value: u.jobTitle || '—' },
      chipField('Locations', u.locations, 'grey'),
      chipField('Topics', u.topics, 'grey'),
      { label: 'Employee ID', value: u.employeeId || '—' },
      { label: 'Pronouns', value: u.pronouns || '—' },
      { label: 'Emergency Contact', value: u.emergencyContact || '—' },
      { label: 'Last Login', value: this.formatDate(u.lastLogin) },
      { label: 'Date Added', value: this.formatDate(u.dateAdded) },
    ];
  });

  /** Normalize a field's value to a list so single- and multi-value fields render the same. */
  fieldValues(field: InfoField): string[] {
    return Array.isArray(field.value) ? field.value : [field.value];
  }

  // ── Permissions (per module the agent belongs to) ─────────────────────────────
  readonly modulePermissionCards = computed<ModulePermissionCard[]>(() => {
    const u = this.user();
    if (!u || !this.isAgent()) return [];

    const modules = this.modulesSvc.modules();
    const sets = this.permissionSetsSvc.sets();
    const teams = this.teamsSvc.teams();

    return u.modules.map((moduleId) => {
      const mod = modules.find((m) => m.id === moduleId);
      const setId = u.permissionSetByModule[moduleId];
      const set = sets.find((s) => s.id === setId);
      const moduleTeams = teams
        .filter((t) => u.teams.includes(t.id) && t.modules.includes(moduleId))
        .map((t) => t.name);

      return {
        id: moduleId,
        name: mod?.name ?? moduleId,
        icon: mod?.icon ?? 'category',
        accent: mod?.accent ?? 'grey',
        permissionSetName: set?.name ?? 'Not assigned',
        teams: moduleTeams,
      };
    });
  });

  // ── Tickets owned by this agent (real data) ───────────────────────────────────
  // Match on full name, falling back to first+last (seed ticket ownerName values omit
  // the middle names that fullName() includes).
  private readonly ownedTickets = computed<Ticket[]>(() => {
    const u = this.user();
    if (!u) return [];
    const full = fullName(u).toLowerCase();
    const firstLast = `${u.firstName} ${u.lastName}`.toLowerCase();
    return this.ticketsSvc.tickets().filter((t) => {
      const owner = t.ownerName.toLowerCase();
      return owner === full || owner === firstLast;
    });
  });

  readonly ticketStats = computed<TicketStat[]>(() => {
    const all = this.ownedTickets();
    const open = all.filter((t) => t.status !== 'Closed').length;
    const inProgress = all.filter((t) => t.status === 'In Progress').length;
    const closed = all.filter((t) => t.status === 'Closed').length;
    return [
      { icon: 'inbox', label: 'Open', value: String(open), tone: 'blue' },
      { icon: 'autorenew', label: 'In Progress', value: String(inProgress), tone: 'orange' },
      { icon: 'check_circle', label: 'Closed', value: String(closed), tone: 'grey' },
    ];
  });

  // Most-recent owned tickets for the activity list.
  readonly recentTickets = computed<Ticket[]>(() =>
    [...this.ownedTickets()]
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
      .slice(0, 5),
  );

  // Status → DS label color. Mirrors the inbox: Unopened grey, In Progress blue,
  // Waiting yellow, Closed green.
  ticketStatusColor(status: Ticket['status']): 'green' | 'grey' | 'yellow' | 'blue' {
    switch (status) {
      case 'In Progress':
        return 'blue';
      case 'Waiting':
        return 'yellow';
      case 'Closed':
        return 'green';
      case 'Unopened':
      default:
        return 'grey';
    }
  }

  // ── Assets (mock — TODO eng) ───────────────────────────────────────────────────
  readonly assets: MockAsset[] = [
    { name: 'HP Chromebook 14', assetId: 'AST-0312', status: 'In Use', statusColor: 'green' },
    { name: 'Logitech Headset H390', assetId: 'AST-0881', status: 'In Use', statusColor: 'green' },
    { name: 'Dell Docking Station', assetId: 'AST-0942', status: 'In Use', statusColor: 'green' },
    { name: 'iPad Air (10.9")', assetId: 'AST-1107', status: 'Pending Return', statusColor: 'yellow' },
  ];

  // ── Notes — agent-authored notes (local-only in design mode) ───────────────────
  // TODO eng: persist notes (create + load) for this agent.
  readonly notes = signal<AgentNote[]>([
    {
      author: 'Devon Clark',
      initials: 'DC',
      timestamp: 'May 30, 2026',
      body: 'Promoted to team lead in the IT module — updated the permission set to match.',
    },
    {
      author: 'Front Office',
      initials: 'FO',
      timestamp: 'May 22, 2026',
      body: 'Covers the North Campus on Fridays; route urgent hardware tickets here first.',
    },
  ]);

  addNote(body: string): void {
    const text = body.trim();
    if (!text) return;
    this.notes.update((list) => [
      { author: 'You', initials: 'Y', timestamp: 'Just now', body: text },
      ...list,
    ]);
  }

  // ── Formatting ─────────────────────────────────────────────────────────────────
  formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
