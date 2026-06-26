import { TestBed } from '@angular/core/testing';
import { ScenarioService } from './scenario.service';
import { UsersService } from './users.service';
import { TeamsService } from './teams.service';
import { PermissionSetsService } from './permission-sets.service';
import { ModulesService } from './modules.service';
import { CustomFieldsService } from './custom-fields.service';
import { PersonaService } from './persona.service';

describe('ScenarioService — first-time global admin (fresh-it-setup) world', () => {
  let scenario: ScenarioService;
  let users: UsersService;
  let teams: TeamsService;
  let sets: PermissionSetsService;
  let modules: ModulesService;
  let customFields: CustomFieldsService;
  let persona: PersonaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    scenario = TestBed.inject(ScenarioService);
    users = TestBed.inject(UsersService);
    teams = TestBed.inject(TeamsService);
    sets = TestBed.inject(PermissionSetsService);
    modules = TestBed.inject(ModulesService);
    customFields = TestBed.inject(CustomFieldsService);
    persona = TestBed.inject(PersonaService);
  });

  it('boots into the fully-configured district (Scarlett) with no swap', () => {
    expect(persona.current().id).toBe('scarlett');
    expect(users.users().length).toBeGreaterThan(20);
    expect(teams.teams().length).toBeGreaterThan(0);
    expect(modules.modules().some((m) => m.id === 'music')).toBe(true);
    expect(customFields.defs().length).toBe(3);
  });

  it('loads a fresh, AD-synced, unconfigured world when Priya is selected', () => {
    scenario.selectPersona('priya');

    // Persona switched and is a global admin scoped to IT only.
    expect(persona.current().id).toBe('priya');
    expect(persona.current().isGlobalAdmin).toBe(true);
    expect(persona.current().moduleAccess.map((a) => a.moduleId)).toEqual(['it']);

    const all = users.users();
    expect(all.length).toBeGreaterThan(0);

    // Every agent synced from Active Directory — no manual entries.
    expect(all.every((u) => u.source === 'Active Directory')).toBe(true);

    // Only the founding admin (Priya) holds a permission set — Global Admin.
    const priya = all.find((u) => u.firstName === 'Priya');
    expect(priya?.permissionSetByModule).toEqual({ it: 'ps-sysadmin' });
    const others = all.filter((u) => u.firstName !== 'Priya');
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((u) => Object.keys(u.permissionSetByModule).length === 0)).toBe(true);

    // Nobody is on a team and nobody has custom-field values yet.
    expect(all.every((u) => u.teams.length === 0)).toBe(true);
    expect(all.every((u) => !u.customFields || Object.keys(u.customFields).length === 0)).toBe(true);

    // No teams exist; only the built-in System permission sets (no custom sets); no custom-field defs.
    expect(teams.teams()).toEqual([]);
    expect(sets.sets().every((s) => s.type === 'System')).toBe(true);
    expect(sets.sets().some((s) => s.id === 'ps-sysadmin')).toBe(true);
    expect(customFields.defs()).toEqual([]);

    // Only the IT module is active, and no custom ('Music') module has been created yet.
    const mods = modules.modules();
    expect(mods.find((m) => m.id === 'it')?.active).toBe(true);
    expect(mods.filter((m) => m.active).map((m) => m.id)).toEqual(['it']);
    expect(mods.some((m) => m.id === 'music')).toBe(false);
  });

  it('restores the default world when switching back to a normal persona', () => {
    scenario.selectPersona('priya');
    scenario.selectPersona('scarlett');

    expect(persona.current().id).toBe('scarlett');
    expect(users.users().length).toBeGreaterThan(20);
    expect(teams.teams().length).toBeGreaterThan(0);
    expect(sets.sets().some((s) => s.type === 'Custom')).toBe(true);
    expect(modules.modules().some((m) => m.id === 'music')).toBe(true);
    expect(modules.modules().find((m) => m.id === 'classic')?.active).toBe(true);
    expect(customFields.defs().length).toBe(3);
  });
});
