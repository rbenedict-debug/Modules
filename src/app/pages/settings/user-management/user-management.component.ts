import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UsersTabComponent } from './users-tab/users-tab.component';
import { TeamsTabComponent } from './teams-tab/teams-tab.component';
import { PermissionSetsTabComponent } from './permission-sets-tab/permission-sets-tab.component';
import { PermissionSetEditorComponent } from './permission-set-editor/permission-set-editor.component';
import { UserProfileDrawerComponent } from './user-profile-drawer/user-profile-drawer.component';

type UserMgmtTab = 'users' | 'teams' | 'permission-sets';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    UsersTabComponent,
    TeamsTabComponent,
    PermissionSetsTabComponent,
    PermissionSetEditorComponent,
    UserProfileDrawerComponent,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ds-page-content', role: 'main' },
})
export class UserManagementComponent {
  readonly activeTab = signal<UserMgmtTab>('users');

  // Profile drawer + permission editor are owned here (the parent stays attached), so row
  // clicks from the detached table tabs can open them by setting these signals.
  readonly selectedUserId = signal<string | null>(null);
  /** Permission set being edited (null = list/tabs view). Drives the full-area editor. */
  readonly editingSetId = signal<string | null>(null);

  setTab(tab: UserMgmtTab): void {
    this.activeTab.set(tab);
  }
}
