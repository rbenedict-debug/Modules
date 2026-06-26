import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Persona } from '../../data/models';
import { PersonaService } from '../../data/persona.service';
import { ModulesService } from '../../data/modules.service';
import { ScenarioService } from '../../data/scenario.service';

/**
 * ⌘K (Mac) / Ctrl+K (Windows) persona swapper. Always mounted in the shell; listens for the
 * shortcut on the document. Picking a persona re-renders the whole app as that persona — the
 * module switcher, nav gating, and current context all derive from PersonaService.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  private readonly personaSvc = inject(PersonaService);
  private readonly modulesSvc = inject(ModulesService);
  // Persona selection routes through ScenarioService so a persona that carries a demo scenario
  // (e.g. the first-time setup) swaps its world data synchronously, before the shell re-renders.
  private readonly scenarioSvc = inject(ScenarioService);

  readonly open = signal(false);
  readonly highlighted = signal(0);

  readonly personas = computed<Persona[]>(() => this.personaSvc.personas());
  readonly currentId = computed(() => this.personaSvc.current().id);

  /** Cross-platform shortcut hint: ⌘K on Mac, Ctrl+K elsewhere. */
  readonly shortcutLabel = /mac|iphone|ipad/i.test(
    typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : '',
  )
    ? '⌘K'
    : 'Ctrl+K';

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    // Move focus into the dialog and reset the highlight each time the palette opens.
    effect(() => {
      if (this.open()) {
        this.highlighted.set(0);
        setTimeout(() => this.panel()?.nativeElement.focus(), 0);
      }
    });
  }

  initials(p: Persona): string {
    const parts = p.name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }

  /** Human summary of a persona's access, e.g. "Global admin · all modules", "Global admin · IT"
   *  (a freshly set-up account with one module), or "IT Agent". */
  accessSummary(p: Persona): string {
    const mods = this.modulesSvc.modules();
    if (p.isGlobalAdmin) {
      // A global admin sees the whole district. Say "all modules" when they cover the full catalog,
      // otherwise name the enabled one(s) — a first-time account may have only one.
      const coversAll = mods.every(m => p.moduleAccess.some(a => a.moduleId === m.id));
      if (coversAll) return 'Global admin · all modules';
      const names = p.moduleAccess.map(a => mods.find(m => m.id === a.moduleId)?.name ?? a.moduleId);
      return `Global admin · ${names.join(', ')}`;
    }
    return p.moduleAccess
      .map(a => `${mods.find(m => m.id === a.moduleId)?.name ?? a.moduleId} ${a.role}`)
      .join(' · ');
  }

  openPalette(): void {
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  selectPersona(p: Persona): void {
    this.scenarioSvc.selectPersona(p.id);
    this.close();
  }

  // ⌘K / Ctrl+K toggles the palette anywhere; ↑↓ move the highlight; Enter selects; Esc closes.
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.open() ? this.close() : this.openPalette();
      return;
    }
    if (!this.open()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = this.personas()[this.highlighted()];
      if (p) this.selectPersona(p);
    }
  }

  private move(delta: number): void {
    const len = this.personas().length;
    if (len === 0) return;
    this.highlighted.set((this.highlighted() + delta + len) % len);
  }
}
