export interface ExternalItemPickerOption {
  id: string;
  label: string;
  raw?: unknown;
}

export interface ExternalItemPickerData {
  categoryId?: string;
  categoryLabel?: string;
  itemId?: string;
  itemLabel?: string;
}

export interface ExternalItemPickerDataProvider {
  getCategories: () => Promise<ExternalItemPickerOption[]>;
  getItemsByCategory: (categoryId: string) => Promise<ExternalItemPickerOption[]>;
}

export interface ExternalItemPickerConfig {
  dataProvider?: ExternalItemPickerDataProvider;
  endpoints?: {
    categories?: string;
    itemsByCategory?: string;
  };
  labels?: {
    categoryPlaceholder?: string;
    itemPlaceholder?: string;
    searchPlaceholder?: string;
  };
  required?: boolean;
}

export interface EditorJsToolConstructorArgs {
  data?: ExternalItemPickerData;
  api?: unknown;
  config?: ExternalItemPickerConfig;
  readOnly?: boolean;
}
