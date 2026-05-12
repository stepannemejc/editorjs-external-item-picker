'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// src/services/normalizeOptions.ts
var isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
var firstStringLike = (record, keys) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return void 0;
};
var unwrapCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!isRecord(payload)) {
    return [];
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
};
var normalizeOptions = (payload) => {
  return unwrapCollection(payload).map((entry) => {
    if (typeof entry === "string" || typeof entry === "number") {
      const value = String(entry);
      return {
        id: value,
        label: value,
        raw: entry
      };
    }
    if (!isRecord(entry)) {
      return null;
    }
    const attributes = isRecord(entry.attributes) ? entry.attributes : {};
    const source = { ...attributes, ...entry };
    const id = firstStringLike(source, ["id", "value", "key", "uuid", "slug"]);
    const label = firstStringLike(source, ["label", "name", "title", "text", "value"]);
    if (!id || !label) {
      return null;
    }
    return {
      id,
      label,
      raw: entry
    };
  }).filter((option) => option !== null);
};

// src/services/createFetchDataProvider.ts
var loadJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
};
var createItemsUrl = (template, categoryId) => {
  const encodedCategoryId = encodeURIComponent(categoryId);
  if (template.includes("{categoryId}")) {
    return template.split("{categoryId}").join(encodedCategoryId);
  }
  const separator = template.includes("?") ? "&" : "?";
  return `${template}${separator}categoryId=${encodedCategoryId}`;
};
var createFetchDataProvider = (endpoints) => {
  return {
    async getCategories() {
      if (!endpoints.categories) {
        return [];
      }
      return normalizeOptions(await loadJson(endpoints.categories));
    },
    async getItemsByCategory(categoryId) {
      if (!endpoints.itemsByCategory) {
        return [];
      }
      return normalizeOptions(await loadJson(createItemsUrl(endpoints.itemsByCategory, categoryId)));
    }
  };
};

// src/tool/ExternalItemPickerTool.ts
var SearchableSelect = class {
  constructor(config) {
    this.options = [];
    this.selected = null;
    this.isOpen = false;
    this.config = config;
    this.disabled = Boolean(config.disabled);
    this.element = document.createElement("div");
    this.element.className = `${config.classPrefix}__select`;
    this.input = document.createElement("input");
    this.input.className = `${config.classPrefix}__input`;
    this.input.type = "text";
    this.input.placeholder = config.placeholder;
    this.input.autocomplete = "off";
    this.input.disabled = this.disabled || Boolean(config.readOnly);
    this.dropdown = document.createElement("div");
    this.dropdown.className = `${config.classPrefix}__dropdown`;
    this.dropdown.hidden = true;
    this.status = document.createElement("div");
    this.status.className = `${config.classPrefix}__status`;
    this.optionsList = document.createElement("div");
    this.optionsList.className = `${config.classPrefix}__options`;
    this.dropdown.append(this.status, this.optionsList);
    this.element.append(this.input, this.dropdown);
    this.bindEvents();
    this.setDisabled(this.disabled);
  }
  setOptions(options) {
    this.options = options;
    this.renderOptions();
  }
  setSelected(option) {
    this.selected = option;
    this.input.value = option?.label ?? "";
    this.renderOptions();
  }
  setDisabled(disabled) {
    this.disabled = disabled;
    this.input.disabled = disabled || Boolean(this.config.readOnly);
    this.element.classList.toggle(`${this.config.classPrefix}__select--disabled`, this.input.disabled);
    if (this.input.disabled) {
      this.close();
    }
  }
  setLoading(isLoading) {
    this.element.classList.toggle(`${this.config.classPrefix}__select--loading`, isLoading);
    this.status.textContent = isLoading ? "Loading..." : "";
  }
  clear() {
    this.setSelected(null);
    this.input.value = "";
  }
  focus() {
    this.input.focus();
  }
  bindEvents() {
    this.input.addEventListener("focus", () => {
      this.open();
    });
    this.input.addEventListener("click", () => {
      this.open();
    });
    this.input.addEventListener("input", () => {
      this.selected = null;
      this.renderOptions();
      this.open();
      this.config.onChange(null);
    });
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.close();
      }
    });
    document.addEventListener("click", (event) => {
      if (!this.element.contains(event.target)) {
        this.close();
      }
    });
  }
  open() {
    if (this.disabled || this.config.readOnly) {
      return;
    }
    this.isOpen = true;
    this.dropdown.hidden = false;
    this.input.placeholder = this.config.searchPlaceholder;
    this.config.onOpen();
    this.renderOptions();
  }
  close() {
    this.isOpen = false;
    this.dropdown.hidden = true;
    this.input.placeholder = this.config.placeholder;
    if (this.selected) {
      this.input.value = this.selected.label;
    }
  }
  renderOptions() {
    this.optionsList.textContent = "";
    if (!this.isOpen) {
      return;
    }
    const query = this.input.value.trim().toLocaleLowerCase();
    const filteredOptions = this.options.filter((option) => {
      return option.label.toLocaleLowerCase().includes(query) || option.id.toLocaleLowerCase().includes(query);
    });
    if (filteredOptions.length === 0) {
      this.status.textContent = "No results found";
      return;
    }
    this.status.textContent = "";
    for (const option of filteredOptions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `${this.config.classPrefix}__option`;
      button.textContent = option.label;
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        this.setSelected(option);
        this.config.onChange(option);
        this.close();
      });
      this.optionsList.append(button);
    }
  }
};
var CLASS_PREFIX = "external-item-picker";
var DYNAMIC_LINK_SELECTOR = 'a[data-dynamic-link="true"]';
var defaultLabels = {
  categoryPlaceholder: "Select category",
  itemPlaceholder: "Select item",
  searchPlaceholder: "Search..."
};
var ExternalItemPickerTool = class {
  constructor({ config, readOnly }) {
    this.activeAnchor = null;
    this.selectedRange = null;
    this.data = {};
    this.categoriesLoaded = false;
    this.handleDocumentMouseDown = (event) => {
      const target = event.target;
      if (!target || !this.popover || this.popover.contains(target) || this.button?.contains(target)) {
        return;
      }
      this.closePopover();
    };
    this.config = config ?? {};
    this.readOnly = Boolean(readOnly);
    this.dataProvider = this.resolveDataProvider(this.config);
  }
  static get isInline() {
    return true;
  }
  static get isReadOnlySupported() {
    return true;
  }
  render() {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = `${CLASS_PREFIX}__toolbar-button`;
    this.button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 13.5 13.5 10.5M8.75 7.75l-1 .02a4 4 0 0 0-2.73 6.88l.33.33a4 4 0 0 0 5.66 0l1.24-1.23M11.75 10.25l1.24-1.23a4 4 0 0 1 5.66 0l.33.33a4 4 0 0 1-2.73 6.88l-1 .02" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    this.button.title = "Dynamic link";
    return this.button;
  }
  surround(range) {
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
  checkState() {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode ? this.findDynamicLink(selection.anchorNode) : null;
    this.activeAnchor = anchor;
    this.button?.classList.toggle(`${CLASS_PREFIX}__toolbar-button--active`, Boolean(anchor));
    return Boolean(anchor);
  }
  clear() {
    this.closePopover();
    this.button?.classList.remove(`${CLASS_PREFIX}__toolbar-button--active`);
    this.activeAnchor = null;
    this.selectedRange = null;
    this.data = {};
  }
  openPopover(range) {
    this.closePopover();
    const labels = {
      ...defaultLabels,
      ...this.config.labels
    };
    this.popover = document.createElement("div");
    this.popover.className = `${CLASS_PREFIX} ${CLASS_PREFIX}__popover`;
    this.popover.addEventListener("mousedown", (event) => event.stopPropagation());
    this.popover.addEventListener("click", (event) => event.stopPropagation());
    const categoryField = this.createField(labels.categoryPlaceholder);
    const itemField = this.createField(labels.itemPlaceholder);
    const actions = document.createElement("div");
    actions.className = `${CLASS_PREFIX}__actions`;
    this.errorElement = document.createElement("div");
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
    this.applyButton = document.createElement("button");
    this.applyButton.type = "button";
    this.applyButton.className = `${CLASS_PREFIX}__action ${CLASS_PREFIX}__action--primary`;
    this.applyButton.textContent = "Apply";
    this.applyButton.addEventListener("click", () => this.applyLink());
    this.unlinkButton = document.createElement("button");
    this.unlinkButton.type = "button";
    this.unlinkButton.className = `${CLASS_PREFIX}__action`;
    this.unlinkButton.textContent = "Unlink";
    this.unlinkButton.hidden = !this.activeAnchor;
    this.unlinkButton.addEventListener("click", () => this.unlink());
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
    document.addEventListener("mousedown", this.handleDocumentMouseDown);
    this.positionPopover(range);
    this.syncApplyButton();
    void this.loadCategories();
    if (this.data.categoryId) {
      void this.loadItemsForCurrentCategory();
    }
    this.categorySelect.focus();
  }
  closePopover() {
    document.removeEventListener("mousedown", this.handleDocumentMouseDown);
    this.popover?.remove();
    this.popover = void 0;
    this.categorySelect = void 0;
    this.itemSelect = void 0;
    this.applyButton = void 0;
    this.unlinkButton = void 0;
    this.errorElement = void 0;
    this.categoriesLoaded = false;
    this.itemsLoadedForCategoryId = void 0;
  }
  positionPopover(range) {
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
  applyLink() {
    if (!this.data.categoryId || !this.data.itemId) {
      this.showError("Choose a category and item before applying the link.");
      return;
    }
    const anchor = this.activeAnchor ?? this.createAnchorFromRange();
    if (!anchor) {
      this.showError("Select text before applying the link.");
      return;
    }
    this.writeDataToAnchor(anchor);
    this.closePopover();
    this.button?.classList.add(`${CLASS_PREFIX}__toolbar-button--active`);
  }
  createAnchorFromRange() {
    if (!this.selectedRange || this.selectedRange.collapsed) {
      return null;
    }
    const anchor = document.createElement("a");
    const contents = this.selectedRange.extractContents();
    anchor.append(contents);
    this.selectedRange.insertNode(anchor);
    return anchor;
  }
  unlink() {
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
  findDynamicLink(node) {
    let current = node;
    if (current?.nodeType === Node.TEXT_NODE) {
      current = current.parentNode;
    }
    while (current && current instanceof HTMLElement) {
      if (current.matches(DYNAMIC_LINK_SELECTOR)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
  findDynamicLinkForRange(range) {
    return this.findDynamicLink(range.commonAncestorContainer) ?? this.findDynamicLink(range.startContainer) ?? this.findDynamicLink(range.endContainer);
  }
  readDataFromAnchor(anchor) {
    return {
      categoryId: anchor.dataset.dynamicLinkCategoryId ?? "",
      categoryLabel: anchor.dataset.dynamicLinkCategoryLabel ?? "",
      itemId: anchor.dataset.dynamicLinkItemId ?? "",
      itemLabel: anchor.dataset.dynamicLinkItemLabel ?? ""
    };
  }
  writeDataToAnchor(anchor) {
    anchor.href = "#";
    anchor.dataset.dynamicLink = "true";
    anchor.dataset.dynamicLinkCategoryId = this.data.categoryId ?? "";
    anchor.dataset.dynamicLinkCategoryLabel = this.data.categoryLabel ?? "";
    anchor.dataset.dynamicLinkItemId = this.data.itemId ?? "";
    anchor.dataset.dynamicLinkItemLabel = this.data.itemLabel ?? "";
  }
  resolveDataProvider(config) {
    if (config.dataProvider) {
      return config.dataProvider;
    }
    if (config.endpoints) {
      return createFetchDataProvider(config.endpoints);
    }
    return void 0;
  }
  createField(labelText) {
    const field = document.createElement("div");
    field.className = `${CLASS_PREFIX}__field`;
    const label = document.createElement("label");
    label.className = `${CLASS_PREFIX}__label`;
    label.textContent = labelText;
    field.append(label);
    return field;
  }
  async loadCategories() {
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
      this.showError("Categories could not be loaded. Try again later.");
    } finally {
      this.categorySelect.setLoading(false);
    }
  }
  async loadItemsForCurrentCategory() {
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
      this.showError("Items could not be loaded. Try again later.");
    } finally {
      this.itemSelect.setLoading(false);
    }
  }
  handleCategoryChange(option) {
    const previousCategoryId = this.data.categoryId;
    this.data.categoryId = option?.id ?? "";
    this.data.categoryLabel = option?.label ?? "";
    if (previousCategoryId !== this.data.categoryId) {
      this.data.itemId = "";
      this.data.itemLabel = "";
      this.itemsLoadedForCategoryId = void 0;
      this.itemSelect?.clear();
      this.itemSelect?.setOptions([]);
      this.itemSelect?.setDisabled(!this.data.categoryId);
    }
    this.syncApplyButton();
  }
  handleItemChange(option) {
    this.data.itemId = option?.id ?? "";
    this.data.itemLabel = option?.label ?? "";
    this.syncApplyButton();
  }
  syncApplyButton() {
    if (!this.applyButton) {
      return;
    }
    this.applyButton.disabled = !this.data.categoryId || !this.data.itemId;
  }
  showError(message) {
    if (!this.errorElement) {
      return;
    }
    this.errorElement.textContent = message;
    this.errorElement.hidden = false;
  }
  clearError() {
    if (!this.errorElement) {
      return;
    }
    this.errorElement.textContent = "";
    this.errorElement.hidden = true;
  }
};
var DynamicLinkTool = ExternalItemPickerTool;
var ExternalItemPickerTool_default = ExternalItemPickerTool;

exports.DynamicLinkTool = DynamicLinkTool;
exports.ExternalItemPickerTool = ExternalItemPickerTool;
exports.createFetchDataProvider = createFetchDataProvider;
exports.default = ExternalItemPickerTool_default;
exports.normalizeOptions = normalizeOptions;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map