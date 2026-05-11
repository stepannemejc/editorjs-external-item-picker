interface ExternalItemPickerOption {
    id: string;
    label: string;
    raw?: unknown;
}
interface ExternalItemPickerData {
    categoryId?: string;
    categoryLabel?: string;
    itemId?: string;
    itemLabel?: string;
}
interface ExternalItemPickerDataProvider {
    getCategories: () => Promise<ExternalItemPickerOption[]>;
    getItemsByCategory: (categoryId: string) => Promise<ExternalItemPickerOption[]>;
}
interface ExternalItemPickerConfig {
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
interface EditorJsToolConstructorArgs {
    data?: ExternalItemPickerData;
    api?: unknown;
    config?: ExternalItemPickerConfig;
    readOnly?: boolean;
}

declare class ExternalItemPickerTool {
    private readonly dataProvider?;
    private readonly config;
    private readonly readOnly;
    private data;
    private wrapper?;
    private categorySelect?;
    private itemSelect?;
    private errorElement?;
    private categoriesLoaded;
    private itemsLoadedForCategoryId?;
    constructor({ data, config, readOnly }: EditorJsToolConstructorArgs);
    static get toolbox(): {
        title: string;
        icon: string;
    };
    static get isReadOnlySupported(): boolean;
    render(): HTMLElement;
    save(): ExternalItemPickerData;
    validate(savedData: ExternalItemPickerData): boolean;
    private resolveDataProvider;
    private createField;
    private loadCategories;
    private loadItemsForCurrentCategory;
    private handleCategoryChange;
    private handleItemChange;
    private showError;
    private clearError;
}

declare const createFetchDataProvider: (endpoints: NonNullable<ExternalItemPickerConfig["endpoints"]>) => ExternalItemPickerDataProvider;

declare const normalizeOptions: (payload: unknown) => ExternalItemPickerOption[];

export { type ExternalItemPickerConfig, type ExternalItemPickerData, type ExternalItemPickerDataProvider, type ExternalItemPickerOption, ExternalItemPickerTool, createFetchDataProvider, ExternalItemPickerTool as default, normalizeOptions };
