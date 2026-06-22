import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SOURCE_LOCKED_FIELDS, Ticket, User, UserStatus, fullName } from '../../../../data/models';
import { UsersService } from '../../../../data/users.service';
import { ModulesService } from '../../../../data/modules.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TicketsService } from '../../../../data/tickets.service';
import { ChromeService } from '../../../../data/chrome.service';
import { AgentTicketsTableComponent, AgentTicketRow } from './agent-tickets-table/agent-tickets-table.component';
import { AgentActivityTabComponent } from './agent-activity-tab/agent-activity-tab.component';

// A Basic-Information row: a label with one value, several stacked values, or a set
// of values rendered as chips (roles / locations / topics). Mirrors the User-Explorer
// profile's field model so the template stays data-driven.
interface InfoField {
  label: string;
  value: string | string[];
  chips?: boolean;
  chipColor?: 'blue' | 'grey';
  // Department-module chips, each coloured by its module accent (ties the field to the
  // project's department-module system).
  moduleChips?: { name: string; accent: string }[];
  // Leading icon + tint on a single-value field (Account Status, Source).
  icon?: string;
  iconColor?: 'green' | 'yellow' | 'grey' | 'purple' | 'blue';
  // When set, the field is synced/locked from this integration → "Managed by X" note.
  managedBy?: string;
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

// Which information panel shows below the hero.
type TabId = 'details' | 'permissions' | 'tickets' | 'activity';
interface ProfileTab { id: TabId; label: string; }

// Hero provenance chip: at-a-glance "where did this agent come from". Synced agents
// carry the integration name + a sync icon (blue); manual entries read "Manual entry"
// with an edit icon (grey) — mirrors the agents/teams "integration = blue, Manual =
// grey" convention.
interface SourceBadge {
  synced: boolean;
  icon: string;
  label: string;
  title: string;
}

// Status → DS label colour (matches the agents table + the former drawer).
const STATUS_COLOR: Record<UserStatus, 'green' | 'yellow' | 'grey' | 'purple'> = {
  Active: 'green',
  Unverified: 'yellow',
  Inactive: 'grey',
  Pending: 'purple',
};

// Status → leading icon for the Account Status field.
const STATUS_ICON: Record<UserStatus, string> = {
  Active: 'check_circle',
  Unverified: 'help',
  Inactive: 'cancel',
  Pending: 'schedule',
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
  imports: [RouterLink, AgentTicketsTableComponent, AgentActivityTabComponent],
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

  // ── Tabs (Details / Tickets / Activity) ───────────────────────────────────────
  readonly tabs: ProfileTab[] = [
    { id: 'details', label: 'Details' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'activity', label: 'Activity' },
  ];
  readonly activeTab = signal<TabId>('details');
  // The Tickets and Activity tabs each host the canonical table-init.js engine, which takes
  // over the DOM, detaches change detection, and binds every element by GLOBAL id. Two such
  // tables can't coexist in the DOM, so both tabs render only while active (mutually
  // exclusive, inside the @switch) — see AgentTicketsTableComponent / AgentActivityTabComponent.

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

  // Source provenance for the hero chip — manual entry vs. synced from an integration.
  readonly sourceBadge = computed<SourceBadge | null>(() => {
    const u = this.user();
    if (!u) return null;
    if (u.source === 'Manual') {
      return {
        synced: false,
        icon: 'edit',
        label: 'Manual entry',
        title: 'This agent was added manually.',
      };
    }
    return {
      synced: true,
      icon: 'sync',
      label: `Synced from ${u.source}`,
      title: `This agent is synced from ${u.source}; its core fields are managed by the integration.`,
    };
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

    // Synced sources lock a subset of fields (SOURCE_LOCKED_FIELDS); those carry a
    // "Managed by {integration}" note so admins know the value is owned upstream.
    const synced = u.source !== 'Manual';
    const locked = SOURCE_LOCKED_FIELDS[u.source];
    const managedBy = (key: keyof User): string | undefined =>
      synced && locked.includes(key) ? u.source : undefined;

    const teamNames = this.teamsSvc.teams()
      .filter((t) => u.teams.includes(t.id))
      .map((t) => t.name);
    // Departments ARE the project's department modules — resolve each to its name +
    // accent so the field reads consistently with the rest of the module system.
    const departments = u.modules.map((id) => {
      const m = this.modulesSvc.modules().find((mod) => mod.id === id);
      return { name: m?.name ?? id, accent: m?.accent ?? 'grey' };
    });

    return [
      { label: 'User ID', value: this.formatUserId(u.id) },
      { label: 'First Name', value: u.firstName, managedBy: managedBy('firstName') },
      { label: 'Last Name', value: u.lastName, managedBy: managedBy('lastName') },
      { label: 'Middle Name', value: u.middleName || '—' },
      { label: 'Email', value: u.email, managedBy: managedBy('email') },
      { label: 'Phone', value: u.phone || '—' },
      { label: 'Account Status', value: u.status, icon: STATUS_ICON[u.status], iconColor: STATUS_COLOR[u.status], managedBy: managedBy('status') },
      chipField('Role', u.roles, 'blue'),
      chipField('Locations', u.locations, 'grey'),
      { label: 'Source', value: u.source, icon: synced ? 'cloud' : undefined, iconColor: synced ? 'blue' : undefined },
      departments.length
        ? { label: 'Department(s)', value: '', moduleChips: departments }
        : { label: 'Department(s)', value: '—' },
      chipField('Team(s)', teamNames, 'grey'),
      { label: 'Job Title', value: u.jobTitle || '—' },
      chipField('Topic(s)', u.topics, 'grey'),
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
  // Every ticket this agent is on, newest first — the Tickets tab's full history.
  readonly ownedTickets = computed<Ticket[]>(() => {
    const u = this.user();
    if (!u) return [];
    const full = fullName(u).toLowerCase();
    const firstLast = `${u.firstName} ${u.lastName}`.toLowerCase();
    return this.ticketsSvc.tickets()
      .filter((t) => {
        const owner = t.ownerName.toLowerCase();
        return owner === full || owner === firstLast;
      })
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  });

  // Shape the owned tickets for the table-init.js host (label colors + formatted date
  // resolved here, so the table component stays a dumb view).
  readonly ticketRows = computed<AgentTicketRow[]>(() =>
    this.ownedTickets().map((t) => ({
      id: t.id,
      number: t.number,
      subject: t.subject,
      status: t.status,
      statusColor: this.ticketStatusColor(t.status),
      priority: t.priority,
      priorityColor: this.ticketPriorityColor(t.priority),
      moduleName: this.moduleName(t.moduleId),
      received: this.formatDate(t.receivedAt),
    })),
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

  // Priority → DS label color (P1 most urgent).
  ticketPriorityColor(priority: Ticket['priority']): 'red' | 'orange' | 'grey' {
    switch (priority) {
      case 'P1':
        return 'red';
      case 'P2':
        return 'orange';
      default:
        return 'grey';
    }
  }

  /** Module display name for a ticket's moduleId (falls back to the id). */
  moduleName(moduleId: string): string {
    return this.modulesSvc.modules().find((m) => m.id === moduleId)?.name ?? moduleId;
  }

  // ── Formatting ─────────────────────────────────────────────────────────────────
  /** Display id like "USR-00002" from the internal id (e.g. "u2"). */
  formatUserId(id: string): string {
    const digits = id.replace(/\D/g, '');
    return digits ? `USR-${digits.padStart(5, '0')}` : id.toUpperCase();
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
