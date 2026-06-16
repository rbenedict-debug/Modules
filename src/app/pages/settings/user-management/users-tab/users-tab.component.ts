import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { ModuleContextService } from '../../../../data/module-context.service';
import { ModulesService } from '../../../../data/modules.service';
import { UsersService } from '../../../../data/users.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import {
  User,
  UserRole,
  UserStatus,
  fullName,
} from '../../../../data/models';

// ── Column model ─────────────────────────────────────────────────────────────
// Every data column the grid can show. `key` doubles as the visibility-toggle id
// and (for sortable columns) the sort key. `module` is hidden in module context.
type ColKey =
  | 'name'
  | 'roles'
  | 'status'
  | 'modules'
  | 'teams'
  | 'locations'
  | 'phone'
  | 'source'
  | 'jobTitle'
  | 'lastLogin'
  | 'dateAdded';

interface ColumnDef {
  key: ColKey;
  label: string;
  sortable: boolean;
  globalOnly?: boolean; // Module(s) column — only meaningful in Global context
}

type SortDir = 'asc' | 'desc';
type ActivationType = 'send-email' | 'activate' | 'no-activation';

// Form state for the create/edit dialog. Modules/locations are multi-select arrays.
interface UserForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId: string;
  jobTitle: string;
  modules: string[];
  locations: string[];
  activation: ActivationType;
}

const EMPTY_FORM: UserForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeId: '',
  jobTitle: '',
  modules: [],
  locations: [],
  activation: 'send-email',
};

// Locations aren't a service — derive the option list from the seeded users so the
// multi-select offers every location already in use across the directory.
const FALLBACK_LOCATIONS = [
  'District Office',
  'Lincoln High',
  'Roosevelt Middle',
  'Transport Depot',
];

@Component({
  selector: 'app-users-tab',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './users-tab.component.html',
  styleUrl: './users-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTabComponent {
  /** Emits the id of the user whose profile should open. */
  @Output() viewProfile = new EventEmitter<string>();

  private readonly moduleCtx = inject(ModuleContextService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly permsSvc = inject(PermissionSetsService);

  // Expose context flags to the template.
  readonly isGlobal = this.moduleCtx.isGlobal;
  readonly canCreateUsers = this.moduleCtx.canCreateUsers;
  readonly canAdminActions = this.moduleCtx.canAdminActions;

  readonly fullName = fullName;

  constructor() {
    // Row selection is keyed by user id, but the visible rows change with the module
    // switcher. Clear the selection whenever the module context changes so a stale
    // cross-module id can never be picked up by the bulk "Delete (n)" action.
    effect(() => {
      this.moduleCtx.currentModuleId(); // track the signal
      this.selectedIds.set(new Set<string>());
    });
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  readonly allColumns: ColumnDef[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'roles', label: 'Roles', sortable: false },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'modules', label: 'Module(s)', sortable: false, globalOnly: true },
    { key: 'teams', label: 'Teams', sortable: false },
    { key: 'locations', label: 'Locations', sortable: false },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'source', label: 'Source', sortable: true },
    { key: 'jobTitle', label: 'Job Title', sortable: false },
    { key: 'lastLogin', label: 'Last Login', sortable: true },
    { key: 'dateAdded', label: 'Date Added', sortable: true },
  ];

  // Visibility state — Module(s) starts on; some lower-value columns start hidden
  // to keep the default grid scannable (they're still toggleable).
  private readonly hiddenKeys = signal<Set<ColKey>>(
    new Set<ColKey>(['phone', 'jobTitle', 'lastLogin']),
  );

  // The columns actually rendered: drop globalOnly columns in module context, then
  // drop any the user has hidden. Reactive to both the switcher and the toggle menu.
  readonly visibleColumns = computed<ColumnDef[]>(() => {
    const hidden = this.hiddenKeys();
    const global = this.isGlobal();
    return this.allColumns.filter(
      (c) => (global || !c.globalOnly) && !hidden.has(c.key),
    );
  });

  // Columns offered in the visibility menu — same global filter, but ignores the
  // hidden set so the user can turn columns back on.
  readonly toggleableColumns = computed<ColumnDef[]>(() => {
    const global = this.isGlobal();
    return this.allColumns.filter((c) => global || !c.globalOnly);
  });

  isColumnVisible(key: ColKey): boolean {
    return !this.hiddenKeys().has(key);
  }

  toggleColumn(key: ColKey): void {
    this.hiddenKeys.update((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Lookups ──────────────────────────────────────────────────────────────
  // team id → name, and module id → name, for cell rendering.
  private readonly teamNameById = computed(() => {
    const map = new Map<string, string>();
    for (const t of this.teamsSvc.teams()) map.set(t.id, t.name);
    return map;
  });

  private readonly moduleNameById = computed(() => {
    const map = new Map<string, string>();
    for (const m of this.modulesSvc.modules()) map.set(m.id, m.name);
    return map;
  });

  teamNames(u: User): string[] {
    const map = this.teamNameById();
    return u.teams.map((id) => map.get(id) ?? id);
  }

  moduleNames(u: User): string[] {
    const map = this.moduleNameById();
    return u.modules.map((id) => map.get(id) ?? id);
  }

  // ── Search / sort state ────────────────────────────────────────────────────
  readonly search = signal('');
  readonly sortKey = signal<ColKey | null>('name');
  readonly sortDir = signal<SortDir>('asc');

  // Filter state — Status + Roles checkbox sets (empty = no filter on that field).
  readonly statusFilter = signal<Set<UserStatus>>(new Set<UserStatus>());
  readonly roleFilter = signal<Set<UserRole>>(new Set<UserRole>());

  readonly allStatuses: UserStatus[] = [
    'Active',
    'Pending',
    'Unverified',
    'Inactive',
  ];
  readonly allRoles: UserRole[] = [
    'Agent',
    'District Admin',
    'School Admin',
    'Staff',
    'Teacher',
    'Parent',
    'Student',
  ];

  readonly activeFilterCount = computed(
    () => this.statusFilter().size + this.roleFilter().size,
  );

  isStatusChecked(s: UserStatus): boolean {
    return this.statusFilter().has(s);
  }
  toggleStatus(s: UserStatus): void {
    this.statusFilter.update((set) => {
      const next = new Set(set);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  isRoleChecked(r: UserRole): boolean {
    return this.roleFilter().has(r);
  }
  toggleRole(r: UserRole): void {
    this.roleFilter.update((set) => {
      const next = new Set(set);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  clearFilters(): void {
    this.statusFilter.set(new Set());
    this.roleFilter.set(new Set());
  }

  // ── The grid rows ──────────────────────────────────────────────────────────
  // Source list reacts to the module switcher, then narrows by search + filters,
  // then sorts. Everything is a signal read, so the table re-renders on any change.
  readonly rows = computed<User[]>(() => {
    const base = this.usersSvc.byModule(this.moduleCtx.currentModuleId());

    const q = this.search().trim().toLowerCase();
    const statuses = this.statusFilter();
    const roles = this.roleFilter();

    const filtered = base.filter((u) => {
      if (q) {
        const hay = `${fullName(u)} ${u.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statuses.size && !statuses.has(u.status)) return false;
      if (roles.size && !u.roles.some((r) => roles.has(r))) return false;
      return true;
    });

    const key = this.sortKey();
    if (!key) return filtered;
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const av = this.sortValue(a, key);
      const bv = this.sortValue(b, key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  });

  private sortValue(u: User, key: ColKey): string | number {
    switch (key) {
      case 'name':
        return fullName(u).toLowerCase();
      case 'status':
        return u.status.toLowerCase();
      case 'source':
        return u.source.toLowerCase();
      case 'lastLogin':
        return u.lastLogin ? Date.parse(u.lastLogin) : 0;
      case 'dateAdded':
        return Date.parse(u.dateAdded);
      default:
        return '';
    }
  }

  toggleSort(key: ColKey): void {
    const col = this.allColumns.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  sortIconFor(key: ColKey): string {
    if (this.sortKey() !== key) return 'arrow_upward_alt';
    return this.sortDir() === 'asc' ? 'arrow_upward_alt' : 'arrow_downward_alt';
  }

  // ── Roles overflow ──────────────────────────────────────────────────────────
  // Show up to 2 role chips per row; the rest collapse into a "+N" pill.
  private readonly ROLE_VISIBLE = 2;
  visibleRoles(u: User): UserRole[] {
    return u.roles.slice(0, this.ROLE_VISIBLE);
  }
  roleOverflow(u: User): number {
    return Math.max(0, u.roles.length - this.ROLE_VISIBLE);
  }

  statusColor(s: UserStatus): string {
    switch (s) {
      case 'Active':
        return 'green';
      case 'Pending':
      case 'Unverified':
        return 'yellow';
      case 'Inactive':
      default:
        return 'grey';
    }
  }

  // ── Selection ────────────────────────────────────────────────────────────────
  readonly selectedIds = signal<Set<string>>(new Set<string>());

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleRowSelection(id: string): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Header checkbox — reflects the currently-visible rows only.
  readonly allVisibleSelected = computed(() => {
    const rows = this.rows();
    if (!rows.length) return false;
    const sel = this.selectedIds();
    return rows.every((r) => sel.has(r.id));
  });

  readonly someVisibleSelected = computed(() => {
    const rows = this.rows();
    const sel = this.selectedIds();
    const n = rows.filter((r) => sel.has(r.id)).length;
    return n > 0 && n < rows.length;
  });

  readonly selectedCount = computed(() => this.selectedIds().size);

  toggleSelectAll(): void {
    const rows = this.rows();
    const allSelected = this.allVisibleSelected();
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (allSelected) {
        for (const r of rows) next.delete(r.id);
      } else {
        for (const r of rows) next.add(r.id);
      }
      return next;
    });
  }

  // ── Row action menu ──────────────────────────────────────────────────────────
  // Which row's "more_vert" menu is open (null = none). Stored as the user id.
  readonly openRowMenu = signal<string | null>(null);

  toggleRowMenu(id: string): void {
    this.openRowMenu.update((cur) => (cur === id ? null : id));
  }
  closeRowMenu(): void {
    this.openRowMenu.set(null);
  }

  // ── Toolbar popovers (filter + columns) ──────────────────────────────────────
  readonly openPopover = signal<'filter' | 'columns' | null>(null);

  togglePopover(which: 'filter' | 'columns'): void {
    this.openPopover.update((cur) => (cur === which ? null : which));
  }
  closePopovers(): void {
    this.openPopover.set(null);
  }

  // Single document-level handler closes any open menu/popover on an outside click.
  // The triggers call $event.stopPropagation() so their own clicks don't bubble here.
  onDocumentClick(): void {
    this.closeRowMenu();
    this.closePopovers();
  }

  // ── Locations option list ────────────────────────────────────────────────────
  readonly locationOptions = computed<string[]>(() => {
    const set = new Set<string>(FALLBACK_LOCATIONS);
    for (const u of this.usersSvc.users())
      for (const loc of u.locations) set.add(loc);
    return [...set].sort();
  });

  // Module options for the create/edit multi-select (id + name).
  readonly moduleOptions = computed(() => this.modulesSvc.modules());

  // ── Create / Edit dialog ─────────────────────────────────────────────────────
  // null = closed; 'create' / { edit: id } drives title + submit behaviour.
  readonly dialogMode = signal<'create' | { editId: string } | null>(null);
  readonly form = signal<UserForm>({ ...EMPTY_FORM });
  // Whether a submit has been attempted — gates inline error display.
  readonly submitAttempted = signal(false);

  get isEditing(): boolean {
    const m = this.dialogMode();
    return !!m && m !== 'create';
  }

  // Field-level validation (first/last/email required; email shape-checked).
  readonly errors = computed(() => {
    const f = this.form();
    const e: Partial<Record<keyof UserForm, string>> = {};
    if (!f.firstName.trim()) e.firstName = 'First name is required';
    if (!f.lastName.trim()) e.lastName = 'Last name is required';
    if (!f.email.trim()) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      e.email = 'Enter a valid email address';
    return e;
  });

  readonly errorCount = computed(() => Object.keys(this.errors()).length);

  // Show an error only after a submit attempt (matches the React prototype).
  showError(field: keyof UserForm): string | null {
    return this.submitAttempted() ? this.errors()[field] ?? null : null;
  }

  // Two-way ngModel helpers for the form signal.
  updateField<K extends keyof UserForm>(key: K, value: UserForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  // Module multi-select toggle (used inside the dialog's ds-select menu).
  isFormModuleSelected(id: string): boolean {
    return this.form().modules.includes(id);
  }
  toggleFormModule(id: string): void {
    this.form.update((f) => {
      const has = f.modules.includes(id);
      return {
        ...f,
        modules: has
          ? f.modules.filter((m) => m !== id)
          : [...f.modules, id],
      };
    });
  }
  formModuleLabel(): string {
    const ids = this.form().modules;
    if (!ids.length) return '';
    const map = this.moduleNameById();
    return ids.map((id) => map.get(id) ?? id).join(', ');
  }

  isFormLocationSelected(loc: string): boolean {
    return this.form().locations.includes(loc);
  }
  toggleFormLocation(loc: string): void {
    this.form.update((f) => {
      const has = f.locations.includes(loc);
      return {
        ...f,
        locations: has
          ? f.locations.filter((l) => l !== loc)
          : [...f.locations, loc],
      };
    });
  }
  formLocationLabel(): string {
    return this.form().locations.join(', ');
  }

  // Which multi-select dropdown inside the dialog is open ('modules' | 'locations').
  readonly openDialogSelect = signal<'modules' | 'locations' | null>(null);
  toggleDialogSelect(which: 'modules' | 'locations'): void {
    this.openDialogSelect.update((cur) => (cur === which ? null : which));
  }

  openCreate(): void {
    this.closeRowMenu();
    this.closePopovers();
    // In module context, modules are hidden and prefilled to the current module.
    const moduleId = this.moduleCtx.currentModuleId();
    this.form.set({
      ...EMPTY_FORM,
      modules: moduleId ? [moduleId] : [],
    });
    this.submitAttempted.set(false);
    this.openDialogSelect.set(null);
    this.dialogMode.set('create');
  }

  openEdit(u: User): void {
    this.closeRowMenu();
    this.form.set({
      firstName: u.firstName,
      middleName: u.middleName ?? '',
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? '',
      employeeId: u.employeeId ?? '',
      jobTitle: u.jobTitle ?? '',
      modules: [...u.modules],
      locations: [...u.locations],
      // Activation only matters for new users; default the control for edits.
      activation: 'activate',
    });
    this.submitAttempted.set(false);
    this.openDialogSelect.set(null);
    this.dialogMode.set({ editId: u.id });
  }

  closeDialog(): void {
    this.dialogMode.set(null);
    this.openDialogSelect.set(null);
  }

  // Map the chosen activation option to a starting status (new users only).
  private statusForActivation(a: ActivationType): UserStatus {
    if (a === 'no-activation') return 'Inactive';
    if (a === 'send-email') return 'Unverified';
    return 'Active';
  }

  submitDialog(): void {
    this.submitAttempted.set(true);
    if (this.errorCount() > 0) return;

    const f = this.form();
    const mode = this.dialogMode();

    if (mode === 'create') {
      // New users default to the Agent role, Manual source, and today's date.
      const newUser: Omit<User, 'id'> = {
        firstName: f.firstName.trim(),
        middleName: f.middleName.trim() || undefined,
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        phone: f.phone.trim() || undefined,
        status: this.statusForActivation(f.activation),
        source: 'Manual',
        roles: ['Agent'],
        modules: f.modules,
        teams: [],
        locations: f.locations,
        topics: [],
        jobTitle: f.jobTitle.trim() || undefined,
        employeeId: f.employeeId.trim() || undefined,
        permissionSetByModule: {},
        dateAdded: new Date().toISOString().slice(0, 10),
      };
      this.usersSvc.add(newUser);
    } else if (mode && mode.editId) {
      const patch: Partial<User> = {
        firstName: f.firstName.trim(),
        middleName: f.middleName.trim() || undefined,
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        phone: f.phone.trim() || undefined,
        modules: f.modules,
        locations: f.locations,
        jobTitle: f.jobTitle.trim() || undefined,
        employeeId: f.employeeId.trim() || undefined,
      };
      this.usersSvc.update(mode.editId, patch);
    }

    this.closeDialog();
  }

  // ── Delete confirmation ──────────────────────────────────────────────────────
  // Holds the users queued for deletion (from a row action or the bulk button).
  readonly deleteTargets = signal<User[]>([]);

  requestDeleteOne(u: User): void {
    this.closeRowMenu();
    this.deleteTargets.set([u]);
  }

  requestDeleteSelected(): void {
    const sel = this.selectedIds();
    const targets = this.usersSvc.users().filter((u) => sel.has(u.id));
    if (targets.length) this.deleteTargets.set(targets);
  }

  cancelDelete(): void {
    this.deleteTargets.set([]);
  }

  confirmDelete(): void {
    const ids = this.deleteTargets().map((u) => u.id);
    this.usersSvc.remove(ids);
    // Drop the removed ids from the selection set as well.
    this.selectedIds.update((set) => {
      const next = new Set(set);
      for (const id of ids) next.delete(id);
      return next;
    });
    this.deleteTargets.set([]);
  }

  // ── View profile ──────────────────────────────────────────────────────────────
  emitViewProfile(u: User): void {
    this.closeRowMenu();
    this.viewProfile.emit(u.id);
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  exportCsv(): void {
    this.closePopovers();
    // TODO eng: CSV export
  }

  // Trailing-comma-free initials for the delete list avatars.
  initials(u: User): string {
    return [u.firstName, u.lastName]
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
}
