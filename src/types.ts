export interface DynamicLinkOption {
  id: string;
  label: string;
  pathname?: string;
  params?: Record<string, string>;
  raw?: unknown;
}

export interface DynamicLinkQueryParam {
  key: string;
  value: string;
}

export interface DynamicLinkData {
  categoryId: string;
  categoryLabel?: string;
  itemId?: string | null;
  itemLabel?: string | null;
  pathname?: string | null;
  params?: Record<string, string>;
  queryParams?: DynamicLinkQueryParam[];
}

export interface DynamicLinkDataProvider {
  getCategories: () => Promise<DynamicLinkOption[]>;
  getItemsByCategory: (categoryId: string) => Promise<DynamicLinkOption[]>;
}

export interface DynamicLinkConfig {
  dataProvider?: DynamicLinkDataProvider;
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

export type ExternalItemPickerOption = DynamicLinkOption;
export type ExternalItemPickerData = DynamicLinkData;
export type ExternalItemPickerDataProvider = DynamicLinkDataProvider;
export type ExternalItemPickerConfig = DynamicLinkConfig;

export interface EditorJsToolConstructorArgs {
  data?: DynamicLinkData;
  api?: unknown;
  config?: DynamicLinkConfig;
  readOnly?: boolean;
}
