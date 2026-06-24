import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnDestroy, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionDef, PermissionSection, SectionPreset } from '../../../../data/permission-catalog';
import { PermissionEditorStateService } from './permission-editor-state.service';

type PermRun =
  | { kind: 'item'; perm: PermissionDef }
  | { kind: 'group'; label: string; perms: PermissionDef[] };

/**
 * The two-column permission matrix (left section nav + search, right perm grid with presets).
 * Used by BOTH the Actions and Settings tabs — fed a different `sections` array each time.
 * Reads / writes through the shared PermissionEditorStateService (provided by the editor shell).
 */
@Component({
  selector: 'app-pset-matrix-tab',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './pset-matrix-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'psets-editor__matrix' },
})
export class PsetMatrixTabComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) set sections(value: PermissionSection[]) {
    this._sections.set(value);
  }
  private readonly _sections = signal<PermissionSection[]>([]);

  readonly state = inject(PermissionEditorStateService);

  readonly presetLabels: Record<SectionPreset, string> = {
    'no-access': 'No Access',
    'view-only': 'View Only',
    'full-access': 'Full Access',
    custom: 'Custom',
  };

  searchText = '';
  private readonly search = signal('');
  private readonly activeId = signal<string>('');

  // Sections (and their perms) narrowed by the search query; sections with no match drop out.
  readonly filteredSections = computed(() => {
    const q = this.search().trim().toLowerCase();
    const out: { section: PermissionSection; perms: PermissionDef[]; matchCount: number }[] = [];
    for (const s of this._sections()) {
      const perms = q ? s.perms.filter(p => p.label.toLowerCase().includes(q)) : s.perms;
      if (q && perms.length === 0) continue;
      out.push({ section: s, perms, matchCount: q ? perms.length : 0 });
    }
    return out;
  });

  // The right pane renders ALL sections stacked; the nav is a jump-to anchor list, not a tab
  // switcher. `activeSectionId` is the section currently at the top of the scroller — set on nav
  // click and kept in sync by the scroll-spy below. It always resolves to a section that's
  // actually rendered, so the highlight never points at one the search has filtered out.
  readonly activeSectionId = computed(() => {
    const list = this.filteredSections();
    const active = this.activeId();
    if (active && list.some(x => x.section.id === active)) return active;
    return list[0]?.section.id ?? '';
  });

  /** Nav click → highlight the section and smooth-scroll the right pane to it. */
  select(id: string): void {
    this.activeId.set(id);
    this.scroller()
      ?.querySelector<HTMLElement>(`[data-section-id="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private scroller(): HTMLElement | null {
    return document.getElementById('pset-matrix-content');
  }

  /** Stable DOM id for a section wrapper (and `${id}-title` for its heading) — drives the scroll
   * anchor and aria-labelledby. */
  sectionDomId(id: string): string {
    return `pset-section-${id}`;
  }

  onSearch(v: string): void {
    this.searchText = v;
    this.search.set(v);
  }
  clearSearch(): void {
    this.searchText = '';
    this.search.set('');
  }

  // ── Scroll-spy ──────────────────────────────────────────────────────────────────────
  // Keep the nav highlight on whichever section sits at the top of the scroller. The listener is
  // rAF-coalesced; zone.js runs the rAF callback in-zone, so the signal write drives OnPush change
  // detection. A fresh component instance mounts per editor tab, so teardown just detaches.
  private scrollHandler?: () => void;
  private rafPending = false;

  ngAfterViewInit(): void {
    const el = this.scroller();
    if (!el) return;
    this.scrollHandler = () => {
      if (this.rafPending) return;
      this.rafPending = true;
      requestAnimationFrame(() => {
        this.rafPending = false;
        const id = this.topSectionId();
        if (id) this.activeId.set(id);
      });
    };
    el.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) this.scroller()?.removeEventListener('scroll', this.scrollHandler);
  }

  // The last section whose head has scrolled to within ~80px of the scroller's top edge — or, once
  // the scroller bottoms out, the final section. A short last section (e.g. Integrations) can never
  // reach the top line, so without this it would never highlight no matter how far you scroll.
  private topSectionId(): string {
    const el = this.scroller();
    if (!el) return '';
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-section-id]'));
    if (!secs.length) return '';
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      return secs[secs.length - 1].dataset['sectionId'] ?? '';
    }
    const cutoff = el.getBoundingClientRect().top + 80;
    let current = secs[0].dataset['sectionId'] ?? '';
    for (const sec of secs) {
      if (sec.getBoundingClientRect().top <= cutoff) current = sec.dataset['sectionId'] ?? current;
      else break;
    }
    return current;
  }

  // Group consecutive same-subGroup perms into collapsible blocks, preserving order.
  groupPerms(perms: PermissionDef[]): PermRun[] {
    const runs: PermRun[] = [];
    for (const perm of perms) {
      if (!perm.subGroup) {
        runs.push({ kind: 'item', perm });
        continue;
      }
      const last = runs[runs.length - 1];
      if (last && last.kind === 'group' && last.label === perm.subGroup) last.perms.push(perm);
      else runs.push({ kind: 'group', label: perm.subGroup, perms: [perm] });
    }
    return runs;
  }

  private readonly collapsed = signal<Record<string, boolean>>({});
  isCollapsed(sectionId: string, label: string): boolean {
    return this.collapsed()[`${sectionId}::${label}`] ?? false;
  }
  toggleGroup(sectionId: string, label: string): void {
    const key = `${sectionId}::${label}`;
    this.collapsed.update(c => ({ ...c, [key]: !(c[key] ?? false) }));
  }

  noteIcon(type: 'info' | 'warning' | 'auto'): string {
    return type === 'warning' ? 'warning' : type === 'auto' ? 'auto_awesome' : 'info';
  }
}
