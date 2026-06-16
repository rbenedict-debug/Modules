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
  // Each card sells activating its module: a short, benefit-led tagline, then a "What's
  // included" list of the capabilities it comes with, written as short phrases. The team
  // modules (Classic, HR, Transportation) include ticketing, reporting/analytics, and
  // workflow automation; IT and Facilities add asset management; the lightweight Custom
  // module includes ticketing only.
  private readonly modules = signal<ModuleInfo[]>([
    // Classic — Onflo's original product and the shared foundation every other module
    // builds on and connects to.
    {
      id: 'classic',
      name: 'Classic',
      icon: 'star',
      accent: 'blue',
      tagline: 'The Onflo service desk your district already runs on, and the foundation every other module is built from.',
      features: [
        'Service desk ticketing',
        'Dashboard analytics',
        'Workflow automation and routing',
      ],
      active: true,
    },
    // IT — Classic's core plus IT asset management, in a space that's just IT's.
    {
      id: 'it',
      name: 'IT',
      icon: 'computer',
      accent: 'purple',
      tagline: "Your IT team gets a service desk of its own, running on the setup you've already done.",
      features: [
        'Service desk ticketing',
        'Dashboard analytics',
        'Workflow automation and routing',
        'Asset management',
      ],
      active: false,
    },
    // HR — Classic, tailored for HR with confidential, restricted-access queues.
    {
      id: 'hr',
      name: 'HR',
      icon: 'groups',
      accent: 'orange',
      tagline: 'A private space for HR, with restricted queues for cases that need to stay confidential.',
      features: [
        'Service desk ticketing',
        'Dashboard analytics',
        'Workflow automation and routing',
      ],
      active: false,
    },
    // Transportation — Classic, tailored to how the transportation team works.
    {
      id: 'transportation',
      name: 'Transportation',
      icon: 'directions_bus',
      accent: 'yellow',
      tagline: 'A space built around how your transportation team works, ready to go with the data you already have.',
      features: [
        'Service desk ticketing',
        'Dashboard analytics',
        'Workflow automation and routing',
      ],
      active: true,
    },
    // Facilities — Classic's core plus asset management for buildings, equipment, and grounds.
    {
      id: 'facilities',
      name: 'Facilities',
      icon: 'apartment',
      accent: 'teal',
      tagline: 'A service desk for your facilities team, with asset and maintenance tracking built in.',
      features: [
        'Service desk ticketing',
        'Dashboard analytics',
        'Workflow automation and routing',
        'Asset management',
      ],
      active: false,
    },
    // Requestable "Custom module" — always stays in Available. Requesting it spawns a named
    // pending copy (see confirmRequest). Kept intentionally light so the prebuilt modules
    // stay the default; it includes ticketing only.
    {
      id: 'custom',
      name: 'Custom module',
      icon: 'settings',
      accent: 'grey',
      tagline: "For the occasional need the prebuilt modules don't cover, you can add a custom one of your own. It's intentionally lightweight, with ticketing only, so the prebuilt modules stay your first choice whenever one fits what your team does.",
      features: [
        'Service desk ticketing',
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
      tagline: "For the occasional need the prebuilt modules don't cover, you can add a custom one of your own. It's intentionally lightweight, with ticketing only, so the prebuilt modules stay your first choice whenever one fits what your team does.",
      features: [
        'Service desk ticketing',
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
