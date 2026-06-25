import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// Process-wide counter so every rendered select gets unique input/menu ids (aria-controls
// needs them; select.js itself discovers dropdowns structurally and needs no ids).
let selectUid = 0;

/**
 * Presentational `ds-select` wrapper, shared by the agent + team creation/edit forms. Emits
 * the canonical design-system select markup so the global `runtime/select.js` (wired in
 * angular.json) makes it a working dropdown — open, single/multi pick, select-all — with no
 * per-instance init. This component owns NO behaviour or state; it only renders markup +
 * initial selection. The host form reads chosen values from the DOM at submit time
 * (design-mode: submit is mocked).
 *
 * TODO eng: replace with a reactive `ds-select` bound to the form model on handoff.
 */
@Component({
  selector: 'app-form-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; } .ds-select { width: 100%; }'],
  template: `
    <div class="ds-select" [class.ds-select--multi]="multiple" [class.is-disabled]="disabled" [class.is-error]="error">
      <label class="ds-select__label" [class.ds-sr-only]="hideLabel" [attr.for]="inputId">
        {{ label }}@if (required) {<span class="ds-select__required" aria-hidden="true">*</span>}
      </label>
      <div class="ds-select__field-row">
        <div class="ds-select__field">
          <input type="text" [id]="inputId" class="ds-select__control"
                 [attr.readonly]="multiple ? '' : null" [disabled]="disabled"
                 [value]="displayValue" [attr.data-default-placeholder]="placeholder" [attr.placeholder]="placeholder"
                 autocomplete="off" spellcheck="false"
                 role="combobox" aria-haspopup="listbox" aria-expanded="false"
                 [attr.aria-controls]="menuId" [attr.aria-label]="label"
                 [attr.aria-invalid]="error ? 'true' : null" [attr.aria-describedby]="error ? helperId : null" />
          @if (error) {
            <span class="ds-icon ds-icon--sm ds-icon--filled ds-select__error-icon" aria-hidden="true">error</span>
          } @else {
            <span class="ds-icon ds-icon--sm ds-select__arrow" aria-hidden="true">arrow_drop_down</span>
          }
        </div>
        <div class="ds-select__dropdown" [id]="menuId" role="listbox"
             [attr.aria-multiselectable]="multiple ? 'true' : null" [attr.aria-label]="label">
          <div class="ds-menu">
            @if (multiple) {
              <button class="ds-menu__section-label" role="menuitemcheckbox"
                      [attr.aria-checked]="allChecked ? 'true' : 'false'">Select all</button>
            }
            @for (opt of options; track opt) {
              <button class="ds-menu__item" [class.ds-menu__item--indent]="multiple"
                      [class.ds-menu__item--selected]="isSelected(opt)"
                      role="option" [attr.aria-selected]="isSelected(opt)" [attr.data-label]="opt">
                @if (isSelected(opt)) {
                  <span class="ds-menu__item-check"><span class="ds-icon ds-icon--filled" aria-hidden="true">check</span></span>
                }
                {{ opt }}
              </button>
            }
          </div>
        </div>
      </div>
      @if (error) {
        <span class="ds-select__helper" [id]="helperId" role="alert">{{ errorMessage }}</span>
      } @else if (helper) {
        <span class="ds-select__helper">{{ helper }}</span>
      }
    </div>
  `,
})
export class FormSelectComponent {
  @Input() label = '';
  /** Visually hide the label (still announced to screen readers + drives the control's aria-label).
   *  Use when surrounding context — e.g. a section heading — already names the single control. */
  @Input() hideLabel = false;
  @Input() options: string[] = [];
  @Input() multiple = false;
  /** Initial selection — a label (single) or labels (multi). */
  @Input() selected: string | string[] | null | undefined;
  @Input() placeholder = 'Select…';
  @Input() required = false;
  @Input() disabled = false;
  @Input() helper?: string;
  /** When true, render the DS error state (red, error icon) + the error helper. */
  @Input() error = false;
  /** Error helper text shown (with role="alert") when `error` is true. */
  @Input() errorMessage = '';

  readonly inputId = `afs-${++selectUid}`;
  readonly menuId = `${this.inputId}-menu`;
  readonly helperId = `${this.inputId}-helper`;

  /** Field text: the label (single), or "N selected" (multi). */
  get displayValue(): string {
    const sel = this.selected;
    if (this.multiple) {
      const arr = Array.isArray(sel) ? sel : [];
      return arr.length === 0 ? '' : arr.length === 1 ? arr[0] : `${arr.length} selected`;
    }
    return typeof sel === 'string' ? sel : '';
  }

  isSelected(opt: string): boolean {
    const sel = this.selected;
    return this.multiple ? Array.isArray(sel) && sel.includes(opt) : sel === opt;
  }

  get allChecked(): boolean {
    return this.multiple && this.options.length > 0 && this.options.every((o) => this.isSelected(o));
  }
}
