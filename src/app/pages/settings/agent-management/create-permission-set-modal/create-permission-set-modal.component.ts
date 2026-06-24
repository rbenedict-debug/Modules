import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModulesService } from '../../../../data/modules.service';
import { ModuleContextService } from '../../../../data/module-context.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { FormSelectComponent } from '../form-select.component';

/**
 * "New Permission Set" modal — the first step of creating a set. Collects name, description,
 * a (context-locked) department, and an optional Copy-From source. On Create it adds the set
 * (scoped to the current switcher context, capabilities copied from the source) and emits its
 * id so the parent opens the editor. Design-mode mock: persists to PermissionSetsService.
 */
@Component({
  selector: 'app-create-permission-set-modal',
  standalone: true,
  imports: [FormsModule, FormSelectComponent],
  templateUrl: './create-permission-set-modal.component.html',
  styleUrl: './create-permission-set-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePermissionSetModalComponent {
  @Output() close = new EventEmitter<void>();
  /** Emits the new set's id so the parent opens its editor. */
  @Output() created = new EventEmitter<string>();

  private readonly modulesSvc = inject(ModulesService);
  private readonly moduleCtx = inject(ModuleContextService);
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly name = signal('');
  readonly description = signal('');

  // Department is locked to the current switcher context (Global → "Global"), like the team form.
  readonly departmentName = computed(() => {
    const id = this.moduleCtx.currentModuleId();
    return id === null ? 'Global' : this.modulesSvc.modules().find(m => m.id === id)?.name ?? id;
  });
  readonly departmentOptions = computed(() => this.modulesSvc.modules().filter(m => m.active).map(m => m.name));
  readonly copyFromOptions = computed(() => this.setsSvc.sets().map(s => s.name));
  readonly canCreate = computed(() => this.name().trim() !== '');

  cancel(): void {
    this.close.emit();
  }

  create(): void {
    if (!this.canCreate()) return;
    // Copy-From is a select.js visual stand-in; read its chosen value from the DOM at submit.
    const copyFrom =
      (this.host.nativeElement.querySelector('#cps-copy-from .ds-select__control') as HTMLInputElement | null)?.value?.trim() ??
      '';
    const source = this.setsSvc.sets().find(s => s.name === copyFrom);
    this.setsSvc.add({
      name: this.name().trim(),
      description: this.description().trim() || undefined,
      moduleId: this.moduleCtx.currentModuleId(),
      type: 'Custom',
      isLocked: false,
      capabilities: source ? { ...source.capabilities } : {},
    });
    const createdSet = this.setsSvc.sets()[this.setsSvc.sets().length - 1];
    if (createdSet) this.created.emit(createdSet.id);
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close.emit();
  }
}
