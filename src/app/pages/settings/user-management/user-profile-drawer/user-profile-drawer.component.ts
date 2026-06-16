import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SOURCE_LOCKED_FIELDS,
  Ticket,
  User,
  UserSource,
  UserStatus,
  fullName,
} from '../../../../data/models';
import { UsersService } from '../../../../data/users.service';
import { ModulesService } from '../../../../data/modules.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TicketsService } from '../../../../data/tickets.service';

type ProfileTab = 'details' | 'permissions' | 'tickets' | 'assets' | 'activity';
type TicketFilter = 'all' | 'open' | 'closed';

/**
 * The slice of User the Edit form can mutate (a working copy committed on Save).
 * `Required<…>` because the draft always initializes every field to a string
 * (optional User fields default to ''), so `save()` can call `.trim()` safely.
 */
type EditableUser = Required<
  Pick<
    User,
    | 'firstName'
    | 'middleName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'status'
    | 'jobTitle'
    | 'employeeId'
    | 'pronouns'
    | 'emergencyContact'
  >
>;

interface ModulePermissionCard {
  id: string;
  name: string;
  icon: string;
  accent: string;
  permissionSetName: string;
  teams: string[];
}

interface MockAsset {
  name: string;
  assetId: string;
  type: string;
  assignedOn: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'grey';
}

interface ActivityEntry {
  date: string;
  type: 'login' | 'profile' | 'permission' | 'ticket' | 'asset';
  description: string;
}

const ACTIVITY_ICONS: Record<ActivityEntry['type'], string> = {
  login: 'login',
  profile: 'edit',
  permission: 'shield',
  ticket: 'confirmation_number',
  asset: 'inventory_2',
};

// Status → DS label colour. Used for the header pill and the Details status row.
const STATUS_COLOR: Record<UserStatus, 'green' | 'yellow' | 'grey' | 'purple'> = {
  Active: 'green',
  Unverified: 'yellow',
  Inactive: 'grey',
  Pending: 'purple',
};

const ALL_STATUSES: UserStatus[] = ['Active', 'Unverified', 'Inactive', 'Pending'];

@Component({
  selector: 'app-user-profile-drawer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-profile-drawer.component.html',
  styleUrl: './user-profile-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileDrawerComponent {
  private readonly usersSvc = inject(UsersService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly permissionSetsSvc = inject(PermissionSetsService);
  private readonly ticketsSvc = inject(TicketsService);

  /** Id of the user to show; null means the drawer is closed. */
  private readonly _userId = signal<string | null>(null);
  @Input() set userId(value: string | null) {
    this._userId.set(value);
    // Opening a different user always resets to a clean view (not mid-edit).
    this.editing.set(false);
    this.activeTab.set('details');
  }
  get userId(): string | null {
    return this._userId();
  }

  /** Emits when the drawer requests to close. */
  @Output() close = new EventEmitter<void>();

  // Resolve the live user record from the service by id.
  readonly user = computed<User | undefined>(() =>
    this.usersSvc.users().find((u) => u.id === this._userId()),
  );

  readonly activeTab = signal<ProfileTab>('details');
  readonly editing = signal(false);

  // Working copy of the editable fields — populated when Edit is pressed, committed on Save.
  readonly draft = signal<EditableUser | null>(null);

  // ── Header / display helpers ────────────────────────────────────────────────
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

  // All team names the user belongs to (Details → Teams row), resolved id → name.
  readonly teamNames = computed<string[]>(() => {
    const u = this.user();
    if (!u) return [];
    const teams = this.teamsSvc.teams();
    return u.teams
      .map((id) => teams.find((t) => t.id === id)?.name)
      .filter((name): name is string => !!name);
  });

  readonly tabs: { id: ProfileTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'assets', label: 'Assets' },
    { id: 'activity', label: 'Activity' },
  ];

  readonly statusOptions = ALL_STATUSES;

  // ── Source-field locking ─────────────────────────────────────────────────────
  /** Fields that are externally synced for this user's source (stay read-only in edit). */
  readonly lockedFields = computed<Set<keyof User>>(() => {
    const u = this.user();
    return new Set(u ? SOURCE_LOCKED_FIELDS[u.source] : []);
  });

  isLocked(field: keyof User): boolean {
    return this.lockedFields().has(field);
  }

  // ── Details tab values (view mode reads the live user) ───────────────────────
  formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatUserId(id: string): string {
    return id.toUpperCase();
  }

  // ── Permissions tab ──────────────────────────────────────────────────────────
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
      // Teams the user belongs to that are scoped to this module.
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

  // ── Tickets tab ────────────────────────────────────────────────────────────
  readonly ticketFilter = signal<TicketFilter>('all');
  readonly ticketSearch = signal('');

  // All tickets owned by this user. Match on full name, falling back to first+last
  // (seed ticket ownerName values omit middle names that fullName() includes).
  private readonly ownedTickets = computed<Ticket[]>(() => {
    const u = this.user();
    if (!u) return [];
    const full = fullName(u).toLowerCase();
    const firstLast = `${u.firstName} ${u.lastName}`.toLowerCase();
    return this.ticketsSvc
      .tickets()
      .filter((t) => {
        const owner = t.ownerName.toLowerCase();
        return owner === full || owner === firstLast;
      });
  });

  readonly ticketCounts = computed(() => {
    const all = this.ownedTickets();
    const open = all.filter((t) => t.status !== 'Closed').length;
    return { all: all.length, open, closed: all.length - open };
  });

  readonly filteredTickets = computed<Ticket[]>(() => {
    let list = this.ownedTickets();
    const filter = this.ticketFilter();
    if (filter === 'open') list = list.filter((t) => t.status !== 'Closed');
    else if (filter === 'closed') list = list.filter((t) => t.status === 'Closed');

    const q = this.ticketSearch().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.number.toLowerCase().includes(q),
      );
    }
    return list;
  });

  ticketStatusColor(status: Ticket['status']): 'green' | 'grey' | 'yellow' | 'blue' {
    switch (status) {
      case 'Closed':
        return 'grey';
      case 'Waiting':
        return 'yellow';
      case 'Unopened':
        return 'blue';
      default:
        return 'green';
    }
  }

  // ── Assets tab (mock — TODO eng) ─────────────────────────────────────────────
  readonly assetSearch = signal('');

  private readonly mockAssets: MockAsset[] = [
    { name: 'HP Chromebook 14', assetId: 'AST-0312', type: 'Chromebook', assignedOn: '2026-01-14T09:00:00Z', status: 'In Use', statusColor: 'green' },
    { name: 'Logitech Headset H390', assetId: 'AST-0881', type: 'Peripheral', assignedOn: '2025-09-03T09:00:00Z', status: 'In Use', statusColor: 'green' },
    { name: 'Dell Docking Station', assetId: 'AST-0942', type: 'Peripheral', assignedOn: '2025-09-03T09:00:00Z', status: 'In Use', statusColor: 'green' },
    { name: 'iPad Air (10.9")', assetId: 'AST-1107', type: 'Tablet', assignedOn: '2025-11-20T09:00:00Z', status: 'Pending Return', statusColor: 'yellow' },
    { name: 'Epson Projector EX3280', assetId: 'AST-0455', type: 'AV Equipment', assignedOn: '2024-08-22T09:00:00Z', status: 'Retired', statusColor: 'grey' },
  ];

  readonly filteredAssets = computed<MockAsset[]>(() => {
    const q = this.assetSearch().trim().toLowerCase();
    if (!q) return this.mockAssets;
    return this.mockAssets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.assetId.toLowerCase().includes(q),
    );
  });

  // ── Activity tab (mock — TODO eng) ───────────────────────────────────────────
  readonly activity: ActivityEntry[] = [
    { date: '2026-06-15T09:14:00Z', type: 'login', description: 'Signed in via single sign-on from Chrome on Windows.' },
    { date: '2026-06-14T14:33:00Z', type: 'ticket', description: 'Replied to the customer on ticket IT-1001 — Laptop will not boot.' },
    { date: '2026-06-12T11:07:00Z', type: 'asset', description: 'Asset HP Chromebook 14 (AST-0312) was assigned to this user.' },
    { date: '2026-06-08T16:52:00Z', type: 'permission', description: 'Permission set changed to Team Member in the IT module.' },
    { date: '2026-06-01T08:30:00Z', type: 'profile', description: 'Phone number updated by a District Admin.' },
    { date: '2026-05-22T10:00:00Z', type: 'login', description: 'Signed in via single sign-on from Safari on macOS.' },
    { date: '2026-05-10T13:45:00Z', type: 'ticket', description: 'Closed ticket IT-0994 — Monitor flickering.' },
  ];

  activityIcon(type: ActivityEntry['type']): string {
    return ACTIVITY_ICONS[type];
  }

  // ── Edit lifecycle ───────────────────────────────────────────────────────────
  startEditing(): void {
    const u = this.user();
    if (!u) return;
    this.draft.set({
      firstName: u.firstName,
      middleName: u.middleName ?? '',
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? '',
      status: u.status,
      jobTitle: u.jobTitle ?? '',
      employeeId: u.employeeId ?? '',
      pronouns: u.pronouns ?? '',
      emergencyContact: u.emergencyContact ?? '',
    });
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.draft.set(null);
    this.editing.set(false);
  }

  save(): void {
    const u = this.user();
    const d = this.draft();
    if (!u || !d) return;

    // Commit only the fields that aren't locked for this user's source.
    const locked = this.lockedFields();
    const patch: Partial<User> = {
      middleName: d.middleName.trim() || undefined,
      phone: d.phone.trim() || undefined,
      jobTitle: d.jobTitle.trim() || undefined,
      employeeId: d.employeeId.trim() || undefined,
      pronouns: d.pronouns.trim() || undefined,
      emergencyContact: d.emergencyContact.trim() || undefined,
    };
    if (!locked.has('firstName')) patch.firstName = d.firstName.trim();
    if (!locked.has('lastName')) patch.lastName = d.lastName.trim();
    if (!locked.has('email')) patch.email = d.email.trim();
    if (!locked.has('status')) patch.status = d.status;

    this.usersSvc.update(u.id, patch);
    this.draft.set(null);
    this.editing.set(false);
  }

  selectTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  setDraftStatus(value: string): void {
    this.draft.update((d) => (d ? { ...d, status: value as UserStatus } : d));
  }

  requestClose(): void {
    this.close.emit();
  }

  // ── Working-copy field binding helpers (used by the template) ────────────────
  get draftValue(): EditableUser | null {
    return this.draft();
  }

  updateDraft<K extends keyof EditableUser>(key: K, value: EditableUser[K]): void {
    this.draft.update((d) => (d ? { ...d, [key]: value } : d));
  }

  sourceHint(source: UserSource): string {
    return `Synced from ${source}`;
  }
}
