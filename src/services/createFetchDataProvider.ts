import type { ExternalItemPickerConfig, ExternalItemPickerDataProvider } from '../types';
import { normalizeOptions } from './normalizeOptions';

const loadJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

const createItemsUrl = (template: string, categoryId: string): string => {
  const encodedCategoryId = encodeURIComponent(categoryId);

  if (template.includes('{categoryId}')) {
    return template.split('{categoryId}').join(encodedCategoryId);
  }

  if (template.includes('{category}')) {
    return template.split('{category}').join(encodedCategoryId);
  }

  const separator = template.includes('?') ? '&' : '?';
  return `${template}${separator}categoryId=${encodedCategoryId}`;
};

export const createFetchDataProvider = (
  endpoints: NonNullable<ExternalItemPickerConfig['endpoints']>
): ExternalItemPickerDataProvider => {
  return {
    async getCategories() {
      if (!endpoints.categories) {
        return [];
      }

      return normalizeOptions(await loadJson(endpoints.categories));
    },

    async getItemsByCategory(categoryId: string) {
      if (!endpoints.itemsByCategory) {
        return [];
      }

      return normalizeOptions(await loadJson(createItemsUrl(endpoints.itemsByCategory, categoryId)));
    }
  };
};
