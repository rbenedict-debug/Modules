import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { UsersService } from '../../../../data/users.service';
import { MessagingService } from '../../../../data/messaging.service';
import { Team, TeamSource, fullName } from '../../../../data/models';
import { FormSelectComponent } from '../form-select.component';

/**
 * Create / Edit Team popup — a `ds-modal` over a scrim, mirroring the agent form. Maps to the
 * Team model: name, permissionSetId, memberIds (plus `module`, which is set from the current
 * switcher context, never edited here). There is NO Department field in any mode — a team belongs
 * to the context you're in (Global context → a global team), the same context-scoping the Teams
 * table and permission sets use. Three modes:
 *  - Create (no `team`): name, permission set, and members are editable.
 *  - Edit, manual (`team.source === 'Manual'`): pre-filled and editable.
 *  - Edit, synced (`team.source !== 'Manual'`): fully read-only — the team is owned by the
 *    integration. A `ds-alert--info` banner points to Integration Hub, fields are disabled,
 *    members render as static chips, and there is no Save (Close only).
 *
 * Design-mode contract: text fields are native + uncontrolled, dropdowns are run by
 * `runtime/select.js`, the member search is a visual stand-in, and submit is mocked (toast +
 * close). Real binding, validation, member search, and persistence are the eng team's job.
 */
@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [FormsModule, FormSelectComponent],
  templateUrl: './team-form.component.html',
  styleUrl: './team-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormComponent {
  // Classic @Input (codebase convention) bridged to a signal so the computeds below react.
  private readonly teamSig = signal<Team | null>(null);
  @Input() set team(value: Team | null) {
    this.teamSig.set(value);
    // Re-seed the editable name field (and reset the submit flag) whenever the bound team changes,
    // so reopening the modal for a different team starts clean.
    this.teamName.set(value?.name ?? '');
    this.submitted.set(false);
    // Reset member-editing state (adds, removes, both searches, dropdown) so reopening the modal
    // for a different team — or for create — starts clean.
    this.addedMemberIds.set([]);
    this.removedMemberIds.set([]);
    this.addQuery.set('');
    this.chipQuery.set('');
    this.addOpen.set(false);
  }

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private readonly setsSvc = inject(PermissionSetsService);
  private readonly usersSvc = inject(UsersService);
  private readonly msg = inject(MessagingService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // ── Mode + synced read-only ────────────────────────────────────────────────────────
  readonly isEdit = computed(() => !!this.teamSig());
  readonly source = computed<TeamSource>(() => this.teamSig()?.source ?? 'Manual');
  /** Synced teams are owned by their integration and are fully read-only here. */
  readonly isSynced = computed(() => this.source() !== 'Manual');

  readonly title = computed(() =>
    this.isSynced() ? 'Team Details' : this.isEdit() ? 'Edit Team' : 'Create New Team',
  );
  readonly subtitle = computed(() =>
    this.isSynced()
      ? `Synced from ${this.source()} — managed in Integration Hub`
      : this.isEdit()
        ? 'Update this team’s information'
        : 'Add a new team to the system',
  );

  // ── Option lists ─────────────────────────────────────────────────────────────────────
  readonly permissionSetNames = computed(() => this.setsSvc.sets().map((s) => s.name));

  // ── Edit pre-fill (resolved from the team) ───────────────────────────────────────────
  readonly editing = computed(() => this.teamSig());
  readonly permissionSetName = computed(() => {
    const t = this.teamSig();
    if (!t?.permissionSetId) return '';
    return this.setsSvc.sets().find((s) => s.id === t.permissionSetId)?.name ?? '';
  });
  /** Members removed in this session — a visual stand-in only (resets when the modal reopens). */
  private readonly removedMemberIds = signal<string[]>([]);
  /** Members added in this session — a visual stand-in only (resets when the modal reopens). */
  private readonly addedMemberIds = signal<string[]>([]);
  /** Whether the "Add agents" dropdown panel is open. */
  readonly addOpen = signal(false);
  /** Query for the in-panel "Add agents" search. */
  readonly addQuery = signal('');
  /** Query for the search above the member chips. */
  readonly chipQuery = signal('');
  /** The team's members as `{ id, name }`, minus any removed this session. Drives the read-only
   *  chips on a synced team and the removable chips when creating/editing a manual team — the same
   *  agents the Teams table's Agents column counts (`memberIds`). */
  readonly members = computed(() => {
    const t = this.teamSig();
    const removed = new Set(this.removedMemberIds());
    const baseIds = t ? t.memberIds : [];
    // Bound team's members plus any added this session (base order first, de-duped), minus removed.
    const ids = [
      ...baseIds,
      ...this.addedMemberIds().filter((id) => !baseIds.includes(id)),
    ].filter((id) => !removed.has(id));
    const byId = new Map(this.usersSvc.users().map((u) => [u.id, u] as const));
    return ids.map((id) => {
      const u = byId.get(id);
      return { id, name: u ? fullName(u) : id };
    });
  });

  /** Agents the "Add agents" dropdown offers: everyone not already a member, sorted A-Z.
   *  TODO eng: scope this to the team's module/context instead of every agent. */
  readonly addableAgents = computed(() => {
    const memberIds = new Set(this.members().map((m) => m.id));
    return this.usersSvc
      .users()
      .filter((u) => !memberIds.has(u.id))
      .map((u) => ({ id: u.id, name: fullName(u) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
  /** Addable agents narrowed by the in-panel search query. */
  readonly addableFiltered = computed(() => {
    const q = this.addQuery().trim().toLowerCase();
    const list = this.addableAgents();
    return q ? list.filter((a) => a.name.toLowerCase().includes(q)) : list;
  });
  /** Current members narrowed by the chip search query. */
  readonly membersFiltered = computed(() => {
    const q = this.chipQuery().trim().toLowerCase();
    const list = this.members();
    return q ? list.filter((m) => m.name.toLowerCase().includes(q)) : list;
  });

  /** Toggle the "Add agents" dropdown. */
  toggleAdd(): void {
    this.addOpen.update((v) => !v);
  }

  /** Add an agent to the team (visual stand-in; not persisted). Keeps the panel open so several
   *  can be added in a row, and clears the in-panel search. TODO eng: real membership editing. */
  addMember(id: string): void {
    this.removedMemberIds.update((cur) => cur.filter((x) => x !== id));
    this.addedMemberIds.update((cur) => (cur.includes(id) ? cur : [...cur, id]));
    this.addQuery.set('');
  }

  /** Drop a member chip (visual stand-in; not persisted). An agent added this session is simply
   *  un-added; an existing member is marked removed. Either way it returns to the addable pool.
   *  TODO eng: real membership editing. */
  removeMember(id: string): void {
    if (this.addedMemberIds().includes(id)) {
      this.addedMemberIds.update((cur) => cur.filter((x) => x !== id));
    } else {
      this.removedMemberIds.update((cur) => (cur.includes(id) ? cur : [...cur, id]));
    }
  }

  // ── Validation (editable modes only — synced teams are read-only with no Save) ───────
  /** The one editable required field: Team Name. Seeded from the bound team in `set team`. */
  readonly teamName = signal('');
  /** True once the user has attempted to submit; gates all error display. */
  readonly submitted = signal(false);
  /** Required-only, no format check. */
  readonly nameInvalid = computed(() => this.teamName().trim() === '');
  /** Drives the summary banner. */
  readonly hasErrors = computed(() => this.nameInvalid());

  cancel(): void {
    this.close.emit();
  }

  submit(): void {
    // TODO eng: validate + persist. Design-mode mock: toast + close. (Synced teams never reach
    // here — their footer has no Save.) There's no Department field: on create, a new team's
    // `module` = the current switcher context (ModuleContextService.currentModuleId() — null in the
    // Global context = a global team); on edit, the existing `module` is preserved.
    this.submitted.set(true);
    if (this.hasErrors()) {
      // Invalid: keep the modal open, no toast, move focus to the first invalid control.
      queueMicrotask(() =>
        (this.host.nativeElement.querySelector('#tf-name') as HTMLInputElement | null)?.focus(),
      );
      return;
    }
    this.msg.success(this.isEdit() ? 'Team updated.' : 'Team created.');
    this.saved.emit();
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
