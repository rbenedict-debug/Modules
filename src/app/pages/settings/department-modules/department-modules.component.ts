import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Module, CUSTOM_MODULE_DEFAULTS } from '../../../data/models';
import { ModulesService } from '../../../data/modules.service';

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
        title: 'Available modules',
        modules: [
          ...real.filter(m => !m.active && !pending.has(m.id)),
          this.customTemplate,
        ],
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

  get isCustomRequest(): boolean {
    return this.requestTarget()?.id === 'custom';
  }

  openRequest(module: ModuleCard): void {
    this.customName = '';
    this.requestTarget.set(module);
  }

  closeRequest(): void {
    this.requestTarget.set(null);
  }

  confirmRequest(): void {
    const target = this.requestTarget();
    if (!target) return;

    if (target.id === 'custom') {
      const name = this.customName.trim();
      if (!name) return; // name is required for a custom module
      // Spawn a named pending copy; the requestable Custom card stays in Available.
      this.localPending.update(list => [
        ...list,
        { ...this.customTemplate, id: `pending-custom-${++this.pendingSeq}`, name, pending: true },
      ]);
    } else {
      // Mark the requested catalog module pending so it moves into Active under the overlay.
      this.pendingIds.update(set => new Set(set).add(target.id));
    }

    this.closeRequest();
  }
}
