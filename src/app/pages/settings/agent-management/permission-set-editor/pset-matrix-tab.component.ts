import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
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
export class PsetMatrixTabComponent {
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

  // The section rendered on the right — active if it survived the filter, else the first match.
  readonly visible = computed(() => {
    const list = this.filteredSections();
    const active = this.activeId() || this._sections()[0]?.id;
    return list.find(x => x.section.id === active) ?? list[0] ?? null;
  });
  /** Id of the section shown on the right — drives the nav's selected state. */
  readonly visibleId = computed(() => this.visible()?.section.id ?? '');

  select(id: string): void {
    this.activeId.set(id);
    queueMicrotask(() => document.getElementById('pset-matrix-content')?.scrollTo({ top: 0 }));
  }
  onSearch(v: string): void {
    this.searchText = v;
    this.search.set(v);
  }
  clearSearch(): void {
    this.searchText = '';
    this.search.set('');
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
