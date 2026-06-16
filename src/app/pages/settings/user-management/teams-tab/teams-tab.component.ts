import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ModuleContextService } from '../../../../data/module-context.service';
import { ModulesService } from '../../../../data/modules.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TeamsService } from '../../../../data/teams.service';
import { UsersService } from '../../../../data/users.service';
import { Team, TeamSource, User, fullName } from '../../../../data/models';

// A team row, pre-resolved for the template so the grid never has to reach back into the
// services per cell. Module names, the permission-set name, and a stable initials/full-name
// pair for each cell are computed once in `rows`.
interface TeamRow {
  id: string;
  name: string;
  moduleNames: string[];
  topics: string[];
  memberCount: number;
  permissionSetName: string; // resolved name, or 'None'
  source: TeamSource;
}

// A user pre-resolved for the member picker and the selected-members / view-members lists:
// full name, initials, email, status all ready for the template.
interface MemberOption {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: User['status'];
}

// Dialog modes: closed, the create form, the edit form, or the read-only "view members" panel.
type DialogMode = 'closed' | 'create' | 'edit' | 'view';

@Component({
  selector: 'app-teams-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './teams-tab.component.html',
  styleUrl: './teams-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsTabComponent {
  private readonly moduleCtx = inject(ModuleContextService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly usersSvc = inject(UsersService);
  private readonly permissionSetsSvc = inject(PermissionSetsService);

  // The Module(s) column only appears when no single module is selected — in a scoped module
  // context every team already belongs to that module, so the column would be redundant.
  readonly isGlobal = this.moduleCtx.isGlobal;

  // ── Toolbar state ────────────────────────────────────────────────────────────
  searchText = '';
  private readonly search = signal('');
  // Optional simple filters. '' = no filter (All).
  moduleFilter = '';
  sourceFilter = '';
  private readonly moduleFilterSig = signal('');
  private readonly sourceFilterSig = signal('');

  readonly sources: TeamSource[] = ['Manual', 'Active Directory', 'Azure', 'Google'];
  // Modules offered in the filter dropdown — all modules, by name (id kept for matching).
  readonly moduleOptions = computed(() =>
    this.modulesSvc.modules().map(m => ({ id: m.id, name: m.name })),
  );

  // Fast id→name lookup for resolving module + permission-set names in `rows`.
  private readonly moduleNameById = computed(() => {
    const map = new Map<string, string>();
    for (const m of this.modulesSvc.modules()) map.set(m.id, m.name);
    return map;
  });

  private readonly permSetNameById = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.permissionSetsSvc.sets()) map.set(s.id, s.name);
    return map;
  });

  // Permission sets offered in the dialog dropdown. In a scoped module context, narrow to that
  // module's sets plus global (moduleId === null) sets; globally, show them all.
  readonly permissionSetOptions = computed(() => {
    const moduleId = this.moduleCtx.currentModuleId();
    return this.permissionSetsSvc
      .sets()
      .filter(s => moduleId === null || s.moduleId === null || s.moduleId === moduleId)
      .map(s => ({ id: s.id, name: s.name }));
  });

  // Topic suggestions for the dialog's topic multi-select — the union of every topic already
  // in use across teams (sorted), so the picker stays in sync with the seed data.
  readonly topicOptions = computed(() => {
    const set = new Set<string>();
    for (const t of this.teamsSvc.teams()) for (const topic of t.topics) set.add(topic);
    return [...set].sort();
  });

  // ── Grid rows ─────────────────────────────────────────────────────────────────
  // Teams in the current module context, resolved to display shape, then narrowed by the
  // search box and the module/source filters.
  readonly rows = computed<TeamRow[]>(() => {
    const moduleNames = this.moduleNameById();
    const permSetNames = this.permSetNameById();
    const query = this.search().trim().toLowerCase();
    const moduleId = this.moduleFilterSig();
    const source = this.sourceFilterSig();

    return this.teamsSvc
      .byModule(this.moduleCtx.currentModuleId())
      .filter(t => !query || t.name.toLowerCase().includes(query))
      .filter(t => !moduleId || t.modules.includes(moduleId))
      .filter(t => !source || t.source === source)
      .map(t => ({
        id: t.id,
        name: t.name,
        moduleNames: t.modules.map(id => moduleNames.get(id) ?? id),
        topics: t.topics,
        memberCount: t.memberIds.length,
        permissionSetName: t.permissionSetId ? (permSetNames.get(t.permissionSetId) ?? 'None') : 'None',
        source: t.source,
      }));
  });

  // True when any filter or search is active — drives the empty-state copy.
  readonly isFiltered = computed(
    () => !!this.search().trim() || !!this.moduleFilterSig() || !!this.sourceFilterSig(),
  );

  // All users as ready-to-render member options, for the picker and member lists.
  private readonly memberOptions = computed<MemberOption[]>(() =>
    this.usersSvc.users().map(u => this.toMemberOption(u)),
  );
  private readonly memberOptionById = computed(() => {
    const map = new Map<string, MemberOption>();
    for (const m of this.memberOptions()) map.set(m.id, m);
    return map;
  });

  private toMemberOption(u: User): MemberOption {
    const name = fullName(u);
    const initials = [u.firstName, u.lastName]
      .filter(Boolean)
      .map(part => part![0])
      .join('')
      .toUpperCase();
    return { id: u.id, name, initials, email: u.email, status: u.status };
  }

  // ── Row action menu (more_vert) ────────────────────────────────────────────────
  // id of the team whose row menu is open (null = none). Toggled by the trailing button.
  readonly openMenuId = signal<string | null>(null);

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId.update(current => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Dialog state ────────────────────────────────────────────────────────────────
  readonly dialogMode = signal<DialogMode>('closed');
  // The team being edited / viewed (null while creating).
  private readonly editingId = signal<string | null>(null);

  // Editable form fields (plain props — bound with ngModel / click handlers).
  formName = '';
  formModules: string[] = [];
  formTopics: string[] = [];
  formPermissionSetId = ''; // '' = None
  formMemberIds: string[] = [];
  // Member-picker search box inside the dialog.
  memberSearch = '';
  // Becomes true after a failed submit, so required-field errors only show once attempted.
  formAttempted = signal(false);

  // Convenience flags for the template.
  readonly isViewMode = computed(() => this.dialogMode() === 'view');
  readonly isCreateMode = computed(() => this.dialogMode() === 'create');

  // Title/subtitle for the dialog header, by mode.
  readonly dialogTitle = computed(() => {
    switch (this.dialogMode()) {
      case 'create': return 'Create team';
      case 'edit': return 'Edit team';
      case 'view': return this.formName || 'Team members';
      default: return '';
    }
  });

  get nameInvalid(): boolean {
    return !this.formName.trim();
  }

  // Resolved member options currently selected in the form (preserves selection order).
  get selectedMembers(): MemberOption[] {
    const byId = this.memberOptionById();
    return this.formMemberIds.map(id => byId.get(id)).filter((m): m is MemberOption => !!m);
  }

  // Users not yet selected, narrowed by the picker search box. Capped to keep the list short.
  get availableMembers(): MemberOption[] {
    const selected = new Set(this.formMemberIds);
    const query = this.memberSearch.trim().toLowerCase();
    return this.memberOptions()
      .filter(m => !selected.has(m.id))
      .filter(m => !query || m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query))
      .slice(0, 25);
  }

  // The label shown in the (mock) module multi-select field. Names, comma-joined.
  get moduleFieldLabel(): string {
    const names = this.moduleNameById();
    return this.formModules.map(id => names.get(id) ?? id).join(', ');
  }

  // The label shown in the permission-set select field.
  get permissionSetFieldLabel(): string {
    if (!this.formPermissionSetId) return 'None';
    return this.permSetNameById().get(this.formPermissionSetId) ?? 'None';
  }

  // Status → DS label color for the member status pill.
  statusColor(status: User['status']): string {
    switch (status) {
      case 'Active': return 'green';
      case 'Inactive': return 'grey';
      case 'Pending': return 'blue';
      case 'Unverified': return 'yellow';
      default: return 'grey';
    }
  }

  // ── Toolbar handlers ──────────────────────────────────────────────────────────
  onSearch(value: string): void {
    this.searchText = value;
    this.search.set(value);
  }

  clearSearch(): void {
    this.searchText = '';
    this.search.set('');
  }

  onModuleFilter(value: string): void {
    this.moduleFilter = value;
    this.moduleFilterSig.set(value);
  }

  onSourceFilter(value: string): void {
    this.sourceFilter = value;
    this.sourceFilterSig.set(value);
  }

  // ── Dialog open/close ───────────────────────────────────────────────────────────
  openCreate(): void {
    this.editingId.set(null);
    this.formName = '';
    // In a scoped module context the module is fixed — prefill and hide the field.
    const moduleId = this.moduleCtx.currentModuleId();
    this.formModules = moduleId ? [moduleId] : [];
    this.formTopics = [];
    this.formPermissionSetId = '';
    this.formMemberIds = [];
    this.memberSearch = '';
    this.formAttempted.set(false);
    this.dialogMode.set('create');
  }

  openEdit(id: string): void {
    this.closeMenu();
    this.loadTeamIntoForm(id);
    if (this.editingId()) this.dialogMode.set('edit');
  }

  openView(id: string): void {
    this.closeMenu();
    this.loadTeamIntoForm(id);
    if (this.editingId()) this.dialogMode.set('view');
  }

  // Switch the read-only view panel into the edit form for the same team.
  switchToEdit(): void {
    if (this.editingId()) this.dialogMode.set('edit');
  }

  private loadTeamIntoForm(id: string): void {
    const team = this.teamsSvc.teams().find(t => t.id === id);
    if (!team) return;
    this.editingId.set(team.id);
    this.formName = team.name;
    this.formModules = [...team.modules];
    this.formTopics = [...team.topics];
    this.formPermissionSetId = team.permissionSetId ?? '';
    this.formMemberIds = [...team.memberIds];
    this.memberSearch = '';
    this.formAttempted.set(false);
  }

  closeDialog(): void {
    this.dialogMode.set('closed');
    this.editingId.set(null);
  }

  // ── Member picker handlers ──────────────────────────────────────────────────────
  addMember(id: string): void {
    if (!this.formMemberIds.includes(id)) this.formMemberIds = [...this.formMemberIds, id];
    this.memberSearch = '';
  }

  removeMember(id: string): void {
    this.formMemberIds = this.formMemberIds.filter(m => m !== id);
  }

  // ── Topic + module multi-select handlers (mock multi-selects toggled inline) ──────
  // Which inline multi-select dropdown is open in the dialog ('modules' | 'topics' | null).
  readonly openPicker = signal<'modules' | 'topics' | null>(null);

  togglePicker(which: 'modules' | 'topics'): void {
    this.openPicker.update(current => (current === which ? null : which));
  }

  closePickers(): void {
    this.openPicker.set(null);
  }

  toggleModule(id: string): void {
    this.formModules = this.formModules.includes(id)
      ? this.formModules.filter(m => m !== id)
      : [...this.formModules, id];
  }

  toggleTopic(topic: string): void {
    this.formTopics = this.formTopics.includes(topic)
      ? this.formTopics.filter(t => t !== topic)
      : [...this.formTopics, topic];
  }

  selectPermissionSet(id: string): void {
    this.formPermissionSetId = id;
    this.openPicker.set(null);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  save(): void {
    if (this.nameInvalid) {
      this.formAttempted.set(true);
      return;
    }

    const patch: Omit<Team, 'id'> = {
      name: this.formName.trim(),
      modules: [...this.formModules],
      topics: [...this.formTopics],
      memberIds: [...this.formMemberIds],
      permissionSetId: this.formPermissionSetId || undefined,
      // New teams from this prototype are manual; editing preserves the original source.
      source: this.editingId()
        ? (this.teamsSvc.teams().find(t => t.id === this.editingId())?.source ?? 'Manual')
        : 'Manual',
    };

    const id = this.editingId();
    if (id) this.teamsSvc.update(id, patch);
    else this.teamsSvc.add(patch);

    this.closeDialog();
  }

  // ── Delete confirmation ─────────────────────────────────────────────────────────
  readonly deleteTargetId = signal<string | null>(null);

  // The team queued for deletion, resolved for the confirm copy (name + member count).
  readonly deleteTarget = computed(() => {
    const id = this.deleteTargetId();
    if (!id) return null;
    const team = this.teamsSvc.teams().find(t => t.id === id);
    return team ? { name: team.name, memberCount: team.memberIds.length } : null;
  });

  askDelete(id: string): void {
    this.closeMenu();
    this.deleteTargetId.set(id);
  }

  cancelDelete(): void {
    this.deleteTargetId.set(null);
  }

  confirmDelete(): void {
    const id = this.deleteTargetId();
    if (id) this.teamsSvc.remove([id]);
    this.deleteTargetId.set(null);
  }
}
