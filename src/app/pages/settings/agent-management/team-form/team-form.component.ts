import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
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
  imports: [FormSelectComponent],
  templateUrl: './team-form.component.html',
  styleUrl: './team-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormComponent {
  // Classic @Input (codebase convention) bridged to a signal so the computeds below react.
  private readonly teamSig = signal<Team | null>(null);
  @Input() set team(value: Team | null) {
    this.teamSig.set(value);
  }

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private readonly setsSvc = inject(PermissionSetsService);
  private readonly usersSvc = inject(UsersService);
  private readonly msg = inject(MessagingService);

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
  /** The team's members as `{ id, name }`, minus any removed this session. Drives the read-only
   *  chips on a synced team and the removable chips when creating/editing a manual team — the same
   *  agents the Teams table's Agents column counts (`memberIds`). */
  readonly members = computed(() => {
    const t = this.teamSig();
    if (!t) return [];
    const removed = new Set(this.removedMemberIds());
    const byId = new Map(this.usersSvc.users().map((u) => [u.id, u] as const));
    return t.memberIds
      .filter((id) => !removed.has(id))
      .map((id) => {
        const u = byId.get(id);
        return { id, name: u ? fullName(u) : id };
      });
  });

  /** Drop a member chip (visual stand-in; not persisted). TODO eng: real membership editing. */
  removeMember(id: string): void {
    this.removedMemberIds.update((cur) => (cur.includes(id) ? cur : [...cur, id]));
  }

  cancel(): void {
    this.close.emit();
  }

  submit(): void {
    // TODO eng: validate + persist. Design-mode mock: toast + close. (Synced teams never reach
    // here — their footer has no Save.) There's no Department field: on create, a new team's
    // `module` = the current switcher context (ModuleContextService.currentModuleId() — null in the
    // Global context = a global team); on edit, the existing `module` is preserved.
    this.msg.success(this.isEdit() ? 'Team updated.' : 'Team created.');
    this.saved.emit();
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
