import type {
  DynamicLinkConfig,
  DynamicLinkData,
  DynamicLinkDataProvider,
  DynamicLinkOption,
  DynamicLinkQueryParam,
  EditorJsToolConstructorArgs,
} from '../types';
import { createFetchDataProvider } from '../services/createFetchDataProvider';

interface SearchableSelectOptions {
  classPrefix: string;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  readOnly?: boolean;
  onOpen: () => void;
  onChange: (option: DynamicLinkOption | null) => void;
}

class SearchableSelect {
  public readonly element: HTMLDivElement;
  public readonly dropdownElement: HTMLDivElement;

  private readonly input: HTMLInputElement;
  private readonly optionsList: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly config: SearchableSelectOptions;
  private options: DynamicLinkOption[] = [];
  private selected: DynamicLinkOption | null = null;
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

    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = `${config.classPrefix}__dropdown`;
    this.dropdownElement.hidden = true;

    this.status = document.createElement('div');
    this.status.className = `${config.classPrefix}__status`;

    this.optionsList = document.createElement('div');
    this.optionsList.className = `${config.classPrefix}__options`;

    this.dropdownElement.append(this.status, this.optionsList);
    this.element.append(this.input, this.dropdownElement);
    this.bindEvents();
    this.setDisabled(this.disabled);
  }

  setOptions(options: DynamicLinkOption[]): void {
    this.options = options;
    this.renderOptions();
  }

  setSelected(option: DynamicLinkOption | null): void {
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
    this.dropdownElement.hidden = false;
    this.input.placeholder = this.config.searchPlaceholder;
    this.config.onOpen();
    this.renderOptions();
  }

  private close(): void {
    this.isOpen = false;
    this.dropdownElement.hidden = true;
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
const STATIC_PAGE_CATEGORY_ID = 'static-page';
const STATIC_PAGE_OPTION: DynamicLinkOption = {
  id: STATIC_PAGE_CATEGORY_ID,
  label: 'Static page'
};

const defaultLabels = {
  categoryPlaceholder: 'Select category',
  itemPlaceholder: 'Select item',
  searchPlaceholder: 'Search...'
};

export class ExternalItemPickerTool {
  private readonly dataProvider?: DynamicLinkDataProvider;
  private readonly config: DynamicLinkConfig;
  private readonly readOnly: boolean;
  private button?: HTMLButtonElement;
  private popover?: HTMLDivElement;
  private categorySelect?: SearchableSelect;
  private itemSelect?: SearchableSelect;
  private itemField?: HTMLDivElement;
  private pathnameField?: HTMLDivElement;
  private pathnameInput?: HTMLInputElement;
  private queryParamsList?: HTMLDivElement;
  private applyButton?: HTMLButtonElement;
  private unlinkButton?: HTMLButtonElement;
  private errorElement?: HTMLDivElement;
  private activeAnchor: HTMLAnchorElement | null = null;
  private selectedRange: Range | null = null;
  private data: DynamicLinkData = this.createEmptyData();
  private categoriesLoaded = false;
  private itemsLoadedForCategoryId?: string;
  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target as Node | null;

    if (!target || this.isInternalInteractionTarget(target)) {
      return;
    }

    this.closePopover();
  };
  private readonly handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.popover) {
      event.stopPropagation();
      this.closePopover();
    }
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
    this.data = anchor ? this.readDataFromAnchor(anchor) : this.createEmptyData();
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
    if (this.isFocusInsidePopover()) {
      return;
    }

    this.closePopover();
    this.button?.classList.remove(`${CLASS_PREFIX}__toolbar-button--active`);
    this.activeAnchor = null;
    this.selectedRange = null;
    this.data = this.createEmptyData();
  }

  private openPopover(range: Range): void {
    this.closePopover();

    const labels = {
      ...defaultLabels,
      ...this.config.labels
    };

    this.popover = document.createElement('div');
    this.popover.className = `${CLASS_PREFIX} ${CLASS_PREFIX}__popover`;
    this.bindPopoverEventBoundary(this.popover);

    const categoryField = this.createField(labels.categoryPlaceholder);
    this.itemField = this.createField(labels.itemPlaceholder);
    this.pathnameField = this.createPathnameField();
    const queryParamsField = this.createQueryParamsField();
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
    this.itemField.append(this.itemSelect.element);
    actions.append(this.unlinkButton, this.applyButton);
    this.popover.append(categoryField, this.itemField, this.pathnameField, queryParamsField, this.errorElement, actions);
    document.body.append(this.popover);
    document.addEventListener('pointerdown', this.handleDocumentPointerDown);
    document.addEventListener('keydown', this.handleDocumentKeyDown);
    this.positionPopover(range);
    this.syncApplyButton();
    this.syncModeUi();
    this.renderQueryParamRows();
    void this.loadCategories();

    if (this.data.categoryId && !this.isStaticPageSelected()) {
      void this.loadItemsForCurrentCategory();
    }

    this.categorySelect.focus();
  }

  private createEmptyData(): DynamicLinkData {
    return {
      categoryId: '',
      params: {},
      queryParams: []
    };
  }

  private closePopover(): void {
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    this.popover?.remove();
    this.popover = undefined;
    this.categorySelect = undefined;
    this.itemSelect = undefined;
    this.itemField = undefined;
    this.pathnameField = undefined;
    this.pathnameInput = undefined;
    this.queryParamsList = undefined;
    this.applyButton = undefined;
    this.unlinkButton = undefined;
    this.errorElement = undefined;
    this.categoriesLoaded = false;
    this.itemsLoadedForCategoryId = undefined;
  }

  private bindPopoverEventBoundary(popover: HTMLDivElement): void {
    const stopPropagation = (event: Event): void => {
      event.stopPropagation();
    };

    popover.addEventListener('pointerdown', stopPropagation);
    popover.addEventListener('mousedown', stopPropagation);
    popover.addEventListener('click', stopPropagation);
    popover.addEventListener('focusin', stopPropagation);
  }

  private isInternalInteractionTarget(target: Node): boolean {
    return Boolean(
      this.popover?.contains(target) ||
        this.button?.contains(target) ||
        this.categorySelect?.element.contains(target) ||
        this.categorySelect?.dropdownElement.contains(target) ||
        this.itemSelect?.element.contains(target) ||
        this.itemSelect?.dropdownElement.contains(target)
    );
  }

  private isFocusInsidePopover(): boolean {
    const activeElement = document.activeElement;

    return Boolean(activeElement && this.popover?.contains(activeElement));
  }

  private restoreSavedSelection(): void {
    if (!this.selectedRange || this.activeAnchor) {
      return;
    }

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(this.selectedRange);
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
    this.data.queryParams = this.getQueryParamsFromRows();

    if (!this.data.categoryId) {
      this.showError('Choose a category before applying the link.');
      return;
    }

    if (this.isStaticPageSelected() && !this.isValidPathname(this.data.pathname ?? '')) {
      this.showError('Pathname must start with "/".');
      return;
    }

    if (!this.isStaticPageSelected() && !this.data.itemId) {
      this.showError('Choose a category and item before applying the link.');
      return;
    }

    this.restoreSavedSelection();

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

  private readDataFromAnchor(anchor: HTMLAnchorElement): DynamicLinkData {
    return {
      categoryId: anchor.dataset.dynamicLinkCategoryId ?? '',
      categoryLabel: anchor.dataset.dynamicLinkCategoryLabel ?? '',
      itemId: anchor.dataset.dynamicLinkItemId ?? '',
      itemLabel: anchor.dataset.dynamicLinkItemLabel ?? '',
      pathname: anchor.dataset.dynamicLinkPathname ?? '',
      params: this.parseParams(anchor.dataset.dynamicLinkParams),
      queryParams: this.parseQueryParams(anchor.dataset.dynamicLinkQueryParams)
    };
  }

  private writeDataToAnchor(anchor: HTMLAnchorElement): void {
    anchor.href = '#';
    anchor.dataset.dynamicLink = 'true';
    anchor.dataset.dynamicLinkCategoryId = this.data.categoryId ?? '';
    anchor.dataset.dynamicLinkCategoryLabel = this.data.categoryLabel ?? '';
    anchor.dataset.dynamicLinkItemId = this.isStaticPageSelected() ? '' : this.data.itemId ?? '';
    anchor.dataset.dynamicLinkItemLabel = this.isStaticPageSelected() ? '' : this.data.itemLabel ?? '';
    anchor.dataset.dynamicLinkPathname = this.data.pathname ?? '';
    anchor.dataset.dynamicLinkParams = JSON.stringify(this.isStaticPageSelected() ? {} : this.data.params ?? {});
    anchor.dataset.dynamicLinkQueryParams = JSON.stringify(this.getQueryParamsFromRows());
  }

  private resolveDataProvider(config: DynamicLinkConfig): DynamicLinkDataProvider | undefined {
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

  private createPathnameField(): HTMLDivElement {
    const field = this.createField('Pathname');

    this.pathnameInput = document.createElement('input');
    this.pathnameInput.className = `${CLASS_PREFIX}__input`;
    this.pathnameInput.type = 'text';
    this.pathnameInput.placeholder = '/pathname';
    this.pathnameInput.value = this.data.pathname ?? '';
    this.pathnameInput.addEventListener('input', () => {
      this.data.pathname = this.pathnameInput?.value ?? '';
      this.syncApplyButton();
    });

    const helper = document.createElement('div');
    helper.className = `${CLASS_PREFIX}__helper`;
    helper.textContent = 'The pathname must be in the format /pathname.';

    field.append(this.pathnameInput, helper);
    return field;
  }

  private createQueryParamsField(): HTMLDivElement {
    const field = document.createElement('div');
    field.className = `${CLASS_PREFIX}__query`;

    const header = document.createElement('div');
    header.className = `${CLASS_PREFIX}__query-header`;

    const label = document.createElement('div');
    label.className = `${CLASS_PREFIX}__label`;
    label.textContent = 'Query params';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = `${CLASS_PREFIX}__action`;
    addButton.textContent = 'Add query param';
    addButton.addEventListener('click', () => {
      this.addQueryParamRow();
    });

    this.queryParamsList = document.createElement('div');
    this.queryParamsList.className = `${CLASS_PREFIX}__query-list`;

    header.append(label, addButton);
    field.append(header, this.queryParamsList);
    return field;
  }

  private async loadCategories(): Promise<void> {
    if (this.categoriesLoaded || !this.categorySelect) {
      return;
    }

    if (!this.dataProvider) {
      this.categorySelect.setOptions([STATIC_PAGE_OPTION]);
      this.categoriesLoaded = true;
      return;
    }

    this.categorySelect.setLoading(true);
    this.clearError();

    try {
      const categories = await this.dataProvider.getCategories();
      this.categorySelect.setOptions(this.withStaticPageOption(categories));
      this.categoriesLoaded = true;
    } catch (error) {
      this.categorySelect.setOptions([STATIC_PAGE_OPTION]);
      this.showError('Categories could not be loaded. Try again later.');
    } finally {
      this.categorySelect.setLoading(false);
    }
  }

  private async loadItemsForCurrentCategory(): Promise<void> {
    if (!this.itemSelect || !this.data.categoryId || this.isStaticPageSelected()) {
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

  private handleCategoryChange(option: DynamicLinkOption | null): void {
    const previousCategoryId = this.data.categoryId;

    this.data.categoryId = option?.id ?? '';
    this.data.categoryLabel = option?.label ?? '';

    if (previousCategoryId !== this.data.categoryId) {
      this.data.itemId = '';
      this.data.itemLabel = '';
      this.data.pathname = '';
      this.data.params = {};
      if (this.pathnameInput) {
        this.pathnameInput.value = '';
      }
      this.itemsLoadedForCategoryId = undefined;
      this.itemSelect?.clear();
      this.itemSelect?.setOptions([]);
      this.itemSelect?.setDisabled(!this.data.categoryId || this.isStaticPageSelected());
    }

    this.syncModeUi();
    this.syncApplyButton();
  }

  private handleItemChange(option: DynamicLinkOption | null): void {
    this.data.itemId = option?.id ?? '';
    this.data.itemLabel = option?.label ?? '';
    this.data.pathname = option?.pathname ?? '';
    this.data.params = option?.params ?? {};
    this.syncApplyButton();
  }

  private syncApplyButton(): void {
    if (!this.applyButton) {
      return;
    }

    this.applyButton.disabled =
      !this.data.categoryId ||
      (this.isStaticPageSelected() && !this.isValidPathname(this.data.pathname ?? '')) ||
      (!this.isStaticPageSelected() && !this.data.itemId);
  }

  private syncModeUi(): void {
    const isStaticPage = this.isStaticPageSelected();

    if (this.itemField) {
      this.itemField.hidden = isStaticPage;
    }

    if (this.pathnameField) {
      this.pathnameField.hidden = !isStaticPage;
    }

    this.itemSelect?.setDisabled(!this.data.categoryId || isStaticPage);
  }

  private isStaticPageSelected(): boolean {
    return this.data.categoryId === STATIC_PAGE_CATEGORY_ID;
  }

  private isValidPathname(pathname: string): boolean {
    return pathname.startsWith('/');
  }

  private withStaticPageOption(options: DynamicLinkOption[]): DynamicLinkOption[] {
    return [STATIC_PAGE_OPTION, ...options.filter((option) => option.id !== STATIC_PAGE_CATEGORY_ID)];
  }

  private parseQueryParams(value: string | undefined): DynamicLinkQueryParam[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((entry): DynamicLinkQueryParam | null => {
          if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
            return null;
          }

          const record = entry as Record<string, unknown>;

          return {
            key: typeof record.key === 'string' ? record.key : '',
            value: typeof record.value === 'string' ? record.value : ''
          };
        })
        .filter((entry): entry is DynamicLinkQueryParam => entry !== null);
    } catch (error) {
      return [];
    }
  }

  private parseParams(value: string | undefined): Record<string, string> {
    if (!value) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as unknown;

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }

      return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>(
        (params, [key, entryValue]) => {
          if (typeof entryValue === 'string' || typeof entryValue === 'number' || typeof entryValue === 'boolean') {
            params[key] = String(entryValue);
          }

          return params;
        },
        {}
      );
    } catch (error) {
      return {};
    }
  }

  private renderQueryParamRows(): void {
    if (!this.queryParamsList) {
      return;
    }

    this.queryParamsList.textContent = '';

    for (const queryParam of this.data.queryParams ?? []) {
      this.addQueryParamRow(queryParam);
    }
  }

  private addQueryParamRow(queryParam: DynamicLinkQueryParam = { key: '', value: '' }): void {
    if (!this.queryParamsList) {
      return;
    }

    const row = document.createElement('div');
    row.className = `${CLASS_PREFIX}__query-row`;

    const keyInput = document.createElement('input');
    keyInput.className = `${CLASS_PREFIX}__input`;
    keyInput.type = 'text';
    keyInput.placeholder = 'key';
    keyInput.value = queryParam.key;
    keyInput.dataset.queryParamKey = 'true';

    const valueInput = document.createElement('input');
    valueInput.className = `${CLASS_PREFIX}__input`;
    valueInput.type = 'text';
    valueInput.placeholder = 'value';
    valueInput.value = queryParam.value;
    valueInput.dataset.queryParamValue = 'true';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = `${CLASS_PREFIX}__query-remove`;
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      row.remove();
    });

    row.append(keyInput, valueInput, removeButton);
    this.queryParamsList.append(row);
    keyInput.focus();
  }

  private getQueryParamsFromRows(): DynamicLinkQueryParam[] {
    if (!this.queryParamsList) {
      return this.data.queryParams ?? [];
    }

    return Array.from(this.queryParamsList.querySelectorAll<HTMLDivElement>(`.${CLASS_PREFIX}__query-row`))
      .map((row): DynamicLinkQueryParam => {
        const key = row.querySelector<HTMLInputElement>('[data-query-param-key="true"]')?.value.trim() ?? '';
        const value = row.querySelector<HTMLInputElement>('[data-query-param-value="true"]')?.value.trim() ?? '';

        return { key, value };
      })
      .filter((queryParam) => queryParam.key.length > 0);
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
