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
import { FormsModule } from '@angular/forms';
import { Persona } from '../../data/models';
import { PersonaService } from '../../data/persona.service';
import { ModulesService } from '../../data/modules.service';

/**
 * ⌘K (Mac) / Ctrl+K (Windows) persona swapper. Always mounted in the shell; listens for the
 * shortcut on the document. Picking a persona re-renders the whole app as that persona — the
 * module switcher, nav gating, and current context all derive from PersonaService.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  private readonly personaSvc = inject(PersonaService);
  private readonly modulesSvc = inject(ModulesService);

  readonly open = signal(false);
  readonly query = signal('');
  readonly highlighted = signal(0);

  readonly currentId = computed(() => this.personaSvc.current().id);

  /** Personas filtered by the search query (name / title / access summary). */
  readonly filtered = computed<Persona[]>(() => {
    const q = this.query().toLowerCase().trim();
    const all = this.personaSvc.personas();
    if (!q) return all;
    return all.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        this.accessSummary(p).toLowerCase().includes(q),
    );
  });

  /** Cross-platform shortcut hint: ⌘K on Mac, Ctrl+K elsewhere. */
  readonly shortcutLabel = /mac|iphone|ipad/i.test(
    typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : '',
  )
    ? '⌘K'
    : 'Ctrl+K';

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  constructor() {
    // Focus the search box and reset the highlight each time the palette opens.
    effect(() => {
      if (this.open()) {
        this.highlighted.set(0);
        setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
      }
    });
  }

  initials(p: Persona): string {
    const parts = p.name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }

  /** Human summary of a persona's access, e.g. "Global admin · all modules" or "IT Agent". */
  accessSummary(p: Persona): string {
    if (p.isGlobalAdmin) return 'Global admin · all modules';
    const mods = this.modulesSvc.modules();
    return p.moduleAccess
      .map(a => `${mods.find(m => m.id === a.moduleId)?.name ?? a.moduleId} ${a.role}`)
      .join(' · ');
  }

  openPalette(): void {
    this.query.set('');
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  selectPersona(p: Persona): void {
    this.personaSvc.select(p.id);
    this.close();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.highlighted.set(0);
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
      const p = this.filtered()[this.highlighted()];
      if (p) this.selectPersona(p);
    }
  }

  private move(delta: number): void {
    const len = this.filtered().length;
    if (len === 0) return;
    this.highlighted.set((this.highlighted() + delta + len) % len);
  }
}
