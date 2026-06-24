import { Injectable, inject, signal } from '@angular/core';
import { PermissionSet } from '../../../../data/models';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import {
  ACTIONS_SECTIONS,
  PermissionDef,
  PermissionSection,
  ROLE_PRESET_STATES,
  SECTION_PRESETS_DEFAULT,
  SET_ROLE_PRESET,
  SETTINGS_SECTIONS,
  SectionPreset,
} from '../../../../data/permission-catalog';

export interface FilterState {
  values: string[];
  exclude: boolean;
}
export type FilterKey = 'assetType' | 'userType' | 'grade';

// Capability keys for the Data Visibility scopes (persisted into capabilities on save).
const DV_TICKET_SCOPE = 'dv-ticket-scope';
const DV_ASSET_SCOPE = 'dv-asset-scope';

/**
 * Working state for one open permission-set editor. Provided at the editor component (NOT root),
 * so each editor instance gets a fresh copy. Holds the in-flight name/description/capabilities/
 * data-visibility/assignments and the mutators every tab calls; Save flushes to PermissionSetsService.
 */
@Injectable()
export class PermissionEditorStateService {
  private readonly setsSvc = inject(PermissionSetsService);

  private setId = '';
  private readonly allSections: PermissionSection[] = [...ACTIONS_SECTIONS, ...SETTINGS_SECTIONS];
  private readonly permById = new Map<string, PermissionDef>(
    this.allSections.flatMap(s => s.perms).map(p => [p.id, p] as const),
  );

  readonly name = signal('');
  readonly description = signal('');
  readonly readOnly = signal(false);

  // Working capabilities: perm id → toggle bool or segment option string.
  private readonly caps = signal<Record<string, boolean | string>>({});
  // Per-segment Manage sub-checkboxes, keyed by perm id (only meaningful at the Manage option).
  private readonly manageSubs = signal<Record<string, Record<string, boolean>>>({});

  // ── Data Visibility ──────────────────────────────────────────────────────────────
  readonly ticketScope = signal<'all' | 'assigned'>('all');
  readonly assetScope = signal<'all' | 'assigned'>('all');
  readonly filters = signal<Record<FilterKey, FilterState>>({
    assetType: { values: [], exclude: false },
    userType: { values: [], exclude: false },
    grade: { values: [], exclude: false },
  });

  // ── Assignments ────────────────────────────────────────────────────────────────
  readonly assignedUserIds = signal<string[]>([]);
  readonly assignedTeamIds = signal<string[]>([]);

  // ── Load ─────────────────────────────────────────────────────────────────────────
  init(set: PermissionSet): void {
    this.setId = set.id;
    this.name.set(set.name);
    this.description.set(set.description ?? '');
    this.assignedUserIds.set([...(set.assignedUserIds ?? [])]);
    this.assignedTeamIds.set([...(set.assignedTeamIds ?? [])]);

    // Catalog-keyed sets (saved by this editor) clone verbatim; legacy/system seed sets seed
    // from their role preset; brand-new custom sets fall back to defaults.
    const usesCatalogKeys = [...this.permById.keys()].some(id => id in set.capabilities);
    if (usesCatalogKeys) {
      this.caps.set({ ...set.capabilities });
      this.ticketScope.set(this.normScope(set.capabilities[DV_TICKET_SCOPE] as string));
      this.assetScope.set(this.normScope(set.capabilities[DV_ASSET_SCOPE] as string));
    } else {
      const presetName = SET_ROLE_PRESET[set.id];
      const preset = presetName ? ROLE_PRESET_STATES[presetName] : undefined;
      if (preset) {
        this.caps.set({ ...preset.toggles, ...preset.segments });
        this.ticketScope.set(this.normScope(preset.ticketScope));
        this.assetScope.set(this.normScope(preset.assetScope));
      } else {
        this.caps.set(this.defaultCaps());
      }
    }
    this.readOnly.set(set.isLocked || set.type === 'System');
    this.seedManageSubs();
  }

  /** The source uses 'all' | 'assigned' | 'department'; the UI offers all / assigned only. */
  private normScope(s: string | undefined): 'all' | 'assigned' {
    return s === 'assigned' || s === 'department' ? 'assigned' : 'all';
  }

  private defaultCaps(): Record<string, boolean | string> {
    const c: Record<string, boolean | string> = {};
    for (const p of this.permById.values()) {
      c[p.id] =
        p.controlType === 'toggle'
          ? p.defaultValue === true
          : typeof p.defaultValue === 'string'
            ? p.defaultValue
            : this.segOptions(p)[0];
    }
    return c;
  }

  // ── Segments / toggles ─────────────────────────────────────────────────────────
  segOptions(p: PermissionDef): string[] {
    return p.segmentOptions ?? ['Hide', 'View', 'Manage'];
  }

  toggleValue(p: PermissionDef): boolean {
    return this.caps()[p.id] === true;
  }
  setToggle(p: PermissionDef, value: boolean): void {
    if (this.readOnly()) return;
    this.caps.update(c => ({ ...c, [p.id]: value }));
  }

  segValue(p: PermissionDef): string {
    const v = this.caps()[p.id];
    return typeof v === 'string' ? v : this.segOptions(p)[0];
  }
  setSegment(p: PermissionDef, value: string): void {
    if (this.readOnly()) return;
    this.caps.update(c => ({ ...c, [p.id]: value }));
    if (this.isManageValue(p, value) && !this.manageSubs()[p.id]) {
      this.manageSubs.update(m => ({ ...m, [p.id]: this.allSubsOn(p) }));
    }
  }

  manageSubOptions(p: PermissionDef): string[] {
    return p.manageSubOptions ?? ['Create', 'Edit', 'Delete'];
  }
  private allSubsOn(p: PermissionDef): Record<string, boolean> {
    const o: Record<string, boolean> = {};
    for (const s of this.manageSubOptions(p)) o[s] = true;
    return o;
  }
  /** Manage sub-checkboxes show when the last segment option is the "manage" tier and is selected. */
  isManageValue(p: PermissionDef, value: string): boolean {
    const opts = this.segOptions(p);
    const last = opts[opts.length - 1];
    return opts.length > 2 && value === last;
  }
  showManageSubs(p: PermissionDef): boolean {
    return this.isManageValue(p, this.segValue(p));
  }
  manageSub(p: PermissionDef, sub: string): boolean {
    return this.manageSubs()[p.id]?.[sub] ?? true;
  }
  setManageSub(p: PermissionDef, sub: string, value: boolean): void {
    if (this.readOnly()) return;
    this.manageSubs.update(m => ({
      ...m,
      [p.id]: { ...(m[p.id] ?? this.allSubsOn(p)), [sub]: value },
    }));
  }
  private seedManageSubs(): void {
    const subs: Record<string, Record<string, boolean>> = {};
    for (const p of this.permById.values()) {
      if (p.controlType === 'segment' && this.isManageValue(p, this.segValue(p))) {
        subs[p.id] = this.allSubsOn(p);
      }
    }
    this.manageSubs.set(subs);
  }

  /** disabledByKey: a row is disabled when its parent perm is "off" (toggle false / segment first option). */
  isDisabledByParent(p: PermissionDef): boolean {
    if (!p.disabledByKey) return false;
    const parent = this.permById.get(p.disabledByKey);
    if (!parent) return false;
    return parent.controlType === 'toggle'
      ? !this.toggleValue(parent)
      : this.segValue(parent) === this.segOptions(parent)[0];
  }

  // ── Section presets ──────────────────────────────────────────────────────────────
  presetsFor(section: PermissionSection): SectionPreset[] {
    return section.availablePresets ?? SECTION_PRESETS_DEFAULT;
  }

  currentPreset(section: PermissionSection): SectionPreset {
    let noAccess = true;
    let viewOnly = true;
    let fullAccess = true;
    for (const p of section.perms) {
      if (p.controlType === 'toggle') {
        const v = this.toggleValue(p);
        if (v) noAccess = false;
        // View Only = view-tier toggles on, manage-tier off.
        if (v !== (p.accessTier === 'view')) viewOnly = false;
        if (!v) fullAccess = false;
      } else {
        const opts = this.segOptions(p);
        const v = this.segValue(p);
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

  applyPreset(section: PermissionSection, preset: SectionPreset): void {
    if (this.readOnly() || preset === 'custom') return;
    this.caps.update(c => {
      const next = { ...c };
      for (const p of section.perms) {
        if (p.controlType === 'toggle') {
          next[p.id] =
            preset === 'full-access' ? true : preset === 'view-only' ? p.accessTier === 'view' : false;
        } else {
          const opts = this.segOptions(p);
          next[p.id] =
            preset === 'no-access'
              ? opts[0]
              : preset === 'view-only'
                ? opts.includes('View')
                  ? 'View'
                  : opts[0]
                : opts[opts.length - 1];
        }
      }
      return next;
    });
  }

  presetColor(section: PermissionSection): string {
    switch (this.currentPreset(section)) {
      case 'no-access': return 'red';
      case 'view-only': return 'blue';
      case 'full-access': return 'green';
      default: return 'yellow';
    }
  }

  // ── Data Visibility writes ───────────────────────────────────────────────────────
  setTicketScope(v: 'all' | 'assigned'): void {
    if (!this.readOnly()) this.ticketScope.set(v);
  }
  setAssetScope(v: 'all' | 'assigned'): void {
    if (!this.readOnly()) this.assetScope.set(v);
  }
  toggleFilterValue(key: FilterKey, value: string): void {
    if (this.readOnly()) return;
    this.filters.update(f => {
      const cur = f[key];
      const values = cur.values.includes(value)
        ? cur.values.filter(v => v !== value)
        : [...cur.values, value];
      return { ...f, [key]: { ...cur, values } };
    });
  }
  setFilterExclude(key: FilterKey, exclude: boolean): void {
    if (this.readOnly()) return;
    this.filters.update(f => ({ ...f, [key]: { ...f[key], exclude } }));
  }

  // ── Assignments ────────────────────────────────────────────────────────────────
  applyAssignments(userIds: string[], teamIds: string[]): void {
    if (this.readOnly()) return;
    this.assignedUserIds.update(cur => [...new Set([...cur, ...userIds])]);
    this.assignedTeamIds.update(cur => [...new Set([...cur, ...teamIds])]);
  }
  removeUser(id: string): void {
    if (this.readOnly()) return;
    this.assignedUserIds.update(cur => cur.filter(u => u !== id));
  }
  removeTeam(id: string): void {
    if (this.readOnly()) return;
    this.assignedTeamIds.update(cur => cur.filter(t => t !== id));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────────
  save(): void {
    if (this.readOnly()) return;
    const capabilities = {
      ...this.caps(),
      [DV_TICKET_SCOPE]: this.ticketScope(),
      [DV_ASSET_SCOPE]: this.assetScope(),
    };
    this.setsSvc.update(this.setId, {
      name: this.name().trim() || this.name(),
      description: this.description(),
      assignedUserIds: this.assignedUserIds(),
      assignedTeamIds: this.assignedTeamIds(),
      capabilities,
    });
  }
}
