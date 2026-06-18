import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Module, ModuleColor, CUSTOM_MODULE_DEFAULTS } from '../../../data/models';
import { ModulesService } from '../../../data/modules.service';
import { MessagingService } from '../../../data/messaging.service';

// A rendered card is a catalog Module (single source of truth = ModulesService) plus the
// transient request state this page layers on top. `pending` is page UI state, not catalog data.
type ModuleCard = Module & { pending?: boolean };

interface ModuleSection {
  title: string;
  modules: ModuleCard[];
}

@Component({
  selector: 'app-department-modules',
  imports: [FormsModule],
  templateUrl: './department-modules.component.html',
  styleUrl: './department-modules.component.scss',
  host: { class: 'ds-page-content', role: 'main' }
})
export class DepartmentModulesComponent {
  // Single source of truth for every real module's identity + catalog copy. Adding a module here
  // makes it appear both in this page and in the top-nav switcher — they can no longer drift.
  private readonly modulesSvc = inject(ModulesService);

  // The requestable "Custom module" card is a request CTA, not a real catalog module, so it stays
  // local and never reaches the switcher. Requesting it spawns a named pending copy (confirmRequest).
  private readonly customTemplate: ModuleCard = {
    id: 'custom',
    name: 'Custom module',
    ticketCount: 0,
    active: false,
    ...CUSTOM_MODULE_DEFAULTS,
  };

  // Pending requests awaiting review — page UI state layered over the catalog, shown in Active
  // under the "Under review" overlay. Seeded with one example; requesting a real module below adds
  // its id to `pendingIds`; requesting the custom card appends a named copy here.
  private readonly localPending = signal<ModuleCard[]>([
    { ...this.customTemplate, id: 'pending-custom', pending: true },
  ]);
  private readonly pendingIds = signal<ReadonlySet<string>>(new Set<string>());

  // Active = owned (catalog `active`) or pending; Available = the rest + the custom-request card.
  // Every real module's identity (name, icon, accent, copy) comes from ModulesService — never
  // duplicated here — so the cards always match the switcher.
  readonly sections = computed<ModuleSection[]>(() => {
    const real = this.modulesSvc.modules();
    const pending = this.pendingIds();
    const localPend = this.localPending();
    return [
      {
        title: 'Active modules',
        modules: [
          ...real.filter(m => m.active || pending.has(m.id)).map(m => ({ ...m, pending: pending.has(m.id) })),
          ...localPend,
        ],
      },
      {
        // Released prebuilt modules the account hasn't added yet, plus the custom-request card.
        title: 'Available modules',
        modules: [
          ...real.filter(m => !m.active && !pending.has(m.id) && !m.comingSoon),
          this.customTemplate,
        ],
      },
      {
        // Prebuilt modules not yet released — shown as a preview, not requestable.
        title: 'Coming soon',
        modules: real.filter(m => !m.active && !pending.has(m.id) && m.comingSoon),
      },
    ];
  });

  // ── Request flow ───────────────────────────────────────────────────────────
  // The module whose request dialog is open (null = no dialog). The Custom module adds a required
  // name field; every other module is a straight confirmation.
  readonly requestTarget = signal<ModuleCard | null>(null);
  // Two-way bound to the name field in the Custom module dialog.
  customName = '';
  // Keeps each requested custom module's id unique.
  private pendingSeq = 0;

  // ── Custom module appearance picker ──────────────────────────────────────────
  // Beyond its name, a custom module's identity is a chosen icon + color, picked in the request
  // dialog from the preset libraries below. They reset to the first option of each list whenever
  // the dialog opens (openRequest), so a selection is always present and the live preview always
  // renders; confirmRequest carries the choices onto the spawned card + switcher. (The reusable
  // Custom request card itself stays generic grey + gear — see CUSTOM_MODULE_DEFAULTS.)
  selectedIcon = 'school';
  selectedColor: ModuleColor = 'blue';

  /** Preset filled-icon library — a curated set of Material Symbols for the K12 district
   *  departments that run a service desk: weighted toward IT, then operations/facilities,
   *  business/admin, student services, and the common student-facing programs. Audited against a
   *  reference department list for coverage (added Purchasing, Records, Special Education). Labels
   *  caption each option for screen readers. */
  readonly iconOptions: ReadonlyArray<{ name: string; label: string }> = [
    { name: 'school', label: 'School' },
    // IT / Technology — the heaviest service-desk users in a district.
    { name: 'computer', label: 'Technology' },
    { name: 'support_agent', label: 'Help Desk' },
    { name: 'devices', label: 'Devices' },
    { name: 'wifi', label: 'Network' },
    { name: 'print', label: 'Printing' },
    { name: 'cast', label: 'AV Support' },
    { name: 'vpn_key', label: 'Accounts & Access' },
    // Operations / facilities.
    { name: 'apartment', label: 'Facilities' },
    { name: 'build', label: 'Maintenance' },
    { name: 'cleaning_services', label: 'Custodial' },
    { name: 'directions_bus', label: 'Transportation' },
    { name: 'inventory_2', label: 'Warehouse' },
    { name: 'engineering', label: 'Operations' },
    // Business / administration.
    { name: 'groups', label: 'Human Resources' },
    { name: 'account_balance', label: 'Business Office' },
    { name: 'payments', label: 'Payroll' },
    { name: 'shopping_cart', label: 'Purchasing' },
    { name: 'description', label: 'Records' },
    { name: 'campaign', label: 'Communications' },
    { name: 'security', label: 'Safety & Security' },
    // Student services / health.
    { name: 'medical_services', label: 'Health Services' },
    { name: 'psychology', label: 'Counseling' },
    { name: 'accessible', label: 'Special Education' },
    // Academics / programs.
    { name: 'menu_book', label: 'Curriculum' },
    { name: 'local_library', label: 'Library' },
    { name: 'restaurant', label: 'Food Services' },
    { name: 'sports_basketball', label: 'Athletics' },
    { name: 'music_note', label: 'Music' },
    { name: 'translate', label: 'Multilingual' },
  ];

  /** Preset color library — the 9 design-system accents + the 6 K12 colors (see ModuleColor),
   *  ordered by hue for a natural swatch row. */
  readonly colorOptions: ReadonlyArray<{ key: ModuleColor; label: string }> = [
    { key: 'blue', label: 'Blue' },
    { key: 'sky', label: 'Sky' },
    { key: 'cyan', label: 'Cyan' },
    { key: 'teal', label: 'Teal' },
    { key: 'mint', label: 'Mint' },
    { key: 'green', label: 'Green' },
    { key: 'lime', label: 'Lime' },
    { key: 'yellow', label: 'Yellow' },
    { key: 'gold', label: 'Gold' },
    { key: 'orange', label: 'Orange' },
    { key: 'coral', label: 'Coral' },
    { key: 'red', label: 'Red' },
    { key: 'maroon', label: 'Maroon' },
    { key: 'pink', label: 'Pink' },
    { key: 'magenta', label: 'Magenta' },
    { key: 'purple', label: 'Purple' },
    { key: 'indigo', label: 'Indigo' },
    { key: 'navy', label: 'Navy' },
    { key: 'slate', label: 'Slate' },
    { key: 'clay', label: 'Clay' },
  ];

  // Which appearance picker is open in the dialog (null = both closed). These are custom popovers
  // rather than ds-select, since each trigger shows a glyph / color dot (not text). Selecting sets
  // the value and closes; outside-click (onDialogClick) and Escape also close.
  readonly openPicker = signal<'icon' | 'color' | null>(null);

  togglePicker(which: 'icon' | 'color'): void {
    this.openPicker.update(cur => (cur === which ? null : which));
  }
  pickIcon(name: string): void {
    this.selectedIcon = name;
    this.openPicker.set(null);
  }
  pickColor(key: ModuleColor): void {
    this.selectedColor = key;
    this.openPicker.set(null);
  }

  /** The dialog stops click propagation so inner clicks never reach the backdrop's close handler;
   *  piggyback on that to also close an open picker when clicking elsewhere inside the dialog. */
  onDialogClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.openPicker() && !(event.target as HTMLElement).closest('.modules__picker')) {
      this.openPicker.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  closePickerOnEscape(): void {
    if (this.openPicker()) this.openPicker.set(null);
  }

  // Async submit state for the request dialog: mock ~600ms latency behind a button loading
  // state, an in-dialog error alert on (simulated) failure, and a success toast on submit.
  private readonly msg = inject(MessagingService);
  readonly submitting = signal(false);
  readonly requestError = signal<string | null>(null);

  get isCustomRequest(): boolean {
    return this.requestTarget()?.id === 'custom';
  }

  /** Custom-module name validation: a name can't duplicate any existing module — prebuilt/catalog
   *  (Classic, Transportation, …) or an already-requested custom (e.g. a second "Music"). Matched
   *  case-insensitively and trimmed. Returns the error message, or null when valid. An empty name
   *  isn't an error here — that's handled by the required-field disable on Send. */
  get nameError(): string | null {
    const name = this.customName.trim();
    if (!name) return null;
    const taken = new Set<string>([
      ...this.modulesSvc.modules().map(m => m.name.trim().toLowerCase()),
      ...this.localPending().map(m => m.name.trim().toLowerCase()),
    ]);
    return taken.has(name.toLowerCase())
      ? `A module named “${name}” already exists. Choose a different name.`
      : null;
  }

  openRequest(module: ModuleCard): void {
    this.customName = '';
    // Reset the appearance picker to its defaults (the Custom request card itself stays grey + gear).
    this.selectedIcon = this.iconOptions[0].name;
    this.selectedColor = this.colorOptions[0].key;
    this.openPicker.set(null);
    this.requestError.set(null);
    this.requestTarget.set(module);
  }

  closeRequest(): void {
    this.requestTarget.set(null);
    this.requestError.set(null);
    this.openPicker.set(null);
  }

  confirmRequest(event?: MouseEvent): void {
    const target = this.requestTarget();
    if (!target) return;
    // Name is required for a custom module, and must be unique (no dupe of a prebuilt or existing custom).
    if (target.id === 'custom' && (!this.customName.trim() || this.nameError !== null)) return;

    // Mock submit: ~600ms latency behind a button loading state. Hold Shift while clicking
    // Send request to simulate a backend failure (mock submits otherwise always succeed).
    const simulateFailure = event?.shiftKey ?? false;
    this.requestError.set(null);
    this.submitting.set(true);

    setTimeout(() => {
      if (this.requestTarget() !== target) { this.submitting.set(false); return; } // dialog closed mid-submit
      this.submitting.set(false);

      if (simulateFailure) {
        // In-dialog failure: the alert sits at the top of the dialog body, which stays open;
        // Send request doubles as the retry (clicking it again clears the alert and re-submits).
        this.requestError.set("Couldn't send your request. Please try again.");
        return;
      }

      const name = target.id === 'custom' ? this.customName.trim() : target.name;
      this.applyRequest(target);
      this.closeRequest();
      this.msg.success(`Request submitted for "${name}".`);
    }, 600);
  }

  /** Commit the request to local page state (custom = named pending copy; real = pending id). */
  private applyRequest(target: ModuleCard): void {
    if (target.id === 'custom') {
      // Spawn a named pending copy carrying the chosen icon + color; the requestable Custom card
      // stays in Available. The choices render on the new card and (once active) in the switcher.
      this.localPending.update(list => [
        ...list,
        { ...this.customTemplate, id: `pending-custom-${++this.pendingSeq}`, name: this.customName.trim(),
          icon: this.selectedIcon, color: this.selectedColor, pending: true },
      ]);
    } else {
      // Mark the requested catalog module pending so it moves into Active under the overlay.
      this.pendingIds.update(set => new Set(set).add(target.id));
    }
  }
}
