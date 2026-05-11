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

const defaultLabels = {
  categoryPlaceholder: 'Select category',
  itemPlaceholder: 'Select item',
  searchPlaceholder: 'Search...'
};

export class ExternalItemPickerTool {
  private readonly dataProvider?: ExternalItemPickerDataProvider;
  private readonly config: ExternalItemPickerConfig;
  private readonly readOnly: boolean;
  private data: ExternalItemPickerData;
  private wrapper?: HTMLDivElement;
  private categorySelect?: SearchableSelect;
  private itemSelect?: SearchableSelect;
  private errorElement?: HTMLDivElement;
  private categoriesLoaded = false;
  private itemsLoadedForCategoryId?: string;

  constructor({ data, config, readOnly }: EditorJsToolConstructorArgs) {
    this.config = config ?? {};
    this.readOnly = Boolean(readOnly);
    this.data = {
      categoryId: data?.categoryId ?? '',
      categoryLabel: data?.categoryLabel ?? '',
      itemId: data?.itemId ?? '',
      itemLabel: data?.itemLabel ?? ''
    };
    this.dataProvider = this.resolveDataProvider(this.config);
  }

  static get toolbox(): { title: string; icon: string } {
    return {
      title: 'External item',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M4 6.5h16M4 12h16M4 17.5h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  render(): HTMLElement {
    const labels = {
      ...defaultLabels,
      ...this.config.labels
    };

    this.wrapper = document.createElement('div');
    this.wrapper.className = CLASS_PREFIX;

    const categoryField = this.createField(labels.categoryPlaceholder);
    const itemField = this.createField(labels.itemPlaceholder);
    this.errorElement = document.createElement('div');
    this.errorElement.className = `${CLASS_PREFIX}__error`;
    this.errorElement.hidden = true;

    this.categorySelect = new SearchableSelect({
      classPrefix: CLASS_PREFIX,
      placeholder: labels.categoryPlaceholder,
      searchPlaceholder: labels.searchPlaceholder,
      disabled: false,
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
    this.wrapper.append(categoryField, itemField, this.errorElement);

    if (this.data.categoryId) {
      void this.loadItemsForCurrentCategory();
    }

    return this.wrapper;
  }

  save(): ExternalItemPickerData {
    return {
      categoryId: this.data.categoryId || '',
      categoryLabel: this.data.categoryLabel || '',
      itemId: this.data.itemId || '',
      itemLabel: this.data.itemLabel || ''
    };
  }

  validate(savedData: ExternalItemPickerData): boolean {
    if (!this.config.required) {
      return true;
    }

    return Boolean(savedData.categoryId && savedData.itemId);
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
  }

  private handleItemChange(option: ExternalItemPickerOption | null): void {
    this.data.itemId = option?.id ?? '';
    this.data.itemLabel = option?.label ?? '';
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

export default ExternalItemPickerTool;
