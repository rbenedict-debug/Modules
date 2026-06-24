import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ModuleContextService } from '../../../data/module-context.service';
import { TeamsService } from '../../../data/teams.service';
import { Team } from '../../../data/models';
import { PermissionSetsService } from '../../../data/permission-sets.service';
import { AgentsTabComponent } from './agents-tab/agents-tab.component';
import { AuthenticationTabComponent } from './authentication-tab/authentication-tab.component';
import { TeamsTabComponent } from './teams-tab/teams-tab.component';
import { PermissionSetsTabComponent } from './permission-sets-tab/permission-sets-tab.component';
import { PermissionSetEditorComponent, EditorTab } from './permission-set-editor/permission-set-editor.component';
import { AgentFormComponent } from './agent-form/agent-form.component';
import { TeamFormComponent } from './team-form/team-form.component';
import { CreatePermissionSetModalComponent } from './create-permission-set-modal/create-permission-set-modal.component';

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
    CreatePermissionSetModalComponent,
  ],
  templateUrl: './agent-management.component.html',
  styleUrl: './agent-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ds-page-content', role: 'main' },
})
export class AgentManagementComponent {
  private readonly router = inject(Router);
  private readonly teamsSvc = inject(TeamsService);
  private readonly setsSvc = inject(PermissionSetsService);

  /** Exposed to the template so the Permission Sets tab can be re-mounted when the module
   *  switcher changes (see the @for key in the template). */
  readonly moduleCtx = inject(ModuleContextService);

  readonly activeTab = signal<AgentMgmtTab>('agents');

  /** Permission set being edited (null = list/tabs view). Drives the full-area editor. */
  readonly editingSetId = signal<string | null>(null);

  /** The set being edited, resolved to its display name + read-only state for the page heading.
   *  Reads the stored set, so an editable set's title updates on Save (not while typing). */
  readonly editingSet = computed(() => {
    const id = this.editingSetId();
    if (!id) return null;
    const s = this.setsSvc.sets().find((x) => x.id === id);
    return s ? { name: s.name, readOnly: s.isLocked || s.type === 'System' } : null;
  });

  /** Active editor tab — the tab bar lives in the page heading now, so the parent owns it. */
  readonly editorTab = signal<EditorTab>('details');
  readonly editorTabs: { id: EditorTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'data-visibility', label: 'Data Visibility' },
    { id: 'actions', label: 'Actions' },
    { id: 'settings', label: 'Settings' },
  ];

  /** True while the New Permission Set modal is open (hosted here — the Permission Sets tab is detached). */
  readonly creatingSet = signal(false);

  /** True while the Create Agent form is open. Hosted here (not in the Agents tab) because
   *  that tab detaches change detection for table-init.js and can't drive a modal. */
  readonly creatingAgent = signal(false);

  /** True while the Create Team form is open. Hosted here for the same reason as the agent
   *  form — the Teams tab detaches change detection for table-init.js. */
  readonly creatingTeam = signal(false);

  /** The team opened from a Teams-table row click (null = no edit form open). Manual teams
   *  open editable; synced teams open read-only — the Team form decides from `source`. */
  readonly editingTeam = signal<Team | null>(null);

  setTab(tab: AgentMgmtTab): void {
    this.activeTab.set(tab);
  }

  /** A row click in the (detached) Agents table opens the full agent profile page. */
  openProfile(id: string): void {
    this.router.navigate(['/settings/agent-management', id]);
  }

  /** A row click in the (detached) Teams table opens the Team form for that team. */
  openTeam(id: string): void {
    this.editingTeam.set(this.teamsSvc.teams().find((t) => t.id === id) ?? null);
  }

  /** Close the Team form (covers both create and edit). */
  closeTeamForm(): void {
    this.creatingTeam.set(false);
    this.editingTeam.set(null);
  }

  /** Open the editor for a set, starting on the Details tab. */
  openEditor(id: string): void {
    this.editorTab.set('details');
    this.editingSetId.set(id);
  }

  setEditorTab(tab: EditorTab): void {
    this.editorTab.set(tab);
  }

  /** The New Permission Set modal created a set — close it and open its editor. */
  onSetCreated(id: string): void {
    this.creatingSet.set(false);
    this.openEditor(id);
  }
}
