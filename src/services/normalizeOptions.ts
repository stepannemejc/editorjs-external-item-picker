import type { ExternalItemPickerOption } from '../types';

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const firstStringLike = (record: AnyRecord, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }

  return undefined;
};

const unwrapCollection = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.data)) {
    return Object.values(payload.data);
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (isRecord(payload.items)) {
    return Object.values(payload.items);
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (isRecord(payload.results)) {
    return Object.values(payload.results);
  }

  return Object.values(payload);
};

const normalizeStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.entries(value).reduce<Record<string, string>>((params, [key, entryValue]) => {
    if (typeof entryValue === 'string' || typeof entryValue === 'number' || typeof entryValue === 'boolean') {
      params[key] = String(entryValue);
    }

    return params;
  }, {});
};

export const normalizeOptions = (payload: unknown): ExternalItemPickerOption[] => {
  return unwrapCollection(payload)
    .map((entry): ExternalItemPickerOption | null => {
      if (typeof entry === 'string' || typeof entry === 'number') {
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
      const id = firstStringLike(source, ['id', 'value', 'key', 'uuid', 'slug']);
      const label = firstStringLike(source, ['label', 'name', 'title', 'text', 'value']);

      if (!id || !label) {
        return null;
      }

      return {
        id,
        label,
        pathname: firstStringLike(source, ['pathname', 'path']),
        params: normalizeStringRecord(source.params),
        raw: entry
      };
    })
    .filter((option): option is ExternalItemPickerOption => option !== null);
};
