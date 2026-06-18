import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AgentsTabComponent } from './agents-tab/agents-tab.component';
import { AuthenticationTabComponent } from './authentication-tab/authentication-tab.component';
import { TeamsTabComponent } from './teams-tab/teams-tab.component';
import { PermissionSetsTabComponent } from './permission-sets-tab/permission-sets-tab.component';
import { PermissionSetEditorComponent } from './permission-set-editor/permission-set-editor.component';
import { AgentProfileDrawerComponent } from './agent-profile-drawer/agent-profile-drawer.component';

type AgentMgmtTab = 'agents' | 'authentication' | 'teams' | 'permission-sets';

@Component({
  selector: 'app-agent-management',
  standalone: true,
  imports: [
    AgentsTabComponent,
    AuthenticationTabComponent,
    TeamsTabComponent,
    PermissionSetsTabComponent,
    PermissionSetEditorComponent,
    AgentProfileDrawerComponent,
  ],
  templateUrl: './agent-management.component.html',
  styleUrl: './agent-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ds-page-content', role: 'main' },
})
export class AgentManagementComponent {
  readonly activeTab = signal<AgentMgmtTab>('agents');

  // Profile drawer + permission editor are owned here (the parent stays attached), so row
  // clicks from the detached table tabs can open them by setting these signals.
  readonly selectedAgentId = signal<string | null>(null);
  /** Permission set being edited (null = list/tabs view). Drives the full-area editor. */
  readonly editingSetId = signal<string | null>(null);

  setTab(tab: AgentMgmtTab): void {
    this.activeTab.set(tab);
  }
}
