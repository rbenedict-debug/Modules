import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeamsService } from '../../../../data/teams.service';
import { UsersService } from '../../../../data/users.service';
import { Team, User, fullName } from '../../../../data/models';
import { PermissionEditorStateService } from './permission-editor-state.service';

/**
 * Details tab: the set's name + description, and the Assigned Teams & Agents list — removable chips
 * plus an "Add Agents" dropdown (search teams + agents, click to add). The assignment lists live in
 * PermissionEditorStateService (seeded from live data on open); edits buffer there and the save bar
 * commits/discards them, so add/remove apply immediately to the working list with no per-item confirm.
 */
@Component({
  selector: 'app-pset-details-tab',
  standalone: true,
  imports: [FormsModule],
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
  // — seeded from live data on open, then buffered through the save bar.
  readonly assignedUsers = computed<User[]>(() => {
    const byId = new Map(this.usersSvc.users().map(u => [u.id, u] as const));
    return this.state.assignedUserIds().map(id => byId.get(id)).filter((u): u is User => !!u);
  });
  readonly assignedTeams = computed<Team[]>(() => {
    const byId = new Map(this.teamsSvc.teams().map(t => [t.id, t] as const));
    return this.state.assignedTeamIds().map(id => byId.get(id)).filter((t): t is Team => !!t);
  });

  // ── Filter over the already-assigned members (the chip-list search) ──
  readonly assignSearch = signal('');
  private readonly assignQuery = computed(() => this.assignSearch().trim().toLowerCase());
  readonly filteredTeams = computed<Team[]>(() => {
    const q = this.assignQuery();
    const teams = this.assignedTeams();
    return q ? teams.filter(t => t.name.toLowerCase().includes(q)) : teams;
  });
  readonly filteredUsers = computed<User[]>(() => {
    const q = this.assignQuery();
    const users = this.assignedUsers();
    return q
      ? users.filter(u => fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : users;
  });

  clearAssignSearch(input: HTMLInputElement): void {
    this.assignSearch.set('');
    input.focus();
  }

  // ── "Add Agents" dropdown: search the directory for teams + agents NOT yet assigned, click to add ──
  readonly addMenuOpen = signal(false);
  readonly addSearch = signal('');
  // Fixed-position coords for the dropdown (computed from the trigger on open) so it escapes the
  // scrollable tab body's clipping.
  readonly addMenuPos = signal<{ top: number; right: number }>({ top: 0, right: 0 });
  private readonly addQuery = computed(() => this.addSearch().trim().toLowerCase());
  readonly addableTeams = computed<Team[]>(() => {
    const assigned = new Set(this.state.assignedTeamIds());
    const q = this.addQuery();
    return this.teamsSvc.teams().filter(t => !assigned.has(t.id) && (!q || t.name.toLowerCase().includes(q)));
  });
  readonly addableUsers = computed<User[]>(() => {
    const assigned = new Set(this.state.assignedUserIds());
    const q = this.addQuery();
    return this.usersSvc
      .users()
      .filter(u => !assigned.has(u.id) && (!q || fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  });

  toggleAddMenu(trigger: HTMLElement): void {
    const open = !this.addMenuOpen();
    this.addMenuOpen.set(open);
    if (open) {
      this.addSearch.set('');
      const r = trigger.getBoundingClientRect();
      this.addMenuPos.set({ top: Math.round(r.bottom + 4), right: Math.round(window.innerWidth - r.right) });
    }
  }
  closeAddMenu(): void {
    this.addMenuOpen.set(false);
  }
  // Add to the working list immediately (buffered — committed by the save bar). The item drops out of
  // the menu's addable list (now assigned) and appears as a chip; the menu stays open for adding more.
  addTeam(id: string): void {
    this.state.applyAssignments([], [id]);
  }
  addUser(id: string): void {
    this.state.applyAssignments([id], []);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.addMenuOpen()) this.closeAddMenu();
  }

  // Close on any click outside the Add control. The menu is a DOM child of .psets-editor__add, so
  // clicks on its search/items keep it open (and the opening button click is inside it too).
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.addMenuOpen() && !(e.target instanceof HTMLElement && e.target.closest('.psets-editor__add'))) {
      this.closeAddMenu();
    }
  }
}
