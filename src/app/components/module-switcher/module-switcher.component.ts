import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ModuleContextService } from '../../data/module-context.service';
import { MessagingService } from '../../data/messaging.service';

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

  readonly open = signal(false);

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
