import type {
  EditorJsToolConstructorArgs,
  ExternalItemPickerConfig,
  ExternalItemPickerData,
  ExternalItemPickerDataProvider,
  ExternalItemPickerOption
} from '../types';
import { createFetchDataProvider } from '../services/createFetchDataProvider';

interface SearchableSelectOptions {
  classPrefix: string;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  readOnly?: boolean;
  onOpen: () => void;
  onChange: (option: ExternalItemPickerOption | null) => void;
}

class SearchableSelect {
  public readonly element: HTMLDivElement;

  private readonly input: HTMLInputElement;
  private readonly dropdown: HTMLDivElement;
  private readonly optionsList: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly config: SearchableSelectOptions;
  private options: ExternalItemPickerOption[] = [];
  private selected: ExternalItemPickerOption | null = null;
  private disabled: boolean;
  private isOpen = false;

  constructor(config: SearchableSelectOptions) {
    this.config = config;
    this.disabled = Boolean(config.disabled);
    this.element = document.createElement('div');
    this.element.className = `${config.classPrefix}__select`;

    this.input = document.createElement('input');
    this.input.className = `${config.classPrefix}__input`;
    this.input.type = 'text';
    this.input.placeholder = config.placeholder;
    this.input.autocomplete = 'off';
    this.input.disabled = this.disabled || Boolean(config.readOnly);

    this.dropdown = document.createElement('div');
    this.dropdown.className = `${config.classPrefix}__dropdown`;
    this.dropdown.hidden = true;

    this.status = document.createElement('div');
    this.status.className = `${config.classPrefix}__status`;

    this.optionsList = document.createElement('div');
    this.optionsList.className = `${config.classPrefix}__options`;

    this.dropdown.append(this.status, this.optionsList);
    this.element.append(this.input, this.dropdown);
    this.bindEvents();
    this.setDisabled(this.disabled);
  }

  setOptions(options: ExternalItemPickerOption[]): void {
    this.options = options;
    this.renderOptions();
  }

  setSelected(option: ExternalItemPickerOption | null): void {
    this.selected = option;
    this.input.value = option?.label ?? '';
    this.renderOptions();
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.input.disabled = disabled || Boolean(this.config.readOnly);
    this.element.classList.toggle(`${this.config.classPrefix}__select--disabled`, this.input.disabled);

    if (this.input.disabled) {
      this.close();
    }
  }

  setLoading(isLoading: boolean): void {
    this.element.classList.toggle(`${this.config.classPrefix}__select--loading`, isLoading);
    this.status.textContent = isLoading ? 'Loading...' : '';
  }

  clear(): void {
    this.setSelected(null);
    this.input.value = '';
  }

  focus(): void {
    this.input.focus();
  }

  private bindEvents(): void {
    this.input.addEventListener('focus', () => {
      this.open();
    });

    this.input.addEventListener('click', () => {
      this.open();
    });

    this.input.addEventListener('input', () => {
      this.selected = null;
      this.renderOptions();
      this.open();
      this.config.onChange(null);
    });

    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });

    document.addEventListener('click', (event) => {
      if (!this.element.contains(event.target as Node)) {
        this.close();
      }
    });
  }

  private open(): void {
    if (this.disabled || this.config.readOnly) {
      return;
    }

    this.isOpen = true;
    this.dropdown.hidden = false;
    this.input.placeholder = this.config.searchPlaceholder;
    this.config.onOpen();
    this.renderOptions();
  }

  private close(): void {
    this.isOpen = false;
    this.dropdown.hidden = true;
    this.input.placeholder = this.config.placeholder;

    if (this.selected) {
      this.input.value = this.selected.label;
    }
  }

  private renderOptions(): void {
    this.optionsList.textContent = '';

    if (!this.isOpen) {
      return;
    }

    const query = this.input.value.trim().toLocaleLowerCase();
    const filteredOptions = this.options.filter((option) => {
      return option.label.toLocaleLowerCase().includes(query) || option.id.toLocaleLowerCase().includes(query);
    });

    if (filteredOptions.length === 0) {
      this.status.textContent = 'No results found';
      return;
    }

    this.status.textContent = '';

    for (const option of filteredOptions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${this.config.classPrefix}__option`;
      button.textContent = option.label;
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        this.setSelected(option);
        this.config.onChange(option);
        this.close();
      });
      this.optionsList.append(button);
    }
  }
}

const CLASS_PREFIX = 'external-item-picker';
const DYNAMIC_LINK_SELECTOR = 'a[data-dynamic-link="true"]';

const defaultLabels = {
  categoryPlaceholder: 'Select category',
  itemPlaceholder: 'Select item',
  searchPlaceholder: 'Search...'
};

export class ExternalItemPickerTool {
  private readonly dataProvider?: ExternalItemPickerDataProvider;
  private readonly config: ExternalItemPickerConfig;
  private readonly readOnly: boolean;
  private button?: HTMLButtonElement;
  private popover?: HTMLDivElement;
  private categorySelect?: SearchableSelect;
  private itemSelect?: SearchableSelect;
  private applyButton?: HTMLButtonElement;
  private unlinkButton?: HTMLButtonElement;
  private errorElement?: HTMLDivElement;
  private activeAnchor: HTMLAnchorElement | null = null;
  private selectedRange: Range | null = null;
  private data: ExternalItemPickerData = {};
  private categoriesLoaded = false;
  private itemsLoadedForCategoryId?: string;
  private readonly handleDocumentMouseDown = (event: MouseEvent): void => {
    const target = event.target as Node | null;

    if (!target || !this.popover || this.popover.contains(target) || this.button?.contains(target)) {
      return;
    }

    this.closePopover();
  };

  constructor({ config, readOnly }: EditorJsToolConstructorArgs) {
    this.config = config ?? {};
    this.readOnly = Boolean(readOnly);
    this.dataProvider = this.resolveDataProvider(this.config);
  }

  static get isInline(): boolean {
    return true;
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  render(): HTMLElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = `${CLASS_PREFIX}__toolbar-button`;
    this.button.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 13.5 13.5 10.5M8.75 7.75l-1 .02a4 4 0 0 0-2.73 6.88l.33.33a4 4 0 0 0 5.66 0l1.24-1.23M11.75 10.25l1.24-1.23a4 4 0 0 1 5.66 0l.33.33a4 4 0 0 1-2.73 6.88l-1 .02" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    this.button.title = 'Dynamic link';

    return this.button;
  }

  surround(range: Range): void {
    if (this.readOnly) {
      return;
    }

    const anchor = this.findDynamicLinkForRange(range);

    if (!anchor && range.collapsed) {
      this.clear();
      return;
    }

    this.selectedRange = range.cloneRange();
    this.activeAnchor = anchor;
    this.data = anchor ? this.readDataFromAnchor(anchor) : {};
    this.openPopover(range);
  }

  checkState(): boolean {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode ? this.findDynamicLink(selection.anchorNode) : null;
    this.activeAnchor = anchor;
    this.button?.classList.toggle(`${CLASS_PREFIX}__toolbar-button--active`, Boolean(anchor));

    return Boolean(anchor);
  }

  clear(): void {
    this.closePopover();
    this.button?.classList.remove(`${CLASS_PREFIX}__toolbar-button--active`);
    this.activeAnchor = null;
    this.selectedRange = null;
    this.data = {};
  }

  private openPopover(range: Range): void {
    this.closePopover();

    const labels = {
      ...defaultLabels,
      ...this.config.labels
    };

    this.popover = document.createElement('div');
    this.popover.className = `${CLASS_PREFIX} ${CLASS_PREFIX}__popover`;
    this.popover.addEventListener('mousedown', (event) => event.stopPropagation());
    this.popover.addEventListener('click', (event) => event.stopPropagation());

    const categoryField = this.createField(labels.categoryPlaceholder);
    const itemField = this.createField(labels.itemPlaceholder);
    const actions = document.createElement('div');
    actions.className = `${CLASS_PREFIX}__actions`;

    this.errorElement = document.createElement('div');
    this.errorElement.className = `${CLASS_PREFIX}__error`;
    this.errorElement.hidden = true;

    this.categorySelect = new SearchableSelect({
      classPrefix: CLASS_PREFIX,
      placeholder: labels.categoryPlaceholder,
      searchPlaceholder: labels.searchPlaceholder,
      readOnly: this.readOnly,
      onOpen: () => void this.loadCategories(),
      onChange: (option) => this.handleCategoryChange(option)
    });

    this.itemSelect = new SearchableSelect({
      classPrefix: CLASS_PREFIX,
      placeholder: labels.itemPlaceholder,
      searchPlaceholder: labels.searchPlaceholder,
      disabled: !this.data.categoryId,
      readOnly: this.readOnly,
      onOpen: () => void this.loadItemsForCurrentCategory(),
      onChange: (option) => this.handleItemChange(option)
    });

    this.applyButton = document.createElement('button');
    this.applyButton.type = 'button';
    this.applyButton.className = `${CLASS_PREFIX}__action ${CLASS_PREFIX}__action--primary`;
    this.applyButton.textContent = 'Apply';
    this.applyButton.addEventListener('click', () => this.applyLink());

    this.unlinkButton = document.createElement('button');
    this.unlinkButton.type = 'button';
    this.unlinkButton.className = `${CLASS_PREFIX}__action`;
    this.unlinkButton.textContent = 'Unlink';
    this.unlinkButton.hidden = !this.activeAnchor;
    this.unlinkButton.addEventListener('click', () => this.unlink());

    if (this.data.categoryId && this.data.categoryLabel) {
      this.categorySelect.setSelected({
        id: this.data.categoryId,
        label: this.data.categoryLabel
      });
    }

    if (this.data.itemId && this.data.itemLabel) {
      this.itemSelect.setSelected({
        id: this.data.itemId,
        label: this.data.itemLabel
      });
    }

    categoryField.append(this.categorySelect.element);
    itemField.append(this.itemSelect.element);
    actions.append(this.unlinkButton, this.applyButton);
    this.popover.append(categoryField, itemField, this.errorElement, actions);
    document.body.append(this.popover);
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    this.positionPopover(range);
    this.syncApplyButton();
    void this.loadCategories();

    if (this.data.categoryId) {
      void this.loadItemsForCurrentCategory();
    }

    this.categorySelect.focus();
  }

  private closePopover(): void {
    document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    this.popover?.remove();
    this.popover = undefined;
    this.categorySelect = undefined;
    this.itemSelect = undefined;
    this.applyButton = undefined;
    this.unlinkButton = undefined;
    this.errorElement = undefined;
    this.categoriesLoaded = false;
    this.itemsLoadedForCategoryId = undefined;
  }

  private positionPopover(range: Range): void {
    if (!this.popover) {
      return;
    }

    const rect = range.getBoundingClientRect();
    const fallbackRect = this.button?.getBoundingClientRect();
    const sourceRect = rect.width || rect.height ? rect : fallbackRect;

    if (!sourceRect) {
      return;
    }

    const width = 320;
    const left = Math.min(Math.max(8, sourceRect.left + window.scrollX), window.scrollX + window.innerWidth - width - 8);
    const top = sourceRect.bottom + window.scrollY + 8;

    this.popover.style.left = `${left}px`;
    this.popover.style.top = `${top}px`;
    this.popover.style.width = `${width}px`;
  }

  private applyLink(): void {
    if (!this.data.categoryId || !this.data.itemId) {
      this.showError('Choose a category and item before applying the link.');
      return;
    }

    const anchor = this.activeAnchor ?? this.createAnchorFromRange();

    if (!anchor) {
      this.showError('Select text before applying the link.');
      return;
    }

    this.writeDataToAnchor(anchor);
    this.closePopover();
    this.button?.classList.add(`${CLASS_PREFIX}__toolbar-button--active`);
  }

  private createAnchorFromRange(): HTMLAnchorElement | null {
    if (!this.selectedRange || this.selectedRange.collapsed) {
      return null;
    }

    const anchor = document.createElement('a');
    const contents = this.selectedRange.extractContents();
    anchor.append(contents);
    this.selectedRange.insertNode(anchor);

    return anchor;
  }

  private unlink(): void {
    if (!this.activeAnchor) {
      this.closePopover();
      return;
    }

    const parent = this.activeAnchor.parentNode;

    if (!parent) {
      this.closePopover();
      return;
    }

    while (this.activeAnchor.firstChild) {
      parent.insertBefore(this.activeAnchor.firstChild, this.activeAnchor);
    }

    parent.removeChild(this.activeAnchor);
    parent.normalize();
    this.clear();
  }

  private findDynamicLink(node: Node | null): HTMLAnchorElement | null {
    let current: Node | null = node;

    if (current?.nodeType === Node.TEXT_NODE) {
      current = current.parentNode;
    }

    while (current && current instanceof HTMLElement) {
      if (current.matches(DYNAMIC_LINK_SELECTOR)) {
        return current as HTMLAnchorElement;
      }

      current = current.parentElement;
    }

    return null;
  }

  private findDynamicLinkForRange(range: Range): HTMLAnchorElement | null {
    return (
      this.findDynamicLink(range.commonAncestorContainer) ??
      this.findDynamicLink(range.startContainer) ??
      this.findDynamicLink(range.endContainer)
    );
  }

  private readDataFromAnchor(anchor: HTMLAnchorElement): ExternalItemPickerData {
    return {
      categoryId: anchor.dataset.dynamicLinkCategoryId ?? '',
      categoryLabel: anchor.dataset.dynamicLinkCategoryLabel ?? '',
      itemId: anchor.dataset.dynamicLinkItemId ?? '',
      itemLabel: anchor.dataset.dynamicLinkItemLabel ?? ''
    };
  }

  private writeDataToAnchor(anchor: HTMLAnchorElement): void {
    anchor.href = '#';
    anchor.dataset.dynamicLink = 'true';
    anchor.dataset.dynamicLinkCategoryId = this.data.categoryId ?? '';
    anchor.dataset.dynamicLinkCategoryLabel = this.data.categoryLabel ?? '';
    anchor.dataset.dynamicLinkItemId = this.data.itemId ?? '';
    anchor.dataset.dynamicLinkItemLabel = this.data.itemLabel ?? '';
  }

  private resolveDataProvider(config: ExternalItemPickerConfig): ExternalItemPickerDataProvider | undefined {
    if (config.dataProvider) {
      return config.dataProvider;
    }

    if (config.endpoints) {
      return createFetchDataProvider(config.endpoints);
    }

    return undefined;
  }

  private createField(labelText: string): HTMLDivElement {
    const field = document.createElement('div');
    field.className = `${CLASS_PREFIX}__field`;

    const label = document.createElement('label');
    label.className = `${CLASS_PREFIX}__label`;
    label.textContent = labelText;

    field.append(label);
    return field;
  }

  private async loadCategories(): Promise<void> {
    if (this.categoriesLoaded || !this.categorySelect) {
      return;
    }

    if (!this.dataProvider) {
      this.categorySelect.setOptions([]);
      return;
    }

    this.categorySelect.setLoading(true);
    this.clearError();

    try {
      const categories = await this.dataProvider.getCategories();
      this.categorySelect.setOptions(categories);
      this.categoriesLoaded = true;
    } catch (error) {
      this.showError('Categories could not be loaded. Try again later.');
    } finally {
      this.categorySelect.setLoading(false);
    }
  }

  private async loadItemsForCurrentCategory(): Promise<void> {
    if (!this.itemSelect || !this.data.categoryId) {
      return;
    }

    if (this.itemsLoadedForCategoryId === this.data.categoryId) {
      return;
    }

    if (!this.dataProvider) {
      this.itemSelect.setOptions([]);
      return;
    }

    this.itemSelect.setLoading(true);
    this.clearError();

    try {
      const items = await this.dataProvider.getItemsByCategory(this.data.categoryId);
      this.itemSelect.setOptions(items);
      this.itemsLoadedForCategoryId = this.data.categoryId;
    } catch (error) {
      this.showError('Items could not be loaded. Try again later.');
    } finally {
      this.itemSelect.setLoading(false);
    }
  }

  private handleCategoryChange(option: ExternalItemPickerOption | null): void {
    const previousCategoryId = this.data.categoryId;

    this.data.categoryId = option?.id ?? '';
    this.data.categoryLabel = option?.label ?? '';

    if (previousCategoryId !== this.data.categoryId) {
      this.data.itemId = '';
      this.data.itemLabel = '';
      this.itemsLoadedForCategoryId = undefined;
      this.itemSelect?.clear();
      this.itemSelect?.setOptions([]);
      this.itemSelect?.setDisabled(!this.data.categoryId);
    }

    this.syncApplyButton();
  }

  private handleItemChange(option: ExternalItemPickerOption | null): void {
    this.data.itemId = option?.id ?? '';
    this.data.itemLabel = option?.label ?? '';
    this.syncApplyButton();
  }

  private syncApplyButton(): void {
    if (!this.applyButton) {
      return;
    }

    this.applyButton.disabled = !this.data.categoryId || !this.data.itemId;
  }

  private showError(message: string): void {
    if (!this.errorElement) {
      return;
    }

    this.errorElement.textContent = message;
    this.errorElement.hidden = false;
  }

  private clearError(): void {
    if (!this.errorElement) {
      return;
    }

    this.errorElement.textContent = '';
    this.errorElement.hidden = true;
  }
}

export const DynamicLinkTool = ExternalItemPickerTool;

export default ExternalItemPickerTool;
