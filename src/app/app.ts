import { Component, AfterViewInit, ElementRef, OnDestroy, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs';
import { ModuleSwitcherComponent } from './components/module-switcher/module-switcher.component';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { SnackbarHostComponent } from './components/snackbar-host/snackbar-host.component';
import { ModuleContextService } from './data/module-context.service';
import { PersonaService } from './data/persona.service';
import { ChromeService } from './data/chrome.service';
import { OpenAgentTabsService } from './data/open-agent-tabs.service';
import { UsersService } from './data/users.service';
import { fullName } from './data/models';

type NavSection = 'tickets' | 'assets' | 'users' | 'analytics' | 'settings';

interface SettingsItem {
  id: string;
  label: string;
  section: string;
  isSubheader?: boolean;
  subheaderParent?: string;
}

/** Routed Settings pages reachable only in the Global context. (Agent Management also lives in the
 *  Global section, but it's reachable by any admin — global or department — so it's NOT listed.) */
const GLOBAL_ONLY_SETTINGS_PAGES = new Set(['department-modules']);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModuleSwitcherComponent, CommandPaletteComponent, SnackbarHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, OnDestroy {
  // Public so app.html can gate Analytics/Settings nav on the current module role.
  readonly moduleCtx = inject(ModuleContextService);
  // The active persona drives the shell; the top-nav avatar shows its initials.
  readonly persona = inject(PersonaService);
  // Shell chrome state. subNavOpen lives here so full-area takeover views (the permission-set
  // editor) can auto-collapse the drawer across the router-outlet boundary; see the proxy below.
  private readonly chrome = inject(ChromeService);
  // Open agent profile tabs (the browser-style top-nav document tabs). The service owns the ordered
  // set of open agents; this shell renders the strip and derives the active tab from the URL.
  private readonly tabs = inject(OpenAgentTabsService);
  private readonly usersSvc = inject(UsersService);

  /** Initials of the active persona, for the top-nav avatar. */
  get personaInitials(): string {
    const parts = this.persona.current().name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }

  // Proxies the shared ChromeService signal, so existing template bindings and the
  // ds-nav-expand toggle keep working unchanged while the editor can drive it too.
  get subNavOpen(): boolean { return this.chrome.subNavOpen(); }
  set subNavOpen(value: boolean) { this.chrome.subNavOpen.set(value); }

  /** Contextual save bar config from the shared chrome service (null = hidden). The shell renders
   *  it at the bottom of the content area, outside the routed page. */
  get saveBar() { return this.chrome.saveBar(); }
  activeNav: NavSection = 'tickets';

  // ── Top-nav tabs ─────────────────────────────────────────────────────────────
  // The strip = one section tab (relabels per sidebar section, closeable) + one tab per open agent
  // profile. `activeAgentId` is the agent currently being viewed (from the URL) — null on a section
  // page, where the section tab is the active one. `sectionTabClosed` hides the section tab after the
  // user closes it; it reappears when they navigate to a section via the sidebar/subnav.
  readonly activeAgentId = signal<string | null>(null);
  readonly sectionTabClosed = signal(false);

  /** Open agent tabs resolved to {id, name}. Reads UsersService so an edited name updates its tab. */
  readonly agentTabs = computed(() =>
    this.tabs.ids().map((id) => {
      const u = this.usersSvc.users().find((x) => x.id === id);
      return { id, name: u ? fullName(u) : 'Agent' };
    }),
  );

  // Overflow — agent tabs that don't fit the strip width collapse into the DS "…" tab.
  @ViewChild('tabStrip') private tabStrip?: ElementRef<HTMLElement>;
  @ViewChild('overflowTrigger') private overflowTrigger?: ElementRef<HTMLElement>;
  private _tabResizeObserver?: ResizeObserver;
  /** Agent ids currently collapsed into the "…" overflow tab. */
  readonly hiddenAgentIds = signal<string[]>([]);
  /** The "…" overflow panel: open state + fixed position (computed from the trigger on open). */
  readonly overflowPanelOpen = signal(false);
  readonly overflowPanelTop = signal(0);
  readonly overflowPanelRight = signal(0);
  /** Left offset (px, within the strip) where the "…" tab sits — right after the last visible tab. */
  readonly moreTabLeft = signal(0);
  /** The collapsed agent tabs, listed in the overflow panel. */
  readonly overflowTabs = computed(() => {
    const hidden = new Set(this.hiddenAgentIds());
    return this.agentTabs().filter((t) => hidden.has(t.id));
  });

  private _scrollCleanup: (() => void) | null = null;
  private _routerSub: Subscription;

  constructor(private readonly router: Router) {
    // Pre-boot script in index.html already applied the saved theme to <html>
    this.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    this._syncNavFromUrl(router.url);
    this._syncSettingsFromUrl(router.url);
    this._reconcileSettingsPage();
    this._routerSub = router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(e => {
      this._syncNavFromUrl((e as NavigationEnd).urlAfterRedirects);
      this._syncSettingsFromUrl((e as NavigationEnd).urlAfterRedirects);
      this._reconcileSettingsPage();
      if (this.activeNav === 'settings') setTimeout(() => this._setupSettingsScrollbar(), 0);
      setTimeout(() => this.recomputeTabOverflow(), 0);
    });

    // ModuleContextService.select() only flips a signal — no router event fires — so the
    // URL-driven redirects won't run when the switcher changes the context. Read the context
    // signals directly so this re-runs on every switch, then: bounce to Tickets if you're on a
    // nav section the new context hides (an agent on Settings/Analytics, or a module without
    // Assets/Analytics), or swap the open Settings page to/from the blank placeholder when you
    // cross the Global boundary. The router sync keeps activeNav current and both targets are
    // stable, so there's no redirect loop.
    effect(() => {
      this.moduleCtx.visibleCapabilities();
      this.moduleCtx.isAgentRole();
      this.moduleCtx.isGlobal();
      if (!this.navVisible(this.activeNav)) {
        this.router.navigate(['tickets']);
        return;
      }
      this._reconcileSettingsPage();
    });

    // Recompute tab overflow when the open-tab set / section tab / active tab changes (deferred so
    // the DOM reflects the new tabs first). Width changes are handled by the ResizeObserver.
    effect(() => {
      this.agentTabs();
      this.sectionTabClosed();
      this.activeAgentId();
      setTimeout(() => this.recomputeTabOverflow(), 0);
    });
  }

  /**
   * Whether a top-level nav section is reachable in the current module context. Drives both the
   * sidebar `@if` gates and the redirect that bounces you off a section the active module hides
   * (e.g. switching into Classic while on Assets). Tickets/Users are always available — Tickets is
   * the safe fallback. Assets needs the module's Asset-management capability; Analytics needs
   * Dashboard analytics and is hidden for agents; Settings is hidden for agents.
   */
  navVisible(section: NavSection): boolean {
    switch (section) {
      case 'assets':    return this.moduleCtx.hasAssets();
      case 'analytics': return !this.moduleCtx.isAgentRole() && this.moduleCtx.hasAnalytics();
      case 'settings':  return !this.moduleCtx.isAgentRole();
      default:          return true; // tickets, users
    }
  }

  private _syncNavFromUrl(url: string): void {
    const segment = url.split('/')[1]?.split('?')[0];
    const valid: NavSection[] = ['tickets', 'assets', 'users', 'analytics', 'settings'];
    let next: NavSection;
    if (!segment) {
      next = 'tickets';
    } else {
      next = valid.includes(segment as NavSection) ? (segment as NavSection) : 'tickets';
    }
    // Sections the active module hides (Assets without asset mgmt, Analytics/Settings for agents)
    // bounce to Tickets.
    if (!this.navVisible(next)) {
      this.activeNav = 'tickets';
      this.router.navigate(['tickets']);
      return;
    }
    this.activeNav = next;

    // Which agent profile (if any) is being viewed — drives the active top-nav tab. The profile
    // route is /settings/agent-management/:id; the bare list and other settings pages have no id.
    const segs = url.split('?')[0].split('/').filter(Boolean);
    this.activeAgentId.set(
      segs[0] === 'settings' && segs[1] === 'agent-management' && segs[2] ? segs[2] : null,
    );
  }

  ngAfterViewInit(): void {
    if (this.activeNav === 'settings') setTimeout(() => this._setupSettingsScrollbar(), 0);
    // Recompute tab overflow whenever the strip's width changes.
    const strip = this.tabStrip?.nativeElement;
    if (strip && typeof ResizeObserver !== 'undefined') {
      this._tabResizeObserver = new ResizeObserver(() => this.recomputeTabOverflow());
      this._tabResizeObserver.observe(strip);
    }
    setTimeout(() => this.recomputeTabOverflow(), 0);
  }

  ngOnDestroy(): void {
    this._scrollCleanup?.();
    this._routerSub.unsubscribe();
    this._tabResizeObserver?.disconnect();
  }

  setNav(section: NavSection): void {
    // A section the active module hides → go to Tickets instead.
    if (!this.navVisible(section)) {
      section = 'tickets';
    }
    this.subNavOpen = true;
    this.sectionTabClosed.set(false); // a sidebar section click always (re)shows its tab
    this.router.navigate([section]);
  }

  /** Navigate to a routed settings sub-page, e.g. /settings/department-modules. */
  goSettings(id: string): void {
    this.sectionTabClosed.set(false); // navigating to a settings page (re)shows the section tab
    this.router.navigate(['/settings', id]);
  }

  // ── Top-nav tab actions ──────────────────────────────────────────────────────
  /** Activate the section tab — return to the current section's page (the Agents list in Settings). */
  onSectionTabClick(): void {
    if (this.activeNav === 'settings') {
      this.router.navigate(['/settings', this.settingsNavItem]);
    } else {
      this.router.navigate([this.activeNav]);
    }
  }

  /** Activate an agent tab — open that agent's profile. */
  onAgentTabClick(id: string): void {
    this.router.navigate(['/settings/agent-management', id]);
  }

  /** Close the section tab. If it was the active view, move to an agent tab (or the Inbox home if
   *  none); closing it while viewing an agent just hides it and you stay on the agent. */
  onSectionTabClose(event: Event): void {
    event.stopPropagation();
    const wasActive = this.activeAgentId() === null;
    this.sectionTabClosed.set(true);
    if (!wasActive) return;
    const open = this.tabs.ids();
    if (open.length > 0) {
      this.router.navigate(['/settings/agent-management', open[0]]);
    } else {
      this._goInbox();
    }
  }

  /** Close an agent tab. Closing the active one lands you on its neighbour; closing the very last
   *  tab returns to the Inbox home (matching prod). Closing a background tab leaves you in place. */
  onAgentTabClose(id: string, event: Event): void {
    event.stopPropagation();
    const open = this.tabs.ids();
    const idx = open.indexOf(id);
    const wasActive = this.activeAgentId() === id;
    this.tabs.close(id);
    if (!wasActive) return;
    const remaining = this.tabs.ids();
    if (remaining.length > 0) {
      // The tab that shifted into this slot, else the previous one.
      const next = remaining[idx] ?? remaining[idx - 1];
      this.router.navigate(['/settings/agent-management', next]);
    } else if (!this.sectionTabClosed()) {
      this.onSectionTabClick();
    } else {
      this._goInbox();
    }
  }

  /** The Inbox home — the fallback when every tab is closed (Tickets is the always-available safe
   *  section). Restores the section tab. */
  private _goInbox(): void {
    this.sectionTabClosed.set(false);
    this.subNavOpen = true;
    this.router.navigate(['tickets']);
  }

  // ── Tab overflow ("…" collapse) ──────────────────────────────────────────────
  /**
   * Collapse agent tabs that don't fit the strip width into the "…" overflow tab. Collapsed tabs
   * stay in the DOM with `visibility: hidden` (boxes preserved) so this measurement stays stable —
   * never `display: none`, which would zero their width and oscillate.
   */
  private recomputeTabOverflow(): void {
    const strip = this.tabStrip?.nativeElement;
    if (!strip) return;
    const agentEls = Array.from(strip.querySelectorAll<HTMLElement>('.ds-nav-tab--agent'));
    let hidden: string[] = [];
    if (agentEls.length > 0) {
      const stripWidth = strip.clientWidth;
      const last = agentEls[agentEls.length - 1];
      const fitsAll = last.offsetLeft + last.offsetWidth <= stripWidth;
      if (!fitsAll) {
        const MORE_WIDTH = 52; // room reserved for the "…" tab (estimate; tune if it overlaps)
        const limit = stripWidth - MORE_WIDTH;
        for (const el of agentEls) {
          const id = el.dataset['tabId'];
          if (id && el.offsetLeft + el.offsetWidth > limit) {
            // The first collapsed tab's left edge = the right edge of the last visible tab, so the
            // "…" tab tucks right after it (no gap to the strip's right edge).
            if (hidden.length === 0) this.moreTabLeft.set(Math.round(el.offsetLeft));
            hidden.push(id);
          }
        }
      }
    }
    const cur = this.hiddenAgentIds();
    if (cur.length !== hidden.length || hidden.some((id, i) => id !== cur[i])) {
      this.hiddenAgentIds.set(hidden);
    }
    if (hidden.length === 0 && this.overflowPanelOpen()) this.overflowPanelOpen.set(false);
  }

  /** Toggle the "…" overflow panel, anchoring it (fixed) under the trigger. */
  toggleOverflowPanel(): void {
    if (!this.overflowPanelOpen()) {
      const r = this.overflowTrigger?.nativeElement.getBoundingClientRect();
      if (r) {
        this.overflowPanelTop.set(Math.round(r.bottom + 4));
        this.overflowPanelRight.set(Math.round(window.innerWidth - r.right));
      }
    }
    this.overflowPanelOpen.update((v) => !v);
  }

  /** "Close all tabs" — clears every open agent tab and returns to the Inbox home (prod behavior). */
  closeAllTabs(): void {
    this.tabs.closeAll();
    this.overflowPanelOpen.set(false);
    this._goInbox();
  }

  /** Keep the highlighted settings item in sync with the URL (mirrors _syncNavFromUrl). */
  private _syncSettingsFromUrl(url: string): void {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    if (segments[0] === 'settings' && segments[1]) {
      this.settingsNavItem = segments[1];
    }
  }

  /**
   * Keep the open Settings page consistent with the context. The Global pages (Department Modules /
   * Agent Management) require the Global context; scoped into a module the content area shows the
   * blank placeholder instead, and returning to Global restores the Department Modules default.
   * No-op unless Settings is the active section.
   */
  private _reconcileSettingsPage(): void {
    if (this.activeNav !== 'settings') return;
    if (!this.moduleCtx.isGlobal() && GLOBAL_ONLY_SETTINGS_PAGES.has(this.settingsNavItem)) {
      this.router.navigate(['settings', 'blank']);
    } else if (this.moduleCtx.isGlobal() && this.settingsNavItem === 'blank') {
      this.router.navigate(['settings', 'department-modules']);
    }
  }

  get activeNavLabel(): string {
    const labels: Record<NavSection, string> = {
      tickets: 'Tickets', assets: 'Assets',
      users: 'Users', analytics: 'Analytics', settings: 'Settings',
    };
    return labels[this.activeNav];
  }

  private _setupSettingsScrollbar(): void {
    this._scrollCleanup?.();
    this._scrollCleanup = null;

    const scroll = document.querySelector('.settings-subnav__scroll') as HTMLElement;
    const track  = document.querySelector('.settings-subnav__track') as HTMLElement;
    const thumb  = document.querySelector('.settings-subnav__thumb') as HTMLElement;
    if (!scroll || !track || !thumb) return;

    let hideTimer: ReturnType<typeof setTimeout>;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroll;
      if (scrollHeight <= clientHeight + 1) return;
      const thumbH = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
      const maxScroll = scrollHeight - clientHeight;
      const thumbT = maxScroll > 0 ? (scrollTop / maxScroll) * (clientHeight - thumbH) : 0;
      thumb.style.height = Math.round(thumbH) + 'px';
      thumb.style.top    = Math.round(thumbT) + 'px';
    };
    updateThumb();

    const show = () => { clearTimeout(hideTimer); track.style.opacity = '1'; track.style.pointerEvents = 'auto'; };
    const hide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { track.style.opacity = '0'; track.style.pointerEvents = 'none'; }, 150); };

    const onMouseMove = (e: MouseEvent) => {
      const rect = scroll.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top  && e.clientY <= rect.bottom;
      inside ? show() : hide();
    };

    scroll.addEventListener('scroll', updateThumb);
    document.addEventListener('mousemove', onMouseMove);

    let isDragging = false;
    const onThumbEnter = () => { thumb.style.background = 'var(--color-text-primary)'; };
    const onThumbLeave = () => { if (!isDragging) thumb.style.background = ''; };
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const dragStartY = e.clientY;
      const dragStartTop = scroll.scrollTop;
      const thumbH = parseInt(thumb.style.height);
      const maxScroll = scroll.scrollHeight - scroll.clientHeight;
      const trackH = scroll.clientHeight - thumbH;
      isDragging = true;
      show();
      thumb.style.background = 'var(--color-text-primary)';
      const onMove = (e: PointerEvent) => {
        if (trackH <= 0) return;
        const delta = e.clientY - dragStartY;
        scroll.scrollTop = Math.max(0, Math.min(maxScroll, dragStartTop + (delta / trackH) * maxScroll));
      };
      const onUp = () => {
        isDragging = false;
        thumb.style.background = '';
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        hide();
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    };

    thumb.addEventListener('mouseenter', onThumbEnter);
    thumb.addEventListener('mouseleave', onThumbLeave);
    thumb.addEventListener('pointerdown', onPointerDown);

    this._scrollCleanup = () => {
      scroll.removeEventListener('scroll', updateThumb);
      document.removeEventListener('mousemove', onMouseMove);
      thumb.removeEventListener('mouseenter', onThumbEnter);
      thumb.removeEventListener('mouseleave', onThumbLeave);
      thumb.removeEventListener('pointerdown', onPointerDown);
      clearTimeout(hideTimer);
    };
  }

  // ── Theme / profile menu ─────────────────────────────────────────────────
  profileMenuOpen = false;
  theme: 'light' | 'dark' = 'light';

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('onflo-theme', theme);
    this.profileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.profileMenuOpen && !target.closest('.profile-menu')) {
      this.profileMenuOpen = false;
    }
    if (this.overflowPanelOpen() && !target.closest('.tnav-overflow')) {
      this.overflowPanelOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeProfileMenuOnEscape(): void {
    this.profileMenuOpen = false;
    this.overflowPanelOpen.set(false);
  }

  // The overflow panel is fixed-positioned from the trigger's rect, so a viewport resize would
  // detach it — close it (the ResizeObserver re-measures the strip separately).
  @HostListener('window:resize')
  closeOverflowPanelOnResize(): void {
    if (this.overflowPanelOpen()) this.overflowPanelOpen.set(false);
  }

  // ── Tickets ──────────────────────────────────────────────────────────────
  ticketsNavItem = 'inbox';
  ticketSavedViewsExpanded = true;
  savedSearchesExpanded = false;
  ticketSavedViews = [
    { id: 'sv1', name: 'My Open Tickets', ticketCount: 12 },
    { id: 'sv2', name: 'Team Escalations', ticketCount: 4 },
    { id: 'sv3', name: 'VIP Customers', ticketCount: 0 },
  ];

  // ── Assets ───────────────────────────────────────────────────────────────
  assetsNavItem = 'overview';

  // ── Analytics ────────────────────────────────────────────────────────────
  analyticsNavItem = 'service-overview';
  comparisonExpanded = false;
  analyticsSavedViewsExpanded = false;
  analyticsSavedViews = [
    { id: 'av1', name: 'Q1 District Summary' },
    { id: 'av2', name: 'IT Dept Breakdown' },
  ];

  // ── Settings ─────────────────────────────────────────────────────────────
  settingsNavItem = 'department-modules';
  settingsSearchQuery = '';

  settingsExpanded: Record<string, boolean> = {
    'global': true,
    'general': true,
    'integration-hub': false,
    'workflows': false,
    'tickets-settings': false,
    'assets-settings': false,
    'call-center': false,
    'activity-log': false,
    'communications': false,
    'custom-fields': false,
    'locations': false,
    'tags': false,
    'portals': false,
    'topics-manager': false,
  };

  toggleSettings(key: string): void {
    if (this.settingsSearchQuery) return;
    this.settingsExpanded[key] = !this.settingsExpanded[key];
  }

  private readonly _settingsSectionLabels: Record<string, string> = {
    'global':           'Global',
    'general':          'General',
    'integration-hub':  'Integration Hub',
    'workflows':        'Automations',
    'tickets-settings': 'Tickets',
    'assets-settings':  'Assets',
    'call-center':      'Call Center',
  };

  private readonly _settingsItems: SettingsItem[] = [
    // Global — truly district-wide settings (shown only in the Global context)
    { id: 'district-profile',       label: 'District Profile',       section: 'global' },
    { id: 'ai-training',            label: 'AI Training Resources',  section: 'global' },
    { id: 'custom-fields',          label: 'Custom Fields',          section: 'global',            isSubheader: true },
    { id: 'custom-fields-field-library', label: 'Field Library',     section: 'global',            subheaderParent: 'custom-fields' },
    { id: 'custom-fields-visibility-rules', label: 'Visibility Rules', section: 'global',          subheaderParent: 'custom-fields' },
    { id: 'department-modules',     label: 'Department Modules',     section: 'global' },
    { id: 'labels',                 label: 'Labels',                 section: 'global' },
    { id: 'languages',              label: 'Languages',              section: 'global' },
    { id: 'locations',              label: 'Locations',              section: 'global',            isSubheader: true },
    { id: 'locations-physical',     label: 'Physical Locations',     section: 'global',            subheaderParent: 'locations' },
    { id: 'locations-containers',   label: 'Containers',             section: 'global',            subheaderParent: 'locations' },
    { id: 'locations-configurations', label: 'Configurations',       section: 'global',            subheaderParent: 'locations' },
    { id: 'portal-branding',        label: 'Portal Branding',        section: 'global' },
    // General — department-tier settings (shown for a department admin in their dept, and for a
    // global admin in the Global context). Mirrors the catalog's 'general' SETTINGS_SECTIONS group.
    { id: 'activity-log',           label: 'Activity Log',           section: 'general',           isSubheader: true },
    { id: 'activity-log-onflo',     label: 'Onflo',                  section: 'general',           subheaderParent: 'activity-log' },
    { id: 'activity-log-assets',    label: 'Assets',                 section: 'general',           subheaderParent: 'activity-log' },
    { id: 'agent-management',       label: 'Agent Management',       section: 'general' },
    { id: 'chatbot',                label: 'Chatbot',                section: 'general' },
    { id: 'communications',         label: 'Communications',         section: 'general',           isSubheader: true },
    { id: 'cs-score-templates',     label: 'CX Score Templates',     section: 'general',           subheaderParent: 'communications' },
    { id: 'email',                  label: 'Email',                  section: 'general',           subheaderParent: 'communications' },
    { id: 'response-templates',     label: 'Response Templates',     section: 'general',           subheaderParent: 'communications' },
    { id: 'keyword-alerts',         label: 'Keyword Alerts',         section: 'general' },
    { id: 'live-agent',             label: 'Live Agent',             section: 'general' },
    { id: 'tags',                   label: 'Tags',                   section: 'general',           isSubheader: true },
    { id: 'tags-tickets',           label: 'Tickets',                section: 'general',           subheaderParent: 'tags' },
    { id: 'tags-assets',            label: 'Assets',                 section: 'general',           subheaderParent: 'tags' },
    // Integration Hub
    { id: 'api-tokens',             label: 'API Tokens',             section: 'integration-hub' },
    { id: 'webhooks',               label: 'Webhooks',               section: 'integration-hub' },
    { id: 'marketplace',            label: 'Marketplace',            section: 'integration-hub' },
    { id: 'installed-apps',         label: 'Installed Apps',         section: 'integration-hub' },
    // Workflows
    { id: 'workflows-tickets',      label: 'Legacy Workflows',       section: 'workflows' },
    { id: 'workflows-assets',       label: 'Workflows',              section: 'workflows' },
    { id: 'lookup-tables',          label: 'Lookup Tables',          section: 'workflows' },
    // Tickets Settings
    { id: 'portals',                label: 'Portals',                section: 'tickets-settings', isSubheader: true },
    { id: 'portals-service-portals', label: 'Service Portals',       section: 'tickets-settings', subheaderParent: 'portals' },
    { id: 'portals-landing-page',   label: 'Landing Page / Tab',     section: 'tickets-settings', subheaderParent: 'portals' },
    { id: 'portals-systems',        label: 'Systems',                section: 'tickets-settings', subheaderParent: 'portals' },
    { id: 'forms',                  label: 'Forms',                  section: 'tickets-settings' },
    { id: 'saved-exports',          label: 'Saved Exports',          section: 'tickets-settings' },
    { id: 'slas',                   label: 'SLAs',                   section: 'tickets-settings' },
    { id: 'ticket-schedules',       label: 'Tickets Schedule',       section: 'tickets-settings' },
    { id: 'topics-manager',         label: 'Topic Manager',          section: 'tickets-settings', isSubheader: true },
    { id: 'topics',                 label: 'Topics',                 section: 'tickets-settings', subheaderParent: 'topics-manager' },
    { id: 'success-messages',       label: 'Success Messages',       section: 'tickets-settings', subheaderParent: 'topics-manager' },
    // Assets Settings
    { id: 'archived-assets',        label: 'Archived Assets',        section: 'assets-settings' },
    { id: 'asset-fields',           label: 'Asset Fields',           section: 'assets-settings' },
    { id: 'asset-hierarchy',        label: 'Asset Hierarchy',        section: 'assets-settings' },
    { id: 'funding-sources',        label: 'Funding Sources',        section: 'assets-settings' },
    { id: 'manufacturers',          label: 'Manufacturers',          section: 'assets-settings' },
    { id: 'models',                 label: 'Models',                 section: 'assets-settings' },
    { id: 'purchase-order-details', label: 'Purchase Order Details', section: 'assets-settings' },
    { id: 'statuses',               label: 'Statuses',               section: 'assets-settings' },
    { id: 'suppliers',              label: 'Suppliers',              section: 'assets-settings' },
    // Call Center
    { id: 'business-hours',         label: 'Business Hours',         section: 'call-center' },
    { id: 'calendar',               label: 'Calendar',               section: 'call-center' },
    { id: 'call-notes',             label: 'Call Notes',             section: 'call-center' },
    { id: 'contact-numbers',        label: 'Contact Numbers',        section: 'call-center' },
    { id: 'greetings',              label: 'Greetings',              section: 'call-center' },
    { id: 'ivr',                    label: 'IVR',                    section: 'call-center' },
    { id: 'queues',                 label: 'Queues',                 section: 'call-center' },
    { id: 'texting',                label: 'Texting',                section: 'call-center' },
  ];

  get settingsFilteredIds(): Set<string> | null {
    const q = this.settingsSearchQuery.toLowerCase().trim();
    if (!q) return null;

    const matchingSectionKeys = new Set(
      Object.entries(this._settingsSectionLabels)
        .filter(([, label]) => label.toLowerCase().includes(q))
        .map(([key]) => key)
    );
    const matchingSubheaderIds = new Set(
      this._settingsItems
        .filter(item => item.isSubheader && item.label.toLowerCase().includes(q))
        .map(item => item.id)
    );

    const result = new Set<string>();
    for (const item of this._settingsItems) {
      if (
        item.label.toLowerCase().includes(q) ||
        matchingSectionKeys.has(item.section) ||
        (item.subheaderParent !== undefined && matchingSubheaderIds.has(item.subheaderParent))
      ) {
        result.add(item.id);
      }
    }
    return result;
  }

  get settingsSectionVis() {
    const f = this.settingsFilteredIds;
    // Context/role gating, independent of the search box — which areas the current context exposes.
    // Global is the district-wide admin area: visible ONLY in the Global context (the Global switcher
    // selected). A global admin loses it the moment they scope into a module, and department admins —
    // who can never enter Global context — never see it. General is the department-tier settings area:
    // visible in the Global context AND for department admins (canAdminActions), so a department admin
    // sees their own dept's General settings and a global admin sees it in Global context too.
    // Integration Hub is district-level like Global, except a department granted manager access to
    // specific integrations (in the Marketplace) sees a scoped version. Workflows needs the module's
    // workflow capability (off for custom modules); Assets needs Asset management. Tickets and Call
    // Center stay on for every admin for now. Composed with the search filter below so you can never
    // surface a section the context hides by searching for it.
    const ctx = {
      global:          this.moduleCtx.isGlobal(),
      general:         this.moduleCtx.isGlobal() || this.moduleCtx.canAdminActions(),
      integrationHub:  this.moduleCtx.canSeeIntegrations(),
      workflows:       this.moduleCtx.hasWorkflow(),
      ticketsSettings: this.moduleCtx.hasTicketing(),
      assetsSettings:  this.moduleCtx.hasAssets(),
      callCenter:      true,
    };
    if (!f) return ctx;
    const hasAny = (section: string) =>
      this._settingsItems.some(item => item.section === section && f.has(item.id));
    return {
      global:          ctx.global && hasAny('global'),
      general:         ctx.general && hasAny('general'),
      integrationHub:  ctx.integrationHub && hasAny('integration-hub'),
      workflows:       ctx.workflows && hasAny('workflows'),
      ticketsSettings: ctx.ticketsSettings && hasAny('tickets-settings'),
      assetsSettings:  ctx.assetsSettings && hasAny('assets-settings'),
      callCenter:      ctx.callCenter && hasAny('call-center'),
    };
  }
}
