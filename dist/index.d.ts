interface DynamicLinkOption {
    id: string;
    label: string;
    pathname?: string;
    params?: Record<string, string>;
    raw?: unknown;
}
interface DynamicLinkQueryParam {
    key: string;
    value: string;
}
interface DynamicLinkData {
    categoryId: string;
    categoryLabel?: string;
    itemId?: string | null;
    itemLabel?: string | null;
    pathname?: string | null;
    params?: Record<string, string>;
    queryParams?: DynamicLinkQueryParam[];
}
interface DynamicLinkDataProvider {
    getCategories: () => Promise<DynamicLinkOption[]>;
    getItemsByCategory: (categoryId: string) => Promise<DynamicLinkOption[]>;
}
interface DynamicLinkConfig {
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
type ExternalItemPickerOption = DynamicLinkOption;
type ExternalItemPickerData = DynamicLinkData;
type ExternalItemPickerDataProvider = DynamicLinkDataProvider;
type ExternalItemPickerConfig = DynamicLinkConfig;
interface EditorJsToolConstructorArgs {
    data?: DynamicLinkData;
    api?: unknown;
    config?: DynamicLinkConfig;
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
    private itemField?;
    private pathnameField?;
    private pathnameInput?;
    private queryParamsList?;
    private applyButton?;
    private unlinkButton?;
    private errorElement?;
    private activeAnchor;
    private selectedRange;
    private data;
    private categoriesLoaded;
    private itemsLoadedForCategoryId?;
    private readonly handleDocumentPointerDown;
    private readonly handleDocumentKeyDown;
    constructor({ config, readOnly }: EditorJsToolConstructorArgs);
    static get isInline(): boolean;
    static get isReadOnlySupported(): boolean;
    render(): HTMLElement;
    surround(range: Range): void;
    checkState(): boolean;
    clear(): void;
    private openPopover;
    private createEmptyData;
    private closePopover;
    private bindPopoverEventBoundary;
    private isInternalInteractionTarget;
    private isFocusInsidePopover;
    private restoreSavedSelection;
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
    private createPathnameField;
    private createQueryParamsField;
    private loadCategories;
    private loadItemsForCurrentCategory;
    private handleCategoryChange;
    private handleItemChange;
    private syncApplyButton;
    private syncModeUi;
    private isStaticPageSelected;
    private isValidPathname;
    private withStaticPageOption;
    private parseQueryParams;
    private parseParams;
    private renderQueryParamRows;
    private addQueryParamRow;
    private getQueryParamsFromRows;
    private showError;
    private clearError;
}
declare const DynamicLinkTool: typeof ExternalItemPickerTool;

declare const createFetchDataProvider: (endpoints: NonNullable<ExternalItemPickerConfig["endpoints"]>) => ExternalItemPickerDataProvider;

declare const normalizeOptions: (payload: unknown) => ExternalItemPickerOption[];

export { type DynamicLinkConfig, type DynamicLinkData, type DynamicLinkDataProvider, type DynamicLinkOption, type DynamicLinkQueryParam, DynamicLinkTool, type ExternalItemPickerConfig, type ExternalItemPickerData, type ExternalItemPickerDataProvider, type ExternalItemPickerOption, ExternalItemPickerTool, createFetchDataProvider, ExternalItemPickerTool as default, normalizeOptions };
