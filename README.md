# editorjs-external-item-link-picker

Reusable framework-agnostic Editor.js inline tool for creating dynamic links from selected text.

The tool behaves like an inline link tool: select text, click the toolbar button, choose a category and target, and the selected text is wrapped in an anchor with dynamic-link data attributes.

## Installation

```sh
npm install editorjs-external-item-link-picker @editorjs/editorjs
```

Import the stylesheet once in your app:

```ts
import 'editorjs-external-item-link-picker/dist/style.css';
```

## Basic Editor.js Usage

```ts
import EditorJS from '@editorjs/editorjs';
import DynamicLinkTool from 'editorjs-external-item-link-picker';
import 'editorjs-external-item-link-picker/dist/style.css';

const editor = new EditorJS({
  holder: 'editorjs',
  inlineToolbar: ['dynamicLink'],
  tools: {
    dynamicLink: {
      class: DynamicLinkTool,
      inlineToolbar: true,
      config: {
        endpoints: {
          categories: '/content/resources',
          itemsByCategory: '/content/resources/{category}'
        }
      }
    }
  }
});
```

The package exports the tool as default and named exports:

```ts
import DynamicLinkTool, {
  DynamicLinkTool as NamedDynamicLinkTool,
  ExternalItemPickerTool
} from 'editorjs-external-item-link-picker';
```

## Static Page Mode

The first select always includes this built-in option together with categories loaded from your provider or endpoint:

```ts
{ id: 'static-page', label: 'Static page' }
```

When `Static page` is selected, the item select is hidden and no item endpoint/provider call is made. The popover shows a `Pathname` input instead. Pathnames must start with `/`, for example `/about-us`.

Changing category clears the selected item and pathname, but keeps query params.

## Query Params

The popover includes a query-param builder for every link variant. Use `Add query param` to add rows with `key` and `value` inputs. Rows without a key are ignored when applying the link.

Query params are serialized as JSON into `data-dynamic-link-query-params`.

## Dynamic Item HTML

```html
<a
  href="#"
  data-dynamic-link="true"
  data-dynamic-link-category-id="product"
  data-dynamic-link-category-label="product"
  data-dynamic-link-item-id="7"
  data-dynamic-link-item-label="Bambusová podprsenka s vyjímatelnými vycpávkami"
  data-dynamic-link-pathname="/product/[urlPart]/[slug]"
  data-dynamic-link-params='{"urlPart":"07014P-W","slug":"bambusova-podprsenka-s-vyjimatelnymi-vycpavkami"}'
  data-dynamic-link-query-params='[{"key":"utm_source","value":"newsletter"}]'
>
  selected text
</a>
```

## Static Page HTML

```html
<a
  href="#"
  data-dynamic-link="true"
  data-dynamic-link-category-id="static-page"
  data-dynamic-link-category-label="Static page"
  data-dynamic-link-item-id=""
  data-dynamic-link-item-label=""
  data-dynamic-link-pathname="/about-us"
  data-dynamic-link-params="{}"
  data-dynamic-link-query-params='[{"key":"utm_source","value":"newsletter"}]'
>
  selected text
</a>
```

## Pathname, Params, And Query Params

`pathname` is the route pattern returned by the backend for dynamic resources, or the manually entered pathname for static pages.

`params` are route params returned by the backend and stored as JSON in `data-dynamic-link-params`. Static pages store `{}`.

`queryParams` are the optional rows entered in the query-param builder and stored as JSON in `data-dynamic-link-query-params`.

## Frontend Rendering Parse Example

```ts
const anchor = document.querySelector<HTMLAnchorElement>('a[data-dynamic-link="true"]');

const parseJson = <T>(value: string | undefined, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const pathname = anchor?.dataset.dynamicLinkPathname ?? '';
const params = parseJson<Record<string, string>>(anchor?.dataset.dynamicLinkParams, {});
const queryParams = parseJson<Array<{ key: string; value: string }>>(
  anchor?.dataset.dynamicLinkQueryParams,
  []
);
```

```ts
const href = Object.entries(params).reduce((resolvedPathname, [key, value]) => {
  return resolvedPathname.replace(`[${key}]`, encodeURIComponent(value));
}, pathname);
```

```ts
const searchParams = new URLSearchParams();

for (const queryParam of queryParams) {
  if (queryParam.key) {
    searchParams.set(queryParam.key, queryParam.value);
  }
}

const fullHref = searchParams.size > 0 ? `${href}?${searchParams.toString()}` : href;
```

## Editing And Removing Links

When the cursor or selection is inside an existing dynamic link, the tool detects the anchor, prefills category, item or pathname, and query-param rows from its data attributes. Applying changes updates the existing anchor instead of nesting a new one.

Use the `Unlink` action in the popover to remove the anchor wrapper while preserving the plain text.

## Usage With Custom Data Provider

```ts
import type { DynamicLinkDataProvider } from 'editorjs-external-item-link-picker';

const dataProvider: DynamicLinkDataProvider = {
  async getCategories() {
    return [
      { id: 'books', label: 'Books' },
      { id: 'courses', label: 'Courses' }
    ];
  },
  async getItemsByCategory(categoryId) {
    const response = await fetch(`/internal/items?category=${categoryId}`);
    const items = await response.json();

    return items.map((item: { id: string; title: string }) => ({
      id: item.id,
      label: item.title,
      pathname: item.pathname,
      params: item.params,
      raw: item
    }));
  }
};
```

```ts
tools: {
  dynamicLink: {
    class: DynamicLinkTool,
    inlineToolbar: true,
    config: {
      dataProvider,
      labels: {
        categoryPlaceholder: 'Choose type',
        itemPlaceholder: 'Choose target',
        searchPlaceholder: 'Search'
      }
    }
  }
}
```

If `dataProvider` is provided, it is used before endpoint configuration.

## Usage With Backend Endpoints

```ts
config: {
  endpoints: {
    categories: '/content/resources',
    itemsByCategory: '/content/resources/{category}'
  }
}
```

`itemsByCategory` supports `{category}` and `{categoryId}` replacement. If the placeholder is omitted, the tool appends `categoryId` as a query parameter. The item endpoint is not called when `static-page` is selected.

## Backend Response Formats

Categories can be returned as an array of strings:

```json
[
  "category",
  "product"
]
```

Each string becomes `{ "id": "product", "label": "product" }`.

Items can be returned as an object keyed by item ID:

```json
{
  "7": {
    "id": 7,
    "title": "Bambusová podprsenka s vyjímatelnými vycpávkami",
    "pathname": "/product/[urlPart]/[slug]",
    "params": {
      "urlPart": "07014P-W",
      "slug": "bambusova-podprsenka-s-vyjimatelnymi-vycpavkami"
    }
  }
}
```

Items are normalized into:

```ts
{
  id: string;
  label: string;
  pathname?: string;
  params?: Record<string, string>;
  raw?: unknown;
}
```

Supported array response:

```json
[
  { "id": "books", "label": "Books" },
  { "id": "courses", "name": "Courses" }
]
```

Supported wrapped response:

```json
{
  "data": [
    { "id": 1, "attributes": { "name": "Books" } }
  ]
}
```

The normalizer also accepts arrays, `data`, `items`, or `results` wrappers, and common field names such as `value`, `key`, `uuid`, `slug`, `name`, `title`, and `text`.

## TypeScript API

```ts
import type {
  DynamicLinkData,
  DynamicLinkConfig,
  DynamicLinkOption,
  DynamicLinkDataProvider,
  DynamicLinkQueryParam
} from 'editorjs-external-item-link-picker';
```

Legacy `ExternalItemPicker*` type aliases are still exported for compatibility.

## Development

```sh
npm install
npm run typecheck
npm run build
npm run example
```

The vanilla example uses mock JSON files from `examples/vanilla/mock`.

## Publishing Notes

This repository is prepared for npm publishing but is not published by this setup.

Before publishing:

1. Update `name`, `version`, `author`, and `license` fields as needed.
2. Run `npm run typecheck && npm run build`.
3. Inspect the generated `dist` package output.
4. Publish with `npm publish` when ready.
