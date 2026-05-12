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
    private button?;
    private popover?;
    private categorySelect?;
    private itemSelect?;
    private applyButton?;
    private unlinkButton?;
    private errorElement?;
    private activeAnchor;
    private selectedRange;
    private data;
    private categoriesLoaded;
    private itemsLoadedForCategoryId?;
    private readonly handleDocumentMouseDown;
    constructor({ config, readOnly }: EditorJsToolConstructorArgs);
    static get isInline(): boolean;
    static get isReadOnlySupported(): boolean;
    render(): HTMLElement;
    surround(range: Range): void;
    checkState(): boolean;
    clear(): void;
    private openPopover;
    private closePopover;
    private positionPopover;
    private applyLink;
    private createAnchorFromRange;
    private unlink;
    private findDynamicLink;
    private findDynamicLinkForRange;
    private readDataFromAnchor;
    private writeDataToAnchor;
    private resolveDataProvider;
    private createField;
    private loadCategories;
    private loadItemsForCurrentCategory;
    private handleCategoryChange;
    private handleItemChange;
    private syncApplyButton;
    private showError;
    private clearError;
}
declare const DynamicLinkTool: typeof ExternalItemPickerTool;

declare const createFetchDataProvider: (endpoints: NonNullable<ExternalItemPickerConfig["endpoints"]>) => ExternalItemPickerDataProvider;

declare const normalizeOptions: (payload: unknown) => ExternalItemPickerOption[];

export { DynamicLinkTool, type ExternalItemPickerConfig, type ExternalItemPickerData, type ExternalItemPickerDataProvider, type ExternalItemPickerOption, ExternalItemPickerTool, createFetchDataProvider, ExternalItemPickerTool as default, normalizeOptions };
