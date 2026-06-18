import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  PermissionDef,
  PermissionSetsService,
} from '../../../../data/permission-sets.service';

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
  selector: 'app-permission-set-editor',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './permission-set-editor.component.html',
  styleUrl: './permission-set-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Fills the parent's content area. The parent owns the page <h1>; this editor renders its
  // own section title inside. Stays attached (no detach) so it remains fully reactive.
  host: { class: 'ds-page-content__main', style: 'display: flex; flex-direction: column;' },
})
export class PermissionSetEditorComponent implements OnInit {
  /** The id of the permission set to edit. Loaded into the working copy on init. */
  @Input({ required: true }) setId!: string;
  /** Emitted on Back / Cancel / Save — the parent closes the editor (clears its signal). */
  @Output() back = new EventEmitter<void>();

  private readonly setsSvc = inject(PermissionSetsService);

  // Section ids that hold catalog perms (everything except the synthetic data-visibility pane).
  readonly catalog = this.setsSvc.catalog;
  readonly dataVisibilityId = DATA_VISIBILITY_ID;

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

  ngOnInit(): void {
    this.loadSet(this.setId);
  }

  // Load the set identified by `id` into the working copy. Same logic the old
  // permission-sets-tab `openEditor` ran, now keyed by id and triggered from ngOnInit.
  private loadSet(id: string): void {
    const set = this.setsSvc.sets().find(s => s.id === id);
    if (!set) return;
    this.editingName.set(set.name);
    // Build the working copy BEFORE locking read-only, since applyPreset() bails when
    // read-only. The seeded sets use a legacy capability vocabulary (manageUsers,
    // ticketAccess, …) that shares no ids with the catalog perms (tk-*, as-*, …), so
    // cloning them verbatim would render every section as No Access. Detect that case
    // and seed the working copy from a sensible per-set preset across every section.
    this.readOnly.set(false);
    const usesCatalogKeys = this.catalog.some(section =>
      section.perms.some(perm => perm.id in set.capabilities),
    );
    if (usesCatalogKeys) {
      // Already catalog-keyed (e.g. a Custom set saved by this editor): clone as-is.
      this.working.set({ ...set.capabilities });
    } else {
      // Legacy/seeded set: start from defaults, then apply the derived section preset.
      this.working.set(this.defaultCapabilities());
      const preset = this.presetForSet(set.id);
      for (const section of this.catalog) this.applyPreset(section.id, preset);
    }
    // Now lock System/locked sets read-only (the derived preset still displays).
    this.readOnly.set(set.isLocked || set.type === 'System');
    this.seedManageSubs();
    this.activeSection.set(this.catalog[0]?.id ?? DATA_VISIBILITY_ID);
    this.clearSearch();
    this.collapsed.set({});
  }

  // Default whole-set preset for a seeded set whose capabilities predate the catalog.
  // Privileged sets map to Full Access, standard members to View Only, everything else
  // (including brand-new custom sets) to No Access.
  private presetForSet(setId: string): Preset {
    const fullAccess = new Set(['ps-sysadmin', 'ps-global-user', 'ps-it-desk-lead']);
    const viewOnly = new Set([
      'ps-team-member', 'ps-recorder', 'ps-readonly', 'ps-classic-triage',
    ]);
    if (fullAccess.has(setId)) return 'full-access';
    if (viewOnly.has(setId)) return 'view-only';
    return 'no-access';
  }

  // Back / Cancel — discard the working copy by leaving the editor.
  closeEditor(): void {
    this.back.emit();
  }

  // Save — flush the working copy to the service, then leave the editor.
  save(): void {
    if (this.readOnly()) return;
    this.setsSvc.update(this.setId, { capabilities: { ...this.working() } });
    this.back.emit();
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
