import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { ModuleContextService } from '../../data/module-context.service';
import { MessagingService } from '../../data/messaging.service';
import { PermissionSetsService } from '../../data/permission-sets.service';
import { MODULE_ROLE_PERMISSION_SET_ID, ModuleRole } from '../../data/models';

@Component({
  selector: 'app-module-switcher',
  standalone: true,
  imports: [],
  templateUrl: './module-switcher.component.html',
  styleUrl: './module-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleSwitcherComponent {
  // Persona-derived: availableModules / isGlobalAdmin / current context all come from here.
  readonly moduleCtx = inject(ModuleContextService);
  private readonly msg = inject(MessagingService);
  private readonly setsSvc = inject(PermissionSetsService);

  readonly open = signal(false);

  /** Label shown under each module in the switcher: the Agent Management permission set the role
   *  maps to (Admin → "Department Admin", Agent → "Team Member"), resolved live from
   *  PermissionSetsService so it stays the single source. Falls back to the raw role. */
  roleLabel(role: ModuleRole): string {
    const id = MODULE_ROLE_PERMISSION_SET_ID[role];
    return this.setsSvc.sets().find(s => s.id === id)?.name ?? role;
  }

  /** Effective glyph color for the current context's trigger icon — a custom module's chosen
   *  `color`, otherwise its `accent`. (Menu rows compute `m.color ?? m.accent` inline.) */
  readonly currentColorClass = computed(() => {
    const m = this.moduleCtx.currentModule();
    return m ? (m.color ?? m.accent) : '';
  });

  toggle(): void {
    this.open.update(v => !v);
  }

  /**
   * Pick a context (null = Global) and close the menu. Hold Shift while selecting to
   * simulate a failed switch: the context stays put and an error toast offers Retry
   * (mock switches otherwise always succeed).
   */
  select(moduleId: string | null, event?: Event): void {
    this.open.set(false);
    const shiftHeld = (event as MouseEvent | KeyboardEvent | undefined)?.shiftKey ?? false;
    if (shiftHeld) {
      const label = moduleId === null
        ? 'Global'
        : this.moduleCtx.availableModules().find(m => m.id === moduleId)?.name ?? 'that module';
      this.msg.error(`Couldn't switch to ${label}. Please try again.`, () => this.moduleCtx.select(moduleId));
      return;
    }
    this.moduleCtx.select(moduleId);
  }

  // Mirror app.ts's .profile-menu close pattern: outside-click + Escape.
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!(event.target as HTMLElement).closest('.module-switcher')) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.open.set(false);
  }
}
