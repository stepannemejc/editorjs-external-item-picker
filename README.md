# editorjs-external-item-picker

Reusable framework-agnostic Editor.js block tool with two searchable selects:
category first, then item options loaded for the selected category.

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
import ExternalItemPickerTool from 'editorjs-external-item-picker';
import 'editorjs-external-item-picker/dist/style.css';

const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    externalItem: {
      class: ExternalItemPickerTool,
      config: {
        endpoints: {
          categories: '/api/categories',
          itemsByCategory: '/api/items/{categoryId}'
        },
        required: true
      }
    }
  }
});
```

The package exports both default and named tool exports:

```ts
import ExternalItemPickerTool, {
  ExternalItemPickerTool as NamedExternalItemPickerTool
} from 'editorjs-external-item-picker';
```

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
  externalItem: {
    class: ExternalItemPickerTool,
    config: {
      dataProvider,
      labels: {
        categoryPlaceholder: 'Choose category',
        itemPlaceholder: 'Choose item',
        searchPlaceholder: 'Search'
      },
      required: false
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

## Saved Data Shape

```json
{
  "categoryId": "books",
  "categoryLabel": "Books",
  "itemId": "clean-code",
  "itemLabel": "Clean Code"
}
```

Existing saved data prefills both selects. Changing category clears the selected item.

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
