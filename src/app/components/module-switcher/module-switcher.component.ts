import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ModuleContextService } from '../../data/module-context.service';
import { ModulesService } from '../../data/modules.service';

@Component({
  selector: 'app-module-switcher',
  standalone: true,
  imports: [],
  templateUrl: './module-switcher.component.html',
  styleUrl: './module-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleSwitcherComponent {
  readonly moduleCtx = inject(ModuleContextService);
  readonly modulesSvc = inject(ModulesService);

  readonly open = signal(false);

  toggle(): void {
    this.open.update(v => !v);
  }

  /** Pick a context (null = Global) and close the menu. */
  select(moduleId: string | null): void {
    this.moduleCtx.select(moduleId);
    this.open.set(false);
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
