import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
} from '@angular/core';
import { ModulesService } from '../../../../data/modules.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { MessagingService } from '../../../../data/messaging.service';
import { FormSelectComponent } from '../form-select.component';

/**
 * Create Team popup — a `ds-modal` over a scrim, mirroring the agent form. Maps to the Team
 * model: name, modules (departments), topics, permissionSetId, memberIds.
 *
 * Design-mode contract: the name field is native + uncontrolled, dropdowns are run by
 * `runtime/select.js`, the member search is a visual stand-in, and submit is mocked (success
 * toast + close). Real binding, validation, member search, and persistence are the eng team's job.
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
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private readonly modulesSvc = inject(ModulesService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly msg = inject(MessagingService);

  readonly departments = computed(() => this.modulesSvc.modules().filter((m) => m.active).map((m) => m.name));
  // Topics aren't a standalone entity — the vocabulary lives on teams. Gather the distinct set.
  // TODO eng: scope topic options to the selected department(s).
  readonly topicOptions = computed(() => {
    const seen = new Set<string>();
    for (const t of this.teamsSvc.teams()) for (const topic of t.topics) seen.add(topic);
    return [...seen].sort();
  });
  readonly permissionSetNames = computed(() => this.setsSvc.sets().map((s) => s.name));

  cancel(): void {
    this.close.emit();
  }

  submit(): void {
    // TODO eng: validate + persist. Design-mode mock: toast + close.
    this.msg.success('Team created.');
    this.saved.emit();
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
