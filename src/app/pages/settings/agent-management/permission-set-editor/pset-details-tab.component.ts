import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModulesService } from '../../../../data/modules.service';
import { TeamsService } from '../../../../data/teams.service';
import { UsersService } from '../../../../data/users.service';
import { Team, User, fullName } from '../../../../data/models';
import { PermissionEditorStateService } from './permission-editor-state.service';
import { AssignMembersModalComponent } from './assign-members-modal.component';

/**
 * Details tab: the set's name + description, and the Assigned Users & Teams list (with the
 * Add Assignment modal and a remove-confirm). Reads/writes via PermissionEditorStateService.
 */
@Component({
  selector: 'app-pset-details-tab',
  standalone: true,
  imports: [FormsModule, AssignMembersModalComponent],
  templateUrl: './pset-details-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'psets-editor__details' },
})
export class PsetDetailsTabComponent {
  readonly state = inject(PermissionEditorStateService);
  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly modulesSvc = inject(ModulesService);
  readonly fullName = fullName;

  private moduleName(id: string | null): string {
    return id ? this.modulesSvc.modules().find(m => m.id === id)?.name ?? id : 'Global';
  }

  readonly assignedTeams = computed(() => {
    const ids = new Set(this.state.assignedTeamIds());
    return this.teamsSvc.teams().filter(t => ids.has(t.id));
  });
  readonly assignedUsers = computed(() => {
    const ids = new Set(this.state.assignedUserIds());
    return this.usersSvc.users().filter(u => ids.has(u.id));
  });

  teamMeta(t: Team): string {
    return `${this.moduleName(t.module)} · ${t.memberIds.length} members`;
  }
  userMeta(u: User): string {
    return `${u.email} · ${this.moduleName(u.modules[0] ?? null)}`;
  }
  initials(u: User): string {
    return ((u.firstName[0] ?? '') + (u.lastName[0] ?? '')).toUpperCase();
  }

  readonly showAssign = signal(false);
  readonly removeTarget = signal<{ type: 'user' | 'team'; id: string; name: string } | null>(null);

  onAssign(p: { userIds: string[]; teamIds: string[] }): void {
    this.state.applyAssignments(p.userIds, p.teamIds);
    this.showAssign.set(false);
  }
  askRemove(type: 'user' | 'team', id: string, name: string): void {
    this.removeTarget.set({ type, id, name });
  }
  confirmRemove(): void {
    const t = this.removeTarget();
    if (!t) return;
    if (t.type === 'user') this.state.removeUser(t.id);
    else this.state.removeTeam(t.id);
    this.removeTarget.set(null);
  }
}
