import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AgentsTabComponent } from './agents-tab/agents-tab.component';
import { AuthenticationTabComponent } from './authentication-tab/authentication-tab.component';
import { TeamsTabComponent } from './teams-tab/teams-tab.component';
import { PermissionSetsTabComponent } from './permission-sets-tab/permission-sets-tab.component';
import { PermissionSetEditorComponent } from './permission-set-editor/permission-set-editor.component';
import { AgentFormComponent } from './agent-form/agent-form.component';
import { TeamFormComponent } from './team-form/team-form.component';

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
    AgentFormComponent,
    TeamFormComponent,
  ],
  templateUrl: './agent-management.component.html',
  styleUrl: './agent-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ds-page-content', role: 'main' },
})
export class AgentManagementComponent {
  private readonly router = inject(Router);

  readonly activeTab = signal<AgentMgmtTab>('agents');

  /** Permission set being edited (null = list/tabs view). Drives the full-area editor. */
  readonly editingSetId = signal<string | null>(null);

  /** True while the Create Agent form is open. Hosted here (not in the Agents tab) because
   *  that tab detaches change detection for table-init.js and can't drive a modal. */
  readonly creatingAgent = signal(false);

  /** True while the Create Team form is open. Hosted here for the same reason as the agent
   *  form — the Teams tab detaches change detection for table-init.js. */
  readonly creatingTeam = signal(false);

  setTab(tab: AgentMgmtTab): void {
    this.activeTab.set(tab);
  }

  /** A row click in the (detached) Agents table opens the full agent profile page. */
  openProfile(id: string): void {
    this.router.navigate(['/settings/agent-management', id]);
  }
}
