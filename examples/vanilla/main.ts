import EditorJS from '@editorjs/editorjs';
import ExternalItemPickerTool from '../../src';
import '../../src/styles.css';

const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    externalItem: {
      class: ExternalItemPickerTool,
      config: {
        endpoints: {
          categories: '/mock/categories.json',
          itemsByCategory: '/mock/items-{categoryId}.json'
        },
        required: true
      }
    }
  },
  data: {
    blocks: [
      {
        type: 'externalItem',
        data: {
          categoryId: 'books',
          categoryLabel: 'Books',
          itemId: 'clean-code',
          itemLabel: 'Clean Code'
        }
      }
    ]
  }
});

document.querySelector<HTMLButtonElement>('#save')?.addEventListener('click', async () => {
  const output = await editor.save();
  const outputElement = document.querySelector<HTMLPreElement>('#output');

  if (outputElement) {
    outputElement.textContent = JSON.stringify(output, null, 2);
  }
});
