# editorjs-external-item-picker

Reusable framework-agnostic Editor.js inline tool for creating dynamic links from selected text.

The tool behaves like an inline link tool: select text, click the toolbar button, choose a category and item, and the selected text is wrapped in an anchor with dynamic-link data attributes.

## Installation

```sh
npm install editorjs-external-item-picker @editorjs/editorjs
```

Import the stylesheet once in your app:

```ts
import 'editorjs-external-item-picker/dist/style.css';
```

## Basic Editor.js Usage

```ts
import EditorJS from '@editorjs/editorjs';
import DynamicLinkTool from 'editorjs-external-item-picker';
import 'editorjs-external-item-picker/dist/style.css';

const editor = new EditorJS({
  holder: 'editorjs',
  inlineToolbar: ['dynamicLink'],
  tools: {
    dynamicLink: {
      class: DynamicLinkTool,
      inlineToolbar: true,
      config: {
        endpoints: {
          categories: '/api/categories',
          itemsByCategory: '/api/items/{categoryId}'
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
} from 'editorjs-external-item-picker';
```

## Resulting HTML

The inline output is SSR-safe HTML:

```html
<a
  href="#"
  data-dynamic-link="true"
  data-dynamic-link-category-id="books"
  data-dynamic-link-category-label="Books"
  data-dynamic-link-item-id="clean-code"
  data-dynamic-link-item-label="Clean Code"
>
  selected text
</a>
```

## Editing And Removing Links

When the cursor or selection is inside an existing dynamic link, the tool detects the anchor, prefills both selects from its data attributes, and updates the existing anchor instead of nesting a new one.

Use the `Unlink` action in the popover to remove the anchor wrapper while preserving the plain text.

## Usage With Custom Data Provider

```ts
import type { ExternalItemPickerDataProvider } from 'editorjs-external-item-picker';

const dataProvider: ExternalItemPickerDataProvider = {
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
    categories: '/api/categories',
    itemsByCategory: '/api/categories/{categoryId}/items'
  }
}
```

`itemsByCategory` supports `{categoryId}` replacement. If the placeholder is omitted, the tool appends `categoryId` as a query parameter.

## Backend Response Formats

Responses are normalized into:

```ts
{
  id: string;
  label: string;
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

The normalizer also accepts `items` or `results` arrays and common field names such as `value`, `key`, `uuid`, `slug`, `name`, `title`, and `text`.

## TypeScript API

```ts
import type {
  ExternalItemPickerData,
  ExternalItemPickerConfig,
  ExternalItemPickerOption,
  ExternalItemPickerDataProvider
} from 'editorjs-external-item-picker';
```

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
