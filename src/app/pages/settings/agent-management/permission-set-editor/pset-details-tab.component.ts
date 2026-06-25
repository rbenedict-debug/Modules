import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeamsService } from '../../../../data/teams.service';
import { UsersService } from '../../../../data/users.service';
import { Team, User, fullName } from '../../../../data/models';
import { PermissionEditorStateService } from './permission-editor-state.service';
import { AssignMembersModalComponent } from './assign-members-modal.component';

/**
 * Details tab: the set's name + description, and the Assigned Users & Teams list — removable chips
 * plus an Add Assignment modal. The assignment lists live in PermissionEditorStateService (seeded
 * from live data on open); edits buffer there and the save bar commits/discards them, so × removes
 * immediately with no confirm.
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
  readonly fullName = fullName;

  // The assigned users/teams, resolved (in list order) from the working lists in the state service
  // — seeded from live data on open, then buffered through the save bar. The lists are also the ids
  // shown, so they feed the Add Assignment modal's exclusion set.
  readonly assignedUsers = computed<User[]>(() => {
    const byId = new Map(this.usersSvc.users().map(u => [u.id, u] as const));
    return this.state.assignedUserIds().map(id => byId.get(id)).filter((u): u is User => !!u);
  });
  readonly assignedTeams = computed<Team[]>(() => {
    const byId = new Map(this.teamsSvc.teams().map(t => [t.id, t] as const));
    return this.state.assignedTeamIds().map(id => byId.get(id)).filter((t): t is Team => !!t);
  });
  readonly displayedUserIds = computed(() => this.state.assignedUserIds());
  readonly displayedTeamIds = computed(() => this.state.assignedTeamIds());

  readonly showAssign = signal(false);

  onAssign(p: { userIds: string[]; teamIds: string[] }): void {
    this.state.applyAssignments(p.userIds, p.teamIds);
    this.showAssign.set(false);
  }
}
