import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ModulesService } from '../../../../data/modules.service';
import {
  PermissionDef,
  PermissionSection,
  PermissionSetsService,
} from '../../../../data/permission-sets.service';
import { PermissionSet } from '../../../../data/models';

// A list row, resolved once for the table so cells never reach back into a service.
interface SetRow {
  id: string;
  name: string;
  type: PermissionSet['type'];
  scope: string;       // module name, or 'System-wide'
  isLocked: boolean;
}

// Section-level preset for the four header buttons. 'custom' = current values match none.
type Preset = 'no-access' | 'view-only' | 'full-access' | 'custom';

// The Data Visibility pane is rendered with bespoke radio/toggle markup, but it shares the
// left-nav + active-section machinery by appearing as a synthetic section. Its perm ids are
// the capability keys it writes; controlType is irrelevant for it (rendered specially).
const DATA_VISIBILITY_ID = 'data-visibility';

// Capability keys for the Data Visibility pane.
const DV_TICKET_SCOPE = 'dv-ticket-scope';      // 'All' | 'Assigned'
const DV_ASSET_SCOPE = 'dv-asset-scope';        // 'All' | 'Assigned'
const DV_EXCLUDE_CONFIDENTIAL = 'dv-exclude-confidential-topics';
const DV_EXCLUDE_OTHER_LOCATIONS = 'dv-exclude-other-locations';

@Component({
  selector: 'app-permission-sets-tab',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './permission-sets-tab.component.html',
  styleUrl: './permission-sets-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionSetsTabComponent {
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly modulesSvc = inject(ModulesService);

  // Section ids that hold catalog perms (everything except the synthetic data-visibility pane).
  readonly catalog = this.setsSvc.catalog;
  readonly dataVisibilityId = DATA_VISIBILITY_ID;

  // ── List view ───────────────────────────────────────────────────────────────
  private readonly moduleNameById = computed(() => {
    const map = new Map<string, string>();
    for (const m of this.modulesSvc.modules()) map.set(m.id, m.name);
    return map;
  });

  readonly rows = computed<SetRow[]>(() => {
    const names = this.moduleNameById();
    return this.setsSvc.sets().map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      scope: s.moduleId ? (names.get(s.moduleId) ?? s.moduleId) : 'System-wide',
      isLocked: s.isLocked,
    }));
  });

  // ── Editor open/close ─────────────────────────────────────────────────────────
  // The id of the set being edited (null = list view).
  readonly editingId = signal<string | null>(null);
  // The set's display name + read-only flag, captured when the editor opens.
  readonly editingName = signal('');
  readonly readOnly = signal(false);

  // The local working copy of capabilities. Edits mutate this; Save flushes it to the
  // service, Cancel/Back discards it by simply leaving the editor.
  readonly working = signal<Record<string, boolean | string>>({});

  // Per-segment "Manage" sub-checkboxes (Create / Edit / Delete). Keyed by perm id; only
  // meaningful while that perm's segment value is the Manage option. Defaults all-on.
  private readonly manageSubs = signal<Record<string, Record<string, boolean>>>({});
  readonly manageSubOptions = ['Create', 'Edit', 'Delete'];

  // Active left-nav section (catalog id or the data-visibility id).
  readonly activeSection = signal<string>(this.catalog[0]?.id ?? '');

  // Left-nav search. Filters perms by label; sections with no match drop out, and matching
  // sections show a count badge.
  searchText = '';
  private readonly search = signal('');

  // Sub-group collapse state, keyed by `${sectionId}::${subGroup}`. Absent = expanded.
  private readonly collapsed = signal<Record<string, boolean>>({});

  openEditor(row: SetRow): void {
    const set = this.setsSvc.sets().find(s => s.id === row.id);
    if (!set) return;
    this.editingId.set(set.id);
    this.editingName.set(set.name);
    // System sets and any locked set open read-only.
    this.readOnly.set(set.isLocked || set.type === 'System');
    // Clone capabilities into the working copy so edits don't touch the service until Save.
    this.working.set({ ...set.capabilities });
    this.seedManageSubs();
    this.activeSection.set(this.catalog[0]?.id ?? DATA_VISIBILITY_ID);
    this.clearSearch();
    this.collapsed.set({});
  }

  // Create a new Custom set (system-wide, unlocked) and open its editor immediately.
  createSet(): void {
    const name = this.nextCustomName();
    this.setsSvc.add({
      name,
      moduleId: null,
      type: 'Custom',
      isLocked: false,
      capabilities: this.defaultCapabilities(),
    });
    // add() appends, so the new set is last.
    const created = this.setsSvc.sets()[this.setsSvc.sets().length - 1];
    if (created) {
      this.openEditor({
        id: created.id,
        name: created.name,
        type: created.type,
        scope: 'System-wide',
        isLocked: false,
      });
    }
  }

  // Back / Cancel — discard the working copy by leaving the editor.
  closeEditor(): void {
    this.editingId.set(null);
  }

  // Save — flush the working copy (and is implicitly the only place the service changes).
  save(): void {
    const id = this.editingId();
    if (!id || this.readOnly()) return;
    this.setsSvc.update(id, { capabilities: { ...this.working() } });
    this.closeEditor();
  }

  // A fresh set starts every catalog perm off / Hide, and Data Visibility at All.
  private defaultCapabilities(): Record<string, boolean | string> {
    const caps: Record<string, boolean | string> = {};
    for (const section of this.catalog) {
      for (const perm of section.perms) {
        caps[perm.id] = perm.controlType === 'toggle' ? false : this.segOptions(perm)[0];
      }
    }
    caps[DV_TICKET_SCOPE] = 'All';
    caps[DV_ASSET_SCOPE] = 'All';
    caps[DV_EXCLUDE_CONFIDENTIAL] = false;
    caps[DV_EXCLUDE_OTHER_LOCATIONS] = false;
    return caps;
  }

  private nextCustomName(): string {
    const base = 'New permission set';
    const existing = new Set(this.setsSvc.sets().map(s => s.name));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  // ── Left nav (sections + search) ────────────────────────────────────────────────
  // Sections shown in the nav and rendered on the right, narrowed by the search query.
  // Data Visibility is appended as a synthetic section (no catalog perms).
  readonly filteredSections = computed(() => {
    const q = this.search().trim().toLowerCase();
    const out: { id: string; label: string; icon: string; perms: PermissionDef[]; matchCount: number }[] = [];
    for (const s of this.catalog) {
      const perms = q ? s.perms.filter(p => p.label.toLowerCase().includes(q)) : s.perms;
      if (q && perms.length === 0) continue;
      out.push({ id: s.id, label: s.label, icon: s.icon, perms, matchCount: q ? perms.length : 0 });
    }
    // Data Visibility matches the query if its own label does (it has no catalog perms).
    if (!q || 'data visibility'.includes(q)) {
      out.push({ id: DATA_VISIBILITY_ID, label: 'Data Visibility', icon: 'visibility', perms: [], matchCount: 0 });
    }
    return out;
  });

  // The section currently rendered on the right — the active one if it survived the filter,
  // else the first filtered section (keeps the pane in sync when search narrows the list).
  readonly visibleSection = computed(() => {
    const sections = this.filteredSections();
    const active = this.activeSection();
    return sections.find(s => s.id === active) ?? sections[0] ?? null;
  });

  selectSection(id: string): void {
    this.activeSection.set(id);
    // Scroll the right pane back to the top when the section changes.
    queueMicrotask(() => {
      document.getElementById('perm-set-content')?.scrollTo({ top: 0 });
    });
  }

  onSearch(value: string): void {
    this.searchText = value;
    this.search.set(value);
  }

  clearSearch(): void {
    this.searchText = '';
    this.search.set('');
  }

  // ── Sub-group rendering ────────────────────────────────────────────────────────
  // Group a section's perms into a flat run of ungrouped items and contiguous sub-group
  // blocks, preserving order — the same grouping the source prototype used.
  groupPerms(perms: PermissionDef[]): { kind: 'item'; perm: PermissionDef }[] | { kind: 'group'; label: string; perms: PermissionDef[] }[] {
    type Run = { kind: 'item'; perm: PermissionDef } | { kind: 'group'; label: string; perms: PermissionDef[] };
    const runs: Run[] = [];
    for (const perm of perms) {
      if (!perm.subGroup) {
        runs.push({ kind: 'item', perm });
        continue;
      }
      const last = runs[runs.length - 1];
      if (last && last.kind === 'group' && last.label === perm.subGroup) {
        last.perms.push(perm);
      } else {
        runs.push({ kind: 'group', label: perm.subGroup, perms: [perm] });
      }
    }
    return runs as any;
  }

  isCollapsed(sectionId: string, label: string): boolean {
    return this.collapsed()[`${sectionId}::${label}`] ?? false;
  }

  toggleGroup(sectionId: string, label: string): void {
    const key = `${sectionId}::${label}`;
    this.collapsed.update(c => ({ ...c, [key]: !(c[key] ?? false) }));
  }

  // ── Control state + writes ────────────────────────────────────────────────────
  segOptions(perm: PermissionDef): string[] {
    return perm.segmentOptions ?? ['Hide', 'View', 'Manage'];
  }

  toggleValue(perm: PermissionDef): boolean {
    return this.working()[perm.id] === true;
  }

  setToggle(perm: PermissionDef, value: boolean): void {
    if (this.readOnly()) return;
    this.working.update(w => ({ ...w, [perm.id]: value }));
  }

  segValue(perm: PermissionDef): string {
    const v = this.working()[perm.id];
    return typeof v === 'string' ? v : this.segOptions(perm)[0];
  }

  setSegment(perm: PermissionDef, value: string): void {
    if (this.readOnly()) return;
    this.working.update(w => ({ ...w, [perm.id]: value }));
    // Reaching "Manage" reveals the Create/Edit/Delete sub-checkboxes; seed them all-on
    // the first time so the row isn't blank.
    if (this.isManageOption(perm, value) && !this.manageSubs()[perm.id]) {
      this.manageSubs.update(m => ({ ...m, [perm.id]: { Create: true, Edit: true, Delete: true } }));
    }
  }

  // The "highest"/manage option is the last segment option when it is named 'Manage'.
  isManageOption(perm: PermissionDef, value: string): boolean {
    const opts = this.segOptions(perm);
    return opts[opts.length - 1] === 'Manage' && value === 'Manage';
  }

  showManageSubs(perm: PermissionDef): boolean {
    return this.isManageOption(perm, this.segValue(perm));
  }

  manageSub(perm: PermissionDef, sub: string): boolean {
    return this.manageSubs()[perm.id]?.[sub] ?? true;
  }

  setManageSub(perm: PermissionDef, sub: string, value: boolean): void {
    if (this.readOnly()) return;
    this.manageSubs.update(m => ({
      ...m,
      [perm.id]: { ...(m[perm.id] ?? { Create: true, Edit: true, Delete: true }), [sub]: value },
    }));
  }

  private seedManageSubs(): void {
    const subs: Record<string, Record<string, boolean>> = {};
    for (const section of this.catalog) {
      for (const perm of section.perms) {
        if (perm.controlType === 'segment' && this.isManageOption(perm, this.segValue(perm))) {
          subs[perm.id] = { Create: true, Edit: true, Delete: true };
        }
      }
    }
    this.manageSubs.set(subs);
  }

  // ── Section presets ────────────────────────────────────────────────────────────
  readonly presets: { id: Preset; label: string }[] = [
    { id: 'no-access', label: 'No Access' },
    { id: 'view-only', label: 'View Only' },
    { id: 'full-access', label: 'Full Access' },
    { id: 'custom', label: 'Custom' },
  ];

  // The current preset for a section, by comparing its perms against the three profiles.
  currentPreset(sectionId: string): Preset {
    const section = this.catalog.find(s => s.id === sectionId);
    if (!section) return 'custom';
    let noAccess = true;
    let viewOnly = true;
    let fullAccess = true;
    for (const perm of section.perms) {
      if (perm.controlType === 'toggle') {
        const v = this.toggleValue(perm);
        if (v) noAccess = false;
        // Toggles carry no view-tier here, so View Only treats every toggle as off.
        if (v) viewOnly = false;
        if (!v) fullAccess = false;
      } else {
        const opts = this.segOptions(perm);
        const v = this.segValue(perm);
        if (v !== opts[0]) noAccess = false;
        const viewOpt = opts.includes('View') ? 'View' : opts[0];
        if (v !== viewOpt) viewOnly = false;
        if (v !== opts[opts.length - 1]) fullAccess = false;
      }
    }
    if (noAccess) return 'no-access';
    if (viewOnly) return 'view-only';
    if (fullAccess) return 'full-access';
    return 'custom';
  }

  applyPreset(sectionId: string, preset: Preset): void {
    if (this.readOnly() || preset === 'custom') return;
    const section = this.catalog.find(s => s.id === sectionId);
    if (!section) return;
    this.working.update(w => {
      const next = { ...w };
      for (const perm of section.perms) {
        if (perm.controlType === 'toggle') {
          next[perm.id] = preset === 'full-access';
        } else {
          const opts = this.segOptions(perm);
          if (preset === 'no-access') next[perm.id] = opts[0];
          else if (preset === 'view-only') next[perm.id] = opts.includes('View') ? 'View' : opts[0];
          else next[perm.id] = opts[opts.length - 1];
        }
      }
      return next;
    });
  }

  // ── Data Visibility writes ───────────────────────────────────────────────────────
  dvTicketScope(): string {
    return (this.working()[DV_TICKET_SCOPE] as string) ?? 'All';
  }
  setDvTicketScope(value: string): void {
    if (this.readOnly()) return;
    this.working.update(w => ({ ...w, [DV_TICKET_SCOPE]: value }));
  }

  dvAssetScope(): string {
    return (this.working()[DV_ASSET_SCOPE] as string) ?? 'All';
  }
  setDvAssetScope(value: string): void {
    if (this.readOnly()) return;
    this.working.update(w => ({ ...w, [DV_ASSET_SCOPE]: value }));
  }

  dvExcludeConfidential(): boolean {
    return this.working()[DV_EXCLUDE_CONFIDENTIAL] === true;
  }
  setDvExcludeConfidential(value: boolean): void {
    if (this.readOnly()) return;
    this.working.update(w => ({ ...w, [DV_EXCLUDE_CONFIDENTIAL]: value }));
  }

  dvExcludeOtherLocations(): boolean {
    return this.working()[DV_EXCLUDE_OTHER_LOCATIONS] === true;
  }
  setDvExcludeOtherLocations(value: boolean): void {
    if (this.readOnly()) return;
    this.working.update(w => ({ ...w, [DV_EXCLUDE_OTHER_LOCATIONS]: value }));
  }

  // ── Misc helpers ──────────────────────────────────────────────────────────────
  // Color for a section's nav status dot, by its current preset.
  presetColor(sectionId: string): string {
    switch (this.currentPreset(sectionId)) {
      case 'no-access': return 'red';
      case 'view-only': return 'blue';
      case 'full-access': return 'green';
      default: return 'yellow';
    }
  }

  noteIcon(type: 'info' | 'warning' | 'auto'): string {
    switch (type) {
      case 'warning': return 'warning';
      case 'auto': return 'auto_awesome';
      default: return 'info';
    }
  }
}
