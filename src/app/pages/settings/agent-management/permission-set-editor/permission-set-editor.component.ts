import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { globalTierSections, departmentTierSections } from '../../../../data/permission-catalog';
import { ChromeService } from '../../../../data/chrome.service';
import { MessagingService } from '../../../../data/messaging.service';
import { PermissionEditorStateService } from './permission-editor-state.service';
import { PsetMatrixTabComponent } from './pset-matrix-tab.component';
import { PsetDataVisibilityTabComponent } from './pset-data-visibility-tab.component';
import { PsetDetailsTabComponent } from './pset-details-tab.component';

export type EditorTab = 'details' | 'data-visibility' | 'actions' | 'settings';

/**
 * Permission-set editor shell — rendered full-area by the Agent Management page when its
 * editingSetId is set. Owns the header (Back / name / System badge / Save / Duplicate), the
 * 4-tab bar (Details / Data Visibility / Actions / Settings), and the read-only banner; the
 * tabs read/write the shared PermissionEditorStateService (provided here, per editor instance).
 * ViewEncapsulation.None so its stylesheet styles the tab sub-components too.
 */
@Component({
  selector: 'app-permission-set-editor',
  standalone: true,
  imports: [PsetMatrixTabComponent, PsetDataVisibilityTabComponent, PsetDetailsTabComponent],
  templateUrl: './permission-set-editor.component.html',
  styleUrl: './permission-set-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [PermissionEditorStateService],
  host: { class: 'ds-page-content__main', style: 'display: flex; flex-direction: column;' },
})
export class PermissionSetEditorComponent implements OnInit, OnDestroy {
  /** The set to edit. Re-loads the working state whenever it changes (e.g. after Duplicate). */
  @Input({ required: true })
  set setId(value: string) {
    this._setId = value;
    this.reload();
  }
  get setId(): string {
    return this._setId;
  }
  private _setId = '';

  /** Emitted with a set id to open (Duplicate hands the parent the new set). */
  @Output() openSet = new EventEmitter<string>();

  private readonly setsSvc = inject(PermissionSetsService);
  private readonly chrome = inject(ChromeService);
  private readonly msg = inject(MessagingService);
  readonly state = inject(PermissionEditorStateService);

  readonly actionsSections = this.setsSvc.actionsSections;
  /** A global set holds only district config, so its Settings tab shows the district-wide sections
   *  (Global, Integration Hub, Call Center). A department set shows only the department-tier sections
   *  (General, Automations, Tickets, Assets) — never the district ones. The Actions tab is hidden
   *  entirely for global sets (filtered in agent-management). */
  readonly settingsSections = computed(() =>
    this.state.isGlobalOnly()
      ? globalTierSections(this.setsSvc.settingsSections)
      : departmentTierSections(this.setsSvc.settingsSections),
  );

  /** Active tab — owned by the parent now (the tab bar moved to the page heading). */
  readonly activeTab = input<EditorTab>('details');

  constructor() {
    // Single owner of the contextual save bar config. Sets it only while there are unsaved changes
    // (state.dirty() clears after save/discard); the Agent Management page renders it inside its
    // .ds-page-content, below this editor card. Save Changes persists and stays here, Discard
    // reverts — neither leaves the editor.
    //
    // The bar's error variant is derived purely from validity: it goes red whenever the user has
    // attempted a Save (submitted) AND the required Name is still blank, and reverts to the normal
    // bar the instant the name becomes valid (submitted is also cleared then). Because this is the
    // ONLY place that writes the bar, it can never get stuck red — fixing the field re-renders it
    // normal on the next change-detection pass, with no imperative un-sticking needed.
    effect(() => {
      if (!this.state.dirty()) {
        this.chrome.saveBar.set(null);
        return;
      }
      const invalid = this.state.submitted() && this.state.nameInvalid();
      this.chrome.saveBar.set({
        onCancel: () => this.discardChanges(),
        onSave: () => this.saveChanges(),
        error: invalid,
        message: invalid ? 'Fix the required fields before saving.' : undefined,
      });
    });

    // Clear-as-fix: once the user makes the Name valid after a failed Save, drop the submitted flag
    // so the field returns to its pristine (no-error) state and won't re-flag until the next Save
    // attempt. The save-bar effect above reverts the bar to normal in the same pass.
    effect(() => {
      if (this.state.submitted() && !this.state.nameInvalid()) {
        this.state.submitted.set(false);
      }
    });
  }

  ngOnInit(): void {
    // Collapse the section subnav while this full-area editor is on screen.
    this.chrome.setEditorOpen(true);
  }
  ngOnDestroy(): void {
    this.chrome.setEditorOpen(false);
    this.chrome.hideSaveBar();
  }

  // ── Save bar actions (the project's success/error snackbar pattern) ──────────────
  /**
   * Save Changes: validate, persist, toast success. A blank name on an editable set is a required-
   * field error — instead of a toast it sets `submitted` (which flips the Name field to its
   * is-error state and re-renders the save bar red via the constructor effect), surfaces the field
   * by switching to the Details tab, focuses it, and aborts the save.
   */
  private saveChanges(): void {
    if (this.state.nameInvalid()) {
      this.state.submitted.set(true);
      // Surface the invalid field: ask the parent (which owns the editor tab bar) to switch to
      // Details, then focus the Name input once it's rendered.
      this.chrome.requestEditorTab('details');
      this.focusNameInput();
      return;
    }
    this.state.save();
    this.msg.success('Permission set saved.');
  }

  /** Focus the Name input after the Details tab has rendered (it may have just been switched to). */
  private focusNameInput(): void {
    setTimeout(() => {
      (document.getElementById('pset-name') as HTMLInputElement | null)?.focus();
    });
  }
  /** Discard: revert the working state to the last-saved set (the save bar clears via `dirty`). */
  private discardChanges(): void {
    this.state.discard();
  }

  private reload(): void {
    const set = this.setsSvc.sets().find(s => s.id === this._setId);
    if (!set) return;
    this.state.init(set);
  }

  /** Duplicate a (system) set into an editable Custom copy, then open it. */
  duplicate(): void {
    const src = this.setsSvc.sets().find(s => s.id === this._setId);
    if (!src) return;
    this.setsSvc.add({
      name: `${src.name} (copy)`,
      description: src.description,
      moduleId: src.moduleId,
      isGlobalOnly: src.isGlobalOnly,
      type: 'Custom',
      isLocked: false,
      capabilities: { ...src.capabilities },
    });
    const dup = this.setsSvc.sets()[this.setsSvc.sets().length - 1];
    if (dup) this.openSet.emit(dup.id);
  }
}
