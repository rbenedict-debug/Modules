import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AgentsTabComponent } from './agents-tab/agents-tab.component';
import { AuthenticationTabComponent } from './authentication-tab/authentication-tab.component';
import { TeamsTabComponent } from './teams-tab/teams-tab.component';
import { PermissionSetsTabComponent } from './permission-sets-tab/permission-sets-tab.component';
import { PermissionSetEditorComponent } from './permission-set-editor/permission-set-editor.component';

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

  setTab(tab: AgentMgmtTab): void {
    this.activeTab.set(tab);
  }

  /** A row click in the (detached) Agents table opens the full agent profile page. */
  openProfile(id: string): void {
    this.router.navigate(['/settings/agent-management', id]);
  }
}
