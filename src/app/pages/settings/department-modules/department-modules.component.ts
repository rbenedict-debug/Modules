import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ModuleInfo {
  id: string;
  name: string;
  icon: string;          // Material Symbol name
  accent: 'blue' | 'green' | 'grey' | 'navy' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'; // icon + surface accent pair ('grey' = neutral tile)
  tagline: string;       // one-line summary of the module
  features: string[];    // what's included — rendered as a checklist
  active: boolean;       // true = owned/active; false = available (requestable)
  pending?: boolean;     // requested and awaiting review — shown in Active under a full-card overlay
}

interface ModuleSection {
  title: string;
  modules: ModuleInfo[];
}

@Component({
  selector: 'app-department-modules',
  imports: [FormsModule],
  templateUrl: './department-modules.component.html',
  styleUrl: './department-modules.component.scss',
  host: { class: 'ds-page-content', role: 'main' }
})
export class DepartmentModulesComponent {
  // All cards live in one reactive list so confirming a request can flip a module to
  // pending — moving it into Active under the "Under review" overlay. Section membership
  // is derived (see `sections`), not stored.
  //
  // Card copy follows one pattern so each card sells activating it: a benefit-led tagline
  // (the team's own focused space), then features covering the module's own tools, the
  // classic core it's built on, reuse of your existing integrations/SIS data, and tickets
  // flowing to/from other teams. Classic frames as the shared foundation; Custom stays light.
  private readonly modules = signal<ModuleInfo[]>([
    // Classic — Onflo's original product and the shared foundation every other module
    // builds on and connects to.
    {
      id: 'classic',
      name: 'Classic',
      icon: 'star',
      accent: 'blue',
      tagline: 'The classic Onflo service desk your district runs on — the foundation every other module builds on and connects to.',
      features: [
        'Ticketing and service-desk queues',
        'Workflow automation',
        'Landing pages and request forms',
        'Contact and user management',
        'Reporting and analytics',
        'The shared home for your integrations and SIS data — every module builds on it',
      ],
      active: true,
    },
    // IT — Classic's core plus IT asset management, in a space that's just IT's.
    {
      id: 'it',
      name: 'IT',
      icon: 'computer',
      accent: 'purple',
      tagline: "Give your IT team a service desk that's all their own — without rebuilding what you've already set up.",
      features: [
        'IT asset and inventory management',
        'Device provisioning and lifecycle tracking',
        'The full classic Onflo service desk — ticketing, workflows, and landing pages',
        "Shares the integrations and SIS data you've already uploaded — nothing to redo",
        'Tickets pass seamlessly to and from your other teams',
      ],
      active: false,
    },
    // HR — Classic, tailored for HR with confidential, restricted-access queues.
    {
      id: 'hr',
      name: 'HR',
      icon: 'groups',
      accent: 'orange',
      tagline: "Give HR a private, focused space of its own — without rebuilding what you've already set up.",
      features: [
        'The full classic Onflo service desk — ticketing, workflows, and landing pages',
        'Confidential, restricted-access queues for sensitive cases',
        "Reporting and analytics for HR's work alone",
        "Shares the integrations and SIS data you've already uploaded — nothing to redo",
        'Tickets pass seamlessly to and from your other teams',
      ],
      active: false,
    },
    // Transportation — Classic, tailored to how the transportation team works.
    {
      id: 'transportation',
      name: 'Transportation',
      icon: 'directions_bus',
      accent: 'yellow',
      tagline: "Give your transportation team a focused space of its own — up and running on the data you've already set up.",
      features: [
        'The full classic Onflo service desk — ticketing, workflows, and landing pages',
        'Queues and request forms tuned to how transportation works',
        "Reporting and analytics for your team's work alone",
        "Shares the integrations and SIS data you've already uploaded — nothing to redo",
        'Tickets pass seamlessly to and from your other teams',
      ],
      active: true,
    },
    // Facilities — Classic's core plus asset management for buildings, equipment, and grounds.
    {
      id: 'facilities',
      name: 'Facilities',
      icon: 'apartment',
      accent: 'teal',
      tagline: "Give your facilities team a service desk that's all their own — without rebuilding what you've already set up.",
      features: [
        'Facilities asset and equipment tracking',
        'Preventive maintenance scheduling',
        'The full classic Onflo service desk — ticketing, workflows, and landing pages',
        "Shares the integrations and SIS data you've already uploaded — nothing to redo",
        'Tickets pass seamlessly to and from your other teams',
      ],
      active: false,
    },
    // Requestable "Custom module" — always stays in Available. Requesting it spawns a named
    // pending copy (see confirmRequest). Kept intentionally light so the prebuilt modules
    // stay the default, but it still plugs into the same shared foundation.
    {
      id: 'custom',
      name: 'Custom module',
      icon: 'settings',
      accent: 'grey',
      tagline: "A lighter, build-your-own space for the occasional need a prebuilt module doesn't cover.",
      features: [
        'Basic ticketing and a simple workflow',
        'A landing page and request form',
        'Plugs into the same integrations and SIS data — nothing to redo',
        'Tickets still pass to and from your other teams',
      ],
      active: false,
    },
    // Pre-existing pending example — a custom module already awaiting review. Sits in
    // Active under the "Under review" overlay.
    {
      id: 'pending-custom',
      name: 'Custom module',
      icon: 'settings',
      accent: 'grey',
      tagline: "A lighter, build-your-own space for the occasional need a prebuilt module doesn't cover.",
      features: [
        'Basic ticketing and a simple workflow',
        'A landing page and request form',
        'Plugs into the same integrations and SIS data — nothing to redo',
        'Tickets still pass to and from your other teams',
      ],
      active: false,
      pending: true,
    },
  ]);

  // Active = owned or pending (pending shows the review overlay); Available = the rest.
  // Order within each section follows the list order above.
  readonly sections = computed<ModuleSection[]>(() => {
    const all = this.modules();
    return [
      { title: 'Active modules',    modules: all.filter(m => m.active || m.pending) },
      { title: 'Available modules', modules: all.filter(m => !m.active && !m.pending) },
    ];
  });

  // ── Request flow ───────────────────────────────────────────────────────────
  // The module whose request dialog is open (null = no dialog). The Custom module adds
  // a required name field; every other module is a straight confirmation.
  readonly requestTarget = signal<ModuleInfo | null>(null);
  // Two-way bound to the name field in the Custom module dialog.
  customName = '';
  // Keeps each requested custom module's id unique.
  private pendingSeq = 0;

  get isCustomRequest(): boolean {
    return this.requestTarget()?.id === 'custom';
  }

  openRequest(module: ModuleInfo): void {
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
      const requested: ModuleInfo = {
        ...target,
        id: `pending-custom-${++this.pendingSeq}`,
        name,
        active: false,
        pending: true,
      };
      this.modules.update(list => [...list, requested]);
    } else {
      // Flip the requested module to pending so it moves into Active under the overlay.
      this.modules.update(list =>
        list.map(m => (m.id === target.id ? { ...m, pending: true } : m)),
      );
    }

    this.closeRequest();
  }
}
