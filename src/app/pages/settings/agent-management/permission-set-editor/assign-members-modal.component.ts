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
import { FormsModule } from '@angular/forms';
import { TeamsService } from '../../../../data/teams.service';
import { UsersService } from '../../../../data/users.service';
import { Team, User, fullName } from '../../../../data/models';

/**
 * "Add Assignment" modal for the Details tab — a searchable list of teams + users (excluding
 * those already assigned), multi-select, emits the picked ids. Design-mode: reads UsersService /
 * TeamsService; selection is local until Assign.
 */
@Component({
  selector: 'app-assign-members-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './assign-members-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignMembersModalComponent {
  @Input() assignedUserIds: string[] = [];
  @Input() assignedTeamIds: string[] = [];
  @Output() assign = new EventEmitter<{ userIds: string[]; teamIds: string[] }>();
  @Output() close = new EventEmitter<void>();

  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);
  readonly fullName = fullName;

  searchText = '';
  private readonly search = signal('');
  private readonly pickedUsers = signal<Set<string>>(new Set());
  private readonly pickedTeams = signal<Set<string>>(new Set());

  onSearch(v: string): void {
    this.searchText = v;
    this.search.set(v);
  }

  teamMeta(t: Team): string {
    return `${t.memberIds.length} members`;
  }
  userMeta(u: User): string {
    return u.email;
  }
  initials(u: User): string {
    return ((u.firstName[0] ?? '') + (u.lastName[0] ?? '')).toUpperCase();
  }

  readonly availableTeams = computed(() => {
    const assigned = new Set(this.assignedTeamIds);
    const q = this.search().trim().toLowerCase();
    return this.teamsSvc.teams().filter(t => !assigned.has(t.id) && (!q || t.name.toLowerCase().includes(q)));
  });
  readonly availableUsers = computed(() => {
    const assigned = new Set(this.assignedUserIds);
    const q = this.search().trim().toLowerCase();
    return this.usersSvc
      .users()
      .filter(u => !assigned.has(u.id) && (!q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  });

  isTeamPicked(id: string): boolean {
    return this.pickedTeams().has(id);
  }
  isUserPicked(id: string): boolean {
    return this.pickedUsers().has(id);
  }
  toggleTeam(id: string): void {
    this.pickedTeams.update(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  toggleUser(id: string): void {
    this.pickedUsers.update(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  readonly totalSelected = computed(() => this.pickedTeams().size + this.pickedUsers().size);

  doAssign(): void {
    if (this.totalSelected() === 0) return;
    this.assign.emit({ userIds: [...this.pickedUsers()], teamIds: [...this.pickedTeams()] });
  }
  cancel(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close.emit();
  }
}
